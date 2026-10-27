# The tstack guide

This guide teaches one working habit. Tell the agent what you want and how you will check it, let [`tarique-mode`](../../skills/tarique-mode/SKILL.md) pick the playbook and the skills, and judge the result by the evidence it hands back. Most bad runs come from the opposite habit: a prompt that dictates every step, a finish line nobody can check, and a "done" accepted because the build went green.

On a first pass, go through the pages from 1 to 10. Later you can open any single page as a standalone reference.

| Page | What it teaches |
| --- | --- |
| [1. Setup](01-setup.md) | Install tstack, run `/setup-tstack`, control cost, and run a first small task. |
| [2. Working with tarique-mode](02-tarique-mode.md) | How the router picks a playbook, and what a good prompt contains. |
| [3. Understand before changing](03-understand.md) | `how`, `why`, `teach` and `recall`, and read-only investigations. |
| [4. Design before code](04-design.md) | Comparing designs with `architect` and `arena`, wide checks with `swarm`, review with `interrogate`, then prototypes, plans and threat models. |
| [5. Build and clean](05-build-and-clean.md) | What to say for bugs, features, refactors and perf work, plus `tdd` and cleanup. |
| [Page 6, verify and ship](06-verify-and-ship.md) | Evidence, verification skills, security review, and getting PRs merged. |
| [7. Overnight](07-overnight.md) | Unattended runs, decision logs, and PR queues. |
| [8. Principles](08-principles.md) | The principle skills, and steering a run by naming one. |
| [Page 9, make it yours](09-make-it-yours.md) | `automate-me`, `reflect`, `correct`, and writing your own skills. |
| [Page 10, recipes and pitfalls](10-recipes-and-pitfalls.md) | Short prompts that work, and the mistakes that waste a run. |

## When you are not sure which skill fits

Ask [`/tarique-help`](../../skills/tarique-help/SKILL.md). It reads the relevant skill file, answers your question, gives you one prompt you could send, and links the source. It does not start the work. tstack runs spend real tokens, so the decision to start one stays with you, and the help skill runs only when you type it.

```text
/tarique-help I have a flaky test that only fails in CI. Which skill?
```

## If you remember one thing

Describe, in plain language, the outcome you want and how you will confirm it. Playbook names are optional. This prompt carries enough signal for the router:

```text
/tarique-mode Saving a draft twice in a row creates two drafts instead of one.
Reproduce it first, then fix it and show me it no longer happens.
```

"Reproduce it first" sends the run down the bug-fix playbook. "Show me it no longer happens" tells the agent what evidence you will accept: the same reproduction, run again after the fix, with its output pasted. Everything else (finding the cause, checking for a security angle, ordering the commits, writing the PR) comes from the playbook.

Next: [1. Setup](01-setup.md)
