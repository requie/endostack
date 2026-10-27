// Shared helpers for the issue-loop publish scripts. Plain Node, no
// dependencies, so the publish job needs nothing beyond `node` and `gh`.
import { spawnSync } from 'node:child_process';
import { readFileSync, lstatSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export class Refusal extends Error {}

// ---------------------------------------------------------------------------
// Config: a small YAML reader for the subset config.example.yaml uses
// (nested maps by indentation, scalars, quoted strings, inline [a, b] lists,
// block "- item" lists, # comments). Anything else is refused, because a
// config the reader misunderstands must stop the run.

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(raw) {
  const v = raw.trim();
  if (v === '') return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => scalar(s)) : [];
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

export function parseConfigYaml(text) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  let pendingKey = null; // key whose value is a nested block not yet opened
  text.split('\n').forEach((rawLine, i) => {
    const line = stripComment(rawLine).replace(/\s+$/, '');
    if (!line.trim()) return;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    let parent = stack[stack.length - 1];
    if (pendingKey) {
      const container = body.startsWith('- ') || body === '-' ? [] : {};
      parent.node[pendingKey.key] = container;
      stack.push({ indent: pendingKey.indent, node: container });
      parent = stack[stack.length - 1];
      pendingKey = null;
    }
    if (body.startsWith('- ') || body === '-') {
      if (!Array.isArray(parent.node)) throw new Refusal(`config line ${i + 1}: list item outside a list`);
      parent.node.push(scalar(body.slice(1)));
      return;
    }
    const m = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(body);
    if (!m) throw new Refusal(`config line ${i + 1}: cannot parse "${body}"`);
    if (Array.isArray(parent.node)) throw new Refusal(`config line ${i + 1}: key inside a list`);
    const [, key, rest] = m;
    if (rest === undefined || rest === '') {
      parent.node[key] = null;
      pendingKey = { key, indent };
    } else parent.node[key] = scalar(rest);
  });
  return root;
}

export function loadConfig(path) {
  const p = path || process.env.ISSUE_LOOP_CONFIG || '.issue-loop/config.yaml';
  if (!existsSync(p)) throw new Refusal(`config not found at ${p}`);
  const cfg = parseConfigYaml(readFileSync(p, 'utf8'));
  for (const k of ['intake', 'markers', 'repository', 'status']) {
    if (!cfg[k] || typeof cfg[k] !== 'object') throw new Refusal(`config is missing the "${k}" section`);
  }
  if (!cfg.intake.triage_identity) throw new Refusal('config is missing intake.triage_identity');
  for (const k of ['bug', 'performance', 'other']) {
    if (typeof cfg.markers[k] !== 'string' || !/^\[[^\]\s]+\]$/.test(cfg.markers[k])) {
      throw new Refusal(`config markers.${k} must look like [prefix:${k}]`);
    }
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// Markers

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The text every marker shares, for example "[issue-loop:".
export function markerPrefix(cfg) {
  const m = cfg.markers.other;
  return m.slice(0, m.indexOf(':') + 1) || m.slice(0, -1);
}

// Returns { kind, tracker } when `line` is exactly one configured marker,
// otherwise null. Only bug and performance may carry a tracker URL.
export function parseMarker(cfg, line) {
  const attr = cfg.markers.tracker_attribute || 'tracker';
  for (const kind of ['bug', 'performance', 'other']) {
    const m = cfg.markers[kind];
    if (line === m) return { kind, tracker: null };
    if (kind === 'other') continue;
    const re = new RegExp(`^${esc(m.slice(0, -1))} ${esc(attr)}=(https://[^\\s\\]]+)\\]$`);
    const hit = re.exec(line);
    if (hit) return { kind, tracker: hit[1] };
  }
  return null;
}

export function lastNonEmptyLine(text) {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i] !== '') return lines[i];
  return '';
}

export function countMarkerMentions(cfg, text) {
  return text.split(markerPrefix(cfg)).length - 1;
}

// ---------------------------------------------------------------------------
// Secrets. Shapes of common credentials; a hit refuses the whole publish.

export const SECRET_PATTERNS = [
  { name: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { name: 'OpenAI or Anthropic key', re: /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'credential assignment', re: /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^\s"']{12,}["']/i },
];

// Long runs that look like base64 or random keys. Lowercase hex (commit SHAs,
// hashes) is allowed; a run needs upper, lower, and a digit to count.
function longOpaqueRun(text) {
  for (const m of text.matchAll(/[A-Za-z0-9+/_=-]{40,}/g)) {
    const s = m[0];
    if (/[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)) return s;
  }
  return null;
}

export function findSecret(text) {
  for (const p of SECRET_PATTERNS) if (p.re.test(text)) return p.name;
  if (longOpaqueRun(text)) return 'long opaque token-like string';
  return null;
}

// ---------------------------------------------------------------------------
// Files from the agent's out/ directory. Symlinks are refused so the agent
// cannot point the publisher at a file outside out/.

export function readAgentFile(path, { maxBytes, required = true } = {}) {
  if (!existsSync(path)) {
    if (required) throw new Refusal(`missing ${path}`);
    return null;
  }
  const st = lstatSync(path);
  if (st.isSymbolicLink()) throw new Refusal(`${path} is a symlink`);
  if (!st.isFile()) throw new Refusal(`${path} is not a regular file`);
  if (maxBytes && st.size > maxBytes) throw new Refusal(`${path} is ${st.size} bytes (limit ${maxBytes})`);
  const buf = readFileSync(path);
  const text = buf.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buf)) throw new Refusal(`${path} is not valid UTF-8`);
  if (text.includes('\u0000')) throw new Refusal(`${path} contains a NUL byte`);
  return text;
}

export function readLines(text) {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Processes. Arguments go as an array, never through a shell.

export function run(cmd, args, { input, cwd, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { input, cwd, encoding: 'utf8', env: process.env });
  if (r.error) throw new Error(`${cmd} failed to start: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args[0] ?? ''} exited ${r.status}: ${(r.stderr || '').trim()}`);
  }
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

export const gh = (args, opts) => run('gh', args, opts);

export function requireIssueNumber(value) {
  if (!/^[1-9][0-9]{0,9}$/.test(String(value ?? ''))) throw new Refusal(`issue number "${value}" is not a positive integer`);
  return String(value);
}

export function resolveRepo(cfg, flag) {
  const repo = flag || process.env.REPO || process.env.GITHUB_REPOSITORY || cfg.intake?.github?.repository;
  if (!repo || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Refusal(`repository "${repo ?? ''}" is not owner/name`);
  return repo;
}

// The issue as GitHub returns it, parsed in Node (no --jq, so the fake gh in
// the tests and the real one take the same arguments).
export function getIssue(repo, number) {
  return JSON.parse(gh(['api', `repos/${repo}/issues/${number}`]).stdout);
}

// Every comment on an issue as { login, id, body }, across all pages.
export function listComments(repo, number) {
  const pages = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/issues/${number}/comments`]).stdout || '[]');
  return pages.flat().map((c) => ({ login: c.user?.login ?? '', id: String(c.user?.id ?? ''), body: c.body ?? '' }));
}

// Preflight: the issue exists, is open, and is an issue rather than a pull
// request. Returns the issue so callers can read its labels.
export function preflightIssue(repo, number) {
  const issue = getIssue(repo, number);
  if (issue.pull_request) throw new Refusal(`#${number} is a pull request, not an issue`);
  if (issue.state !== 'open') throw new Refusal(`#${number} is ${issue.state}, not open`);
  return issue;
}

// Trust comes from the account, never from the text: the login must equal
// intake.triage_identity, and when intake.triage_identity_id is set the
// numeric account ID must match as well.
export function isTrustedAuthor(cfg, comment) {
  if (comment.login !== cfg.intake.triage_identity) return false;
  const id = cfg.intake.triage_identity_id;
  if (id !== undefined && id !== null && id !== '' && String(id) !== String(comment.id)) return false;
  return true;
}

// Verdicts on an issue: trusted comments whose last line is one marker.
export function trustedVerdicts(cfg, comments) {
  const out = [];
  for (const c of comments) {
    if (!isTrustedAuthor(cfg, c)) continue;
    const marker = parseMarker(cfg, lastNonEmptyLine(c.body));
    if (marker) out.push(marker);
  }
  return out;
}

export function statusLabels(cfg) {
  return Object.values(cfg.status || {}).filter((v) => typeof v === 'string' && v);
}

export function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--config' || a === '--repo') flags[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return { pos, flags };
}

// Runs main(), printing a refusal as one line and exiting 2 so a workflow can
// tell "validator said no" (2) from a crash (1).
export async function cli(main) {
  try {
    await main();
  } catch (e) {
    if (e instanceof Refusal) {
      console.error(`issue-loop: refused: ${e.message}`);
      process.exit(2);
    }
    console.error(`issue-loop: error: ${e.message}`);
    process.exit(1);
  }
}

// True when the module at `metaUrl` is the script node was started with,
// including through a relative path or a symlink.
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}
