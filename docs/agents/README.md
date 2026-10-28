# ttstack per agent

ttstack ships one set of skills (`skills/<name>/SKILL.md`) and two subagent definitions (`agents/`). `scripts/build.mjs` turns them into each agent's native agent and command files under `dist/`, and `install.sh` (or `install.ps1`) copies the right ones into place. Each page below lists the install command, where files land, the tool that each ttstack verb maps to, where transcripts are stored, how subagent models are chosen, and what does not work in that agent.

| Agent | Subagents | Model per subagent | Readable transcripts |
| --- | --- | --- | --- |
| [Claude Code](claude-code.md) | yes | yes | yes |
| [Cursor](cursor.md) | yes | yes | yes |
| [Codex CLI](codex.md) | yes | yes | yes |
| [Gemini CLI](gemini-cli.md) | yes | yes | yes |
| [GitHub Copilot](copilot.md) | yes | yes | yes |
| [Devin Desktop (formerly Windsurf)](devin-desktop.md) | yes | no | no |
| [Cline](cline.md) | yes | no | yes |
| [Roo Code](roo-code.md) | no | no | yes |
| [OpenCode](opencode.md) | yes | yes | yes |
| [Amp](amp.md) | yes | no | no |
| [Kiro](kiro.md) | yes | yes | no |
| [Aider](aider.md) | no | no | yes |
| [Zed](zed.md) | yes | no | no |
| [JetBrains Junie](junie.md) | yes | yes | no |
| [Goose](goose.md) | yes | yes | yes |

## Installer quick reference

```sh
./install.sh                               # this project, every detected agent
./install.sh --scope user                  # your home directory, every project
./install.sh --agents codex,kiro --dry-run # named agents, print only
./install.sh --link                        # symlink, so git pull updates the install
./install.sh --uninstall                   # remove exactly what was written
```

Detection looks for each agent's home directory (for example `~/.codex`), its CLI on `PATH`, its editor extension, or, for project installs, its folder in the project. Pass `--agents` to skip detection.

Skills go to `.agents/skills/` once for every agent that reads that folder, plus `.claude/skills/`, `.cline/skills/` and `.kiro/skills/` for the three agents that do not. Several agents read both `.agents/skills/` and `.claude/skills/`, so installing for Claude Code by files makes skills appear twice in Cursor, Copilot, OpenCode, Amp and Goose. Use the Claude Code plugin instead; the installer then skips `.claude/` and says so.

When the installer edits a shared file (`AGENTS.md`, an existing `CLAUDE.md` or `GEMINI.md`, `.aider.conf.yml`), it writes only between `ttstack:begin` and `ttstack:end` markers, and uninstall removes only that block.

## Capabilities that vary by agent

- **Parallel subagents.** `swarm`, `arena`, `interrogate`, `security-review` and `architect` spawn several subagents at once. Without subagents (Aider, Roo Code) they run the briefs one after another in one context.
- **Model per subagent.** Multi-model panels assign a different model to each seat. Where every subagent runs on the session model, panels vary each seat's brief and stance instead.
- **Transcripts.** `recall`, `reflect`, `show-me-your-work` and `automate-me` read the agent's stored chats. Where transcripts are not readable, those steps are skipped with a one-line note.
- **Named subagents.** Agents without custom subagent files (Cline, Amp, Zed, Roo Code, Aider) cannot spawn `tarique-agent` or `comment-auditor` by name. When a skill names one of them, spawn a general subagent and paste the definition from `agents/` into its brief.
- **User-only commands.** `disable-model-invocation: true` keeps command-style skills (such as `tarique-mode`) from loading on their own in Claude Code, Cursor, Copilot and Zed. Codex gets the same effect from `agents/openai.yaml`. Other agents ignore the flag, so those skills' descriptions also say to load them only on request.
