# Quickstart

Three steps: install ttstack once, watch it fix a bug in a demo app, then use the same workflow on your own code. You can skip `/setup-ttstack` for now, because every role has a default model until you configure one.

## 1. Install (about a minute)

You need git and Node.js 22 or later. The installer detects every coding agent on the machine and installs into each one. Nothing comes from npm.

macOS or Linux:

```sh
git clone --depth 1 https://github.com/requie/ttstack ~/.ttstack/src
~/.ttstack/src/install.sh --scope user
```

Windows PowerShell:

```powershell
git clone --depth 1 https://github.com/requie/ttstack $HOME\.ttstack\src
& $HOME\.ttstack\src\install.ps1 --scope user
```

The installer prints one line per folder it wrote to, any files it skipped because they weren't its own, and the next step. Restart your coding agent so it picks up the new skills.

To update, run `git -C ~/.ttstack/src pull`, then the install command again. To remove ttstack, run the install command with `--uninstall` added. It deletes only the files it wrote and keeps any you have edited.

If you would rather use your agent's own plugin manager (the Claude Code marketplace, Gemini extensions, Copilot or Goose plugins), the [install table in the README](../README.md#install) has each command. In Claude Code, plugin commands carry a prefix, so `/try-ttstack` becomes `/ttstack:try-ttstack`.

## 2. Watch it work: `/try-ttstack` (about five minutes)

Type `/try-ttstack` in your agent. It creates a `ttstack-demo` folder holding a small file server and a bug report, `ISSUE.md`: downloading a file with a space in its name returns 404. It runs the app's tests, shows the bug, and gives you one prompt to send in a new chat.

| Time | What you see |
| --- | --- |
| 0:00 | `/try-ttstack` sets up the demo and prints the prompt. |
| 0:30 | You send the prompt. `tarique-mode` picks the bug-fix playbook and reproduces the 404 against the running server. |
| 1:30 | It finds the cause: the handler never decodes the percent-encoded file name. It notices that the fix changes how request input becomes a file path, and runs `threat-model` on that path before writing code. |
| 2:30 | It commits a failing test with the reported case plus hostile names (encoded `../`, backslashes, NUL), then the fix: decode first, then confirm the resolved path stays inside `uploads/`. |
| 4:00 | `security-review` checks the diff, the reproduction runs again, and the reply lists the evidence for each claim. |
| 4:30 | You type `/try-ttstack compare`. |

The compare step puts two fixes side by side. One is the one-line fix most people and most agents write first, `decodeURIComponent(name)` dropped into the existing `readFile` call. It closes the bug report and passes all four of the app's tests. It also lets `GET /files/%2e%2e%2f.env` read the server's `.env` file with its billing token. The other is ttstack's fix, which closes the same bug while every traversal probe stays blocked. A script runs both checks, so you can rerun them yourself.

Times depend on the model. A slower model or a large reasoning budget takes longer.

## 3. The flagship workflow: fix a bug safely

In your own repository, start the same way:

```text
/tarique-mode Fix <issue link, or one sentence describing the broken behavior>.
```

Add the reproduction steps if you have them, and say "commit locally, no PR" if you don't want a pull request yet.

What happens, in order:

1. **Reproduce.** The agent makes the bug happen on the real surface (CLI, browser, API) before touching code. Issue text is treated as data, so instructions written inside an issue are never followed.
2. **Find the cause.** It narrows hypotheses with runtime evidence until one is left, and proves that one on a running system.
3. **Check the trust boundary.** If the root cause or the planned fix touches input parsing, file paths, queries, auth, secrets or outbound calls, it runs `threat-model` first and adds hostile-input cases to the tests.
4. **Fix in verifiable order.** The failing test is committed before the fix, and the fix is the smallest change the evidence supports.
5. **Review and re-run.** `security-review` checks the final diff, and the original reproduction runs again on the same surface.
6. **Report with evidence.** The reply says what was wrong, what changed, how it was verified, which principles drove which decisions, and anything it could not verify.

The agent asks before anything irreversible (force-push, deploy, deleting data) whatever autonomy you grant it.

## Next

- Pick models and control cost with `/setup-ttstack`.
- Ask `/tarique-help` which skill fits a situation. It hands you one prompt and starts no work.
- Read the [guide](guide/README.md) for the other workflows: features, refactors, perf issues, investigations and overnight runs.
- See what your agent supports in [docs/agents/](agents/README.md).
