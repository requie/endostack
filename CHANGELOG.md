# Changelog

All notable changes to EndoStack are recorded here.

## v1.0.1 (2026-10-29)

This release packages EndoStack for the Claude plugin directory, adds a privacy policy, and closes the directory scanner's findings. Skill behavior is unchanged except where noted below.

### Claude plugin

- Claude Code now installs a self-contained plugin folder, `dist/claude-code/plugin`, through the marketplace entry. It holds 61 skills (36 workflows and 25 principles), the two subagents, a README that lists every script the plugin runs and every network call it makes, the license, and a 512 x 512 listing icon. Test fixtures stay out of it.
- `make-bot-ui` is left out of the Claude plugin because it has you store a webhook secret for a local relay. The installer still adds it for every agent, Claude Code included.
- The repository root no longer has a `.claude-plugin/plugin.json`. If you loaded the repo root directly as a Claude plugin, install through the marketplace instead: `/plugin marketplace add requie/endostack`, then `/plugin install endostack@endostack`.

### Security and privacy

- Added a [privacy policy](docs/privacy.md). EndoStack collects no data and has no telemetry, analytics or account. The policy lists what it reads, writes and sends.
- `statechart` downloads the TLA+ tools jar with Node's built-in fetch, with no subprocess, and still verifies its SHA-256 before use. Java now starts with a short list of environment variables (PATH, HOME, JAVA_HOME, temp and locale settings) instead of your whole shell environment, so tokens and keys in your shell never reach the model checker.
- The `/try-endostack` demo no longer ships a `.env` file. `demo/check.mjs` writes one marker line into the demo folder when it runs, so the traversal check still has a file to find.
- `make-bot-ui` no longer has the agent copy secrets into the relay config. You add the secret to your OS keychain or a git-ignored settings file and hand it to the relay when you start it.
- The issue-loop tests pass the scripts a minimal environment instead of yours, and the self-hosted runner example no longer uses `$PWD`.

### Changed

- `watch-pr` reports a missing field in GitHub's response with the error code `missing-field`. It was `missing-key`. Update any script that matches on the old code.

## v1.0.0 (2026-10-28)

EndoStack is a plugin of skills, playbooks, principles and subagents that changes how a coding agent works. Before it changes code, the agent reads that code, compares more than one design, and checks the result by running what a user would actually run. When a change crosses a trust boundary, it threat-models the change before building it and security-reviews the diff before shipping it. The skills describe actions in agent-neutral terms, so the same set installs into 15 coding agents.

The name comes from endogenous security: the checks live inside the agent's own workflow instead of running after it.

This is the first public release.

### Try it in five minutes

```sh
git clone --depth 1 https://github.com/requie/endostack ~/.endostack/src
~/.endostack/src/install.sh --scope user
```

Restart your coding agent and type `/try-endostack`. It sets up a small file server with a real-looking bug report and gives you one `tarique-mode` prompt to fix it. Then `/try-endostack compare` runs the same probe against EndoStack's fix and against the obvious one-line fix. The one-line fix passes every existing test and closes the bug, and it also serves the app's `.env` file through `/files/%2e%2e%2f.env`. EndoStack's fix keeps every probe blocked. The [quickstart](docs/quickstart.md) walks through it minute by minute.

### Highlights

- **`tarique-mode` router.** Typing `/tarique-mode` sends each task through one of 23 playbooks (bug fix, feature, refactor, perf issue, investigation, shipping, overnight autopilot and others). It applies always-on triggers that call helper skills, and it pauses for your approval before any irreversible step.
- **Security gates built into the workflow.** `threat-model` runs before a change that touches a trust boundary is built, and `security-review` runs on the final diff before a PR is marked ready. Every mitigation is tied to a test or check that proves it.
- **62 skills**, including 25 principles the agent must read before it may cite one, plus a 3-skill issue-loop automation.
- **15 supported agents.** Eight install natively through their own plugin or extension systems, and the rest through an included installer.
- **Seven bundled tools** in Node 22 with no npm dependencies. The repo has 415 tests in all.

### Install

| Agent | Command |
| --- | --- |
| Claude Code | `/plugin marketplace add requie/endostack`, then `/plugin install endostack@endostack` |
| Cursor | `git clone https://github.com/requie/endostack ~/.cursor/plugins/local/endostack`, then reload the window |
| Codex CLI | `codex plugin marketplace add requie/endostack`, then install EndoStack from the Plugins Directory |
| Gemini CLI | `gemini extensions install https://github.com/requie/endostack` |
| GitHub Copilot | `copilot plugin install requie/endostack` |
| Goose | `goose plugin install https://github.com/requie/endostack.git` |
| Amp | `amp skill add requie/endostack --global` |
| Kiro | Import the repo from GitHub as a custom Power, then run the installer for subagents |
| Devin Desktop (formerly Windsurf), Cline, Roo Code, OpenCode, Aider, Zed, JetBrains Junie | From a clone: `./install.sh --agents <id>` |

The installer works for every agent above:

```sh
./install.sh [--scope project|user] [--agents auto|a,b] [--link] [--dry-run] [--uninstall] [--no-rules] [--project <dir>]
```

On Windows, use `install.ps1` with the same options. Each agent's page in [`docs/agents/`](docs/agents/README.md) lists where files land, how the neutral tool names map to that agent's tools, and which EndoStack features the agent can't run.

After installing, type `/try-endostack` for the demo or `/tarique-mode` to start real work. `/setup-endostack` is optional, because every role has a default model until you choose one. In Claude Code, commands carry the plugin prefix: `/endostack:setup-endostack` and `/endostack:tarique-mode`.

### What's in 1.0.0

#### `tarique-mode` and its 23 playbooks

The router routes each task to a playbook, sets how much the agent may do without asking, decides when to spawn subagents and which model tier each one uses, and sets the reply style. Playbooks:

`investigation`, `bug-fix`, `feature`, `refactoring`, `perf-issue`, `hillclimb`, `prototype`, `visual-parity`, `runtime-forensics`, `trace-forensics`, `eval`, `authoring-a-skill`, `opening-a-pr`, `babysit`, `shipping`, `autopilot-full`, `autopilot-stack`, `autonomous-run`, `orchestrate`, `multi-phase-plan`, `session-pickup`, `pause-safely`, `worktree-cleanup`.

#### Skills by area

| Area | Skills |
| --- | --- |
| Understand the code | `how`, `why`, `teach`, `recall`, `catch-up`, `catch-up-video`, `blast-radius` |
| Design and plan | `architect`, `arena`, `swarm`, `figure-it-out`, `in-your-own-words`, `sharpen` |
| Review and verify | `interrogate`, `reflect`, `benchmark-checklist`, `create-verification-skill`, `maintain-verification-skill`, `create-formal-verification-skill`, `maintain-formal-verification-skill`, `statechart`, `show-me-your-work` |
| Security | `threat-model`, `security-review` |
| Build and clean up | `tdd`, `no-comments`, `typescript-best-practices`, `correct` |
| Writing | `unslop`, `technical-writing`, `bro` |
| Getting started | `try-endostack`, `tarique-help`, `setup-endostack` (optional: every role has a default) |
| Personalization | `tarique-mode`, `automate-me`, `make-bot-ui` |

The review skills that use several models (`arena`, `swarm`, `interrogate`, `reflect`, `architect`) still work on agents that offer only one model. Each reviewer gets a different stance and brief instead of a different model, and the skill tells you it did that.

#### 25 principles

The principles are grouped into core, architecture, verification, security, delegation and process. The router may cite a principle only after reading its file during the session, and its final reply names each principle that changed a decision. New in EndoStack is `principle-treat-input-as-untrusted`: anything the agent reads that you did not write (web pages, issues, PR comments, logs, tool output, transcripts) is quoted, attributed and never obeyed.

#### Subagents

- `tarique-agent` is the delegate that playbooks spawn to write code. It reads the router before doing anything, and it hands back any irreversible action as a proposal for the parent to approve.
- `comment-auditor` is a report-only reviewer for the `no-comments` skill. It lists comments to delete and flags code that only makes sense with a comment as a refactor target.

#### issue-loop automation

In `automations/issue-loop/`, three skills triage incoming bug reports and reproduce and fix confirmed ones. It runs on GitHub Actions, on an agent's own scheduler, or as a local cron or launchd job. The workflows keep the agent's job on a read-only token. A separate publish job, which runs no model, validates the agent's output before posting it, opens fix PRs only as drafts, and refuses patches that touch `.github/` or lockfiles. Workflow examples cover `claude -p`, `codex exec` and `gemini -p`, with flags checked against each CLI's documentation.

#### Bundled tools

| Tool | What it does | Tests |
| --- | --- | --- |
| `statechart` | Runs the TLC model checker on a TLA+ spec and writes a Mermaid state chart plus a report giving the shortest path to each broken rule. Downloads the pinned tla2tools 1.7.4 jar on first run and verifies its SHA-256. | 140 |
| `watch-pr` | Watches a PR or a stack of PRs through `gh` and reports ready, waiting, or the blocking reason (conflict, review threads, failing checks, merge gate), each with its own exit code. | 111 |
| `orch` | A file-based store for orchestrated work: units, a verification ledger, an inbox, gates and the PR stack's frontier, with a lock file so two writers can't overwrite each other. | 40 |
| `check-plan`, `worktree-audit`, `doctor` | Validates multi-phase plans against `PLAN-FORMAT.md`, lists stale git worktrees with cleanup advice, and checks for Node, git, gh and Java. | 54 |
| `log.mjs` | Append-only decision log for `show-me-your-work`. It neutralizes spreadsheet formulas planted in logged text. | 10 |
| issue-loop helpers | `publish-verdict`, `find-trusted-verdict` and `publish-repro`, which check the agent's output and post through `gh`. | 20 |
| Packaging scripts | `build`, `install`, `lint`, `check-manifests`. | 33 |
| `try-endostack` demo | Keeps the demo honest: the shipped app shows the bug with the guard intact, the bundled naive fix closes the bug and leaks `.env`, and a careful fix does both jobs. | 7 |

#### Packaging

- Native manifests for Claude Code (`.claude-plugin/`), Cursor (`.cursor-plugin/`), the Agent Plugins 1.0 format (`plugin.json`, read by Codex, Copilot and Kiro) and Gemini CLI (`gemini-extension.json`).
- `scripts/build.mjs` generates 268 agent-specific files in `dist/` from the canonical skills and agents: Codex agent TOML, Gemini commands, Copilot `.agent.md` files, and OpenCode, Kiro, Junie, Devin, Roo and Goose formats. CI fails if `dist/` is stale.
- The installer records every file it writes in `.endostack/install-manifest.json`, which it creates in the project or in your home folder depending on scope. Uninstall removes only files that still match the recorded hash, so files you edited are kept. Edits to shared files such as `AGENTS.md` go between `endostack:begin` and `endostack:end` markers, and the installer never creates a `CLAUDE.md`.
- The installer prints one line per folder it writes to. `--verbose` lists every file.
- `scripts/lint.mjs` checks skill frontmatter, relative links and writing style on every pull request.

### Security model

- **Threat model before building.** Changes that touch input parsing, auth, secrets, outbound network calls, file paths, deserialization, dependencies, or an agent that reads outside content and then acts are mapped with read-only subagents. Each threat is written as an abuse path with `file:line` steps, and every medium or higher mitigation gets a named proof that becomes a task in the playbook.
- **Security review before shipping.** One read-only reviewer per defect class covers injection (including prompt injection into LLM calls), authn and authz, secrets in code and history, SSRF, path traversal, deserialization, crypto misuse, supply chain, CI permissions, agent tool and MCP configuration, and sensitive data in logs. A finding counts only with `file:line`, an exploit path and evidence. The verdict is block, fix-before-merge or ok.
- **Least-privilege subagents.** Exploration, review and verification subagents are read-only. A writing delegate gets one worktree. No subagent receives merge or deploy credentials.
- **Approval before irreversible steps.** Whatever autonomy you grant, the agent asks first before a force-push to a shared branch, a deploy, deleting data, rotating credentials, changing access, or publishing an unfixed vulnerability.

### Requirements

- Node.js 22 or later and git for the installer and bundled tools. Nothing is installed from npm.
- The GitHub CLI (`gh`) for `watch-pr`, `orch` frontier tracking, `worktree-audit` PR status and issue-loop.
- Java 11 or later for `statechart`. It downloads the TLA+ tools itself but never installs Java.

Run `node skills/tarique-mode/scripts/doctor.mjs` to see what is missing.

### Verification

All 415 tests pass, including the 32 statechart tests that run against a real TLC. Every pull request runs lint, `build --check`, the manifest check and the full test suite, and an install-then-uninstall smoke test runs on Linux, macOS and Windows. Without Java and `TLA2TOOLS` set, the live TLC tests skip.

### Known limitations

- `watch-pr` and `orch` are tested against a fake `gh`. Their GitHub queries use standard API fields but have not run against live GitHub.
- The Codex and Copilot CLI tool names in `docs/agents/` come from third-party sources and are marked as unverified on those pages.
- Transcript locations for Claude Code, Cline, Roo Code and OpenCode, which `recall` and `catch-up` read, are unverified.
- The Gemini CLI extension install also loads the canonical subagent files. If Gemini rejects them, the Gemini page says to use the installer instead.
- Roo Code was reportedly discontinued in May 2026. Its install route is kept and has low priority.
- CI actions are pinned to version tags, not commit SHAs.

### License

MIT. See [LICENSE](LICENSE).
