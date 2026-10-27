#!/usr/bin/env node
// Pick one issue whose trusted triage verdict asks for reproduction.
//
//   node find-trusted-verdict.mjs [--config <path>] [--repo <owner/name>]
//
// Prints `issue=<n>` and `kind=<bug|performance>` lines for $GITHUB_OUTPUT,
// or `issue=` when nothing qualifies. With MANUAL=<n> in the environment
// (workflow_dispatch input) only that issue is checked.
//
// Trust comes from the comment author's login (and numeric ID when
// intake.triage_identity_id is set), never from the comment text. An issue
// qualifies when it is open, is not a pull request, has at least one trusted
// verdict, every trusted verdict has the same kind, that kind is bug or
// performance, and it carries no status label past "seen".
import {
  cli, parseArgs, loadConfig, resolveRepo, requireIssueNumber, gh, getIssue,
  listComments, trustedVerdicts, statusLabels, isMain,
} from './lib/common.mjs';

export const LOOKBACK_HOURS = 24;

export function qualifies(cfg, issue, comments) {
  if (issue.pull_request || issue.state !== 'open') return null;
  const busy = new Set(statusLabels(cfg).filter((l) => l !== cfg.status.seen));
  if ((issue.labels || []).some((l) => busy.has(typeof l === 'string' ? l : l.name))) return null;
  const verdicts = trustedVerdicts(cfg, comments);
  if (!verdicts.length) return null;
  const kinds = new Set(verdicts.map((v) => v.kind));
  if (kinds.size !== 1) return null; // conflicting markers: stop
  const [kind] = kinds;
  if (kind !== 'bug' && kind !== 'performance') return null;
  return { number: issue.number, kind };
}

export async function main(argv = process.argv.slice(2)) {
  const { flags } = parseArgs(argv);
  const cfg = loadConfig(flags.config);
  const repo = resolveRepo(cfg, flags.repo);
  let candidates;
  if (process.env.MANUAL) {
    candidates = [getIssue(repo, requireIssueNumber(process.env.MANUAL))];
  } else {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
    const pages = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/issues?state=open&since=${since}&per_page=100`]).stdout || '[]');
    candidates = pages.flat().sort((a, b) => a.number - b.number); // oldest first
  }
  for (const issue of candidates) {
    if (issue.pull_request) continue;
    const pick = qualifies(cfg, issue, listComments(repo, String(issue.number)));
    if (pick) {
      console.log(`issue=${pick.number}`);
      console.log(`kind=${pick.kind}`);
      return;
    }
  }
  console.log('issue=');
}

if (isMain(import.meta.url)) cli(() => main());
