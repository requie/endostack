# 2. Working with tarique-mode

[`tarique-mode`](../../skills/tarique-mode/SKILL.md) is the entry point for any work that needs rigor. This page explains how it routes a task and what to put in a prompt so it routes well. The habit it teaches is to say the goal and the finish line, and leave the procedure to the playbook.

## What happens when you invoke it

```text
prompt
  │
  ▼
read the principles index
  │
  ▼
match the task to a playbook ──► investigation   (read-only question)
  │                           ├► bug-fix         (a defect to reproduce and fix)
  │                           ├► feature         (new or changed behavior)
  │                           ├► refactoring     (structure only, behavior locked)
  │                           ├► perf-issue      (a measured slowdown)
  │                           └► figure-it-out   (large, cross-cutting, or nothing else fits)
  ▼
copy the playbook's steps into a todo list
  │
  ▼
run steps, calling skills as they fire (how, architect, threat-model, ...)
  │
  ▼
verify on the real artifact, security-review, report with evidence
```

The five playbooks in the diagram cover most daily work. The rest cover narrower jobs: hillclimb for pushing one metric toward a target, runtime-forensics and trace-forensics for diagnosing without fixing, prototype for throwaway design sketches, visual-parity for pixel-exact UI work, authoring-a-skill and eval for working on skills, babysit and shipping for PRs, autonomous-run, orchestrate, autopilot-full and autopilot-stack for unattended work, session-pickup and pause-safely for handing work across sessions, multi-phase-plan for plans, worktree-cleanup for disk, and opening-a-pr, which every code-producing playbook ends with. The [README](../../README.md#playbooks) has the full table.

Alongside the playbook, `tarique-mode` checks a list of always-on triggers. A nontrivial change triggers `how`. Code that crosses a function boundary triggers `architect`. A change that touches a trust boundary triggers `threat-model` before implementation. Anything about to ship triggers `security-review`. A PR status question goes to babysit. A speed number triggers `benchmark-checklist`. You do not need to ask for any of these.

## Say the goal, not the procedure

A prompt can carry up to five things. Include the ones you have.

1. **The goal.** What is broken, or what should exist.
2. **A done check with a yes or no answer.** "Every request with an expired token gets a 401" is a check. "Make auth safer" is not.
3. **The evidence you want to see.** Command output, a screen recording, the row read back from the database, a profile before and after.
4. **What you already know.** The symptom, steps to reproduce, a log excerpt, a link to the issue.
5. **Real constraints.** "Reproduce before fixing." "Don't change code yet." "Zero behavior change." "Stop for my review before implementing." Each one changes what the agent does.

Here is a prompt with all five:

```text
/tarique-mode Users on the Team plan can't invite more than 5 people,
but the plan allows 25 (see issue 3381 and the plan table in billing/plans.ts).
Reproduce it with a Team-plan fixture first. Done means inviting the 6th through
25th user succeeds and the 26th fails with the plan-limit error. Show me the
test output for both.
```

Leave two things out.

**The method.** Do not list skills or steps. The playbook already has the steps, in an order designed to avoid common mistakes, and a hand-written sequence tends to reorder or drop some of them. Mention a skill by name when you want to change a single decision the playbook would make ("use `tdd` here, a unit test is cheap").

**Your guess about the cause, until later.** "I think it's the cache" narrows the search before the agent has looked. Let it state the problem back in its own terms, then add your theory if its account missed something.

## When the request itself is unclear

For a noisy bug report or a long thread, make restatement the first step:

```text
/tarique-mode Read issue 4410 and its comments. Tell me in plain words what the
actual problem is before proposing anything.
```

Two skills help before a task starts. [`in-your-own-words`](../../skills/in-your-own-words/SKILL.md) states what the agent believes your goal and underlying problem are, names its guesses, and stops until you confirm. [`sharpen`](../../skills/sharpen/SKILL.md) takes a draft prompt and rewrites it to ask for the expert version of the same task: the moves a top practitioner would make, the raw sources they would start from, named methods, and a check independent of anyone's opinion. It returns the rewritten prompt and does not do the task.

```text
/sharpen find out why our Docker images got bigger
```

## Follow-ups can be short

Once a task is running, the playbook holds the structure. "Go ahead", "continue until the repro passes", or "yes, option B" are complete prompts. You do not need to restate the context.

When you switch topics in the same chat, say "new task". Without it, `tarique-mode` may treat your message as the next step of the previous playbook and skip the matching step for the new work.

## Forks are settled by experiment

When the agent reaches an approach question, `tarique-mode` classifies it before asking you. If an observation could answer it (how a layout looks, how fast an approach runs, what output a library produces), the agent builds a quick sketch through the prototype playbook and lets the result decide. Only a real product or preference call that no experiment can settle comes back to you as a question. Expect fewer questions and more "I tried both, here are the screenshots".

Under a full-autonomy grant, the agent makes the calls the grant covers, applies a stated default for calls only you can make, and reports its reasoning so you can redirect. It still stops for irreversible steps: force-pushing a shared branch, deploying, deleting data, messaging customers, rotating credentials, changing access, or publishing an unfixed vulnerability.

## Parallel work needs isolation

Two agents writing in one checkout overwrite each other's files and test each other's half-finished code. Give each parallel task its own git worktree, a separate clone, or a cloud agent on its own machine. The playbooks do this for the subagents they spawn. You need to do it for the chats you start yourself.

Worktrees pile up. When disk runs low, ask for cleanup:

```text
/tarique-mode Clean up worktrees for this repo. Only remove the ones you can prove are safe.
```

The worktree-cleanup playbook runs a read-only audit script that classifies each worktree by merge state, uncommitted changes and whether a chat is still using it. Nothing gets removed unless the audit shows it is safe to remove.

## Leaving a run unattended

When you plan to walk away, say so and give a finish condition the agent can check on every round. The router hands that kind of work to [`figure-it-out`](../../skills/figure-it-out/SKILL.md) or to the autonomous-run playbook. Either one records its decisions with [`show-me-your-work`](../../skills/show-me-your-work/SKILL.md). [Page 7](07-overnight.md) covers this in detail.

## Pitfall: listing skills in the prompt

```text
/tarique-mode Run how, then architect, then implement, then interrogate, then open a PR.
```

This prompt looks thorough and does worse than a plain goal. It drops the threat model, the throughput checkpoint, the verification step and the security review, because you did not list them, and it gives the agent no finish line. Write the goal and the check instead, and let the playbook supply the rest.

Next: [3. Understand before changing](03-understand.md)
