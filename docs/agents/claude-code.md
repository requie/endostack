# ttstack in Claude Code

Claude Code has native skills, a plugin system with marketplaces, and custom subagents. The plugin install is the best fit: skills arrive namespaced as `ttstack:<name>`, and nothing is copied into your repository.

## Install

**Plugin (recommended):**

```sh
claude plugin marketplace add requie/ttstack
claude plugin install ttstack@ttstack
```

Inside a session the same steps are `/plugin marketplace add requie/ttstack` and `/plugin install ttstack@ttstack`.

**Files, one project:**

```sh
./install.sh --scope project --agents claude-code
```

**Files, every project:**

```sh
./install.sh --scope user --agents claude-code
```

Run the installer from a clone of the ttstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Plugin install | Claude Code keeps its own copy of the repository. Skills load from its `skills/`, subagents from `dist/claude-code/agents/` (listed in `.claude-plugin/plugin.json`). |
| Skills (files) | `.claude/skills/<name>/` or `~/.claude/skills/<name>/` |
| Subagents (files) | `.claude/agents/` or `~/.claude/agents/` |
| Rules | The project installer adds a marked `@AGENTS.md` import block to an existing `CLAUDE.md`. It never creates `CLAUDE.md`. |

The installer records every file it writes, with a hash, in `.ttstack/install-manifest.json` (project) or `~/.ttstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

ttstack skills use neutral verbs. In this agent they mean:

| ttstack verb | Tool in Claude Code |
| --- | --- |
| Spawn a subagent | `Agent` (older name `Task` still works) |
| Ask the user | `AskUserQuestion` |
| Track a todo list | `TodoWrite` |
| Run a shell command | `Bash` |
| Read a file | `Read` |
| Edit a file | `Edit`; new files with `Write` |
| Search the codebase | `Grep` for contents, `Glob` for file names |
| Fetch a URL | `WebFetch` |
| Load a skill | `Skill`, or the user types `/<name>` |
| Transcripts | `~/.claude/projects/<dir>/<session-id>.jsonl`, where `<dir>` is the absolute workspace path with each `/` replaced by `-`. One JSON object per line (unverified). |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Per-subagent choice works. The spawn tool takes a `model` value of `opus`, `sonnet`, `haiku`, a full model ID, or `inherit`. Map tiers as `strong` to `opus`, `standard` to `sonnet`, `fast` to `haiku`, unless `/setup-ttstack` recorded other names. Reasoning effort is set per subagent with the `effort` field. Up to 20 subagents run at once by default (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`).

Role assignments live in `~/.ttstack/models.toml` or the project's `.ttstack/models.toml`, written by [setup-ttstack](../../skills/setup-ttstack/SKILL.md).

## What degrades here

- Claude Code does not read `AGENTS.md` when a `CLAUDE.md` exists. The installer adds an `@AGENTS.md` import to `CLAUDE.md` so the ttstack rules block still loads.
- A plugin root `CLAUDE.md` is never loaded, so ttstack ships no always-on rules for the plugin install. Start each session with `/tarique-mode` when you want the mode.
- If you install both the plugin and the `.claude/skills/` copies, every skill appears twice. Pick one.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `claude -p "<prompt>"`.

## Sources

- <https://code.claude.com/docs/en/skills>
- <https://code.claude.com/docs/en/plugins/manifest-reference>
- <https://code.claude.com/docs/en/sub-agents.md>
