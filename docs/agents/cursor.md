# ttstack in Cursor

Cursor reads Agent Skills from `.agents/skills/`, has a plugin format (`.cursor-plugin/plugin.json`), and supports custom subagents with a `model` field.

## Install

**Local plugin:**

```sh
git clone https://github.com/requie/ttstack ~/.cursor/plugins/local/ttstack
```

Then run "Developer: Reload Window". Enterprise workspaces must allow local plugin imports.

**Files, one project:**

```sh
./install.sh --scope project --agents cursor
```

**Files, every project:**

```sh
./install.sh --scope user --agents cursor
```

Run the installer from a clone of the ttstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Subagents | `.cursor/agents/` or `~/.cursor/agents/` for a files install; the plugin install reads `dist/cursor/agents/` (set in `.cursor-plugin/plugin.json`) |
| Rules | A marked block in the project `AGENTS.md` |

The installer records every file it writes, with a hash, in `.ttstack/install-manifest.json` (project) or `~/.ttstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

ttstack skills use neutral verbs. In this agent they mean:

| ttstack verb | Tool in Cursor |
| --- | --- |
| Spawn a subagent | Task (several Task calls in one message run in parallel) |
| Ask the user | Ask questions |
| Track a todo list | not documented |
| Run a shell command | Run shell commands |
| Read a file | Read files |
| Edit a file | Edit files |
| Search the codebase | Search files and folders |
| Fetch a URL | Web (search only; no fetch-by-URL tool is documented) |
| Load a skill | automatic, or the user types `/<name>` |
| Transcripts | `~/.cursor/projects/<encoded-workspace>/agent-transcripts/<conversation-id>/<conversation-id>.jsonl`. One JSON object per line with `role` and `message`; tool results are not recorded (unverified). |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Per-subagent choice works through the subagent `model` field (default `inherit`). The tier names map to whatever model names `/setup-ttstack` detected in your Cursor session; ttstack does not hard-code Cursor model names.

Role assignments live in `~/.ttstack/models.toml` or the project's `.ttstack/models.toml`, written by [setup-ttstack](../../skills/setup-ttstack/SKILL.md).

## What degrades here

- No todo tool is documented, so skills keep their todo list as a short checklist in the reply.
- There is no fetch-by-URL tool in the documented list. Skills that fetch a page use a shell command such as `curl` instead, when the user allows it.
- Cursor also reads `.claude/skills/`. If ttstack is installed for Claude Code in the same project, each skill appears twice.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `cursor-agent -p "<prompt>"` (unverified).

## Sources

- <https://cursor.com/docs/skills>
- <https://cursor.com/docs/reference/plugins>
- <https://cursor.com/docs/subagents>
