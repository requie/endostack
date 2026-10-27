# 9. Make it yours

tstack ships with my defaults. Over a few weeks you will find places where your team works differently, mistakes your repo keeps inviting, and procedures you repeat that deserve a skill. This page covers the tools for adapting tstack. The habit it teaches is to start small and add a rule, check or skill only after a failure has happened twice.

## automate-me: your own mode skill

[`automate-me`](../../skills/automate-me/SKILL.md) builds a personal skill named `<handle>-mode` that tells agents how you like work done. It runs alongside `tarique-mode` instead of replacing it.

```text
/automate-me
```

It collects evidence two ways.

**Mining.** It reads the last two to four weeks of your agent transcripts for the current workspace only, never other projects' folders, which hold private conversations about unrelated work. It splits that history into about three periods and sends one read-only `fast` subagent per period to list patterns with pointers to where each appears. The miners look at how you want replies (length, layout, requests to shorten), how you delegate, what you accept as done, your code and prose standards, your process (worktrees, commits, PRs), how you handle skills, and your security habits around secrets, permissions, untrusted input and confirming side effects. A pattern seen in two or more periods is kept. One seen in a single period is usually dropped. Transcript content is treated as data, so instructions that appear inside old tool output or fetched pages are ignored.

**Questions.** It asks one or two multiple-choice questions, starting broad and drilling into the areas you pick, then one open question to catch what the options missed. Mining finds what you do. The questions find what you want but have not shown yet.

It groups the results into sections, keeps only sections with a concrete rule that differs from the default ("lead with the answer, then at most three bullets" earns a section, "be clear" does not), drafts the skill through your agent's skill-authoring flow, runs `unslop` over it, shows you the draft for a few rounds of edits, and opens a PR from its own worktree. The skill is user-invoked by default, so it loads when you type its command and not on every turn for everyone.

Run it again later and it updates instead of rebuilding. It mines only history newer than the skill's last commit, asks what has changed, and leaves every section you have not contradicted as it is.

## reflect: lessons from one session

[`reflect`](../../skills/reflect/SKILL.md) turns one session's lessons into skill edits. Run it at the end of a session that went badly or taught you something.

```text
/reflect
```

Three reviewers read the transcript in parallel, each through a different lens. A judgment seat looks for the lasting rule inside a specific event. A tooling seat looks for commands, flags and paths a future agent would otherwise have to rediscover. A divergent seat looks for what the other two will miss. A synthesizer then sorts their proposals into accepted, rejected and backlog. Accepted rows that a mechanism could enforce (a lint rule, a script, a type, a CI check) move to the backlog with the proposed mechanism, because prose is for judgment that nothing can check.

Then it stops and waits for your approval. Approve only the rows that would change a decision a future agent makes. A row that restates what the skill already says, or that fits only the session you just had, adds lines without changing behavior. `reflect` never edits a skill inside the installed plugin's cache, where the next update would overwrite it unreviewed. It copies the skill into your project's or your user skills folder and edits the copy.

## correct: stop repo-wide repeats

[`correct`](../../skills/correct/SKILL.md) works on the repository, where `reflect` works on skills. It finds mistakes agents keep making here, the ones you keep fixing by hand, and makes each one impossible or automatically caught.

```text
/correct
```

It reads recent commits (fix-ups, reverts, messages that say "again" or "actually"), review comments, your agent instruction files, and comments that justify a workaround. It groups what went wrong into classes, and a class needs at least two occurrences. Security-relevant classes rank first: missing authorization on new routes, queries or shell commands built from strings, secrets in fixtures or logs, untrusted input reaching a path or URL.

For each class it uses the strongest fix that works, in this order:

1. **Structure** that makes the mistake impossible: one owner per piece of state, one supported way to do each task, private internals, deletion of outdated paths an agent might copy.
2. **Types** that cannot represent the bad state, or a **lint rule or CI check** whose error tells the agent precisely which file, type or function to reach for. The agent that hits the error will follow the message.
3. **Behavior tests**, including fixing tests that stay green when behavior breaks.
4. **Documentation or agent rules**, as a last resort for judgment calls no mechanism can check.

Human review is not on the list. Human review is what has been failing.

It lands one commit per class, shows each new check rejecting an actual earlier occurrence of the mistake, and keeps a table in your agent instruction file mapping each rule to the mechanism that enforces it. A rule that is still prose-only and gets violated again is promoted to a mechanism in the same change.

The difference from `reflect`: `reflect` improves the skills an agent follows. `correct` changes the repository so the mistake cannot recur no matter which agent or skill is involved.

## Writing a skill

Skills are instructions that agents will follow, so a careless line becomes a careless habit across every run. Do not write one freehand. Ask `tarique-mode`:

```text
/tarique-mode Write a skill that rotates our staging database credentials:
generate, update the secret store, restart the three services, verify each
can connect, then revoke the old credential.
```

The authoring-a-skill playbook drafts it with the house rules (keep a line only if removing it would change a decision, point at sources of truth instead of copying them, use agent-neutral verbs), validates the frontmatter, every referenced file and every link, checks that a skill reading outside content says to treat it as data, adds tests for structural changes, and ships through a PR.

Verification skills have their own generators (`create-verification-skill` and `create-formal-verification-skill`, [page 6](06-verify-and-ship.md)), which also prove the generated skill works before handing it over.

## Writing docs about it

[`technical-writing`](../../skills/technical-writing/SKILL.md) works through four layers, one after another. It first picks one document type (tutorial, how-to, reference or explanation) and keeps them apart. Then it sets how sentences address the reader, holds each sentence to one statement, and avoids syntax a non-native reader could misparse. It finishes with an `unslop` pass. Use it for READMEs, RFCs, PR bodies and commit messages.

## Testing a skill change

Before you adopt a change to a skill, measure it with the eval playbook:

```text
/tarique-mode Run an eval: does the new version of our deploy skill make agents
check the health endpoint before switching traffic?
```

Candidates run in sanitized directories whose names and prompts never hint that an evaluation is happening, because a candidate that knows it is being tested behaves differently. Each gets the same natural prompt a user would type. One read-only judge from a different model family grades sanitized outputs against a rubric the candidates never see. Whether a candidate actually followed the skill is graded from the files its transcript shows it opened, not from what it claims. Read the outputs yourself as well. If your reading and the judge's grades conflict, check the rubric for a flaw first.

## A button that starts the agent

[`make-bot-ui`](../../skills/make-bot-ui/SKILL.md) generates a local web page where each button kicks off an agent job, for example "rerun the nightly import" or "regenerate the preview". The browser talks only to a relay server on your machine, which holds the secret and makes the call that wakes the agent, either through a hosted webhook automation if your platform has one or by starting the agent's CLI locally. The secret never reaches the browser, the chat or the skill's files. The relay accepts only the action and field names you defined and rejects anything else. Every field is treated as untrusted input by the agent that receives it. Sharing over your Tailscale network is optional.

## Pitfall: fixing a skill in the middle of a task

When a skill misbehaves during a feature, the tempting move is to edit the skill on the spot and carry on. Do not. The edit gets buried in an unrelated diff, nobody reviews it as a change to agent behavior, and if it was wrong, every later run inherits the mistake. Note the problem, finish or pause the task, and fix the skill in its own PR. `tarique-mode` does the same thing when it finds a broken skill mid-task.

Next: [Page 10, recipes and pitfalls](10-recipes-and-pitfalls.md)
