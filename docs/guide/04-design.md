# 4. Design before code

The first design an agent writes becomes the design, unless something forces a comparison. This page covers the skills that force one, and the threat modeling that belongs at the same stage. The habits are to compare real alternatives before committing, to answer design questions with running code rather than argument, to write the plan last, and to map trust boundaries before anyone writes the code that crosses them.

## architect

[`architect`](../../skills/architect/SKILL.md) settles structure before logic. It has five steps.

1. **Ground.** Run `how` on every subsystem the change touches, and `why` if ownership or layering will move. Write down the types the new code must work with, the callers that must keep working, the invariants that cross the new boundary, and every trust boundary: where data arrives from outside the process or from a less-trusted component, where it goes to something that acts on it, and who controls each input.
2. **Sketch.** Run `arena` (below) to get at least two structurally different sketches: types, signatures, module map, stubbed bodies. Two variations on one structure do not count. Candidates are screened for designs that would mislead the next contributor, then compared on interface depth (a small public surface hiding the most complexity wins) and on trust boundaries (untrusted data parsed into domain types at exactly one place per boundary, privileged code separated from code that handles untrusted input).
3. **Agree.** By default there is no checkpoint, and implementation starts. Ask for one if you want to see the sketch first.
4. **Implement** against the sketch. When the code wants something the sketch did not plan for, the agent stops and says so instead of absorbing it.
5. **Scrap** the sketch if implementation shows a pattern of friction: the same workaround in several places, casts or optional-but-always-present fields to make types compile, authorization repeated at several call sites because the boundary is in the wrong place. Then it designs again from step 2.

```text
/architect a webhook delivery system with per-tenant signing secrets.
Stop for my review before implementing.
```

## arena

[`arena`](../../skills/arena/SKILL.md) runs several independent attempts at one brief and merges the best of them.

```text
                       ┌─► runner A (own worktree) ─┐
brief + rubric ────────┼─► runner B (own worktree) ─┼─► read-only judge (different model family)
(rubric hidden         └─► runner C (own worktree) ─┘          │
 from runners)                                                  ▼
                                      you grade each candidate per criterion
                                                                │
                                                                ▼
                                      pick a base ─► graft the best parts of the others ─► verify
```

Each runner works in isolation so it cannot see or overwrite the others. The judge comes from a different model family than the chat, when the agent offers one, because a judge tends to favor output that resembles its own. The coordinating agent grades every candidate criterion by criterion as well, compares its grades with the judge's, and treats disagreement as a sign of bias or an ambiguous criterion. Grafts are integrated by hand so the result reads as one design. If every candidate reached the same structure, that agreement is recorded and the base ships unchanged. If the candidates differ wildly, the brief was too loose and gets rewritten.

Panel size comes from `arena-runners` in your model config (default two seats). Raise it for an open question, or pass a list for one run:

```text
/arena Design the cache invalidation for the product catalog. Use three runners.
```

## swarm

[`swarm`](../../skills/swarm/SKILL.md) launches many workers at once. Workers either take disjoint slices of a job (coverage) or compete on one brief (a race). Each returns `pass`, `problems` or `blocked` with evidence, and you get one combined report with a row per slice. There is no base selection and no grafting.

```text
/swarm one read-only worker per service under services/, each checking whether
the service validates the X-Tenant-Id header before any database call. Table back.
```

Use arena when you want one better artifact, and swarm when you want coverage or a race winner. Using arena for coverage merges results that were never meant to be combined. Using swarm for a design question gives you a table of independent answers with nothing joining them.

## interrogate

[`interrogate`](../../skills/interrogate/SKILL.md) is an adversarial review of a diff. Several read-only reviewers, on different model families when the agent offers them, attack the same change against a fixed rubric. One extra seat always reviews from the attacker's side. A finding that two seats on different models raise independently is the strongest signal you will get.

The lead reviewer sorts every finding into one of four buckets, each with the seats behind it and a reason: act on, consider, noted, dismissed. It applies nothing. Read the dismissed section yourself, because a wrong dismissal is the most expensive mistake a lead reviewer makes.

Do not interrogate a plan with no code. Reviewers of an abstract plan invent risks, because nothing constrains them. A prototype answers a design question better than a review panel does.

## Prototypes

When a question can be answered by looking (which layout reads better, which approach is faster, what a library actually returns), build the options and look. The prototype playbook builds throwaway variants in a scratch directory behind one labeled toggle, with screenshots for UI and timings or printed output for behavior. It drops the usual code-quality bar on purpose. It keeps one rule: sketches never touch production data, real credentials or shared infrastructure.

```text
/tarique-mode Prototype three ways to show sync conflicts in the editor, behind one
toggle. Screenshots of each, then a recommendation.
```

`tarique-mode` also routes here on its own when it is about to ask you a question that an observation could answer.

## Write the target before the code

For a package or API other people will consume, ask for its README or a tutorial before any code. The document fixes what callers will write, and the implementation then has a concrete target. Use [`technical-writing`](../../skills/technical-writing/SKILL.md) so the tutorial, the how-to and the reference stay separate documents instead of one that mixes all three.

## Plans come last

Once the design is settled, a plan turns it into PRs. The multi-phase-plan playbook gives each PR its own section, and every section must prove the PR with more than green tests. The format is defined in [PLAN-FORMAT.md](../../skills/tarique-mode/scripts/PLAN-FORMAT.md). After a reading section and a **Run checklist**, each PR section carries nine blocks in order: **Needs.**, **Touches.**, **Changes.**, **Observable result.**, **Unit proof.**, **Live proof.** (ten lanes, each with a screenshot and a pass condition), **Perf proof.** (metric, probe, baseline, budget), **Operator review.** and **Landing.**. A **Finish the run** section and lettered appendices close the plan. `scripts/check-plan.mjs` lints the plan against that format before hand-back. The playbook writes no code and names the playbook that should execute each phase.

For a migration, add "match the old behavior exactly, bugs included". If the new version fixes old bugs along the way, every comparison between old and new output shows differences, and you can no longer tell an intended fix from a regression. Fix the old bugs in separate PRs afterward.

## Security habits at design time

Design is the cheapest point to remove an attack path. A mitigation added during design costs a line in a plan. The same mitigation added after release costs a patch, a review, a deploy and an advisory.

**Threat-model anything that moves a trust boundary.** `tarique-mode` runs [`threat-model`](../../skills/threat-model/SKILL.md) automatically when a change adds input parsing, authentication or authorization logic, secrets handling, network calls to user-influenced destinations, file paths built from input, deserialization, a new dependency, or an agent that acts on content it reads. You can also run it directly:

```text
/threat-model the "summarize this PDF and email the summary" feature before we build it
```

It maps the actual code with read-only subagents (inbound surface, outbound surface, agent surface, secrets and identity), draws the data flow with trust zones, and lists assets, entry points and attackers with their starting positions. For agent features it draws the model loop explicitly: user input, system prompt, retrieved documents, tool results and memory each enter as a separate edge with its own trust level. Each threat is a concrete abuse path with `file:line` hops, ranked high, medium or low on likelihood and impact with a written reason. Every mitigation at medium or above gets a named proof, such as "integration test: tenant A's token requesting tenant B's file returns 404 and logs no content", or for an agent, a fixture document with injected instructions and an assertion that the email tool was never called.

**Prefer mitigations that remove a capability.** Taking a tool out of an agent's allowlist cannot be talked around. A filter that tries to detect misuse can.

**Put the boundary in one place.** When `architect` compares sketches, favor the one that parses untrusted input at a single point per boundary. A design that needs an authorization check at every call site will miss one.

**Feed the threat model forward.** Its proofs become tasks in the playbook's verification step and test cases for the delegate. `security-review` reads the same file before shipping and confirms each proof exists and passes ([page 6](06-verify-and-ship.md)).

## How much design a task deserves

| Task | Design step |
| --- | --- |
| A small, finished change you want checked | `interrogate` alone |
| New code whose types or calls span more than one function | `architect` |
| A standalone decision (an API shape, a retry policy) | `arena` |
| Checking many independent things | `swarm` |
| A question you can answer by running something | prototype |
| A choice that would cost a lot to undo later | `architect`, then `interrogate` on the sketch |
| Work that spans several PRs | a multi-phase plan, after the above |
| Anything that crosses a trust boundary | `threat-model`, in addition to the row that fits |

`tarique-mode` applies this table on its own. It is here so you can tell when a run is skipping a step it should not, or spending a panel on a typo.

Next: [5. Build and clean](05-build-and-clean.md)
