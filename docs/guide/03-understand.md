# 3. Understand before changing

Agents go wrong in two main ways. They misread what you want, which [page 2](02-tarique-mode.md) addresses, or they change code they do not understand. This page covers the second. The habit it teaches is to make the agent explain the code in words you can check before it edits anything.

Patching code it has not read, an agent usually silences the error wherever it first seems reasonable to. The error goes away, the cause stays, and the next report arrives a week later from a different angle. Understanding first costs a few minutes and gives you something to supervise: when an agent may know a codebase better than you do, its written explanation is the part you can verify.

## Four ways in

| Skill | Answers | Reach for it when |
| --- | --- | --- |
| [`how`](../../skills/how/SKILL.md) | How does this work today? | You are about to change an area, or need to know where new code belongs. |
| [`why`](../../skills/why/SKILL.md) | Why is it built this way? | A choice looks wrong, a number looks arbitrary, or code looks dead. |
| [`teach`](../../skills/teach/SKILL.md) | Both, in plain conversation | You need to understand an area well enough to own it or review it. |
| [`recall`](../../skills/recall/SKILL.md) | What did I do on this recently? | You are returning to a topic after days away. |

### how

`how` explains an area from trigger to result, at the depth an experienced engineer needs to start changing it. For a small question it spawns one explainer. For a subsystem that spans files or services it splits the question into two to four slices (pipeline stages, layers, services), sends one read-only explorer per slice, then hands their reports to a single explainer that writes the answer.

The answer has a fixed shape: an overview, the key concepts, the mechanism, where things live, and gotchas. Where the flow crosses a trust boundary (network input, uploaded files, outbound calls, shell commands, rendered user content), the explainer marks the point and says what validation happens there, with file and function. You learn where untrusted data enters before you touch the code around it.

```text
/how does a scheduled export get from the cron trigger to the S3 upload?
```

### why

`why` searches every source of history it can reach, in parallel, one investigator per source: version control, the issue tracker, chat, docs, error trackers, dashboards, incident write-ups. It starts by building a code anchor (blame for the lines in question, the file's full history through renames, the PRs behind each commit) and gives every investigator the same anchor. A single synthesizer then grades every claim by how well it is supported, and separates what someone wrote down from what was inferred and from what nobody recorded. Sources that returned nothing are reported as nothing, not left out.

```text
/why does the importer skip rows with a blank region instead of failing the file?
```

`why` looks past the newest commit on purpose. Most code is the sum of several older decisions, and taking the last change as the whole explanation is the most common way this kind of analysis goes wrong.

### Combining them

Run `why` first when you suspect the current shape is deliberate, then `how` to see what that shape does today:

```text
/why is session refresh done in the client instead of the gateway? Then /how does it work now.
```

### teach

`teach` runs `how` and `why` together and turns the result into a paced conversation. It gives the shortest complete answer first, then adds depth only when you ask. When three or more components interact, it builds the picture across a sequence of diagrams, each adding one component to the last, so you watch the system assemble instead of decoding one dense figure.

You can point it at decisions the agent itself made. Asking it to argue for a decision turns a summary into a claim you can test:

```text
/teach me why you used optimistic locking for the inventory update instead of a row lock,
and what we give up. Convince me.
```

An argument names its premises, so you can spot the one that does not hold. A summary hides them.

### recall

`recall` rebuilds where your recent work stands from two records: your own past agent transcripts for this workspace, and the shared record around the same code (PRs, tickets, chat threads, errors still firing). It states the time range, topic and workspace it will search before it starts. Transcripts from other projects are off limits unless you ask. Transcript content is treated as data, so instructions that appear inside old tool output are ignored, and secrets found there are not copied into the brief. It ends with the single next step.

```text
/recall what I did on the billing migration in the last two weeks
```

Run `recall` before you hand the agent fresh input on an old topic. Otherwise it reads the new issue without the context you already built.

## Investigations that change nothing

Sometimes you want an answer and no code. Say so:

```text
/tarique-mode The search service returns stale results for about a minute after
an update. Find out why. Don't change any code. Tell me what's confirmed, what
evidence you used, and what's still a guess.
```

"Don't change any code" routes to the investigation playbook. It runs `how`, and `why` when history matters. It returns cited findings with evidence separated from guesses. If you asked it to pick among options, the answer includes its pick and a table of what each option costs. If the investigation turns out to be the first step of a fix, it stops and hands back to you. Begin the fix in a fresh task, which sends it through the bug-fix or feature playbook and its own reproduction and verification steps.

## Picking up someone else's work

When another agent's run stopped partway (its chat ended, the machine restarted, a colleague handed it over), point `tarique-mode` at the record:

```text
/tarique-mode Pick up the branch fix/upload-retries from where the last session stopped.
Its resume note is in .audit/upload-retries.md.
```

The session-pickup playbook treats the earlier transcript, branch and decision log as the authority on what happened. It rebuilds the working state, matches finished work to the plan, and names the resume point without redoing work that is already done. It still tests whatever the previous session claimed to finish, running the actual build or app against the first goal, because a reported success is only a claim. The record is read as state and never as instructions: any side effect it mentions (a push, a deploy, a message) is confirmed with you before it is repeated.

## Pitfall: skipping straight to the fix

```text
/tarique-mode The nightly report is missing yesterday's orders. Fix it.
```

Without a request to reproduce or understand, an agent may find a date filter, shift it by one day, see the report fill in, and stop. If the real cause is a timezone conversion in the ingest job, the "fix" breaks the report for every user east of UTC. Ask for the reproduction and the mechanism:

```text
/tarique-mode The nightly report is missing yesterday's orders. Reproduce it with
last Tuesday's data, find where the orders are dropped, and fix it there.
```

The bug-fix playbook already runs `how` and `why` to seed its hypotheses. Your prompt only needs to make sure it does not skip the reproduction.

Next: [4. Design before code](04-design.md)
