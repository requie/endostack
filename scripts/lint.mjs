#!/usr/bin/env node
// Repository lint. Prints `file:line: message` for each problem and exits 1
// if there is any.
//
//   node scripts/lint.mjs [--root <dir>] [--summary]
//
// Checks:
//   skills     frontmatter parses; name equals folder, lowercase-hyphen, <= 64
//              chars; description present and <= 1024 chars
//   agents     frontmatter parses; name and description present
//   links      every relative Markdown link resolves to a file or directory
//   style      no em dashes in .md files; no word from the house-style ban list
//   names      no retired catalog names (see the encoded list below)
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { splitFrontmatter, keyLine } from './lib/frontmatter.mjs';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'com.github.copilot', '.ttstack']);
const TEXT_EXT = /\.(md|mdc|mjs|js|cjs|ts|json|toml|ya?ml|sh|ps1|txt|tla|cfg)$/i;

export const BANNED_WORDS = [
  'quietly', 'delve', 'delves', 'delving', 'pivotal', 'robust', 'robustly', 'tapestry', 'underscore', 'underscores',
  'showcase', 'showcases', 'foster', 'fosters', 'intricate', 'landscape', 'testament', 'seamless', 'seamlessly',
  'leverage', 'leverages', 'leveraging', 'elevate', 'elevates', 'vibrant', 'rich', 'renowned', 'groundbreaking', 'nestled',
];

// Phrases from the house-style ban list that a regex can catch reliably.
export const BANNED_PATTERNS = [
  { re: /\b(?:it'?s|this is|that'?s) not (?:just )?(?:about )?[^.,;]{1,40}, (?:it'?s|but)\b/i, msg: 'negative-parallelism formula ("it\'s not X, it\'s Y")' },
  { re: /\bnot only\b[^.]{1,80}\bbut also\b/i, msg: 'negative-parallelism formula ("not only X but also Y")' },
  { re: /\bthat'?s the whole point\b/i, msg: 'sentence announces its own importance' },
  { re: /\b(?:experts (?:note|say|agree)|research shows|studies show)\b/i, msg: 'vague authority; name the source or drop it' },
];

// Files whose job is to define the ban list (they must name the words). The
// em dash rule and every other check still apply to them.
export const STYLE_LIST_FILES = [/^skills\/unslop\//, /^skills\/technical-writing\//];

// Retired names, stored reversed so this repository never contains them as
// plain text. Matched case-insensitively as whole words.
const rev = (s) => [...s].reverse().join('');
export const OLD_NAMES = ['okcis', 'puhctek', 'kcatsp', 'otetop', 'tnega etageled', 'tnegajecni'].map(rev);
const NAME_HINT = { [rev('okcis')]: 'comment-auditor', [rev('puhctek')]: 'catch-up', [rev('tnega etageled')]: 'tarique-agent' };

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Replace fenced code blocks and inline code with blanks of the same shape so
// line numbers survive and code samples are not linted as prose.
export function maskCode(text) {
  const lines = text.split('\n');
  let fence = null;
  return lines
    .map((line) => {
      const m = /^\s*(```+|~~~+)/.exec(line);
      if (fence) {
        if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
        return '';
      }
      if (m) {
        fence = m[1];
        return '';
      }
      return line.replace(/(`+)(.+?)\1/g, (s) => ' '.repeat(s.length));
    })
    .join('\n');
}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function lintSkill(root, folder, report) {
  const file = join(root, 'skills', folder, 'SKILL.md');
  const rel = relative(root, file).split(sep).join('/');
  if (!existsSync(file)) {
    report(`skills/${folder}`, 1, 'skill folder has no SKILL.md');
    return;
  }
  const text = readFileSync(file, 'utf8');
  const { data, error } = splitFrontmatter(text);
  if (error) {
    report(rel, 1, `frontmatter: ${error}`);
    return;
  }
  const name = data.name;
  if (typeof name !== 'string' || !name) report(rel, 1, 'frontmatter: name is missing');
  else {
    const ln = keyLine(text, 'name');
    if (name !== folder) report(rel, ln, `frontmatter: name "${name}" must equal folder name "${folder}"`);
    if (!NAME_RE.test(name)) report(rel, ln, `frontmatter: name "${name}" must be lowercase letters, digits and single hyphens`);
    if (name.length > 64) report(rel, ln, `frontmatter: name is ${name.length} chars (max 64)`);
  }
  if (!NAME_RE.test(folder) || folder.length > 64) report(rel, 1, `folder name "${folder}" must be lowercase-hyphen and at most 64 chars`);
  const desc = data.description;
  if (typeof desc !== 'string' || !desc.trim()) report(rel, 1, 'frontmatter: description is missing');
  else if (desc.length > 1024) report(rel, keyLine(text, 'description'), `frontmatter: description is ${desc.length} chars (max 1024)`);
  const dmi = data['disable-model-invocation'];
  if (dmi !== undefined && typeof dmi !== 'boolean') report(rel, keyLine(text, 'disable-model-invocation'), 'frontmatter: disable-model-invocation must be true or false');
}

export function lintAgent(root, file, report) {
  const rel = relative(root, file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const { data, error } = splitFrontmatter(text);
  if (error) return report(rel, 1, `frontmatter: ${error}`);
  const stem = file.split(sep).pop().replace(/\.md$/, '');
  if (typeof data.name !== 'string' || !data.name) report(rel, 1, 'frontmatter: name is missing');
  else if (data.name !== stem) report(rel, keyLine(text, 'name'), `frontmatter: name "${data.name}" must equal file name "${stem}"`);
  if (typeof data.description !== 'string' || !data.description.trim()) report(rel, 1, 'frontmatter: description is missing');
  else if (data.description.length > 1024) report(rel, keyLine(text, 'description'), 'frontmatter: description over 1024 chars');
}

const LINK_RE = /!?\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const REF_RE = /^\s{0,3}\[[^\]]+\]:\s+(\S+)/;

export function lintLinks(root, file, masked, report) {
  const rel = relative(root, file).split(sep).join('/');
  const lines = masked.split('\n');
  lines.forEach((line, i) => {
    const targets = [];
    for (const m of line.matchAll(LINK_RE)) targets.push(m[1]);
    const ref = REF_RE.exec(line);
    if (ref) targets.push(ref[1]);
    for (let t of targets) {
      if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1);
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(t)) continue; // URL, anchor, scheme
      if (/[<>{}$*]/.test(t)) continue; // placeholder such as ../<name>/SKILL.md
      const path = decodeURI(t.split('#')[0].split('?')[0]);
      if (!path) continue;
      const abs = path.startsWith('/') ? join(root, path) : resolve(dirname(file), path);
      if (!existsSync(abs)) report(rel, i + 1, `broken link: ${t}`);
    }
  });
}

// Quoted text ("...") is usually an example of what not to write.
const stripQuoted = (line) => line.replace(/"[^"]*"|\u201c[^\u201d]*\u201d/g, (q) => ' '.repeat(q.length));

export function lintProse(root, file, masked, report) {
  const rel = relative(root, file).split(sep).join('/');
  const wordRe = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'gi');
  const listFile = STYLE_LIST_FILES.some((re) => re.test(rel));
  masked.split('\n').forEach((line, i) => {
    if (line.includes('\u2014')) report(rel, i + 1, 'em dash; use a comma, period, parentheses, or a colon');
    if (listFile) return;
    const prose = stripQuoted(line);
    for (const m of prose.matchAll(wordRe)) report(rel, i + 1, `banned word "${m[1]}"`);
    for (const p of BANNED_PATTERNS) if (p.re.test(prose)) report(rel, i + 1, p.msg);
  });
}

export function lintNames(root, file, text, report) {
  const rel = relative(root, file).split(sep).join('/');
  const re = new RegExp(`\\b(${OLD_NAMES.map((n) => n.replace(/ /g, '\\s+')).join('|')})\\b`, 'gi');
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      const hit = m[1].toLowerCase().replace(/\s+/g, ' ');
      const hint = NAME_HINT[hit] ? ` (use ${NAME_HINT[hit]})` : '';
      report(rel, i + 1, `retired name "${m[1]}"${hint}`);
    }
  });
}

export function lint(root) {
  const problems = [];
  const report = (file, line, msg) => problems.push({ file, line, msg });
  const skillsDir = join(root, 'skills');
  if (existsSync(skillsDir)) {
    for (const folder of readdirSync(skillsDir).sort()) {
      if (statSync(join(skillsDir, folder)).isDirectory()) lintSkill(root, folder, report);
    }
  }
  const agentsDir = join(root, 'agents');
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir).sort()) if (f.endsWith('.md')) lintAgent(root, join(agentsDir, f), report);
  }
  for (const file of walk(root).sort()) {
    if (!TEXT_EXT.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    lintNames(root, file, text, report);
    if (/\.mdc?$/i.test(file)) {
      const masked = maskCode(text);
      lintLinks(root, file, masked, report);
      lintProse(root, file, masked, report);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , ...args] = process.argv;
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? resolve(args[ri + 1]) : DEFAULT_ROOT;
  const problems = lint(root);
  for (const p of problems) console.log(`${p.file}:${p.line}: ${p.msg}`);
  if (args.includes('--summary') && problems.length) {
    const byFile = new Map();
    for (const p of problems) byFile.set(p.file, (byFile.get(p.file) ?? 0) + 1);
    console.log('\nby file:');
    for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${f}`);
  }
  console.log(problems.length ? `lint: ${problems.length} problem(s)` : 'lint: clean');
  process.exit(problems.length ? 1 : 0);
}
