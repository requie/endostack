# EndoStack in Gemini CLI

Gemini CLI installs EndoStack as an extension (`gemini-extension.json` at the repository root) and reads skills, subagents, and TOML commands. Google has moved consumer accounts to Antigravity CLI; Gemini CLI still works with paid Gemini API keys and Code Assist Standard or Enterprise.

## Install

**Extension (recommended):**

```sh
gemini extensions install https://github.com/requie/endostack
```

**Files, one project:**

```sh
./install.sh --scope project --agents gemini-cli
```

**Files, every project:**

```sh
./install.sh --scope user --agents gemini-cli
```

Run the installer from a clone of the EndoStack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Extension install | Skills from the extension's `skills/`; context from `GEMINI.md`, which maps EndoStack's verbs to Gemini tools. |
| Skills (files) | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` (both win over `.gemini/skills/`) |
| Subagents (files) | `.gemini/agents/` or `~/.gemini/agents/` |
| Commands (files) | `.gemini/commands/<name>.toml` or `~/.gemini/commands/<name>.toml`, one per command-style skill; `{{args}}` carries what you type after the command |
| Rules | A marked block in `AGENTS.md`, plus an `@AGENTS.md` import block in an existing project `GEMINI.md`. Gemini reads `AGENTS.md` directly only if `context.fileName` in `settings.json` lists it. |

The installer records every file it writes, with a hash, in `.endostack/install-manifest.json` (project) or `~/.endostack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

EndoStack skills use neutral verbs. In this agent they mean:

| EndoStack verb | Tool in Gemini CLI |
| --- | --- |
| Spawn a subagent | a tool named after each subagent (for example `tarique-agent`); `@<name>` forces delegation |
| Ask the user | `ask_user` |
| Track a todo list | `write_todos` |
| Run a shell command | `run_shell_command` |
| Read a file | `read_file` |
| Edit a file | `replace`; new files with `write_file` |
| Search the codebase | `grep_search`, `glob` |
| Fetch a URL | `web_fetch` |
| Load a skill | `activate_skill` (asks you to confirm before the skill body loads) |
| Transcripts | `~/.gemini/tmp/<project-hash>/chats/`, one folder per project. The hash function and file format are not documented. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per subagent definition (the `model` field). EndoStack's generated agents leave it unset, so they run on the session model unless you add one.

Role assignments live in `~/.endostack/models.toml` or the project's `.endostack/models.toml`, written by [setup-endostack](../../skills/setup-endostack/SKILL.md).

## What degrades here

- Subagents cannot spawn subagents. Fan-outs that a delegate would start run from the main chat instead.
- Parallel subagents are described in Google's launch post but not in the reference docs. If calls run one at a time, skills still finish, only slower.
- Every skill activation asks for your confirmation.
- The extension install also loads the canonical `agents/*.md` files, whose `tools` value is prose rather than a tool list. If Gemini rejects them, use the files install, which writes Gemini-format agents to `.gemini/agents/`.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `gemini -p "<prompt>"`.

## Sources

- <https://geminicli.com/docs/cli/skills/>
- <https://geminicli.com/docs/extensions/reference/>
- <https://geminicli.com/docs/core/subagents.md>
- <https://geminicli.com/docs/cli/custom-commands.md>
