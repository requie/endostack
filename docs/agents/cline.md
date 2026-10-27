# tstack in Cline

Cline reads skills from `.cline/skills/` (project) and `~/.cline/skills/` (user) and does not document `.agents/skills/`. It has a built-in subagent tool but no custom subagent files.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents cline
```

**Files, every project:**

```sh
./install.sh --scope user --agents cline
```

Run the installer from a clone of the tstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.cline/skills/<name>/` or `~/.cline/skills/<name>/`. A user-level skill wins over a project skill with the same name. |
| Subagents, commands | Not installed. Cline has no custom subagent format, and skills already appear as `/<name>`. |
| Rules | A marked block in the project `AGENTS.md` |

The installer records every file it writes, with a hash, in `.tstack/install-manifest.json` (project) or `~/.tstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

tstack skills use neutral verbs. In this agent they mean:

| tstack verb | Tool in Cline |
| --- | --- |
| Spawn a subagent | `spawn_agent` |
| Ask the user | `ask_question` |
| Track a todo list | not documented |
| Run a shell command | `run_commands` |
| Read a file | `read_files` |
| Edit a file | `editor` or `apply_patch` |
| Search the codebase | `search_codebase` |
| Fetch a URL | `fetch_web_content` |
| Load a skill | `skills`, or the user types `/<name>` |
| Transcripts | Per task, in the editor's extension storage: `<editor globalStorage>/saoudrizwan.claude-dev/tasks/<task-id>/api_conversation_history.json` (unverified). |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Every subagent runs on the session model; `spawn_agent` takes no model. Panels vary each seat's brief instead of its model.

Role assignments live in `~/.tstack/models.toml` or the project's `.tstack/models.toml`, written by [setup-tstack](../../skills/setup-tstack/SKILL.md).

## What degrades here

- Custom subagents are not supported. Where a skill spawns `tarique-agent` or `comment-auditor`, it spawns a built-in subagent and pastes the agent definition into the brief.
- Subagents get no MCP tools.
- No todo tool. Skills keep the list as a checklist in the reply.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): not documented.

## Sources

- <https://docs.cline.bot/customization/skills.md>
- <https://docs.cline.bot/features/subagents>
- <https://docs.cline.bot/tools-reference/all-cline-tools>
