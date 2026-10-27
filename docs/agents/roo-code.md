# tstack in Roo Code

A third-party report says Roo Code was sunset on 2026-05-15; its docs still load without a notice. tstack installs skills and commands for it, but it gets the least testing of any agent here.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents roo-code
```

**Files, every project:**

```sh
./install.sh --scope user --agents roo-code
```

Run the installer from a clone of the tstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Commands | `.roo/commands/<name>.md` or `~/.roo/commands/<name>.md`, one per command-style skill |
| Rules | A marked block in the project `AGENTS.md` (unverified) |

The installer records every file it writes, with a hash, in `.tstack/install-manifest.json` (project) or `~/.tstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

tstack skills use neutral verbs. In this agent they mean:

| tstack verb | Tool in Roo Code |
| --- | --- |
| Spawn a subagent | none |
| Ask the user | not documented |
| Track a todo list | not documented |
| Run a shell command | not documented |
| Read a file | not documented |
| Edit a file | not documented |
| Search the codebase | not documented |
| Fetch a URL | not documented |
| Load a skill | `skill` |
| Transcripts | Per task, in the editor's extension storage under `rooveterinaryinc.roo-cline/tasks/<task-id>/` (unverified). |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

No subagents, so there is no per-subagent model. Every role runs in the main chat on the session model.

Role assignments live in `~/.tstack/models.toml` or the project's `.tstack/models.toml`, written by [setup-tstack](../../skills/setup-tstack/SKILL.md).

## What degrades here

- No subagents. Skills run every subagent brief one after another in the main chat, which uses more context and takes longer.
- Panels (`arena`, `interrogate`, `security-review`) lose independence: one model writes every seat's answer in one context, so treat their agreement as weaker evidence.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): not documented.

## Sources

- <https://roocodeinc.github.io/Roo-Code/advanced-usage/available-tools/skill/>
- <https://roocodeinc.github.io/Roo-Code/features/slash-commands/>
