# ttstack in Amp

Amp reads skills from `.agents/skills/` and several other directories, and has a built-in Task subagent. Custom subagents and commands exist only as TypeScript plugins, which ttstack does not ship.

## Install

**Skill installer:**

```sh
amp skill add requie/ttstack --global
```

**Files, one project:**

```sh
./install.sh --scope project --agents amp
```

**Files, every project:**

```sh
./install.sh --scope user --agents amp
```

Run the installer from a clone of the ttstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` |
| Subagents, commands | Not installed. Amp defines both only in TypeScript plugins. |
| Rules | A marked block in the project `AGENTS.md` |

The installer records every file it writes, with a hash, in `.ttstack/install-manifest.json` (project) or `~/.ttstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

ttstack skills use neutral verbs. In this agent they mean:

| ttstack verb | Tool in Amp |
| --- | --- |
| Spawn a subagent | Task |
| Ask the user | not documented |
| Track a todo list | not documented |
| Run a shell command | not documented |
| Read a file | not documented |
| Edit a file | not documented |
| Search the codebase | not documented |
| Fetch a URL | not documented |
| Load a skill | automatic, or `/<name>`; `reload_skills` rescans |
| Transcripts | Not readable from disk. Amp keeps threads on its server (unverified). |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

Every subagent runs on the model Amp picks for Task; ttstack cannot choose per role. Panels vary each seat's brief instead of its model.

Role assignments live in `~/.ttstack/models.toml` or the project's `.ttstack/models.toml`, written by [setup-ttstack](../../skills/setup-ttstack/SKILL.md).

## What degrades here

- `tarique-agent` and `comment-auditor` are not registered as named subagents. Skills spawn Task with the agent definition pasted into the brief.
- Amp also scans `~/.claude/skills/` and `~/.claude/plugins/cache/`. With ttstack installed for Claude Code too, each skill appears twice; the copies are identical.
- `recall`, `reflect`, `show-me-your-work` and `automate-me` cannot read past transcripts from disk.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `amp -x "<prompt>"` (unverified).

## Sources

- <https://ampcode.com/manual/agent-skills.md>
- <https://ampcode.com/docs/models-and-subagents>
- <https://ampcode.com/docs/customize/agents-md>
