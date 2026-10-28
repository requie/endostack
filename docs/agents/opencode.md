# EndoStack in OpenCode

OpenCode reads skills from `.agents/skills/`, subagents from `.opencode/agents/` (`mode: subagent`), and commands from `.opencode/commands/`.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents opencode
```

**Files, every project:**

```sh
./install.sh --scope user --agents opencode
```

Run the installer from a clone of the EndoStack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Subagents | `.opencode/agents/<name>.md` or `~/.config/opencode/agents/<name>.md`. The file name is the agent name. Read-only agents get `permission: { edit: deny }`. |
| Commands | `.opencode/commands/<name>.md` or `~/.config/opencode/commands/<name>.md`; `$ARGUMENTS` carries what you type |
| Rules | A marked block in the project `AGENTS.md` |

The installer records every file it writes, with a hash, in `.endostack/install-manifest.json` (project) or `~/.endostack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

EndoStack skills use neutral verbs. In this agent they mean:

| EndoStack verb | Tool in OpenCode |
| --- | --- |
| Spawn a subagent | Task (permission key `task`); `@<name>` by hand |
| Ask the user | `question` (unverified) |
| Track a todo list | `todowrite` (unverified) |
| Run a shell command | `bash` (unverified) |
| Read a file | `read` (unverified) |
| Edit a file | `edit`; new files with `write` (unverified) |
| Search the codebase | `grep`, `glob` (unverified) |
| Fetch a URL | `webfetch` (unverified) |
| Load a skill | `skill` |
| Transcripts | Under `~/.local/share/opencode/` (unverified). The storage layout has changed between versions, so check the installed version's layout before parsing it. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per agent definition: `model: <provider>/<model-id>` in the agent file. EndoStack's generated agents leave it unset, so they run on the session model unless you add one.

Role assignments live in `~/.endostack/models.toml` or the project's `.endostack/models.toml`, written by [setup-endostack](../../skills/setup-endostack/SKILL.md).

## What degrades here

- Most tool names above come from prior knowledge, not the official pages. Skills use neutral wording, so a wrong name in this table does not break them.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `opencode run "<prompt>"` (unverified).

## Sources

- <https://opencode.ai/docs/skills.md>
- <https://opencode.ai/docs/agents/>
- <https://opencode.ai/v2/docs/commands/>
- <https://opencode.ai/docs/rules/>
