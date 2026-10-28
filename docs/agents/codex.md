# EndoStack in Codex CLI

Codex reads skills from `.agents/skills/` and custom agents from TOML files in `.codex/agents/`. The repository root `plugin.json` is an Agent Plugins manifest with Codex settings under `extensions["com.openai"]`.

## Install

**Plugin:**

```sh
codex plugin marketplace add requie/endostack
```

Then install EndoStack from the Plugins Directory in the Codex app.

**Files, one project:**

```sh
./install.sh --scope project --agents codex
```

**Files, every project:**

```sh
./install.sh --scope user --agents codex
```

Run the installer from a clone of the EndoStack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Command-style skills | Each also gets `agents/openai.yaml` with `allow_implicit_invocation: false`, so Codex runs it only when you type `$<name>`. With `--link` this file cannot be added and those skills become model-invocable. |
| Subagents | `.codex/agents/<name>.toml` or `~/.codex/agents/<name>.toml` (fields `name`, `description`, `developer_instructions`). Project agents load only in trusted projects. |
| Rules | A marked block in the project `AGENTS.md` |

The installer records every file it writes, with a hash, in `.endostack/install-manifest.json` (project) or `~/.endostack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

EndoStack skills use neutral verbs. In this agent they mean:

| EndoStack verb | Tool in Codex CLI |
| --- | --- |
| Spawn a subagent | `spawn_agent` (unverified) |
| Ask the user | not documented |
| Track a todo list | `update_plan` (unverified) |
| Run a shell command | `shell_command` (unverified) |
| Read a file | `read_file` (unverified) |
| Edit a file | `apply_patch` |
| Search the codebase | `rg` and `glob_file_search` (unverified) |
| Fetch a URL | none; `web_search` only |
| Load a skill | `$<name>` or `/skills` |
| Transcripts | `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl` (unverified). Files are grouped by date, so filter by the working directory recorded inside each file. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per agent definition: the `model` and `model_reasoning_effort` fields in an agent TOML file. The spawn call itself takes no model. EndoStack's generated agents set neither field, so they run on the session model. To pin a role, add `model` to the installed TOML file (the uninstaller then keeps that file because you changed it).

Role assignments live in `~/.endostack/models.toml` or the project's `.endostack/models.toml`, written by [setup-endostack](../../skills/setup-endostack/SKILL.md).

## What degrades here

- No ask-user tool is confirmed. Skills ask in plain text and stop until you answer.
- No fetch-by-URL tool. Skills that need a page ask you for it or use `curl` when the sandbox allows network access.
- Up to 6 subagents run at once by default (`[agents] max_threads`), and subagents cannot spawn their own by default (`max_depth` 1). Larger fan-outs in `swarm` and `security-review` run in waves.
- Multi-model panels (`arena`, `architect`, `interrogate`) run every seat on the session model and vary each seat's brief instead.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `codex exec "<prompt>"`.

## Sources

- <https://learn.chatgpt.com/docs/build-skills>
- <https://developers.openai.com/codex/plugins/build.md>
- <https://learn.chatgpt.com/docs/agent-configuration/subagents>
