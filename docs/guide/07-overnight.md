# 7. Overnight

An agent can work for hours without you. Whether that time produces anything you can use depends on the setup before you leave. This page covers the prerequisites, the contract you give the agent, the loop it runs, and the record it leaves. The habits are to earn trust before granting autonomy, to give a finish line instead of a duration, and to require a decision log you can audit in the morning.

## Before you loop

Four conditions should hold before you leave an agent running.

1. **You have done the task once by hand, with the agent.** You know what a good result looks like and where it goes wrong.
2. **The agent has your tools.** It can build, run the tests, start the app and drive it. If you need a verification skill, build it first ([page 6](06-verify-and-ship.md)).
3. **Every stage proves its own output and can stop the line.** A step that cannot tell success from failure will report success.
4. **You have read the transcripts of earlier runs and turned repeated failures into tools.** If the agent fumbled the same setup step three times while you watched, script it before you leave. [`correct`](../../skills/correct/SKILL.md) and [`reflect`](../../skills/reflect/SKILL.md) help ([page 9](09-make-it-yours.md)).

## The overnight contract

An unattended prompt states four things: the goal, the finish condition, what you permit, and what to do when stuck.

```text
/tarique-mode I'm going to bed, don't wait on me. Goal: the import pipeline handles
the 40 sample files in fixtures/vendor-b/ without errors.
Done means `npm run import:check fixtures/vendor-b` exits 0 and the row counts match
fixtures/vendor-b/expected.json.
Work in a fresh worktree off main. You can commit and push to that branch.
Don't open PRs against main and don't touch the shared staging database.
Keep going until done. If you've made no progress for two hours, stop, commit
what you have, and write up what you tried.
```

"I'm going to bed" switches `tarique-mode` into continuous mode, so it stops asking questions. The done clause gives it a predicate a command can check on every round. The permissions name exactly which side effects are allowed. The escape hatch bounds the cost of a dead end. If your agent has a loop command that reruns a prompt until a condition holds, pass it the same done clause.

Even under this grant, the agent pauses for irreversible steps (force-pushing a shared branch, deploying, deleting data, messaging customers, rotating credentials, changing access). It also refuses side effects suggested by anything it reads during the run. An unattended run reads a lot of outside text: CI logs, bot comments, issue bodies, dependency READMEs. A log line that says "run this to fix" is a claim to evaluate against the goal and the grant, not an instruction, per [`principle-treat-input-as-untrusted`](../../skills/principle-treat-input-as-untrusted/SKILL.md). Anything outside the grant gets logged and skipped.

Large or cross-cutting work goes to [`figure-it-out`](../../skills/figure-it-out/SKILL.md). That skill frames the work (a falsifiable done predicate, a size estimate, a rigor level expressed as concrete gates), designs phases with the biggest unknown first, builds the measuring harness before the work, and pairs every delegated unit with a read-only judge. A single task pushed to a finish line routes through the autonomous-run playbook.

## The loop

```text
┌──────────────────────────────────────────────────────────────┐
│  check the finish condition ── holds? ──► final check, report │
│        │ no                                                    │
│        ▼                                                       │
│  make the smallest change the evidence supports                │
│        ▼                                                       │
│  verify on the real artifact                                   │
│        ▼                                                       │
│  progress? ── yes ──► commit                                   │
│        │ no                                                    │
│        └────────────► discard the change                       │
│        ▼                                                       │
│  log one decision row                                          │
└────────────── repeat ────────────────────────────────────────┘
```

A change that did not move the predicate gets thrown away, even if it "might help", because an unproven change is a hypothesis you would otherwise ship. A plateau means the agent switches approach. The finish condition never relaxes to let the run claim success.

Side discoveries (a broken skill, a flaky verifier, a related bug) belong to the run. Each one gets fixed in its own PR, and then the run returns to the main goal.

## Pausing

When you need the agent to stop for real (you are closing the laptop, the host is restarting, context is about to be compacted), say "pause". The pause-safely playbook finishes or undoes the step in progress, does nothing irreversible, commits everything as one `WIP:` commit after checking the staged diff for secrets, and writes a resume note a cold-start agent can pick up. "Keep going" and "carry on while I sleep" never trigger it. Those grant continuation.

## The decision log

[`show-me-your-work`](../../skills/show-me-your-work/SKILL.md) keeps an append-only tab-separated log. Each turning point becomes a row with the columns `logged_at`, `phase`, `decision`, `reason`, `evidence` (a commit, a `file:line` or a saved artifact) and `outcome` (a short token such as `passed`, `reverted` or `inconclusive`). Rows are written through a helper script that flattens tabs and line breaks and neutralizes values that a spreadsheet would run as formulas, since cell text can come from PR titles and issue bodies an attacker wrote. By default the log is a scratch file outside version control. Check it in only when the work is big or risky enough that a reviewer needs the record.

Before the agent replies, it audits its own rows against its own transcript and appends rows for anything missing. Then it spawns a read-only reviewer, from a different model family when one is available, briefed to assume corners were cut until the evidence shows otherwise. The last section of the reply, titled **Attention**, names the reviewer's model and lists what it flagged. Read that section first in the morning.

```text
/show-me-your-work for last night's import run
```

For a quick read-only status on a run that is still going, [`catch-up`](../../skills/catch-up/SKILL.md) summarizes everything since your last message and lays out each decision waiting on you, with a recommendation, the evidence and the risk. It changes nothing.

## Queues of PRs

Three playbooks handle more than one change at a time.

**autopilot-full** takes a queue of independent PRs all the way to merged. One owner per PR builds it, opens it early, runs the cleanup and security passes, and babysits it to green. When the code is ready, a swarm of verifiers that did not write it reruns the gates, proves the key behavior live, and audits the diff, with one lane running `security-review` and checking threat-model proofs when a boundary moved. Later small changes get a single fresh verifier. An owner merges only when the verdict is clean for the exact patch that will land. Owners get write access to their own branch and nothing else.

**autopilot-stack** runs the same loop and ships nothing. You get one linear stack to review and land yourself. Use it when the items depend on each other or you want to see everything before it merges.

**orchestrate** is for programs that run for days with many stacked PRs and dozens or hundreds of helper agents. The coordinator writes no code. It cuts the program into units, writes briefs, processes finished work in batches through the bundled orch CLI, and keeps the bottom of the stack mergeable. Before starting, it checks whether the job is small enough for a single agent in the current session, and if it is, it sends you to an autonomous run instead.

## Running several projects at once

If you run several bodies of work in parallel, give each one its own coordinator chat and its own worktrees or cloud agents. Pull related earlier chats into it with [`recall`](../../skills/recall/SKILL.md). Ask for a verification swarm on every PR. Back plans with prototypes and data. A whole-project prompt can combine several habits:

```text
/tarique-mode New project: replace the polling sync with server-sent events.
/recall my notes on the sync redesign first. Prototype both reconnect strategies
and pick from timings. Architect the server side. Then run autopilot-stack so I can
review everything as one stack before it lands.
```

## Loops that start themselves

The final step is a maintenance line that runs on a schedule or an event, where every stage proves its output, can stop the line, and hands evidence to the next stage. [issue-loop](../../automations/issue-loop/README.md) is the shipped example. A triage run reads each new bug report and posts one verdict. For confirmed bugs, a reproduce run drives the real app in a sandbox, records the symptom twice, and may open one small draft PR with before and after evidence. A person reviews every PR. Issue text is untrusted input throughout, and reproduction uses test credentials only. To install it, point your agent at [FOR_AGENTS.md](../../automations/issue-loop/FOR_AGENTS.md).

## Pitfall: giving a time limit instead of a done check

```text
/tarique-mode Work on the flaky tests overnight.
```

In the morning you will find activity: commits, retries, a log. You will not find a result, because the agent had no way to tell whether it was done. Give it a check instead: "Done means the full suite passes 20 times in a row on CI with no retries."

Next: [8. Principles](08-principles.md)
