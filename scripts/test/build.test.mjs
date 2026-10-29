import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generate } from '../lib/generate.mjs';
import { build } from '../build.mjs';
import { splitFrontmatter } from '../lib/frontmatter.mjs';
import { checkManifests } from '../check-manifests.mjs';
import { tempDir, fixtureSource, cleanup, writeTree } from './helpers.mjs';

const quiet = { log: () => {} };

function fixture() {
  const root = fixtureSource(tempDir());
  writeTree(root, { 'assets/logo.png': 'png', 'GEMINI.md': '# g\n', 'skills/setup-endostack/SKILL.md': '---\nname: setup-endostack\ndescription: Setup.\n---\nx\n' });
  return root;
}

test('native command files are generated only for command-style skills', () => {
  const root = fixture();
  try {
    const { dist } = generate(root);
    for (const p of ['gemini-cli/commands/beta.toml', 'opencode/commands/beta.md', 'junie/commands/beta.md', 'devin-desktop/workflows/beta.md', 'roo-code/commands/beta.md']) {
      assert.ok(dist[p], `missing ${p}`);
    }
    assert.equal(dist['gemini-cli/commands/alpha.toml'], undefined);
    assert.equal(dist['opencode/commands/alpha.md'], undefined);
  } finally {
    cleanup(root);
  }
});

test('command bodies reference the skill by path and forward arguments in each agent\'s syntax', () => {
  const root = fixture();
  try {
    const { dist } = generate(root);
    const gem = dist['gemini-cli/commands/beta.toml'];
    assert.match(gem, /Read `beta\/SKILL\.md`/);
    assert.match(gem, /\{\{args\}\}/);
    assert.doesNotMatch(gem, /Read \[the notes\]/, 'skill body must not be duplicated');
    assert.match(dist['opencode/commands/beta.md'], /\$ARGUMENTS/);
    const junie = dist['junie/commands/beta.md'];
    assert.match(junie, /\$prompt/);
    assert.equal(splitFrontmatter(junie).data.allowPromptArgument, true);
  } finally {
    cleanup(root);
  }
});

test('the codex agent TOML has its required fields and an escaped body', () => {
  const root = fixture();
  try {
    const toml = generate(root).dist['codex/agents/reviewer.toml'];
    assert.match(toml, /^name = "reviewer"$/m);
    assert.match(toml, /^description = "Read-only reviewer for \\"quoted\\" diffs\."$/m);
    assert.match(toml, /^developer_instructions = """\n/m);
    assert.match(toml, /""\\" triple quotes/);
    assert.match(toml, /a \\\\ backslash/);
    assert.match(toml, /You are read-only/);
  } finally {
    cleanup(root);
  }
});

test('command-style skills get an explicit-only policy for codex', () => {
  const root = fixture();
  try {
    const { dist } = generate(root);
    assert.match(dist['codex/skills/beta/agents/openai.yaml'], /allow_implicit_invocation: false/);
    assert.equal(dist['codex/skills/alpha/agents/openai.yaml'], undefined);
  } finally {
    cleanup(root);
  }
});

test('generated agent frontmatter parses and includes per-agent fields', () => {
  const root = fixture();
  try {
    const { dist } = generate(root);
    const oc = splitFrontmatter(dist['opencode/agents/reviewer.md']);
    assert.equal(oc.error, null);
    assert.equal(oc.data.mode, 'subagent');
    assert.equal(oc.data.name, undefined, 'OpenCode names agents by file name');
    const cp = splitFrontmatter(dist['copilot/agents/reviewer.agent.md']).data;
    assert.deepEqual(cp.tools, ['read', 'search', 'execute']);
    assert.equal(splitFrontmatter(dist['copilot/agents/helper.agent.md']).data.tools, undefined, 'writing agents inherit every tool');
    assert.equal(splitFrontmatter(dist['claude-code/agents/helper.md']).data.model, 'inherit');
    assert.equal(splitFrontmatter(dist['cursor/agents/reviewer.md']).data.readonly, true);
    for (const id of ['gemini-cli', 'kiro', 'junie', 'goose']) {
      const fm = splitFrontmatter(dist[`${id}/agents/helper.md`]);
      assert.equal(fm.error, null, id);
      assert.equal(fm.data.name, 'helper', id);
    }
  } finally {
    cleanup(root);
  }
});

test('build writes dist, --check passes, and then edits and stale files are detected', () => {
  const root = fixture();
  try {
    build(root, quiet);
    assert.ok(existsSync(join(root, 'dist/index.json')));
    assert.ok(existsSync(join(root, '.claude-plugin/plugin.json')));
    assert.deepEqual(build(root, { check: true, ...quiet }).problems, []);

    writeFileSync(join(root, 'dist/goose/agents/helper.md'), 'tampered');
    writeFileSync(join(root, 'dist/goose/agents/orphan.md'), 'old');
    const { problems } = build(root, { check: true, ...quiet });
    assert.ok(problems.some((p) => p.startsWith('dist/goose/agents/helper.md: out of date')));
    assert.ok(problems.some((p) => p.startsWith('dist/goose/agents/orphan.md: stale')));

    build(root, quiet);
    assert.ok(!existsSync(join(root, 'dist/goose/agents/orphan.md')));
    assert.deepEqual(build(root, { check: true, ...quiet }).problems, []);

    writeTree(root, { 'skills/gamma/SKILL.md': '---\nname: gamma\ndescription: g\ndisable-model-invocation: true\n---\n' });
    assert.ok(build(root, { check: true, ...quiet }).problems.some((p) => p.includes('gamma')));
  } finally {
    cleanup(root);
  }
});

test('two builds produce identical output', () => {
  const root = fixture();
  try {
    const a = generate(root);
    const b = generate(root);
    assert.deepEqual(a, b);
  } finally {
    cleanup(root);
  }
});

test('generated manifests satisfy the manifest schema check', () => {
  const root = fixture();
  try {
    build(root, quiet);
    assert.deepEqual(checkManifests(root), []);
    const claude = JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'));
    assert.deepEqual(claude.agents, ['./dist/claude-code/agents/helper.md', './dist/claude-code/agents/reviewer.md']);
    const mk = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
    assert.equal(mk.name, 'endostack');
    assert.equal(mk.plugins[0].source, './dist/claude-code/plugin');
  } finally {
    cleanup(root);
  }
});

test('the Claude directory plugin stays inside the directory limits', () => {
  const root = fixture();
  try {
    const { dist } = generate(root);
    const files = Object.keys(dist).filter((p) => p.startsWith('claude-code/plugin/'));
    assert.ok(files.length > 0 && files.length <= 512, `${files.length} files; the directory holds plugins over 512 for review`);
    for (const p of files) {
      assert.ok(Buffer.byteLength(dist[p]) < 256 * 1024, `${p} is 256 KiB or larger`);
      assert.doesNotMatch(p, /\/test\//, `${p}: test fixtures stay out of the plugin`);
    }
    const manifest = JSON.parse(dist['claude-code/plugin/.claude-plugin/plugin.json']);
    assert.equal(manifest.name, 'endostack');
    assert.equal(manifest.agents, undefined, 'agents load from the default agents/ folder');
    assert.ok(files.includes('claude-code/plugin/agents/helper.md'));
    assert.ok(files.includes('claude-code/plugin/LICENSE'));
  } finally {
    cleanup(root);
  }
});

test('the manifest check refuses unknown Agent Plugins fields and missing paths', () => {
  const root = fixture();
  try {
    build(root, quiet);
    const p = join(root, 'plugin.json');
    const m = JSON.parse(readFileSync(p, 'utf8'));
    m.skills = './skills/';
    writeFileSync(p, JSON.stringify(m));
    writeFileSync(join(root, 'GEMINI.md'), '');
    cleanup(join(root, 'assets'));
    const errs = checkManifests(root);
    assert.ok(errs.some((e) => e.includes('unknown field "skills"')), errs.join('\n'));
    assert.ok(errs.some((e) => e.includes('logo')), errs.join('\n'));
  } finally {
    cleanup(root);
  }
});

test('dist/ in the real repository is current', () => {
  const repo = join(import.meta.dirname, '..', '..');
  const { problems } = build(repo, { check: true, ...quiet });
  assert.deepEqual(problems, [], 'run: node scripts/build.mjs');
});
