# ttstack in Zed

Zed's agent reads skills from `.agents/skills/` in trusted worktrees and from `~/.agents/skills/`. It has a `spawn_agent` tool but no custom subagent files.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents zed
```

**Files, every project:**

```sh
./install.sh --scope user --agents zed
```

Run the installer from a clone of the ttstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/`. Zed loads them only in trusted worktrees. |
| Rules | A marked block in the project `AGENTS.md`. Zed reads only the first rules file it finds; a `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md` or `AGENT.md` in the project shadows `AGENTS.md`. |

The installer records every file it writes, with a hash, in `.ttstack/install-manifest.json` (project) or `~/.ttstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

ttstack skills use neutral verbs. In this agent they mean:

| ttstack verb | Tool in Zed |
| --- | --- |
| Spawn a subagent | `spawn_agent` |
| Ask the user | none |
| Track a todo list | none |
| Run a shell command | `terminal` |
| Read a file | `read_file` |
| Edit a file | `edit_file`; new files with `write_file` |
| Search the codebase | `grep`, `find_path` |
| Fetch a URL | `fetch` |
| Load a skill | `skill`, `/<name>`, or `@skill` |
| Transcripts | Not readable as files. Zed keeps agent threads in a local database (unverified). |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Every subagent runs on the session model. Panels vary each seat's brief instead of its model.

Role assignments live in `~/.ttstack/models.toml` or the project's `.ttstack/models.toml`, written by [setup-ttstack](../../skills/setup-ttstack/SKILL.md).

## What degrades here

- No ask-user tool. Skills ask in plain text and stop until you answer.
- No todo tool. Skills keep the list as a checklist in the reply.
- No named subagents. Skills spawn `spawn_agent` with the agent definition pasted into the brief.
- Parallel subagents are not documented.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): not documented.

## Sources

- <https://zed.dev/docs/ai/skills.md>
- <https://zed.dev/docs/ai/instructions>
- <https://zed.dev/docs/ai/tools.md>
