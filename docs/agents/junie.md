# EndoStack in JetBrains Junie

Junie reads skills from `.agents/skills/`, subagents from `.junie/agents/`, and commands from `.junie/commands/`. Subagent tool names follow Claude Code's.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents junie
```

**Files, every project:**

```sh
./install.sh --scope user --agents junie
```

Run the installer from a clone of the EndoStack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/`. Project skills load only in trusted projects. |
| Subagents | `.junie/agents/<name>.md` or `~/.junie/agents/<name>.md`. Read-only agents get `tools: [Read, Glob, Grep, Bash]`. |
| Commands | `.junie/commands/<name>.md` or `~/.junie/commands/<name>.md` with `allowPromptArgument: true`; `$prompt` carries what you type |
| Rules | A marked block in the project `AGENTS.md`. If `.junie/AGENTS.md` exists, Junie reads that file instead and the EndoStack block is not loaded. |

The installer records every file it writes, with a hash, in `.endostack/install-manifest.json` (project) or `~/.endostack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

EndoStack skills use neutral verbs. In this agent they mean:

| EndoStack verb | Tool in JetBrains Junie |
| --- | --- |
| Spawn a subagent | subagents (tool name not documented) |
| Ask the user | `AskUserQuestion` |
| Track a todo list | not documented |
| Run a shell command | `Bash` |
| Read a file | `Read` |
| Edit a file | `Edit`; new files with `Write` |
| Search the codebase | `Grep`, `Glob` |
| Fetch a URL | `WebSearch` (no fetch tool listed) |
| Load a skill | `/<name>` or `$<name>` |
| Transcripts | Not readable. Junie does not document where it stores conversations. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per agent definition (the `model` field, plus `reasoningLevel`). EndoStack's generated agents leave both unset, so they run on the session model unless you add them.

Role assignments live in `~/.endostack/models.toml` or the project's `.endostack/models.toml`, written by [setup-endostack](../../skills/setup-endostack/SKILL.md).

## What degrades here

- Junie treats every `*.md` directly under `.agents/` as a subagent. Do not keep loose Markdown files there; EndoStack writes only into `.agents/skills/` and, for Goose, `.agents/agents/`.
- No todo tool is documented. Skills keep the list as a checklist in the reply.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): not documented.

## Sources

- <https://junie.jetbrains.com/docs/agent-skills.html>
- <https://junie.jetbrains.com/docs/junie-cli-subagents.html>
- <https://junie.jetbrains.com/docs/custom-slash-commands.html>
- <https://junie.jetbrains.com/docs/guidelines-and-memory.html>
