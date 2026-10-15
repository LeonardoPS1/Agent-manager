# Claude Code → Aicore Office adapter

Two complementary mechanisms connect a Claude Code session to the office:

1. **Hooks** (`hooks-settings.json`) — fire one HTTP request per tool call / turn.
2. **Session watcher** (`watch-session.mjs`) — tails the session `.jsonl` transcript and emits richer events (tokens, sub-agents, messages).

You can use either one, or both. Hooks give low latency; the watcher gives full fidelity.

---

## 1. Hooks

Claude Code runs shell commands on lifecycle events. We map them to Office events.

| Claude Code hook   | Office event                                             |
| ------------------ | -------------------------------------------------------- |
| `SessionStart`     | `state: idle` + `heartbeat`                              |
| `UserPromptSubmit` | `state: thinking`                                        |
| `PreToolUse`       | `tool_call` (tool name + short args summary)             |
| `PostToolUse`      | `state: typing`                                          |
| `Notification`     | `state: reading`                                         |
| `Stop`             | `task_end` (`status: done`)                              |
| `SubagentStop`     | `message` handoff from the sub-agent back to the parent  |

### Install

Merge the contents of `hooks-settings.json` into your project `.claude/settings.json`
(or `~/.claude/settings.json` for all projects), then export the environment:

```bash
export OFFICE_API_URL="http://localhost:3000"   # or http://office-api:3000 inside Docker
export OFFICE_AGENT_ID="claude-code"            # slug or uuid of the agent
export OFFICE_AGENT_TOKEN="ofc_..."             # only needed if OFFICE_REQUIRE_AUTH=true
```

Each hook shells out to `emit.mjs`, which posts a single event. Hooks receive the
event payload on **stdin** as JSON, so we pipe it in:

```jsonc
{ "type": "command", "command": "node adapters/claude-code/emit.mjs PreToolUse" }
```

### Manual emit

```bash
echo '{"state":"typing"}' | node adapters/claude-code/emit.mjs state
```

---

## 2. Session watcher

Claude Code writes a JSONL transcript per session under
`~/.claude/projects/<project>/<session-id>.jsonl` (one JSON object per line).

`watch-session.mjs` tails that file and emits:

- `state: thinking` when an assistant turn starts,
- `tool_call` per `tool_use` block,
- `usage` from `message.usage` (input/output tokens),
- `message` handoffs when a sub-agent (`Task` / `Agent` tool) is invoked,
- `task_end` when the session stops.

### Run

```bash
node adapters/claude-code/watch-session.mjs /path/to/session.jsonl
# or, auto-resolving the newest session for the current project:
node adapters/claude-code/watch-session.mjs --latest
```

Environment variables are the same as above. The watcher re-reads the file from
its last offset whenever it grows, so it is safe to leave running.

---

## Notes

- Events are best-effort: failures are logged to stderr and never crash the agent.
- Sub-agents appear in the office as **linked characters**: the parent emits a
  `message` with `to` = sub-agent id, and the sub-agent emits its own events under
  its own `agent_id` (set `OFFICE_AGENT_ID` per sub-agent if you want separate desks).
