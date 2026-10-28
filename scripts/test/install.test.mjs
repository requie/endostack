import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, lstatSync, mkdirSync, readdirSync, chmodSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../build.mjs';
import { main, parseArgs, detectAgents, planInstall, BLOCK_BEGIN, BLOCK_END } from '../install.mjs';
import { tempDir, fixtureSource, cleanup, writeTree } from './helpers.mjs';

function setup() {
  const source = fixtureSource(tempDir('ttstack-src-'));
  build(source, { log: () => {} });
  const home = tempDir('ttstack-home-');
  const project = tempDir('ttstack-proj-');
  const bin = tempDir('ttstack-bin-');
  const lines = [];
  const run = (...args) => {
    lines.length = 0;
    const code = main(['--project', project, ...args], { HOME: home, PATH: bin, TTSTACK_SOURCE: source }, (l) => lines.push(l));
    return { code, out: lines.join('\n') };
  };
  const done = () => cleanup(source, home, project, bin);
  return { source, home, project, bin, run, done };
}

const manifestOf = (dir) => JSON.parse(readFileSync(join(dir, '.ttstack', 'install-manifest.json'), 'utf8'));

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const st = lstatSync(p);
      if (st.isDirectory()) walk(p);
      else out[p] = st.isSymbolicLink() ? 'link' : readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return out;
}

test('parseArgs checks the scope and refuses unknown flags', () => {
  assert.equal(parseArgs(['--scope', 'user']).scope, 'user');
  assert.equal(parseArgs(['--agents=codex,kiro']).agents, 'codex,kiro');
  assert.throws(() => parseArgs(['--scope', 'global']), /project or user/);
  assert.throws(() => parseArgs(['--force']), /unknown option/);
});

test('agents are detected by home directory, PATH binary, and project marker', () => {
  const t = setup();
  try {
    mkdirSync(join(t.home, '.kiro'));
    writeFileSync(join(t.bin, 'opencode'), '#!/bin/sh\n');
    chmodSync(join(t.bin, 'opencode'), 0o755);
    mkdirSync(join(t.project, '.junie'));
    const found = detectAgents({ home: t.home, envPath: t.bin, project: t.project, scope: 'project' });
    assert.deepEqual(found.map((f) => f.id).sort(), ['junie', 'kiro', 'opencode']);
    const userScope = detectAgents({ home: t.home, envPath: t.bin, project: t.project, scope: 'user' });
    assert.deepEqual(userScope.map((f) => f.id).sort(), ['kiro', 'opencode'], 'project markers do not count for user scope');
  } finally {
    t.done();
  }
});

test('auto mode with no agent detected exits 1 and writes nothing', () => {
  const t = setup();
  try {
    const { code, out } = t.run();
    assert.equal(code, 1);
    assert.match(out, /No coding agents detected/);
    assert.deepEqual(readdirSync(t.project), []);
  } finally {
    t.done();
  }
});

test('a project install writes shared skills once, per-agent files, and a manifest', () => {
  const t = setup();
  try {
    const { code, out } = t.run('--agents', 'codex,gemini,opencode,kiro');
    assert.equal(code, 0);
    const p = t.project;
    assert.ok(existsSync(join(p, '.agents/skills/alpha/SKILL.md')));
    assert.ok(existsSync(join(p, '.agents/skills/beta/references/notes.md')));
    assert.ok(existsSync(join(p, '.agents/skills/beta/agents/openai.yaml')), 'codex policy for command skill');
    assert.ok(existsSync(join(p, '.kiro/skills/alpha/SKILL.md')));
    assert.ok(existsSync(join(p, '.codex/agents/reviewer.toml')));
    assert.ok(existsSync(join(p, '.gemini/agents/reviewer.md')));
    assert.ok(existsSync(join(p, '.gemini/commands/beta.toml')));
    assert.ok(existsSync(join(p, '.opencode/agents/helper.md')));
    assert.ok(existsSync(join(p, '.opencode/commands/beta.md')));
    assert.ok(existsSync(join(p, '.kiro/agents/helper.md')));
    assert.ok(!existsSync(join(p, '.claude')), 'no .claude/skills unless Claude Code or Cline is a target');
    assert.match(out, /one copy serves codex, gemini-cli, opencode/);
    assert.doesNotMatch(out, /^write  /m, 'files are summarized per folder by default');
    assert.match(out, /^wrote\s+\d+ files? in \.\/\.agents\/skills$/m);
    assert.match(out, /^next   .*\/try-ttstack/m);
    const m = manifestOf(p);
    assert.equal(m.scope, 'project');
    const files = m.entries.filter((e) => e.kind === 'file');
    assert.ok(files.every((e) => /^[0-9a-f]{64}$/.test(e.sha256)));
    assert.ok(files.some((e) => e.path.endsWith('.codex/agents/reviewer.toml')));
    assert.ok(readFileSync(join(p, 'AGENTS.md'), 'utf8').includes(BLOCK_BEGIN));
  } finally {
    t.done();
  }
});

test('--verbose prints each file written', () => {
  const t = setup();
  try {
    const { code, out } = t.run('--agents', 'codex', '--verbose');
    assert.equal(code, 0);
    assert.match(out, /^write  .*alpha\/SKILL\.md$/m);
  } finally {
    t.done();
  }
});

test('a dry run lists the actions and touches nothing', () => {
  const t = setup();
  try {
    const { code, out } = t.run('--agents', 'cursor,claude-code', '--dry-run');
    assert.equal(code, 0);
    assert.match(out, /\[dry-run\] write  .*\.claude\/skills\/alpha\/SKILL\.md/);
    assert.match(out, /\[dry-run\] block  .*AGENTS\.md/);
    assert.deepEqual(readdirSync(t.project), []);
  } finally {
    t.done();
  }
});

test('a user file is never overwritten and a user skill folder is never mixed into', () => {
  const t = setup();
  try {
    writeTree(t.project, {
      '.agents/skills/alpha/SKILL.md': 'my own alpha\n',
      '.codex/agents/reviewer.toml': 'name = "mine"\n',
    });
    const { out } = t.run('--agents', 'codex');
    assert.match(out, /skip   .*\.agents\/skills\/alpha \(folder exists/);
    assert.match(out, /skip   .*reviewer\.toml \(exists and was not written by ttstack\)/);
    assert.equal(readFileSync(join(t.project, '.agents/skills/alpha/SKILL.md'), 'utf8'), 'my own alpha\n');
    assert.equal(readFileSync(join(t.project, '.codex/agents/reviewer.toml'), 'utf8'), 'name = "mine"\n');
    assert.ok(existsSync(join(t.project, '.agents/skills/beta/SKILL.md')));
    t.run('--uninstall');
    assert.equal(readFileSync(join(t.project, '.agents/skills/alpha/SKILL.md'), 'utf8'), 'my own alpha\n');
    assert.equal(readFileSync(join(t.project, '.codex/agents/reviewer.toml'), 'utf8'), 'name = "mine"\n');
  } finally {
    t.done();
  }
});

test('reinstalling changes nothing and uninstalling restores the project exactly', () => {
  const t = setup();
  try {
    writeTree(t.project, { 'CLAUDE.md': '# Team rules\n\nBe kind.\n', 'GEMINI.md': '@AGENTS.md\n', 'src/app.js': 'x\n' });
    const before = snapshot(t.project);
    t.run('--agents', 'claude-code,gemini-cli,junie,aider');
    const first = snapshot(t.project);
    const { out } = t.run('--agents', 'claude-code,gemini-cli,junie,aider');
    assert.match(out, /done: 0 written/);
    assert.deepEqual(snapshot(t.project), first);

    const claude = readFileSync(join(t.project, 'CLAUDE.md'), 'utf8');
    assert.ok(claude.startsWith('# Team rules\n\nBe kind.\n'));
    assert.ok(claude.includes(`${BLOCK_BEGIN}\n@AGENTS.md\n${BLOCK_END}`));
    assert.equal(readFileSync(join(t.project, 'GEMINI.md'), 'utf8'), '@AGENTS.md\n', 'already imports AGENTS.md');
    assert.match(readFileSync(join(t.project, '.aider.conf.yml'), 'utf8'), /read:\n {2}- \.ttstack\/aider\.md/);

    t.run('--uninstall');
    assert.deepEqual(snapshot(t.project), before);
  } finally {
    t.done();
  }
});

test('uninstall preserves files the user changed after installing', () => {
  const t = setup();
  try {
    t.run('--agents', 'goose');
    const f = join(t.project, '.agents/skills/alpha/SKILL.md');
    writeFileSync(f, 'edited by user\n');
    const { out } = t.run('--uninstall');
    assert.match(out, /keep   .*alpha\/SKILL\.md \(changed since ttstack wrote it\)/);
    assert.equal(readFileSync(f, 'utf8'), 'edited by user\n');
    assert.ok(!existsSync(join(t.project, '.agents/agents/helper.md')));
    assert.ok(!existsSync(join(t.project, '.ttstack/install-manifest.json')));
  } finally {
    t.done();
  }
});

test('dropping agents from the list removes files written for them earlier', () => {
  const t = setup();
  try {
    t.run('--agents', 'opencode,junie');
    assert.ok(existsSync(join(t.project, '.junie/agents/helper.md')));
    const { out } = t.run('--agents', 'opencode');
    assert.match(out, /remove .*\.junie\/agents\/helper\.md/);
    assert.ok(!existsSync(join(t.project, '.junie')));
    assert.ok(existsSync(join(t.project, '.opencode/agents/helper.md')));
  } finally {
    t.done();
  }
});

test('user scope writes under HOME with a home manifest and leaves AGENTS.md alone', () => {
  const t = setup();
  try {
    mkdirSync(join(t.home, '.cline'));
    mkdirSync(join(t.home, '.copilot'));
    const { code } = t.run('--scope', 'user');
    assert.equal(code, 0);
    assert.ok(existsSync(join(t.home, '.cline/skills/alpha/SKILL.md')));
    assert.ok(existsSync(join(t.home, '.agents/skills/alpha/SKILL.md')));
    assert.ok(existsSync(join(t.home, '.copilot/agents/reviewer.agent.md')));
    assert.ok(existsSync(join(t.home, '.ttstack/install-manifest.json')));
    assert.deepEqual(readdirSync(t.project), []);
    t.run('--scope', 'user', '--uninstall');
    assert.ok(!existsSync(join(t.home, '.agents')));
    assert.ok(!existsSync(join(t.home, '.ttstack')));
    assert.deepEqual(readdirSync(join(t.home, '.cline')), []);
  } finally {
    t.done();
  }
});

test('--link symlinks skill folders and generated files to the source', () => {
  const t = setup();
  try {
    t.run('--agents', 'kiro', '--link');
    const skill = join(t.project, '.kiro/skills/alpha');
    assert.ok(lstatSync(skill).isSymbolicLink());
    assert.equal(readFileSync(join(skill, 'SKILL.md'), 'utf8'), readFileSync(join(t.source, 'skills/alpha/SKILL.md'), 'utf8'));
    assert.ok(lstatSync(join(t.project, '.kiro/agents/helper.md')).isSymbolicLink());
    assert.ok(manifestOf(t.project).entries.some((e) => e.kind === 'link' && e.path === skill));
    t.run('--uninstall');
    assert.ok(!existsSync(join(t.project, '.kiro')));
    assert.ok(existsSync(join(t.source, 'skills/alpha/SKILL.md')), 'source untouched');
  } finally {
    t.done();
  }
});

test('a Claude Code plugin install skips .claude/ copies so skills are not duplicated', () => {
  const t = setup();
  try {
    writeTree(t.home, { '.claude/plugins/installed_plugins.json': '{"plugins":{"ttstack@ttstack":[{}]}}' });
    const { actions, notes } = planInstall({
      source: t.source, scope: 'project', agents: [{ id: 'claude-code' }, { id: 'cursor' }], link: false, home: t.home, project: t.project, rules: true,
    });
    assert.ok(!actions.some((a) => a.to && a.to.includes('/.claude/')));
    assert.ok(actions.some((a) => a.to && a.to.includes('/.agents/skills/')));
    assert.ok(notes.some((n) => n.includes('plugin is installed')));
  } finally {
    t.done();
  }
});

test('unknown agent names are refused and aliases are resolved', () => {
  const t = setup();
  try {
    assert.throws(() => t.run('--agents', 'notepad'), /unknown agent "notepad"/);
    const { out } = t.run('--agents', 'windsurf,roo', '--dry-run');
    assert.match(out, /devin-desktop \(requested\), roo-code \(requested\)/);
    assert.match(out, /\.devin\/workflows\/beta\.md/);
    assert.match(out, /\.roo\/commands\/beta\.md/);
  } finally {
    t.done();
  }
});
