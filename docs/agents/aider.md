# tstack in Aider

Aider has no skills, subagents, or file-based commands. tstack gives it an index of skills as read-only context, and you add a skill file to the chat when you want to run it.

## Install

**Files, one project:**

```sh
./install.sh --scope project --agents aider
```

**Files, every project:**

```sh
./install.sh --scope user --agents aider
```

Run the installer from a clone of the tstack repository. Add `--dry-run` to see every file it would write, `--link` to symlink instead of copy, and `--uninstall` (with the same `--scope`) to remove exactly what it wrote. On Windows use `install.ps1` with the same options.

## Where the files land

| What | Path |
| --- | --- |
| Skills | `.agents/skills/<name>/` or `~/.agents/skills/<name>/` (plain files Aider does not load by itself) |
| Index | `.tstack/aider.md` (project) or `~/.tstack/aider.md` (user): one line per skill and how to load it |
| Config | A marked block in `.aider.conf.yml` (project root or home) with `read:` pointing at the index. If the file already has its own `read:` list, the installer leaves it alone and tells you the path to add. |

The installer records every file it writes, with a hash, in `.tstack/install-manifest.json` (project) or `~/.tstack/install-manifest.json` (user). It never overwrites a file it did not write.

## Tool names

tstack skills use neutral verbs. In this agent they mean:

| tstack verb | Tool in Aider |
| --- | --- |
| Spawn a subagent | none |
| Ask the user | plain text |
| Track a todo list | none |
| Run a shell command | `/run` |
| Read a file | `/read-only <file>` (you run it) |
| Edit a file | Aider edits files itself through its edit format |
| Search the codebase | none |
| Fetch a URL | `/web <url>` |
| Load a skill | `/read-only .agents/skills/<name>/SKILL.md` |
| Transcripts | `.aider.chat.history.md` in the directory where Aider started (set with `--chat-history-file`). Plain Markdown. |

"(unverified)" marks a name or path taken from a third-party source or prior knowledge rather than the vendor's docs. Where a verb has no tool, skills fall back as they describe: plain-text questions, a checklist in the reply, or doing subagent briefs one after another.

## Models per subagent

No subagents. Every role runs in the main chat on Aider's main model.

Role assignments live in `~/.tstack/models.toml` or the project's `.tstack/models.toml`, written by [setup-tstack](../../skills/setup-tstack/SKILL.md).

## What degrades here

- Every multi-agent skill (`swarm`, `arena`, `interrogate`, `security-review`, `architect`) runs its briefs one after another in one context. Treat panel agreement as weak evidence.
- Skills that drive the agent through many tool calls (`tarique-mode` playbooks, `recall`) need you to approve or run commands, because Aider does not call tools on its own.

Non-interactive mode (used by [make-bot-ui](../../skills/make-bot-ui/SKILL.md) for a local bot): `aider --message "<prompt>"` (unverified).

## Sources

- <https://aider.chat/docs/config/aider_conf.html>
