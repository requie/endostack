#!/usr/bin/env node
// Validate every plugin manifest against a small JSON-schema subset, with no
// npm dependencies. Also checks that each component path a manifest names
// exists inside the repository.
//
//   node scripts/check-manifests.mjs [--root <dir>]
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { AGENT_PLUGINS_SCHEMA } from './lib/meta.mjs';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- validator for the subset of JSON Schema the manifests need -------------
// Supported keywords: type, required, properties, additionalProperties (bool or
// schema), items, enum, const, pattern, minLength, maxLength, minItems, anyOf.
export function validate(schema, value, path = '$', errors = []) {
  if (schema.anyOf) {
    const ok = schema.anyOf.some((s) => validate(s, value, path, []).length === 0);
    if (!ok) errors.push(`${path}: does not match any allowed shape`);
    return errors;
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.join(', ')}`);
  if (schema.type) {
    const t = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    const types = [].concat(schema.type);
    if (!types.includes(t)) {
      errors.push(`${path}: expected ${types.join(' or ')}, got ${t}`);
      return errors;
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: does not match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} item(s)`);
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`, errors));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path}: missing required "${k}"`);
    const props = schema.properties ?? {};
    for (const k of Object.keys(value)) {
      const v = value[k];
      if (props[k]) validate(props[k], v, `${path}.${k}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: unknown field "${k}"`);
      else if (typeof schema.additionalProperties === 'object') validate(schema.additionalProperties, v, `${path}.${k}`, errors);
    }
  }
  return errors;
}

// --- schemas ------------------------------------------------------------------

const str = { type: 'string', minLength: 1 };
const url = { type: 'string', pattern: '^https://' };
const relPath = { type: 'string', pattern: '^\\./' };
const author = { type: 'object', required: ['name'], properties: { name: str, email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+$' }, url }, additionalProperties: false };
const semver = { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$' };
const kebab = { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 64 };

export const SCHEMAS = {
  // https://agent-plugins.org/specification section 5.2: closed top level.
  'plugin.json': {
    type: 'object',
    required: ['$schema', 'name'],
    additionalProperties: false,
    properties: {
      $schema: { const: AGENT_PLUGINS_SCHEMA },
      name: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[a-z0-9](?:[a-z0-9]|[.-](?![.-]))*[a-z0-9]$|^[a-z0-9]$' },
      version: semver,
      description: str,
      author,
      homepage: url,
      repository: url,
      license: str,
      keywords: { type: 'array', items: str },
      extensions: { type: 'object', additionalProperties: { type: 'object' } },
    },
  },
  '.claude-plugin/plugin.json': {
    type: 'object',
    required: ['name', 'version', 'description', 'author'],
    properties: {
      name: kebab,
      displayName: str,
      version: semver,
      description: str,
      author,
      homepage: url,
      repository: url,
      license: str,
      keywords: { type: 'array', items: str },
      skills: { anyOf: [relPath, { type: 'array', items: relPath }] },
      agents: { anyOf: [relPath, { type: 'array', items: { type: 'string', pattern: '^\\./.*\\.md$' } }] },
      commands: { anyOf: [relPath, { type: 'array', items: relPath }, { type: 'object' }] },
    },
  },
  '.claude-plugin/marketplace.json': {
    type: 'object',
    required: ['name', 'owner', 'plugins'],
    properties: {
      name: kebab,
      owner: author,
      metadata: { type: 'object' },
      plugins: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'source'],
          properties: { name: kebab, source: { anyOf: [relPath, { type: 'object' }] }, version: semver, author, homepage: url, repository: url },
        },
      },
    },
  },
  '.agents/plugins/marketplace.json': {
    type: 'object',
    required: ['name', 'plugins'],
    properties: {
      name: kebab,
      interface: { type: 'object', properties: { displayName: str } },
      plugins: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'source', 'policy'],
          properties: {
            name: kebab,
            source: { type: 'object', required: ['source', 'path'], properties: { source: { const: 'local' }, path: relPath } },
            policy: { type: 'object', properties: { installation: { enum: ['AVAILABLE', 'INSTALLED_BY_DEFAULT', 'NOT_AVAILABLE'] } } },
            category: str,
          },
        },
      },
    },
  },
  '.cursor-plugin/plugin.json': {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', pattern: '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$' },
      version: semver,
      description: str,
      author,
      homepage: url,
      repository: url,
      license: str,
      keywords: { type: 'array', items: str },
      logo: str,
      skills: { anyOf: [str, { type: 'array', items: str }] },
      agents: { anyOf: [str, { type: 'array', items: str }] },
      commands: { anyOf: [str, { type: 'array', items: str }] },
      rules: { anyOf: [str, { type: 'array', items: str }] },
    },
  },
  'gemini-extension.json': {
    type: 'object',
    required: ['name', 'version'],
    properties: { name: kebab, version: semver, description: str, contextFileName: { anyOf: [str, { type: 'array', items: str }] } },
  },
};

// Component paths each manifest names, which must exist in the repository.
function pathsToCheck(file, m) {
  const out = [];
  const add = (v) => [].concat(v ?? []).forEach((p) => typeof p === 'string' && out.push(p));
  if (file === '.claude-plugin/plugin.json') ['skills', 'agents'].forEach((k) => add(m[k]));
  if (file === '.cursor-plugin/plugin.json') ['skills', 'agents', 'commands', 'rules', 'logo'].forEach((k) => add(m[k]));
  if (file === 'gemini-extension.json') add(m.contextFileName ?? 'GEMINI.md');
  if (file === 'plugin.json') {
    const oa = m.extensions?.['com.openai'];
    add(oa?.onboardingSkill);
    add(oa?.interface?.logo);
  }
  if (file.endsWith('marketplace.json')) for (const p of m.plugins ?? []) add(typeof p.source === 'string' ? p.source : p.source?.path);
  return out;
}

export function checkManifests(root) {
  const errors = [];
  const names = new Map();
  const versions = new Map();
  for (const file of Object.keys(SCHEMAS)) {
    const schema = SCHEMAS[file];
    const abs = join(root, file);
    if (!existsSync(abs)) {
      errors.push(`${file}: missing`);
      continue;
    }
    let m;
    try {
      m = JSON.parse(readFileSync(abs, 'utf8'));
    } catch (e) {
      errors.push(`${file}: invalid JSON (${e.message})`);
      continue;
    }
    for (const e of validate(schema, m)) errors.push(`${file}: ${e}`);
    const base = file.endsWith('marketplace.json') ? dirname(dirname(abs)) : dirname(abs) === join(root, '.claude-plugin') || dirname(abs) === join(root, '.cursor-plugin') ? root : dirname(abs);
    for (const p of pathsToCheck(file, m)) {
      const target = resolve(base, p);
      if (relative(root, target).startsWith('..')) errors.push(`${file}: path escapes the plugin root: ${p}`);
      else if (!existsSync(target)) errors.push(`${file}: path does not exist: ${p}`);
    }
    if (m.name && !file.endsWith('marketplace.json')) names.set(file, m.name);
    if (m.version) versions.set(file, m.version);
  }
  if (new Set(names.values()).size > 1) errors.push(`manifest names disagree: ${JSON.stringify(Object.fromEntries(names))}`);
  if (new Set(versions.values()).size > 1) errors.push(`manifest versions disagree: ${JSON.stringify(Object.fromEntries(versions))}`);
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , ...args] = process.argv;
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? resolve(args[ri + 1]) : DEFAULT_ROOT;
  const errors = checkManifests(root);
  for (const e of errors) console.error(e);
  console.log(errors.length ? `manifests: ${errors.length} problem(s)` : `manifests: ${Object.keys(SCHEMAS).length} files valid`);
  process.exit(errors.length ? 1 : 0);
}
