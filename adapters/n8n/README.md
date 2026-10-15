# n8n adapter

Emit real Aicore Office events from any n8n workflow with a single **HTTP Request**
node per step. Each node posts to `POST /v1/events` on the office API.

## 1. Import the example workflow

In n8n: **Workflows → Import from File → `office-events.workflow.json`**.

It contains:

- A **Manual Trigger**.
- A `Set: agent` node (edit `agent_id` + `token` here).
- A chain of **HTTP Request** nodes that emit `task_start`, `state`, `usage`,
  `tool_call`, `message` (handoff) and `task_end`.

## 2. Configure credentials

Create an **HTTP Header Auth** credential named `aico-office`:

| Field | Value |
| --- | --- |
| Name | `Authorization` |
| Value | `Bearer <YOUR_AGENT_TOKEN>` |

Then set it on every HTTP Request node. If `OFFICE_REQUIRE_AUTH` is not `true`
on the API, the header can be omitted (dev/demo).

## 3. Or copy the node snippet

Use this as the body of an **HTTP Request** node:

```json
{
  "method": "POST",
  "url": "http://office-api:3000/v1/events",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "Authorization", "value": "Bearer {{$env.OFFICE_AGENT_TOKEN}}" },
      { "name": "Content-Type", "value": "application/json" }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ agent_id: 'atlas', type: 'state', payload: { state: 'typing' }, ts: new Date().toISOString(), source: 'n8n' }) }}"
}
```

## 4. Event cheat-sheet

| Step | type | payload |
| --- | --- | --- |
| Start | `task_start` | `{ task_id, title, priority }` |
| Working | `state` | `{ state: "typing" }` |
| Tool use | `tool_call` | `{ name, args_summary, ok }` |
| Tokens | `usage` | `{ model, tokens_in, tokens_out, cost }` |
| Handoff | `message` | `{ from, to, content, object }` |
| Error | `state` | `{ state: "error" }` |
| End | `task_end` | `{ task_id, status: "done" }` |

> Tip: create an n8n **Function** node returning an array of events, then a single
> HTTP Request node in *"Run for each item"* mode to replay the whole timeline.
