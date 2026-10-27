# tstack in GitHub Copilot

This page covers Copilot in VS Code, Copilot CLI, and the Copilot cloud agent. All three read `.agents/skills/` and `.github/agents/*.agent.md`. Copilot CLI installs plugins from a GitHub repository; it reads the root `plugin.json` and loads Copilot-only agents from `com.github.copilot/agents/`.

## Install

**Copilot CLI plugin:**

```sh
copilot plugin install requie/tstack
```

**VS Code plugin.** Command Palette, "Chat: Install Plugin From Source", then enter https://github.com/requie/tstack.

**Files, one project:**

```sh
./install.sh --scope project --agents copilot
```

**Files, every project:**

```sh
./install.sh --scope user --agents copilot
```

Run the installer from a clone of the tstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Subagents | `.github/agents/<name>.agent.md` or `~/.copilot/agents/<name>.agent.md`. Read-only agents get `tools: [read, search, execute]`. |
| Rules | A marked block in the project `AGENTS.md`, which Copilot reads |

The installer records every file it writes, with a hash, in `.tstack/install-manifest.json` (project) or `~/.tstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

tstack skills use neutral verbs. In this agent they mean:

| tstack verb | Tool in GitHub Copilot |
| --- | --- |
| Spawn a subagent | `task` (CLI and cloud agent); `runSubagent` (VS Code local) |
| Ask the user | `askQuestions` (VS Code); `ask_user` in the CLI (unverified) |
| Track a todo list | `todos` (VS Code); a `sql` todos table in the CLI (unverified) |
| Run a shell command | `bash` (CLI); `runInTerminal` (VS Code) |
| Read a file | `view` (CLI); `readFile` (VS Code) |
| Edit a file | `edit` (CLI), new files with `create` (unverified); `editFiles` (VS Code) |
| Search the codebase | `grep`, `glob` (CLI); `textSearch`, `fileSearch` (VS Code) |
| Fetch a URL | `web_fetch` (CLI); `fetch` (VS Code) |
| Load a skill | automatic, or `/<name>`; the CLI also has `skill` (unverified) |
| Transcripts | Copilot CLI: `~/.copilot/session-state/<session-id>/events.jsonl`, one folder per session, with metadata in `workspace.yaml`. Filter sessions by the workspace path in that file. VS Code chat history is not stored in a documented file format, so treat it as not readable. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per agent definition (the `model` field in `.agent.md`). tstack's generated agents leave it unset, so subagents run on the session model unless you add one.

Role assignments live in `~/.tstack/models.toml` or the project's `.tstack/models.toml`, written by [setup-tstack](../../skills/setup-tstack/SKILL.md).

## What degrades here

- Parallel subagents are not stated in the official docs. If spawns run one at a time, panels and fan-outs still finish, only slower.
- Multi-model panels run every seat on the session model and vary each seat's brief instead, unless you pin models in the agent files.
- `.github/prompts/*.prompt.md` commands run only in VS Code's local harness, so tstack ships commands as skills (`/<name>`).

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `copilot -p "<prompt>"` (unverified).

## Sources

- <https://code.visualstudio.com/docs/agent-customization/agent-skills.md>
- <https://code.visualstudio.com/docs/agent-customization/custom-agents.md>
- <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference>
- <https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-best-practices>
