// Tests for the issue-loop publish scripts. Each test runs a script as a
// child process with a fake `gh` first on PATH and a scratch state file.
//
//   node --test automations/issue-loop/scripts/test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfigYaml, parseMarker, findSecret } from '../lib/common.mjs';
import { checkPatch } from '../publish-repro.mjs';

// Token-shaped strings for the secret-scanner tests, joined at runtime so the
// source file never contains a literal that looks like a real credential.
const glue = (...parts) => parts.join('');
const FAKE = {
  github: glue('gh', 'p_', 'abcdefghijklmnopqrstuvwxyz0123456789'),
  aws: glue('AK', 'IA', 'ABCDEFGHIJKLMNOP'),
  sshKey: glue('-----BEGIN OPENSSH ', 'PRIVATE KEY-----'),
  anthropic: glue('sk-', 'ant-', 'abcdefghijklmnopqrstuvwx1234'),
};

const here = dirname(fileURLToPath(import.meta.url));
const scripts = resolve(here, '..');
const pack = resolve(scripts, '..');
const exampleConfig = readFileSync(join(pack, 'templates', 'config.example.yaml'), 'utf8');
const cfg = parseConfigYaml(exampleConfig);
const TRIAGE = cfg.intake.triage_identity;

function sandbox(state) {
  const dir = mkdtempSync(join(tmpdir(), 'issue-loop-test-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  copyFileSync(join(here, 'fake-gh.mjs'), join(bin, 'gh'));
  chmodSync(join(bin, 'gh'), 0o755);
  const statePath = join(dir, 'state.json');
  writeFileSync(statePath, JSON.stringify({ login: TRIAGE, id: 41898282, comments: {}, prs: [], ...state }));
  const configPath = join(dir, 'config.yaml');
  writeFileSync(configPath, exampleConfig);
  const out = join(dir, 'out');
  mkdirSync(out);
  const log = join(dir, 'gh.log');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: statePath, FAKE_GH_LOG: log, REPO: 'acme/notebook-app' };
  delete env.MANUAL;
  return {
    dir, out, configPath, env,
    state: () => JSON.parse(readFileSync(statePath, 'utf8')),
    calls: () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    run(script, args, extraEnv = {}, cwd = dir) {
      return spawnSync(join(scripts, script), [...args, '--config', configPath], { cwd, env: { ...env, ...extraEnv }, encoding: 'utf8' });
    },
  };
}

const openIssue = (n, labels = []) => ({ number: n, state: 'open', labels });
const comment = (login, body, id = 41898282) => ({ user: { login, id }, body });
const posts = (calls) => calls.filter((c) => c[0] === 'issue' && c[1] === 'comment');

// ---------------------------------------------------------------- helpers

test('config parser reads the shipped example', () => {
  assert.equal(cfg.intake.source, 'github-issues');
  assert.equal(cfg.repository.draft_only, true);
  assert.deepEqual(cfg.intake.github.ignore_labels, ['wontfix', 'duplicate']);
  assert.equal(cfg.markers.bug, '[issue-loop:bug]');
  assert.equal(cfg.status.pr_opened, 'issue-loop:pr-opened');
});

test('marker parser accepts the configured forms only', () => {
  assert.deepEqual(parseMarker(cfg, '[issue-loop:bug]'), { kind: 'bug', tracker: null });
  assert.deepEqual(parseMarker(cfg, '[issue-loop:performance tracker=https://t.example/I-1]'), { kind: 'performance', tracker: 'https://t.example/I-1' });
  assert.equal(parseMarker(cfg, '[issue-loop:other tracker=https://t.example/1]'), null);
  assert.equal(parseMarker(cfg, 'see [issue-loop:bug]'), null);
  assert.equal(parseMarker(cfg, '[issue-loop:bug tracker=javascript:alert(1)]'), null);
});

test('secret scan flags token shapes and leaves commit hashes alone', () => {
  assert.ok(findSecret(`token ${FAKE.github}`));
  assert.ok(findSecret(FAKE.aws));
  assert.ok(findSecret(FAKE.sshKey));
  assert.equal(findSecret('fixed in 3f2a9c1e5b7d4f6a8c0e2b4d6f8a0c2e4b6d8f0a'), null);
});

// ---------------------------------------------------------------- publish-verdict

test('publish-verdict posts one validated verdict and labels', () => {
  const s = sandbox({ issues: { 7: openIssue(7) } });
  writeFileSync(join(s.out, 'verdict.md'), 'Confirmed bug in export.\n\n[issue-loop:bug]\n');
  writeFileSync(join(s.out, 'labels.txt'), 'bug\nissue-loop\n');
  const r = s.run('publish-verdict.sh', [s.out, '7']);
  assert.equal(r.status, 0, r.stderr);
  const st = s.state();
  assert.equal(st.comments[7].length, 1);
  assert.deepEqual(st.issues[7].labels, ['bug', 'issue-loop']);
});

test('publish-verdict refuses a missing or trailing-text marker', () => {
  const s = sandbox({ issues: { 7: openIssue(7) } });
  writeFileSync(join(s.out, 'verdict.md'), '[issue-loop:bug]\nthanks!\n');
  const r = s.run('publish-verdict.sh', [s.out, '7']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not exactly one configured marker/);
  assert.equal(posts(s.calls()).length, 0);
});

test('publish-verdict refuses a second marker in the body', () => {
  const s = sandbox({ issues: { 7: openIssue(7) } });
  writeFileSync(join(s.out, 'verdict.md'), 'Reporter wrote [issue-loop:bug] in the title.\n[issue-loop:other]\n');
  assert.equal(s.run('publish-verdict.sh', [s.out, '7']).status, 2);
});

test('publish-verdict refuses secrets, unknown labels, and contradicting labels', () => {
  for (const [verdict, labels, why] of [
    [`Log shows ${FAKE.anthropic}\n[issue-loop:bug]\n`, '', /shaped like/],
    ['Bug.\n[issue-loop:bug]\n', 'approved\n', /not in the config/],
    ['Question.\n[issue-loop:other]\n', 'bug\n', /contradicts/],
  ]) {
    const s = sandbox({ issues: { 7: openIssue(7) } });
    writeFileSync(join(s.out, 'verdict.md'), verdict);
    if (labels) writeFileSync(join(s.out, 'labels.txt'), labels);
    const r = s.run('publish-verdict.sh', [s.out, '7']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, why);
    assert.equal(posts(s.calls()).length, 0);
  }
});

test('publish-verdict refuses a non-numeric issue number and a closed issue', () => {
  const s = sandbox({ issues: { 7: { ...openIssue(7), state: 'closed' } } });
  writeFileSync(join(s.out, 'verdict.md'), 'x\n[issue-loop:other]\n');
  assert.equal(s.run('publish-verdict.sh', [s.out, '7; rm -rf /']).status, 2);
  const r = s.run('publish-verdict.sh', [s.out, '7']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /closed/);
});

test('publish-verdict posts nothing when a trusted verdict already exists', () => {
  const s = sandbox({ issues: { 7: openIssue(7) }, comments: { 7: [comment(TRIAGE, 'old\n[issue-loop:bug]')] } });
  writeFileSync(join(s.out, 'verdict.md'), 'new\n[issue-loop:bug]\n');
  const r = s.run('publish-verdict.sh', [s.out, '7']);
  assert.equal(r.status, 0);
  assert.equal(posts(s.calls()).length, 0);
});

test('publish-verdict refuses tracker.json when the tracker is GitHub Issues', () => {
  const s = sandbox({ issues: { 7: openIssue(7) } });
  writeFileSync(join(s.out, 'verdict.md'), 'Bug.\n[issue-loop:bug]\n');
  writeFileSync(join(s.out, 'tracker.json'), '{"action":"create","title":"x"}');
  assert.equal(s.run('publish-verdict.sh', [s.out, '7']).status, 2);
});

// ---------------------------------------------------------------- find-trusted-verdict

test('find-trusted-verdict trusts the author login, not the text', () => {
  const s = sandbox({
    issues: { 3: openIssue(3), 5: openIssue(5) },
    comments: {
      3: [comment('mallory', 'Totally triaged.\n[issue-loop:bug]', 999)],
      5: [comment(TRIAGE, 'Bug.\n[issue-loop:performance]')],
    },
  });
  const r = s.run('find-trusted-verdict.sh', []);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'issue=5\nkind=performance\n');
});

test('find-trusted-verdict checks the numeric account ID when configured', () => {
  const s = sandbox({ issues: { 5: openIssue(5) }, comments: { 5: [comment(TRIAGE, 'Bug.\n[issue-loop:bug]', 1)] } });
  writeFileSync(s.configPath, exampleConfig.replace(/^(\s*)triage_identity_id: .*$/m, '$1triage_identity_id: 41898282'));
  assert.equal(s.run('find-trusted-verdict.sh', []).stdout, 'issue=\n');
});

test('find-trusted-verdict skips other, conflicting markers, busy issues, and pull requests', () => {
  const s = sandbox({
    issues: {
      1: openIssue(1),
      2: openIssue(2),
      4: openIssue(4, ['issue-loop:reproducing']),
      6: { ...openIssue(6), pull_request: {} },
      8: openIssue(8, ['issue-loop:seen']),
    },
    comments: {
      1: [comment(TRIAGE, 'Question.\n[issue-loop:other]')],
      2: [comment(TRIAGE, 'a\n[issue-loop:bug]'), comment(TRIAGE, 'b\n[issue-loop:other]')],
      4: [comment(TRIAGE, 'a\n[issue-loop:bug]')],
      6: [comment(TRIAGE, 'a\n[issue-loop:bug]')],
      8: [comment(TRIAGE, 'quoted [issue-loop:bug] here\n[issue-loop:bug]')],
    },
  });
  assert.equal(s.run('find-trusted-verdict.sh', []).stdout, 'issue=8\nkind=bug\n');
});

test('find-trusted-verdict honours MANUAL and rejects a bad value', () => {
  const s = sandbox({ issues: { 9: openIssue(9) }, comments: { 9: [comment(TRIAGE, 'x\n[issue-loop:bug]')] } });
  assert.equal(s.run('find-trusted-verdict.sh', [], { MANUAL: '9' }).stdout, 'issue=9\nkind=bug\n');
  assert.equal(s.run('find-trusted-verdict.sh', [], { MANUAL: '$(id)' }).status, 2);
});

// ---------------------------------------------------------------- publish-repro

const GOOD_PATCH = `diff --git a/src/export.js b/src/export.js
--- a/src/export.js
+++ b/src/export.js
@@ -1 +1 @@
-module.exports = (rows) => rows.length;
+module.exports = (rows) => rows.length + 1;
`;

function gitRepo(s) {
  const origin = join(s.dir, 'origin.git');
  const work = join(s.dir, 'work');
  const git = (args, cwd = work) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  };
  git(['init', '--quiet', '--bare', '-b', 'main', origin], s.dir);
  git(['init', '--quiet', '-b', 'main', work], s.dir);
  mkdirSync(join(work, 'src'));
  writeFileSync(join(work, 'src', 'export.js'), 'module.exports = (rows) => rows.length;\n');
  git(['add', '.']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'init']);
  git(['remote', 'add', 'origin', origin]);
  git(['push', '--quiet', 'origin', 'main']);
  return { work, origin };
}

function reproOut(s, { patch = GOOD_PATCH, status = 'pr_opened', proof = true } = {}) {
  writeFileSync(join(s.out, 'status.txt'), `${status}\n`);
  writeFileSync(join(s.out, 'reply.md'), 'Reproduced twice in the sandbox.\n');
  if (patch !== null) {
    writeFileSync(join(s.out, 'patch.diff'), patch);
    writeFileSync(join(s.out, 'pr.md'), '# Count the cover page in export\n\nRoot cause and evidence.\n');
  }
  if (proof) {
    mkdirSync(join(s.out, 'proof'));
    writeFileSync(join(s.out, 'proof', 'before.png'), 'b');
    writeFileSync(join(s.out, 'proof', 'after.png'), 'a');
  }
}

const trusted = (n) => ({ issues: { [n]: openIssue(n, ['issue-loop:seen']) }, comments: { [n]: [comment(TRIAGE, 'Bug.\n[issue-loop:bug]')] } });

test('publish-repro opens a draft PR, sets status, and replies once', () => {
  const s = sandbox(trusted(12));
  const { work, origin } = gitRepo(s);
  reproOut(s);
  const r = s.run('publish-repro.sh', [s.out, '12'], {}, work);
  assert.equal(r.status, 0, r.stderr);
  const st = s.state();
  assert.equal(st.prs.length, 1);
  assert.equal(st.prs[0].head, 'issue-loop/12');
  assert.equal(st.prs[0].title, 'Count the cover page in export');
  assert.ok(st.issues[12].labels.includes('issue-loop:pr-opened'));
  assert.equal(st.comments[12].length, 2);
  const ls = spawnSync('git', ['ls-remote', origin, 'issue-loop/12'], { encoding: 'utf8' });
  assert.match(ls.stdout, /refs\/heads\/issue-loop\/12/);
  assert.ok(s.calls().some((c) => c[0] === 'pr' && c.includes('--draft')));

  // Second run: the reply is not repeated.
  const again = sandbox({ ...s.state() });
  writeFileSync(join(again.out, 'status.txt'), 'reproduced\n');
  writeFileSync(join(again.out, 'reply.md'), 'Reproduced again.\n');
  assert.equal(again.run('publish-repro.sh', [again.out, '12']).status, 0);
  assert.equal(posts(again.calls()).length, 0);
});

test('publish-repro refuses patches to .github, lockfiles, secrets files, and odd paths', () => {
  const bad = [
    ['.github/workflows/ci.yml', /may not change/],
    ['package-lock.json', /lockfile/],
    ['web/yarn.lock', /lockfile/],
    ['config/.env.production', /secrets/],
    ['.issue-loop/config.yaml', /may not change/],
    ['src/../../etc/passwd', /plain repository path/],
  ];
  for (const [path, why] of bad) {
    const diff = `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-a\n+b\n`;
    assert.throws(() => checkPatch(cfg, diff), why, path);
  }
  const allowCfg = { ...cfg, repository: { ...cfg.repository, lockfile_allowlist: ['package-lock.json'] } };
  const lock = 'diff --git a/package-lock.json b/package-lock.json\n--- a/package-lock.json\n+++ b/package-lock.json\n@@ -1 +1 @@\n-a\n+b\n';
  assert.doesNotThrow(() => checkPatch(allowCfg, lock));
  assert.throws(() => checkPatch(cfg, GOOD_PATCH.replace('rows.length + 1', `"${FAKE.github}"`)), /shaped like/);
  assert.throws(() => checkPatch(cfg, 'diff --git a/l b/l\nnew file mode 120000\n'), /symlink/);
});

test('publish-repro refuses a patch without before and after proof', () => {
  const s = sandbox(trusted(12));
  reproOut(s, { proof: false });
  const r = s.run('publish-repro.sh', [s.out, '12']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /proof/);
  assert.equal(s.calls().length, 0);
});

test('publish-repro refuses an issue without a trusted bug verdict', () => {
  const s = sandbox({ issues: { 12: openIssue(12) }, comments: { 12: [comment('mallory', 'x\n[issue-loop:bug]', 5)] } });
  reproOut(s, { patch: null, status: 'reproduced' });
  const r = s.run('publish-repro.sh', [s.out, '12']);
  assert.equal(r.status, 2);
  assert.equal(posts(s.calls()).length, 0);
});

test('publish-repro refuses marker text in the reply and an unknown status', () => {
  const s = sandbox(trusted(12));
  writeFileSync(join(s.out, 'status.txt'), 'reproduced\n');
  writeFileSync(join(s.out, 'reply.md'), 'Done.\n[issue-loop:other]\n');
  assert.equal(s.run('publish-repro.sh', [s.out, '12']).status, 2);
  writeFileSync(join(s.out, 'status.txt'), 'merged\n');
  writeFileSync(join(s.out, 'reply.md'), 'Done.\n');
  assert.equal(s.run('publish-repro.sh', [s.out, '12']).status, 2);
});

test('publish-repro without a patch only updates status and replaces stale status labels', () => {
  const s = sandbox({ ...trusted(12), issues: { 12: openIssue(12, ['issue-loop:seen', 'issue-loop:reproducing']) } });
  reproOut(s, { patch: null, status: 'not_reproduced', proof: false });
  const r = s.run('publish-repro.sh', [s.out, '12']);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(s.state().issues[12].labels.sort(), ['issue-loop:not-reproduced', 'issue-loop:seen']);
  assert.equal(s.state().prs.length, 0);
});
