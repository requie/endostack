// Minimal YAML frontmatter reader for SKILL.md and agent files.
// Supports `key: value` scalars (plain, single- or double-quoted), `>`/`|` block
// scalars, and `- item` lists. That is the whole subset ttstack's sources use.

export function splitFrontmatter(text) {
  const src = text.replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) return { data: null, body: src, bodyStartLine: 1, error: 'missing frontmatter' };
  const end = src.indexOf('\n---', 4);
  if (end === -1) return { data: null, body: src, bodyStartLine: 1, error: 'unterminated frontmatter' };
  const raw = src.slice(4, end);
  let after = src.slice(end + 4);
  if (after.startsWith('\n')) after = after.slice(1);
  const bodyStartLine = raw.split('\n').length + 3;
  try {
    return { data: parseYamlSubset(raw), body: after, bodyStartLine, raw, error: null };
  } catch (e) {
    return { data: null, body: after, bodyStartLine, raw, error: e.message };
  }
}

function unquote(v) {
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) return JSON.parse(v);
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

function scalar(v) {
  const t = v.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === '' || t === '~' || t === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    return inner ? inner.split(',').map((s) => unquote(s.trim())) : [];
  }
  return unquote(t);
}

export function parseYamlSubset(raw) {
  const lines = raw.split('\n');
  const out = {};
  let i = -1;
  while (++i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(line);
    if (!m) throw new Error(`cannot parse frontmatter line ${i + 2}: ${line}`);
    const key = m[1];
    const rest = (m[2] ?? '').trim();
    if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
      const parts = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1] === '')) parts.push(lines[++i].trim());
      out[key] = rest.startsWith('>') ? parts.join(' ').replace(/\s+/g, ' ').trim() : parts.join('\n').trim();
    } else if (rest === '') {
      const items = [];
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) items.push(scalar(lines[++i].replace(/^\s*-\s+/, '')));
      if (items.length) {
        out[key] = items;
        continue;
      }
      // One level of nested `key: value` pairs.
      const map = {};
      while (i + 1 < lines.length && /^\s+[A-Za-z0-9_.-]+:\s/.test(lines[i + 1])) {
        const n = /^\s+([A-Za-z0-9_.-]+):\s+(.*)$/.exec(lines[++i]);
        map[n[1]] = scalar(n[2]);
      }
      out[key] = Object.keys(map).length ? map : null;
    } else {
      out[key] = scalar(rest);
    }
  }
  return out;
}

// Line number (1-based) of a frontmatter key, for lint messages.
export function keyLine(text, key) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  for (let n = 1; n < lines.length; n++) {
    if (lines[n] === '---') break;
    if (lines[n].startsWith(`${key}:`)) return n + 1;
  }
  return 1;
}
