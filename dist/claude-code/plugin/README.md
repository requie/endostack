# EndoStack for Claude

Security-first workflows for coding agents. EndoStack makes Claude read code before changing it, compare more than one design, and check its result by running what a user would run. When a change touches a trust boundary (input parsing, file paths, auth, secrets, outbound calls), Claude threat-models it before building and runs a security review on the diff before shipping. Text Claude reads from issues, web pages, logs and tool output is treated as data, never as instructions.

This plugin is built from the [EndoStack repository](https://github.com/requie/endostack), which also packages it for Cursor, Codex, Gemini CLI, GitHub Copilot and other coding agents.

## Start here

Install it from Claude Code with `/plugin install endostack --marketplace requie/endostack` (Claude Code 2.1.275 or later), or add it from the Claude directory.

- Type `/try-endostack` for a five-minute demo. It sets up a small file server whose reported bug has an obvious one-line fix that leaks the app's `.env` file, hands you a prompt for `/tarique-mode`, and then compares both fixes with one check script.
- On your own code, type `/tarique-mode Fix <issue link, or one sentence describing the broken behavior>.`
- Optionally run `/setup-endostack` to choose which model each role uses. Every role has a default, so this step can wait.
- Ask `/tarique-help` which skill fits a situation. It answers with one prompt and starts no work.

The plugin contains 61 skills (36 workflows and 25 principles) and two subagents. One workflow from the repository, `make-bot-ui`, is left out here because it has you store a webhook secret for a local relay; the EndoStack installer adds it if you want it. The [quickstart](https://github.com/requie/endostack/blob/main/docs/quickstart.md) and the [guide](https://github.com/requie/endostack/blob/main/docs/guide/README.md) cover every workflow.

## What the plugin runs, reads, and sends

The plugin has no hooks and no MCP servers, and nothing in it runs on its own. Skills are instructions Claude follows. Some skills tell Claude to run a Node.js script that ships inside the plugin, and Claude runs it with your usual permission prompts.

| Script | Runs when | Reads | Network |
| --- | --- | --- | --- |
| `skills/statechart/scripts/statechart` | You ask for a TLA+ model check | The spec and config you point it at | On first use, downloads `tla2tools.jar` version 1.7.4 from the official TLA+ GitHub release (github.com/tlaplus/tlaplus), verifies its SHA-256, and caches it under `~/.cache/endostack/statechart`. Set `TLA2TOOLS` to use your own copy, or `STATECHART_NO_DOWNLOAD=1` to forbid the download. It needs Java 11 or later, which it never installs |
| `skills/tarique-mode/scripts/watch-pr/watch-pr` | A shipping playbook watches a pull request | The PR's checks, review threads and merge state | Calls the GitHub API through the GitHub CLI (`gh`), using the login `gh` already has. Nothing else |
| `skills/tarique-mode/scripts/orch/orch` | An orchestrated multi-PR run keeps its records | Files in its own store folder in your repository | Lists your open pull requests through `gh` |
| `skills/tarique-mode/scripts/worktree-audit.mjs` | You ask to clean up git worktrees | Your git worktrees, and your Claude Code transcript folder for that repository, to show when each worktree was last discussed | Lists your pull requests through `gh` |
| `skills/tarique-mode/scripts/doctor.mjs` | You ask what tools are missing | Versions of node, git, gh and java | None. It runs `gh auth status` to report whether `gh` is signed in, without reading the token |
| `skills/tarique-mode/scripts/check-plan.mjs` | A multi-phase plan is checked | The plan file | None |
| `skills/show-me-your-work/scripts/log.mjs` | A long run keeps a decision log | Nothing | None. Appends rows to a TSV file in your repository |

The `recall`, `catch-up` and `reflect` skills read Claude Code's own transcripts for the current project so Claude can summarize past work. They read them on your machine and send nothing anywhere.

EndoStack collects no data. It has no telemetry, no analytics and no account. Whatever Claude sends to Anthropic while it works is covered by your Claude terms, not by this plugin. The full [privacy policy](https://github.com/requie/endostack/blob/main/docs/privacy.md) has the details.

The `/try-endostack` demo includes a deliberately vulnerable sample app. Its check script writes a `.env` file holding one marker line into the demo folder, and the app is served only on 127.0.0.1.

## Support and security

Open an issue at [github.com/requie/endostack/issues](https://github.com/requie/endostack/issues). Report security problems privately through the repository's [security page](https://github.com/requie/endostack/security), as its SECURITY.md describes.

## License

MIT. See LICENSE.
