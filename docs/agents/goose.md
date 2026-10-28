# ttstack in Goose

Goose reads skills through its Skills extension, installs Open Plugins (root `plugin.json`) and Gemini extensions, and reads custom agents from `.agents/agents/`.

## Install

**Plugin:**

```sh
goose plugin install https://github.com/requie/ttstack.git
```

**Files, one project:**

```sh
./install.sh --scope project --agents goose
```

**Files, every project:**

```sh
./install.sh --scope user --agents goose
```

Run the installer from a clone of the ttstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Subagents | `.agents/agents/<name>.md` or `~/.agents/agents/<name>.md` |
| Rules | A marked block in the project `AGENTS.md` |

The installer records every file it writes, with a hash, in `.ttstack/install-manifest.json` (project) or `~/.ttstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

ttstack skills use neutral verbs. In this agent they mean:

| ttstack verb | Tool in Goose |
| --- | --- |
| Spawn a subagent | `delegate` |
| Ask the user | not documented |
| Track a todo list | not documented |
| Run a shell command | not documented |
| Read a file | not documented |
| Edit a file | not documented |
| Search the codebase | not documented |
| Fetch a URL | not documented |
| Load a skill | Skills extension; `/skills <name>` in the CLI |
| Transcripts | `~/.local/share/goose/sessions/sessions.db`, a SQLite database (since Goose 1.10.0). Read it with `sqlite3` in read-only mode. Older `.jsonl` session files may remain beside it but are no longer updated. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per agent definition (the `model` field). ttstack's generated agents leave it unset, so they run on the session model unless you add one.

Role assignments live in `~/.ttstack/models.toml` or the project's `.ttstack/models.toml`, written by [setup-ttstack](../../skills/setup-ttstack/SKILL.md).

## What degrades here

- Parallel subagents run only in autonomous mode, up to 5 at once (`GOOSE_MAX_CONCURRENT_SUBAGENTS`), and subagents cannot spawn subagents.
- Command-style skills have no native command file. Run them with `/skills <name>`.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `goose run -t "<prompt>"` (unverified).

## Sources

- <https://goose-docs.ai/docs/guides/context-engineering/using-skills>
- <https://goose-docs.ai/docs/guides/context-engineering/custom-agents>
- <https://goose-docs.ai/docs/guides/context-engineering/subagents>
- <https://goose-docs.ai/docs/guides/context-engineering/plugins>
- <https://goose-docs.ai/docs/guides/sessions/session-management>
