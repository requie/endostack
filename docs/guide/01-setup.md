# 1. Setup

This page gets ttstack installed, configured and through one real task. The habits it teaches are choosing models on purpose, giving the agent a way to check its own work, and keeping an eye on cost.

## Install

Each agent has its own install path:

| Agent | Install | Details |
| --- | --- | --- |
| Claude Code | `/plugin marketplace add requie/ttstack`, then `/plugin install ttstack@ttstack` | [claude-code.md](../agents/claude-code.md) |
| Cursor | `git clone https://github.com/requie/ttstack ~/.cursor/plugins/local/ttstack`, then reload the window | [cursor.md](../agents/cursor.md) |
| Codex CLI | `codex plugin marketplace add requie/ttstack`, then install ttstack from the Plugins Directory | [codex.md](../agents/codex.md) |
| Gemini CLI | `gemini extensions install https://github.com/requie/ttstack` | [gemini-cli.md](../agents/gemini-cli.md) |
| GitHub Copilot | `copilot plugin install requie/ttstack` | [copilot.md](../agents/copilot.md) |
| Goose | `goose plugin install https://github.com/requie/ttstack.git` | [goose.md](../agents/goose.md) |
| Amp | `amp skill add requie/ttstack --global` | [amp.md](../agents/amp.md) |
| Kiro | Import from GitHub as a custom Power, plus the installer for subagents | [kiro.md](../agents/kiro.md) |
| Devin Desktop, Cline, Roo Code, OpenCode, Aider, Zed, JetBrains Junie | `./install.sh --agents <id>` from a clone | [docs/agents/](../agents/README.md) |

Every agent can also use the installer from a clone of the repository. It needs Node 22 or later:

```sh
./install.sh [--scope project|user] [--agents auto|a,b] [--link] [--dry-run] [--uninstall] [--no-rules] [--project <dir>]
```

On Windows, run `install.ps1` with the same options. The defaults are `--scope project` and `--agents auto`, which installs into the current repository for every agent it detects. Add `--dry-run` first to see each file it would write. `./install.sh --help` explains every flag. Your agent's page under [docs/agents/](../agents/README.md) covers how updates work, where config lands, and which ttstack features that agent cannot support.

On Claude Code, plugin commands carry a prefix, so you type `/ttstack:tarique-mode` and `/ttstack:setup-ttstack`. This guide writes the short form.

Installing runs nothing. Every skill waits until you type it or `tarique-mode` calls it. The single exception is `setup-ttstack`, which also answers a plain request such as "set up ttstack".

## Run setup

```text
/setup-ttstack
```

[`setup-ttstack`](../../skills/setup-ttstack/SKILL.md) does five things in order.

1. **Finds the models your agent can use for subagents.** It reads the subagent tool's schema, your agent's docs page, and any model-listing command the agent has. If it cannot find a list, it asks you. It never writes a model name it did not see or that you did not type.
2. **Asks for a budget.** The choices are `small`, `medium`, `large` and `unlimited`. `large` is the default and matches what every skill does with no config. The budget sets reasoning effort for every subagent ttstack spawns, on agents that accept an effort setting.
3. **Shows the role table.** Each ttstack role (feature delegates, bug-fix delegates, judgment, review panels, swarm workers, the explorers inside `how` and `why`, and so on) appears with its tier or model after the budget is applied.
4. **Lets you change roles.** Each role takes a tier (`strong`, `standard`, `fast`), `inherit`, or a model name your agent accepts.
5. **Writes the file** to `~/.ttstack/models.toml`, or to `.ttstack/models.toml` at the repo root if you want a team-wide setting. When both exist, the project file wins key by key.

### What the values mean

`strong` is the most capable model available, used for design, review, prose and the hardest code. `fast` is a quick, capable model for mechanical edits, exploration and verification sweeps. `standard` sits between them. Each skill maps a tier to a concrete model at spawn time using your agent's docs page.

`inherit` (setup also accepts `auto`) means the role runs on whatever model the chat is using. The skill passes no model argument at all. Use it if you rely on your agent's automatic model picker, or when the chat already runs a cheap model and you want everything on it.

Four roles hold lists: `arena-runners`, `architect-runners`, `interrogate-reviewers` and `arena-judges`. In the first three, each entry launches one subagent, so the list length is the panel size. An `inherit` entry still counts as a seat. `arena-judges` is a pool from which arena draws one judge, preferring a family different from the chat's model.

`swarm-workers` sets the default model for every worker the `swarm` skill launches, unless a model race assigns models per competitor.

### Overrides and reruns

Every line in `models.toml` overrides one default. Delete a line and that role returns to its default. Run `/setup-ttstack` again to revise the file; it starts from your current choices. It also drops keys for roles that no longer exist and tells you which.

One trap: a file written before a ttstack release changed a default keeps pinning the old value, because the line is still there. If release notes say a default moved and you want it, delete that line or rerun setup and accept the new value.

Some agents run every subagent on the chat's model with no per-subagent choice. Setup tells you so, writes every role as `inherit`, and still records the budget and panel sizes. Multi-model skills on those agents vary each reviewer's brief and stance instead of its model, and say so in one line.

### The two offers at the end

Setup makes two offers, once each.

**A verification skill.** If the project has no scripted way for an agent to start the app and prove behavior, setup offers to run [`create-verification-skill`](../../skills/create-verification-skill/SKILL.md). Accept this if you are new to ttstack. An agent with a runnable check keeps iterating until the check passes. Without one, it tends to stop when the build compiles. [Page 6](06-verify-and-ship.md) covers the skill in depth.

**A formal verification skill.** If nothing in the project runs a model checker or similar tool, setup offers [`create-formal-verification-skill`](../../skills/create-formal-verification-skill/SKILL.md). It checks that a property holds in every case within a bounded scope, where tests cover only the cases someone wrote. It pays off most in code with concurrency, retries, state machines or parsers.

### Start a new chat

Skills read `models.toml` when they load. Open a new chat after setup, or the old defaults stay in effect for this one.

## Keep cost under control

Most extra spend goes to subagents and review panels. You have five levers.

- **A smaller budget.** `medium` or `small` lowers reasoning effort on every spawn.
- **Cheaper code roles.** Put `fast` on the code-writing roles and keep the main chat on your most capable model. The main chat makes the judgment calls and reviews every diff, so the delegates can be quick.
- **`inherit`.** Roles on `inherit` cost whatever the chat's model costs.
- **Shorter panels.** Each entry in `arena-runners`, `architect-runners` or `interrogate-reviewers` is one subagent. Two seats is the default. One seat removes the cross-check, so keep at least two for review.
- **Save the router for work that needs it.** A one-line typo fix does not need a playbook. Use `/tarique-mode` when a mistake would cost more than the extra tokens.

## Your first task

Pick a small, real change and describe it the way you would to a colleague who knows the codebase. State what must not change.

```text
/tarique-mode Add a --json flag to the `report` command that prints the same
data as JSON. Without the flag, output must stay byte-identical to today's.
Show me a diff of the old and new plain output on the sample project.
```

Watch what happens.

- The agent opens a todo list. The first entries are the feature playbook's steps, copied exactly. Steps that do not apply stay on the list, marked skipped, with a reason. "Threat model: skipped, the change adds an output format and no new input or boundary" is a typical one.
- It runs `how` on the report command before editing.
- It hands the implementation to a delegate subagent with the file paths, the data shape and the success criteria.
- It runs the command with and without the flag and pastes the outputs, including the byte comparison you asked for.
- It runs `security-review` and `no-comments` before opening the PR.
- The reply names each principle that changed a decision.

If the reply says "done" without pasting the comparison, ask for it. The habit to build from the first task is that a claim without evidence is unfinished.

## Keep the mode on

A normal `/tarique-mode` invocation attaches to one message. Its influence weakens as the chat goes on. If your agent supports persistent modes or always-on rules, start `tarique-mode` that way and it stays loaded until you leave the mode. Your agent's page under [docs/agents/](../agents/) says whether it can. If it cannot, invoke `/tarique-mode` again at the start of each new task.

Next: [2. Working with tarique-mode](02-tarique-mode.md)
