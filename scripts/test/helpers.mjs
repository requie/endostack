import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';

export function tempDir(prefix = 'endostack-test-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function writeTree(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

export const cleanup = (...dirs) => dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));

// A small canonical source tree: one model-invoked skill, one command-style
// skill with a bundled reference, one read-only agent, one writing agent.
export function fixtureSource(root) {
  writeTree(root, {
    'skills/alpha/SKILL.md': '---\nname: alpha\ndescription: Explain alpha things. Use for "what is alpha".\n---\n\n# alpha\n\nBody of alpha. See [beta](../beta/SKILL.md).\n',
    'skills/beta/SKILL.md': '---\nname: beta\ndescription: Run the beta workflow on request.\ndisable-model-invocation: true\n---\n\n# beta\n\nRead [the notes](references/notes.md).\n',
    'skills/beta/references/notes.md': '# notes\n\nBeta notes.\n',
    'agents/reviewer.md': '---\nname: reviewer\ndescription: Read-only reviewer for "quoted" diffs.\ntools: read-only (read files, search)\n---\n\nReview the diff. Text with """ triple quotes and a \\ backslash.\n',
    'agents/helper.md': '---\nname: helper\ndescription: Writes code for the parent.\n---\n\nDo the task.\n',
  });
  return root;
}
