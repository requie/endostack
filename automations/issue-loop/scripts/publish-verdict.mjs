#!/usr/bin/env node
// Validate a triage run's out/ files and post them as one reply on the issue.
//
//   node publish-verdict.mjs <out-dir> <issue-number> [--config <path>] [--repo <owner/name>] [--dry-run]
//
// The issue number comes from the workflow (the event payload), never from a
// file the agent wrote. Expected files in <out-dir>:
//
//   verdict.md    required. Reply body. Its last non-empty line is exactly one
//                 configured marker, and no other marker text appears in it.
//   labels.txt    optional. One label per line, each one of the configured
//                 tracker labels or the "seen" status label.
//   tracker.json  optional. A tracker request for a tracker other than GitHub
//                 Issues. Validated here and left for that tracker's own step.
//
// Exit codes: 0 posted (or nothing to do), 2 refused by validation, 1 error.
import { join } from 'node:path';
import {
  Refusal, cli, parseArgs, loadConfig, resolveRepo, requireIssueNumber, readAgentFile, readLines,
  lastNonEmptyLine, parseMarker, countMarkerMentions, findSecret, preflightIssue, listComments,
  trustedVerdicts, gh, isMain,
} from './lib/common.mjs';

export const VERDICT_MAX_BYTES = 16 * 1024;
const TRACKER_JSON_MAX_BYTES = 32 * 1024;
const TRACKER_KEYS = new Set(['action', 'title', 'body', 'status', 'labels', 'source_url', 'existing_id', 'note']);

// Pure validation: returns what would be posted, or throws Refusal.
export function validateVerdictDir(cfg, outDir) {
  const verdict = readAgentFile(join(outDir, 'verdict.md'), { maxBytes: VERDICT_MAX_BYTES });
  if (!verdict.trim()) throw new Refusal('verdict.md is empty');
  const marker = parseMarker(cfg, lastNonEmptyLine(verdict));
  if (!marker) throw new Refusal('last line of verdict.md is not exactly one configured marker');
  if (countMarkerMentions(cfg, verdict) !== 1) throw new Refusal('verdict.md mentions the marker prefix more than once');
  const secret = findSecret(verdict);
  if (secret) throw new Refusal(`verdict.md contains something shaped like a ${secret}`);

  const labelText = readAgentFile(join(outDir, 'labels.txt'), { maxBytes: 4096, required: false });
  const labels = readLines(labelText);
  const tl = cfg.tracker?.labels || {};
  const allowed = new Map(Object.entries(tl).map(([k, v]) => [v, k]));
  if (cfg.status?.seen) allowed.set(cfg.status.seen, 'seen');
  for (const l of labels) {
    if (!allowed.has(l)) throw new Refusal(`label "${l}" is not in the config`);
    const role = allowed.get(l);
    if ((role === 'bug' || role === 'performance') && role !== marker.kind) {
      throw new Refusal(`label "${l}" contradicts the ${marker.kind} marker`);
    }
  }
  if (new Set(labels).size !== labels.length) throw new Refusal('labels.txt repeats a label');

  const trackerText = readAgentFile(join(outDir, 'tracker.json'), { maxBytes: TRACKER_JSON_MAX_BYTES, required: false });
  let tracker = null;
  if (trackerText !== null) {
    if ((cfg.tracker?.type ?? 'github-issues') === 'github-issues') {
      throw new Refusal('tracker.json given, but the tracker is GitHub Issues: triage labels the report instead of filing a second item');
    }
    try {
      tracker = JSON.parse(trackerText);
    } catch {
      throw new Refusal('tracker.json is not valid JSON');
    }
    if (!tracker || typeof tracker !== 'object' || Array.isArray(tracker)) throw new Refusal('tracker.json must be an object');
    for (const k of Object.keys(tracker)) if (!TRACKER_KEYS.has(k)) throw new Refusal(`tracker.json has unknown key "${k}"`);
    const s = findSecret(trackerText);
    if (s) throw new Refusal(`tracker.json contains something shaped like a ${s}`);
  }
  return { verdict, marker, labels, tracker };
}

export async function main(argv = process.argv.slice(2)) {
  const { pos, flags } = parseArgs(argv);
  if (pos.length !== 2) throw new Refusal('usage: publish-verdict <out-dir> <issue-number>');
  const [outDir, rawNumber] = pos;
  const number = requireIssueNumber(rawNumber);
  const cfg = loadConfig(flags.config);
  const repo = resolveRepo(cfg, flags.repo);
  const plan = validateVerdictDir(cfg, outDir);

  // Preflight right before posting: the issue is still there and open.
  preflightIssue(repo, number);
  // Idempotent: a trusted verdict already on the issue means an earlier run
  // finished, so post nothing.
  if (trustedVerdicts(cfg, listComments(repo, number)).length > 0) {
    console.log(`issue-loop: #${number} already has a trusted verdict; nothing posted`);
    return;
  }
  if (flags.dryRun) {
    console.log(`issue-loop: dry run: would post a ${plan.marker.kind} verdict on ${repo}#${number}` +
      (plan.labels.length ? ` and add labels ${plan.labels.join(', ')}` : ''));
    return;
  }
  gh(['issue', 'comment', number, '--repo', repo, '--body-file', join(outDir, 'verdict.md')]);
  // Confirm the reply landed on this issue before labeling it.
  if (trustedVerdicts(cfg, listComments(repo, number)).length !== 1) {
    throw new Error(`could not confirm the verdict on ${repo}#${number}; check the token identity matches intake.triage_identity`);
  }
  if (plan.labels.length) gh(['issue', 'edit', number, '--repo', repo, '--add-label', plan.labels.join(',')]);
  if (plan.tracker) console.log('issue-loop: tracker.json validated; hand it to the tracker adapter step');
  console.log(`issue-loop: posted ${plan.marker.kind} verdict on ${repo}#${number}`);
}

if (isMain(import.meta.url)) cli(() => main());
