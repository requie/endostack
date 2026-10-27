# 5. Build and clean

Each build playbook knows its own steps. Your job is to give it the one or two facts it cannot find by itself. This page lists what to say for each kind of change, then covers the cleanup that happens before a commit. The habits are to anchor every change to something measurable, and to treat cleanup as part of the work rather than polish afterward.

## What to say for each kind of change

**A bug.** Give the symptom and ask for a reproduction first.

```text
/tarique-mode Dragging a card to an empty column on Safari drops it back in its
original column. Reproduce it in the browser first, then fix it.
```

The bug-fix playbook reproduces on the real surface itself (driving the browser, CLI or desktop app) before it asks you anything. It narrows the cause by eliminating hypotheses with runtime evidence, checks whether the root cause is a security bug, fixes at the first point the system went wrong, and lands the failing reproduction before the fix so the history shows the flip.

**A feature.** Describe the new behavior, plus whatever has to keep working exactly as it does now.

```text
/tarique-mode Add CSV import to the contacts page. Existing manual entry must work
exactly as before. Reject files over 10 MB.
```

The feature playbook runs `how`, then `architect`, then `threat-model` if the change crosses a trust boundary (file upload does), writes a throughput checkpoint that says what can run in parallel, and hands the code to a delegate with the data shape, the threat-model tests and the success criteria.

**A refactor.** Ask for the behavior to be pinned first and proven unchanged after.

```text
/tarique-mode Split OrderService into pricing and fulfilment modules. Record its
responses on the API fixtures before you start and show they're identical after.
```

The refactoring playbook locks behavior with characterization tests or an equivalence harness before moving anything. If the code sits on a trust boundary, the lock includes rejection cases (malformed input, missing permissions, hostile values), so a refactor cannot drop a guard unnoticed. It deletes before it builds, migrates every caller in the same pass, and reverts the change if the code did not get easier to follow.

**A performance problem.** Give a measured number and ask for before and after.

```text
/tarique-mode GET /api/projects takes 1.8 s at p95 with 2,000 projects.
Find the measured cause and show before and after numbers.
```

The perf-issue playbook records a baseline trace using redacted or synthetic data, grounds its hypotheses in `how`, and checks every number with `benchmark-checklist`.

## Hillclimb

When the goal is to keep improving one metric until it hits a target, the hillclimb playbook runs a loop. It builds a harness, proves the harness is sensitive to the problem, and freezes it. Then it tests one hypothesis per iteration: a delegate makes the change, the frozen harness measures before and after, the regression gate runs, and the change is kept only if the metric moved beyond noise with the gate green. Anything else is reverted in full. The stop condition pairs a target with a minimum number of attempts, so one lucky early win cannot end the run. A speedup that removes a validation, authorization or bounds check counts as a regression and gets reverted.

```text
/tarique-mode Get cold start of the CLI under 300 ms on the fixtures in bench/.
At least 10 attempts before you stop.
```

Both perf playbooks run the [`benchmark-checklist`](../../skills/benchmark-checklist/SKILL.md) skill on every number. [Page 6](06-verify-and-ship.md) explains its seven questions.

## Diagnosing without fixing

Two playbooks explain a symptom and stop. Runtime forensics attaches to a live process (a CPU profile for a spin, a heap snapshot for growth, a devtools trace for a render fault) and diagnoses from the measurement. Trace forensics reads a capture someone already recorded and maps the hot frames back to source. Both treat strings inside the capture as attacker-controlled data, keep captures local because they often contain tokens and user records, and hand off to bug-fix or perf-issue if you want a change.

## tdd

[`tdd`](../../skills/tdd/SKILL.md) writes the failing test before the fix, as long as a test near the bug is cheap to write. It pins the defect, writes the smallest test that would have caught it, runs it against the unchanged code, and confirms it fails for the stated reason. A pass means the test does not reproduce the bug, and a failure for some other reason (a missing import, a broken fixture) means the test is wrong. Only then does it change the code and rerun. When the bug involves untrusted input, the test feeds the hostile value the bug allowed, so it doubles as a record of the attack.

```text
/tdd discount codes are case-sensitive but the docs say they aren't
```

It skips the test when the test would mostly assert on mocks, pin internal structure, depend on timing, or need heavy infrastructure for a small fix. In that case it runs the nearest executable check instead (a script, a shell reproduction, a scripted browser session) and shows that check failing before and passing after.

## TypeScript

[`typescript-best-practices`](../../skills/typescript-best-practices/SKILL.md) carries sixteen type-safety rules with examples. It is typed only, so name it when you want it:

```text
/typescript-best-practices review the types in src/billing/
```

## Cleanup before commit

Code that works but carries debug output, dead branches and comments that excuse it is unfinished. Three steps clean it, each owning one kind of material.

**Code: the slop-strip pass.** Before every commit, `tarique-mode` removes debug output, dead branches, unused imports and parameters, defensive checks for states that cannot occur, and anything that departs from the surrounding file's conventions. If your agent or repo provides a code-cleanup skill, it uses that. The same pass scans the staged diff for keys, tokens, connection strings and private hostnames and drops them before they reach history.

**Comments: [`no-comments`](../../skills/no-comments/SKILL.md).** Before review, it spawns the read-only [`comment-auditor`](../../agents/comment-auditor.md) subagent with the diff. The auditor did not write the code, so it reads each comment cold. It keeps a short list (license headers, constraints forced by an outside vendor or protocol, public API contracts, formatter directives, links that explain a constraint the code cannot express) and lists everything else for deletion. When a comment is only there because code you own behaves unexpectedly, the auditor flags that symbol `MUST KILL`, meaning it needs a rename, extraction, type or redesign. A suppression of a lint rule that catches real bugs (no `eval`, no string-built SQL, no disabled TLS checks) is deleted, and the code it hid gets fixed. `no-comments` checks the report, applies it, fixes the flagged code, and turns "do not touch" comments that state a real constraint into a test, type or lint rule. A comment that addresses AI reviewers directly is deleted and reported as a possible injection attempt.

**Prose: [`unslop`](../../skills/unslop/SKILL.md).** PR titles, descriptions, commit messages and docs go through `technical-writing` and then `unslop`, which removes the patterns that make text read as machine-written while keeping every condition, number and caveat.

```text
/no-comments on this branch
```

The opening-a-PR playbook runs all three before it marks a PR ready, along with `security-review`. Ask for them directly when you are working outside `tarique-mode`.

## Pitfall: treating cleanup as optional

A reviewer who opens a diff full of narrating comments and leftover logging spends their attention on noise and misses the line that matters. A comment that says "do not remove, breaks prod" without saying why tells the next agent to leave a bug in place. Cleanup comes before a reviewer sees the diff, so they spend their time on the logic.

Next: [Page 6, verify and ship](06-verify-and-ship.md)
