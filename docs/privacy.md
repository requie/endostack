# EndoStack privacy policy

Effective October 29, 2026

EndoStack collects no personal data. It has no accounts, no telemetry, no analytics and no server of its own. It is open-source software, published by Tarique Smith under the MIT license at [github.com/requie/endostack](https://github.com/requie/endostack), that runs on your computer inside the coding agent you already use. This policy explains what EndoStack reads, what it writes, and the few network requests its tools make on your behalf.

## What EndoStack is

EndoStack is a set of skills (instructions your coding agent follows), two subagent definitions, and a few Node.js scripts. You install it into an agent such as Claude Code, Cursor, Codex, Gemini CLI or GitHub Copilot. Nothing in it runs on its own: a skill does something only when you invoke it or your agent follows it, and a script runs only when your agent runs it, under your agent's normal permission prompts.

## Data we collect

None. The author of EndoStack does not receive, see or store any information about you, your code or how you use EndoStack. There is no usage tracking, crash reporting, cookie or device identifier in the software.

## What EndoStack reads on your computer

To do the work you ask for, your agent and EndoStack's scripts read data that is already on your computer or in your accounts. This can include names and email addresses, for example in git commit authors or chat messages. All of it is read locally and none of it is sent to the author.

| Source | Read when | By |
| --- | --- | --- |
| Your code, files and git history | Most workflows | Your agent, following EndoStack's skills |
| Your coding agent's own chat transcripts for the current project | You use `recall`, `catch-up` or `reflect`, or the worktree cleanup audit | Your agent and the `worktree-audit` script |
| Pull requests, checks and review threads on GitHub | You use the PR watcher, the orchestrator or the worktree audit | The scripts, through the GitHub CLI and your own GitHub login |
| Slack, Linear, Notion, Sentry, Datadog, Databricks or other connected tools | You use the `why` skill and have connected those tools to your agent | Your agent, through connectors you set up |
| Versions of node, git, gh and java | You run the `doctor` script | The script. It checks whether the GitHub CLI is signed in without reading your token |

EndoStack treats text it reads from issues, web pages, logs, transcripts and tool output as data. It never follows instructions written inside that text.

## Network requests

EndoStack's own code makes two kinds of network requests, both only when you use the feature that needs them:

- **TLA+ tools download.** The first time you use the `statechart` model checker, it downloads `tla2tools.jar` version 1.7.4 from the official TLA+ release on GitHub (github.com/tlaplus/tlaplus), checks its SHA-256 checksum, and caches it on your computer. GitHub receives that download request under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). You can supply your own copy instead and turn the download off.
- **GitHub API.** The PR watcher, the orchestrator and the worktree audit call the GitHub API through the GitHub CLI (`gh`), using the login `gh` already has, to read pull request status for your own repositories.

Your coding agent sends your prompts and the content it works with to its model provider (for example Anthropic, OpenAI, Google or GitHub). That traffic is governed by your agreement with that provider and its privacy policy. EndoStack does not add to it, receive it or control it.

## Optional components you set up yourself

- **issue-loop automation.** If you choose to install it, it runs in your own GitHub Actions, your agent's scheduler, or a cron job on your machine. It reads issues in your repository and calls the coding-agent CLI and model provider you configure, with API keys you store in your own secrets. EndoStack's author has no access to any of it.
- **make-bot-ui.** If you build a bot page with this skill, its relay runs on your machine and reads a secret you store in your own keychain or `.env` file. It sends requests only to the agent platform you choose.

## What EndoStack writes on your computer

| File or folder | Contents |
| --- | --- |
| `~/.endostack/` and `.endostack/` in a project | Your model settings and the installer's record of files it wrote |
| `~/.cache/endostack/statechart/` | The downloaded TLA+ tools jar |
| Files in your repository that you ask for | Decision logs, plans, threat models and other work output |
| An `endostack-demo` folder | The `/try-endostack` demo app, created only when you run the demo |

You can delete any of these at any time. Running the installer with `--uninstall` removes the files it wrote and keeps any you edited.

## Third-party marketplaces

If you install EndoStack from a marketplace or directory, such as the Claude directory, Cursor, the Gemini CLI extensions gallery or a GitHub-hosted plugin list, that service's own privacy policy covers your use of it. GitHub hosts the EndoStack repository and its issue tracker under its own privacy statement.

## Children

EndoStack is a developer tool and is not intended for anyone under 18.

## Changes to this policy

Changes are published in the EndoStack repository, where every revision stays visible in its history. The effective date above shows when this version took effect.

## Contact

Questions about this policy: open an issue at [github.com/requie/endostack/issues](https://github.com/requie/endostack/issues). Security problems: report them privately through the repository's [security page](https://github.com/requie/endostack/security).
