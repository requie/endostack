# issue-loop

issue-loop automates the first hour of a bug report. When someone opens a GitHub issue or posts a report in a chat channel, a triage run reads it, traces the likely cause in your code, deduplicates against your tracker, and replies once with a verdict. If the verdict is `bug` or `performance`, a second run reproduces the symptom twice through your app's real UI inside a sandbox, records video and screenshots, and checks whether an existing pull request already fixes it. With a confirmed reproduction it may open one small draft pull request carrying before-and-after evidence. A person reviews and merges every change.

## Getting started

Start your coding agent anywhere, tell it which repository should get issue-loop, and give it [FOR_AGENTS.md](FOR_AGENTS.md) to read. The agent copies the pack into that repository, asks for your intake source, tracker, app-control skill, and runner, writes a config outside the pack, and walks you through a test report before any real traffic.

## What you need

- A repository with branch protection that requires human review on the default branch.
- A tracker the agent can search and write (GitHub Issues, Linear, Jira, or another with an adapter).
- A skill that can start your app in a test environment and drive its UI (browser, desktop, or terminal automation). Without it, triage still works and reproduction stays off.
- One runner: GitHub Actions, your agent's own scheduled automations, or a cron or launchd job on a machine you control. [The runner guide](skills/setup-issue-loop/references/runners.md) has example workflows for Claude Code, Codex, and Gemini CLI.

## Security model

Issue text, comments, and attachments come from whoever can file an issue. Both automations treat that content as data, never as instructions, never run commands copied from it, and never post secrets. Reproduction runs in a container with test credentials only. Workflow tokens get the smallest permission set each job needs, and fixes land as drafts that a person must review.
