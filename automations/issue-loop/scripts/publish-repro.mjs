#!/usr/bin/env node
// Validate a reproduce run's out/ files, then post its reply and status, and
// open a draft pull request when it produced a proven patch.
//
//   node publish-repro.mjs <out-dir> <issue-number> [--config <path>] [--repo <owner/name>] [--dry-run]
//
// Run it from a clean checkout of the target repository. Expected files:
//
//   status.txt      required. One status key from the config's `status:` map
//                   (reproducing, reproduced, not_reproduced, blocked,
//                   verifying_fix, verified, fixing, fix_failed, pr_opened).
//   reply.md        optional. One reply for the report. Must not contain any
//                   marker text, so reproduce never reads it as a verdict.
//   patch.diff      optional. A unified git diff. Requires pr.md and at least
//                   one proof/before* and one proof/after* file.
//   pr.md           with patch.diff. First line is the title (a leading "# "
//                   is dropped); the rest is the body.
//
// A patch is refused when it touches .github/, a lockfile not listed in
// repository.lockfile_allowlist, the issue-loop config or pack, a file that
// usually holds secrets, a path outside the repository, a symlink, or a
// binary blob, or when an added line looks like a credential.
//
// Exit codes: 0 done, 2 refused by validation, 1 error.
import { join, basename, posix } from 'node:path';
import { existsSync, readdirSync, lstatSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  Refusal, cli, parseArgs, loadConfig, resolveRepo, requireIssueNumber, readAgentFile, readLines,
  countMarkerMentions, findSecret, preflightIssue, listComments, trustedVerdicts, statusLabels, gh, run, isMain,
} from './lib/common.mjs';

export const REPLY_MAX_BYTES = 16 * 1024;
export const PR_MAX_BYTES = 64 * 1024;
export const PATCH_MAX_BYTES = 256 * 1024;
export const REPLY_TAG = '<!-- issue-loop:repro-reply -->';

export const LOCKFILES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock',
  'Cargo.lock', 'Gemfile.lock', 'poetry.lock', 'Pipfile.lock', 'uv.lock', 'pdm.lock', 'composer.lock',
  'go.sum', 'flake.lock', 'packages.lock.json', 'mix.lock', 'pubspec.lock', 'Podfile.lock', 'gradle.lockfile',
]);

const SECRET_FILE_RE = /(^|\/)(\.env(\..*)?|\.npmrc|\.pypirc|\.netrc|id_(rsa|ed25519|ecdsa|dsa)(\.pub)?|credentials(\.json)?|secrets?\.(ya?ml|json|toml)|.*\.(pem|key|p12|pfx|jks|keystore))$/i;

// Every path a unified git diff touches, plus flags for symlinks and binaries.
export function patchPaths(diff) {
  const paths = new Set();
  let symlink = false;
  let binary = false;
  for (const line of diff.split('\n')) {
    let m;
    if ((m = /^diff --git a\/(.+?) b\/(.+)$/.exec(line))) { paths.add(m[1]); paths.add(m[2]); }
    else if ((m = /^(?:---|\+\+\+) (?:a|b)\/(.+?)(?:\t.*)?$/.exec(line))) paths.add(m[1]);
    else if ((m = /^(?:rename|copy) (?:from|to) (.+)$/.exec(line))) paths.add(m[1]);
    else if (/^(?:new|old|deleted) (?:file )?mode 120000/.test(line)) symlink = true;
    else if (/^GIT binary patch$/.test(line) || /^Binary files .* differ$/.test(line)) binary = true;
  }
  return { paths: [...paths], symlink, binary };
}

export function checkPatch(cfg, diff) {
  if (!/^diff --git /m.test(diff)) throw new Refusal('patch.diff is not a git diff');
  const { paths, symlink, binary } = patchPaths(diff);
  if (!paths.length) throw new Refusal('patch.diff touches no files');
  if (symlink) throw new Refusal('patch.diff creates or changes a symlink');
  if (binary) throw new Refusal('patch.diff contains a binary change');
  const allow = new Set(cfg.repository?.lockfile_allowlist || []);
  const protectedDirs = ['.github/', '.issue-loop/', '.git/'];
  for (const p of paths) {
    if (p.startsWith('"')) throw new Refusal(`patch path ${p} uses quoting; refusing unusual file names`);
    const norm = posix.normalize(p);
    if (norm.startsWith('/') || norm.startsWith('../') || norm === '..' || norm !== p) throw new Refusal(`patch path ${p} is not a plain repository path`);
    if (protectedDirs.some((d) => norm.startsWith(d) || norm.includes(`/${d}`))) throw new Refusal(`patch touches ${p}, which issue-loop may not change`);
    if (LOCKFILES.has(basename(norm)) && !allow.has(norm)) throw new Refusal(`patch touches lockfile ${p}`);
    if (SECRET_FILE_RE.test(norm)) throw new Refusal(`patch touches ${p}, a file that usually holds secrets`);
  }
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  const secret = findSecret(added);
  if (secret) throw new Refusal(`patch adds something shaped like a ${secret}`);
  return paths;
}

function proofFiles(outDir) {
  const dir = join(outDir, 'proof');
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) return { before: [], after: [] };
  const files = readdirSync(dir).filter((f) => lstatSync(join(dir, f)).isFile());
  return { before: files.filter((f) => f.startsWith('before')), after: files.filter((f) => f.startsWith('after')) };
}

export function validateReproDir(cfg, outDir) {
  const statusKey = readLines(readAgentFile(join(outDir, 'status.txt'), { maxBytes: 256 }));
  if (statusKey.length !== 1) throw new Refusal('status.txt must hold exactly one status key');
  const key = statusKey[0];
  if (!Object.hasOwn(cfg.status, key) || key === 'seen') throw new Refusal(`status "${key}" is not a reproduce status in the config`);

  const reply = readAgentFile(join(outDir, 'reply.md'), { maxBytes: REPLY_MAX_BYTES, required: false });
  if (reply !== null) {
    if (!reply.trim()) throw new Refusal('reply.md is empty');
    if (countMarkerMentions(cfg, reply) > 0) throw new Refusal('reply.md contains marker text');
    const s = findSecret(reply);
    if (s) throw new Refusal(`reply.md contains something shaped like a ${s}`);
  }

  const patch = readAgentFile(join(outDir, 'patch.diff'), { maxBytes: PATCH_MAX_BYTES, required: false });
  let pr = null;
  if (patch !== null) {
    if (key !== 'pr_opened') throw new Refusal('patch.diff is present but status is not pr_opened');
    checkPatch(cfg, patch);
    const proof = proofFiles(outDir);
    if (!proof.before.length || !proof.after.length) throw new Refusal('patch.diff needs proof/before* and proof/after* evidence');
    const prText = readAgentFile(join(outDir, 'pr.md'), { maxBytes: PR_MAX_BYTES });
    const [first, ...rest] = prText.split('\n');
    const title = first.replace(/^#+\s*/, '').trim();
    if (!title || title.length > 120) throw new Refusal('pr.md first line must be a title of 1 to 120 characters');
    const body = rest.join('\n').trim();
    if (!body) throw new Refusal('pr.md has no body');
    if (countMarkerMentions(cfg, prText) > 0) throw new Refusal('pr.md contains marker text');
    const s = findSecret(prText);
    if (s) throw new Refusal(`pr.md contains something shaped like a ${s}`);
    pr = { title, body, proof };
  } else if (key === 'pr_opened') {
    throw new Refusal('status is pr_opened but there is no patch.diff');
  }
  return { statusKey: key, reply, patch, pr };
}

function setStatus(cfg, repo, number, key, current) {
  const target = cfg.status[key];
  const stale = statusLabels(cfg).filter((l) => l !== target && l !== cfg.status.seen && current.has(l));
  const args = ['issue', 'edit', number, '--repo', repo, '--add-label', target];
  if (stale.length) args.push('--remove-label', stale.join(','));
  gh(args);
}

export async function main(argv = process.argv.slice(2)) {
  const { pos, flags } = parseArgs(argv);
  if (pos.length !== 2) throw new Refusal('usage: publish-repro <out-dir> <issue-number>');
  const [outDir, rawNumber] = pos;
  const number = requireIssueNumber(rawNumber);
  const cfg = loadConfig(flags.config);
  const repo = resolveRepo(cfg, flags.repo);
  if (cfg.repository.draft_only === false) throw new Refusal('repository.draft_only is false; issue-loop opens draft pull requests only');
  const plan = validateReproDir(cfg, outDir);

  // Preflight and re-check the trigger: a trusted bug or performance verdict.
  const issue = preflightIssue(repo, number);
  const comments = listComments(repo, number);
  const kinds = new Set(trustedVerdicts(cfg, comments).map((v) => v.kind));
  if (kinds.size !== 1 || !(kinds.has('bug') || kinds.has('performance'))) {
    throw new Refusal(`#${number} has no single trusted bug or performance verdict`);
  }
  const replied = comments.some((c) => c.login === cfg.intake.triage_identity && c.body.includes(REPLY_TAG));
  const branch = `${cfg.repository.branch_prefix || 'issue-loop/'}${number}`;
  const current = new Set((issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name)));

  if (flags.dryRun) {
    console.log(`issue-loop: dry run: status ${plan.statusKey}` +
      (plan.reply && !replied ? ', one reply' : '') + (plan.patch ? `, draft PR from ${branch}` : ''));
    return;
  }

  let prUrl = null;
  if (plan.patch) {
    const base = cfg.repository.default_branch || 'main';
    const tmp = mkdtempSync(join(tmpdir(), 'issue-loop-'));
    const bodyFile = join(tmp, 'pr-body.md');
    writeFileSync(bodyFile, plan.pr.body + '\n');
    const patchFile = join(outDir, 'patch.diff');
    try {
      run('git', ['fetch', '--quiet', 'origin', base]);
      run('git', ['switch', '--quiet', '-c', branch, `origin/${base}`]);
      run('git', ['apply', '--check', '--index', patchFile]);
      run('git', ['apply', '--index', patchFile]);
      run('git', ['-c', 'user.name=issue-loop', '-c', 'user.email=issue-loop@users.noreply.github.com',
        'commit', '--quiet', '--no-verify', '-m', plan.pr.title, '-m', `Refs #${number}`]);
      run('git', ['push', '--quiet', 'origin', `HEAD:refs/heads/${branch}`]);
      prUrl = gh(['pr', 'create', '--repo', repo, '--draft', '--base', base, '--head', branch,
        '--title', plan.pr.title, '--body-file', bodyFile]).stdout.trim();
    } catch (e) {
      setStatus(cfg, repo, number, 'fix_failed', current);
      throw new Error(`draft pull request did not open: ${e.message}`);
    }
  }

  setStatus(cfg, repo, number, plan.statusKey, current);
  if (plan.reply && !replied) {
    const tmp = mkdtempSync(join(tmpdir(), 'issue-loop-'));
    const replyFile = join(tmp, 'reply.md');
    writeFileSync(replyFile, `${plan.reply.trimEnd()}\n\n${REPLY_TAG}\n`);
    gh(['issue', 'comment', number, '--repo', repo, '--body-file', replyFile]);
  }
  console.log(`issue-loop: #${number} status ${plan.statusKey}` + (prUrl ? `, draft PR ${prUrl}` : ''));
}

if (isMain(import.meta.url)) cli(() => main());
