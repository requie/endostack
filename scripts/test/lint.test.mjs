import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lint, maskCode, OLD_NAMES } from '../lint.mjs';
import { tempDir, writeTree, cleanup } from './helpers.mjs';

const EM = '\u2014';
const rev = (s) => [...s].reverse().join('');

function lintTree(files) {
  const root = tempDir();
  writeTree(root, files);
  try {
    return lint(root).map((p) => `${p.file}:${p.line}: ${p.msg}`);
  } finally {
    cleanup(root);
  }
}

const skill = (name, extra = '') => `---\nname: ${name}\ndescription: Does ${name}.\n${extra}---\n\n# ${name}\n`;

test('a tree with no issues reports nothing', () => {
  assert.deepEqual(lintTree({ 'skills/good-one/SKILL.md': skill('good-one'), 'README.md': '[skill](skills/good-one/SKILL.md)\n' }), []);
});

test('skill name has to match its folder and be lowercase-hyphen', () => {
  const out = lintTree({
    'skills/alpha/SKILL.md': skill('beta'),
    'skills/Bad_Name/SKILL.md': skill('Bad_Name'),
  });
  assert.ok(out.includes('skills/alpha/SKILL.md:2: frontmatter: name "beta" must equal folder name "alpha"'), out.join('\n'));
  assert.ok(out.some((l) => l.startsWith('skills/Bad_Name/SKILL.md:2:') && l.includes('lowercase')), out.join('\n'));
});

test('limits on name length, description presence, and description length apply', () => {
  const long = 'a'.repeat(65);
  const out = lintTree({
    [`skills/${long}/SKILL.md`]: skill(long),
    'skills/nodesc/SKILL.md': '---\nname: nodesc\n---\n',
    'skills/wordy/SKILL.md': `---\nname: wordy\ndescription: ${'w'.repeat(1025)}\n---\n`,
    'skills/nofm/SKILL.md': '# no frontmatter\n',
    'skills/empty-folder/.keep': '',
  });
  assert.ok(out.some((l) => l.includes('name is 65 chars (max 64)')), out.join('\n'));
  assert.ok(out.includes('skills/nodesc/SKILL.md:1: frontmatter: description is missing'));
  assert.ok(out.includes('skills/wordy/SKILL.md:3: frontmatter: description is 1025 chars (max 1024)'));
  assert.ok(out.includes('skills/nofm/SKILL.md:1: frontmatter: missing frontmatter'));
  assert.ok(out.includes('skills/empty-folder:1: skill folder has no SKILL.md'));
});

test('relative links have to resolve, while URLs, anchors, placeholders, and code are skipped', () => {
  const out = lintTree({
    'skills/a/SKILL.md': skill('a'),
    'docs/page.md': [
      '[ok](../skills/a/SKILL.md)',
      '[missing](../skills/zzz/SKILL.md)',
      '[anchor](#top) [web](https://example.com/x.md) [mail](mailto:x@y.z)',
      '[placeholder](../skills/<name>/SKILL.md)',
      '`[in code](nowhere.md)`',
      '```',
      '[in fence](nowhere.md)',
      '```',
      '[dir](../skills/a/) [with anchor](../skills/a/SKILL.md#section)',
      '[ref]: ./gone.md',
    ].join('\n'),
  });
  assert.deepEqual(out, ['docs/page.md:2: broken link: ../skills/zzz/SKILL.md', 'docs/page.md:10: broken link: ./gone.md']);
});

test('em dashes and banned words are flagged with line numbers outside code and quotes', () => {
  const out = lintTree({
    'notes.md': [`first line ${EM} with a dash`, 'This is a robust plan.', 'Avoid the word "robust" in prose.', '`seamless` in code is fine.', 'We leverage caching.'].join('\n'),
  });
  assert.deepEqual(out, [
    'notes.md:1: em dash; use a comma, period, parentheses, or a colon',
    'notes.md:2: banned word "robust"',
    'notes.md:5: banned word "leverage"',
  ]);
});

test('banned sentence patterns are detected', () => {
  const out = lintTree({ 'n.md': "It's not a linter, it's a gate.\nThat's the whole point.\nResearch shows it helps.\n" });
  assert.equal(out.length, 3, out.join('\n'));
});

test('retired catalog names are detected in every text file', () => {
  assert.ok(OLD_NAMES.length >= 5);
  const n1 = rev('okcis');
  const n2 = rev('tnega etageled');
  const out = lintTree({ 'a.md': `Run the ${n1} reviewer.\n`, 'b.mjs': `// the ${n2}\n` });
  assert.ok(out.some((l) => l.startsWith('a.md:1: retired name') && l.includes('comment-auditor')), out.join('\n'));
  assert.ok(out.some((l) => l.startsWith('b.mjs:1: retired name') && l.includes('tarique-agent')), out.join('\n'));
});

test('maskCode preserves the line count', () => {
  const text = 'a\n```\nb\n```\nc `d` e';
  assert.equal(maskCode(text).split('\n').length, text.split('\n').length);
});

test('the packaging files owned by this repo lint clean', () => {
  const repo = join(import.meta.dirname, '..', '..');
  const mine = /^(?:scripts\/|docs\/agents\/|GEMINI\.md|install\.(?:sh|ps1)|\.github\/|plugin\.json|\.claude-plugin|\.cursor-plugin|\.agents\/|gemini-extension\.json)/;
  const problems = lint(repo).filter((p) => mine.test(p.file));
  assert.deepEqual(problems.map((p) => `${p.file}:${p.line}: ${p.msg}`), []);
});
