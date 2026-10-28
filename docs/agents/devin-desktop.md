# EndoStack in Devin Desktop (formerly Windsurf)

Windsurf became Devin Desktop on 2026-06-02. It reads `.devin/` paths first and falls back to `.windsurf/`. Skills load from `.agents/skills/`, and manual commands are workflows in `.devin/workflows/`.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents devin-desktop
```

**Files, every project:**

```sh
./install.sh --scope user --agents devin-desktop
```

Run the installer from a clone of the EndoStack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Workflows | `.devin/workflows/<name>.md` (project) or `~/.codeium/windsurf/global_workflows/<name>.md` (user), one per command-style skill. Each workflow tells the agent to load the skill by path. |
| Subagents | Not installed. Devin Local reads `.devin/agents/` and imports `.claude/agents/`; install for Claude Code as well if you want EndoStack's subagent definitions there. |
| Rules | A marked block in the project `AGENTS.md`, which Devin Desktop always loads |

The installer records every file it writes, with a hash, in `.endostack/install-manifest.json` (project) or `~/.endostack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

EndoStack skills use neutral verbs. In this agent they mean:

| EndoStack verb | Tool in Devin Desktop (formerly Windsurf) |
| --- | --- |
| Spawn a subagent | Devin Local subagents (tool name not documented) |
| Ask the user | not documented |
| Track a todo list | not documented |
| Run a shell command | not documented |
| Read a file | not documented |
| Edit a file | not documented |
| Search the codebase | not documented |
| Fetch a URL | not documented |
| Load a skill | automatic, or `@<name>` |
| Transcripts | Not readable. Devin Desktop does not document where it stores conversations. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Per-subagent model choice is not documented, so every EndoStack role runs on the session model. Panels vary each seat's brief instead of its model.

Role assignments live in `~/.endostack/models.toml` or the project's `.endostack/models.toml`, written by [setup-endostack](../../skills/setup-endostack/SKILL.md).

## What degrades here

- Tool names are not documented, so skills rely on their neutral wording and the agent picks its own tools.
- `recall`, `reflect`, `show-me-your-work` and `automate-me` cannot read past transcripts here. They say so and continue with the sources they can reach.
- Workflows are capped at 12,000 characters. EndoStack's workflows are short pointers to the skill file, so the cap does not bite.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): not documented.

## Sources

- <https://docs.devin.ai/desktop/cascade/skills>
- <https://docs.devin.ai/desktop/cascade/workflows>
- <https://docs.devin.ai/desktop/devin-local>
- <https://devin.ai/blog/windsurf-is-now-devin-desktop>
