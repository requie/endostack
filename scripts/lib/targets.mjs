// Single source of truth for where tstack's files go in each coding agent.
// Paths come from the cross-agent research table (docs/agents/<id>.md cites
// the vendor docs). `~` means the user's home directory.

// Skill directories shared by many agents. Writing skills once to
// `.agents/skills/` reaches every agent listed in AGENTS_SKILLS_READERS.
export const SHARED_SKILLS = { project: '.agents/skills', user: '~/.agents/skills' };

export const TARGETS = {
  'claude-code': {
    label: 'Claude Code',
    detect: { dirs: ['~/.claude'], bins: ['claude'], project: ['.claude'] },
    skills: { project: '.claude/skills', user: '~/.claude/skills' },
    agents: { dist: 'claude-code/agents', project: '.claude/agents', user: '~/.claude/agents' },
    plugin: 'claude plugin marketplace add requie/tstack && claude plugin install tstack@tstack',
  },
  cursor: {
    label: 'Cursor',
    detect: { dirs: ['~/.cursor'], bins: ['cursor', 'cursor-agent'], project: ['.cursor'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'cursor/agents', project: '.cursor/agents', user: '~/.cursor/agents' },
    plugin: 'copy or clone the repo to ~/.cursor/plugins/local/tstack/ and reload the window',
  },
  codex: {
    label: 'Codex CLI',
    detect: { dirs: ['~/.codex'], bins: ['codex'], project: ['.codex'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'codex/agents', project: '.codex/agents', user: '~/.codex/agents' },
    codexPolicy: true,
    plugin: 'codex plugin marketplace add requie/tstack, then install tstack from the Plugins Directory',
  },
  'gemini-cli': {
    label: 'Gemini CLI',
    detect: { dirs: ['~/.gemini'], bins: ['gemini'], project: ['.gemini'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'gemini-cli/agents', project: '.gemini/agents', user: '~/.gemini/agents' },
    commands: { dist: 'gemini-cli/commands', project: '.gemini/commands', user: '~/.gemini/commands' },
    plugin: 'gemini extensions install https://github.com/requie/tstack',
  },
  copilot: {
    label: 'GitHub Copilot',
    detect: { dirs: ['~/.copilot'], bins: ['copilot'], vscode: ['github.copilot-chat'], project: ['.github/copilot-instructions.md', '.github/agents'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'copilot/agents', project: '.github/agents', user: '~/.copilot/agents' },
    plugin: 'copilot plugin install requie/tstack',
  },
  'devin-desktop': {
    label: 'Devin Desktop (formerly Windsurf)',
    detect: { dirs: ['~/.codeium/windsurf', '~/.config/devin'], bins: ['devin', 'windsurf'], project: ['.devin', '.windsurf'] },
    skills: SHARED_SKILLS,
    commands: { dist: 'devin-desktop/workflows', project: '.devin/workflows', user: '~/.codeium/windsurf/global_workflows' },
  },
  cline: {
    label: 'Cline',
    detect: { dirs: ['~/.cline'], bins: ['cline'], vscode: ['saoudrizwan.claude-dev'], project: ['.cline', '.clinerules'] },
    skills: { project: '.cline/skills', user: '~/.cline/skills' },
  },
  'roo-code': {
    label: 'Roo Code',
    detect: { dirs: ['~/.roo'], bins: [], vscode: ['rooveterinaryinc.roo-cline'], project: ['.roo'] },
    skills: SHARED_SKILLS,
    commands: { dist: 'roo-code/commands', project: '.roo/commands', user: '~/.roo/commands' },
  },
  opencode: {
    label: 'OpenCode',
    detect: { dirs: ['~/.config/opencode'], bins: ['opencode'], project: ['.opencode', 'opencode.json'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'opencode/agents', project: '.opencode/agents', user: '~/.config/opencode/agents' },
    commands: { dist: 'opencode/commands', project: '.opencode/commands', user: '~/.config/opencode/commands' },
  },
  amp: {
    label: 'Amp',
    detect: { dirs: ['~/.config/amp'], bins: ['amp'], project: ['.amp'] },
    skills: SHARED_SKILLS,
    plugin: 'amp skill add requie/tstack --global',
  },
  kiro: {
    label: 'Kiro',
    detect: { dirs: ['~/.kiro'], bins: ['kiro', 'kiro-cli'], project: ['.kiro'] },
    skills: { project: '.kiro/skills', user: '~/.kiro/skills' },
    agents: { dist: 'kiro/agents', project: '.kiro/agents', user: '~/.kiro/agents' },
    plugin: 'Powers panel, "Add Custom Power", import from GitHub: https://github.com/requie/tstack',
  },
  aider: {
    label: 'Aider',
    detect: { dirs: [], files: ['~/.aider.conf.yml'], bins: ['aider'], project: ['.aider.conf.yml'] },
    skills: SHARED_SKILLS,
    rulesOnly: true,
  },
  zed: {
    label: 'Zed',
    detect: { dirs: ['~/.config/zed', '~/Library/Application Support/Zed'], bins: ['zed', 'zeditor'], project: ['.zed'] },
    skills: SHARED_SKILLS,
  },
  junie: {
    label: 'JetBrains Junie',
    detect: { dirs: ['~/.junie'], bins: ['junie'], project: ['.junie'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'junie/agents', project: '.junie/agents', user: '~/.junie/agents' },
    commands: { dist: 'junie/commands', project: '.junie/commands', user: '~/.junie/commands' },
  },
  goose: {
    label: 'Goose',
    detect: { dirs: ['~/.config/goose'], bins: ['goose'], project: ['.goosehints'] },
    skills: SHARED_SKILLS,
    agents: { dist: 'goose/agents', project: '.agents/agents', user: '~/.agents/agents' },
    plugin: 'goose plugin install https://github.com/requie/tstack.git',
  },
};

export const TARGET_IDS = Object.keys(TARGETS);

// Skill lookup order a generated command or agent prints, per build target.
// Project directory first, then the user directory. Native plugin installs
// (Gemini extension, Copilot plugin, Codex plugin) are covered by the
// "installed plugin's skills/ directory" fallback the generators add.
export function skillDirsFor(id) {
  if (id === 'claude-code') return ['${CLAUDE_PLUGIN_ROOT}/skills', '.claude/skills', '~/.claude/skills'];
  const t = TARGETS[id];
  const s = t.skills ?? SHARED_SKILLS;
  const dirs = [s.project, s.user];
  return dirs;
}

export const ALIASES = {
  claude: 'claude-code',
  gemini: 'gemini-cli',
  windsurf: 'devin-desktop',
  devin: 'devin-desktop',
  roo: 'roo-code',
  'github-copilot': 'copilot',
};
