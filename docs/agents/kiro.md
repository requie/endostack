# EndoStack in Kiro

Kiro reads skills only from `.kiro/skills/` and `~/.kiro/skills/`. It imports Agent Plugins layouts as Powers, and custom subagents live in `.kiro/agents/`.

## Install

**Power.** In the Powers panel choose "Add Custom Power", import from GitHub, and enter https://github.com/requie/endostack. Powers load skills only; install the files as well to get the subagents.

**Files, one project:**

```sh
./install.sh --scope project --agents kiro
```

**Files, every project:**

```sh
./install.sh --scope user --agents kiro
```

Run the installer from a clone of the EndoStack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.kiro/skills/<name>/` or `~/.kiro/skills/<name>/` |
| Subagents | `.kiro/agents/<name>.md` or `~/.kiro/agents/<name>.md`. Read-only agents get `tools: [read, shell]`. |
| Rules | A marked block in the project `AGENTS.md`, which Kiro always includes |

The installer records every file it writes, with a hash, in `.endostack/install-manifest.json` (project) or `~/.endostack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

EndoStack skills use neutral verbs. In this agent they mean:

| EndoStack verb | Tool in Kiro |
| --- | --- |
| Spawn a subagent | `subagent` |
| Ask the user | not documented |
| Track a todo list | not documented |
| Run a shell command | `shell` |
| Read a file | `read` |
| Edit a file | `write` |
| Search the codebase | not documented |
| Fetch a URL | not documented |
| Load a skill | automatic, or `/<name>` |
| Transcripts | Not readable. Kiro does not document where it stores conversations. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Model choice is per agent definition (the `model` field). EndoStack's generated agents leave it unset, so they run on the session model unless you add one.

Role assignments live in `~/.endostack/models.toml` or the project's `.endostack/models.toml`, written by [setup-endostack](../../skills/setup-endostack/SKILL.md).

## What degrades here

- No todo tool. Skills keep the list as a checklist in the reply.
- `disable-model-invocation` is not honored, so Kiro may load command-style skills on its own when a request matches. Their descriptions say to load them only on request.
- `$ARGUMENTS` substitution works only in the Kiro CLI.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): not documented.

## Sources

- <https://kiro.dev/docs/skills/>
- <https://kiro.dev/docs/custom-agents/creating/>
- <https://kiro.dev/docs/custom-agents/subagents/>
- <https://kiro.dev/docs/steering/>
