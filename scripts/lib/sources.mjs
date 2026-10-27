import { join } from 'node:path';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { splitFrontmatter } from './frontmatter.mjs';

// Canonical skills: skills/<name>/SKILL.md
export function loadSkills(root) {
  const dir = join(root, 'skills');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name, 'SKILL.md');
    if (!statSync(join(dir, name)).isDirectory() || !existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    const { data, body, error } = splitFrontmatter(text);
    out.push({ folder: name, file, text, fm: data ?? {}, body, error });
  }
  return out;
}

// Canonical subagents: agents/<name>.md
export function loadAgents(root) {
  const dir = join(root, 'agents');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.md')) continue;
    const file = join(dir, f);
    const text = readFileSync(file, 'utf8');
    const { data, body, error } = splitFrontmatter(text);
    const fm = data ?? {};
    out.push({ stem: f.slice(0, -3), name: fm.name ?? f.slice(0, -3), file, text, fm, body, error, readonly: isReadonly(fm) });
  }
  return out;
}

// An agent is read-only when it says so with `readonly: true`, or when its
// `tools` value is prose that starts with "read-only".
export function isReadonly(fm) {
  if (fm.readonly === true) return true;
  return typeof fm.tools === 'string' && /^read-only\b/i.test(fm.tools.trim());
}

export const isCommandSkill = (s) => s.fm['disable-model-invocation'] === true;
