// Package metadata shared by every manifest the build writes.
export const META = {
  name: 'tstack',
  displayName: 'tstack',
  version: '1.0.0',
  description:
    'Security-first agent workflows for coding agents: route work through tested playbooks, review with multiple subagents, and verify before you ship.',
  author: { name: 'Tarique Smith', url: 'https://github.com/requie' },
  homepage: 'https://github.com/requie/tstack',
  repository: 'https://github.com/requie/tstack',
  license: 'MIT',
  keywords: ['agent-skills', 'security', 'code-review', 'subagents', 'workflow', 'verification'],
  docsBase: 'https://github.com/requie/tstack/blob/main/docs/agents',
};

export const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
