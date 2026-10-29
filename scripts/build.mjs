#!/usr/bin/env node
// Generate per-agent files into dist/ and the plugin manifests at the repo root
// from skills/*/SKILL.md and agents/*.md.
//
//   node scripts/build.mjs            write dist/ and manifests
//   node scripts/build.mjs --check    exit 1 if anything on disk differs (CI)
//   node scripts/build.mjs --root <dir>
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync, chmodSync } from 'node:fs';
import { generate, CLAUDE_PLUGIN_DIR, OPENAI_PLUGIN_DIR } from './lib/generate.mjs';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, base, out);
    else out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

export function build(root, { check = false, log = console.log } = {}) {
  const { dist, rootFiles } = generate(root);
  const distDir = join(root, 'dist');
  const problems = [];
  const expected = new Map([
    ...Object.entries(dist).map(([p, c]) => [`dist/${p}`, c]),
    ...Object.entries(rootFiles),
  ]);
  for (const [rel, content] of expected) {
    const abs = join(root, rel);
    const binary = Buffer.isBuffer(content);
    const current = existsSync(abs) ? readFileSync(abs, binary ? undefined : 'utf8') : null;
    if (binary ? current?.equals(content) : current === content) continue;
    if (check) problems.push(`${rel}: ${current === null ? 'missing' : 'out of date'}`);
    else {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
      log(`write ${rel}`);
    }
  }
  // Copied skill files keep their source's executable bit (the sh launchers).
  const copiedPrefixes = [`dist/${CLAUDE_PLUGIN_DIR}/skills/`, `dist/${OPENAI_PLUGIN_DIR}/skills/`];
  for (const rel of expected.keys()) {
    const copiedPrefix = copiedPrefixes.find((p) => rel.startsWith(p));
    if (!copiedPrefix) continue;
    const src = join(root, 'skills', rel.slice(copiedPrefix.length));
    const abs = join(root, rel);
    if (!existsSync(src) || !existsSync(abs)) continue;
    const wantExec = (statSync(src).mode & 0o111) !== 0;
    const isExec = (statSync(abs).mode & 0o111) !== 0;
    if (wantExec === isExec) continue;
    if (check) problems.push(`${rel}: executable bit differs from its source`);
    else chmodSync(abs, wantExec ? 0o755 : 0o644);
  }
  // Files the build owns that it no longer generates.
  const owned = [...walk(distDir).map((p) => `dist/${p}`), ...walk(join(root, 'com.github.copilot')).map((p) => `com.github.copilot/${p}`)];
  for (const rel of owned) {
    if (expected.has(rel)) continue;
    if (check) problems.push(`${rel}: stale (no longer generated)`);
    else {
      rmSync(join(root, rel));
      log(`remove ${rel}`);
    }
  }
  return { problems, count: expected.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , ...args] = process.argv;
  const check = args.includes('--check');
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? resolve(args[ri + 1]) : DEFAULT_ROOT;
  const { problems, count } = build(root, { check });
  if (check) {
    if (problems.length) {
      problems.forEach((msg) => console.error(msg));
      console.error(`build --check: ${problems.length} file(s) differ. Run: node scripts/build.mjs`);
      process.exit(1);
    }
    console.log(`build --check: ${count} generated files up to date`);
  } else {
    console.log(`build: ${count} generated files`);
  }
}
