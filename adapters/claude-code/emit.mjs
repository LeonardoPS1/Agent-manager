#!/usr/bin/env node
/**
 * Minimal Claude Code → Aicore Office emitter.
 *
 * Usage:
 *   node emit.mjs <hookName>          # reads the hook payload from stdin
 *   echo '{"state":"typing"}' | node adapters/claude-code/emit.mjs state
 *
 * Env:
 *   OFFICE_API_URL      default http://localhost:3000
 *   OFFICE_AGENT_ID     agent slug or uuid (default: claude-code)
 *   OFFICE_AGENT_TOKEN  bearer token (only when OFFICE_REQUIRE_AUTH=true)
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const API_URL = process.env.OFFICE_API_URL ?? 'http://localhost:3000';
const AGENT_ID = process.env.OFFICE_AGENT_ID ?? 'claude-code';
const TOKEN = process.env.OFFICE_AGENT_TOKEN ?? '';

/** Read all of stdin (best effort, returns {} when empty). */
function readStdin() {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Best-effort short summary of a tool input. */
function summarize(input) {
  if (input == null) return '';
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

/**
 * Map a Claude Code hook name + payload to one or more Office events.
 * @returns {Array<{type: string, payload: object}>}
 */
export function mapHook(hook, data) {
  switch (hook) {
    case 'SessionStart':
      return [
        { type: 'state', payload: { state: 'idle' } },
        { type: 'heartbeat', payload: { session: data.session_id ?? null } },
      ];
    case 'UserPromptSubmit':
      return [{ type: 'state', payload: { state: 'thinking' } }];
    case 'PreToolUse':
      return [
        {
          type: 'tool_call',
          payload: {
            name: data.tool_name ?? data.tool ?? 'unknown',
            args_summary: summarize(data.tool_input),
          },
        },
        { type: 'state', payload: { state: 'typing' } },
      ];
    case 'PostToolUse':
      return [{ type: 'state', payload: { state: 'typing' } }];
    case 'Notification':
      return [{ type: 'state', payload: { state: 'reading' } }];
    case 'SubagentStop':
      return [
        {
          type: 'message',
          payload: {
            from: data.subagent_type ?? 'subagent',
            to: 'claude-code',
            content: data.summary ?? 'Sub-agent finished.',
            object: 'file',
          },
        },
      ];
    case 'Stop':
      return [{ type: 'task_end', payload: { task_id: data.session_id ?? 'claude-code-session', status: 'done' } }];
    // Direct shorthand used for manual testing: `emit.mjs state '{"state":"typing"}'`
    case 'state':
    case 'task_start':
    case 'task_end':
    case 'message':
    case 'tool_call':
    case 'usage':
    case 'heartbeat':
      return [{ type: hook, payload: data }];
    default:
      return [];
  }
}

async function post(events) {
  for (const ev of events) {
    const body = JSON.stringify({
      agent_id: AGENT_ID,
      type: ev.type,
      payload: ev.payload,
      source: 'claude-code',
    });
    try {
      const res = await fetch(`${API_URL}/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        },
        body,
      });
      if (!res.ok) {
        process.stderr.write(`[office] emit ${ev.type} failed: ${res.status}\n`);
      }
    } catch (err) {
      process.stderr.write(`[office] emit ${ev.type} error: ${err?.message ?? err}\n`);
    }
  }
}

// Only run when invoked directly (not when imported by tests).
const invokedDirectly = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (invokedDirectly) {
  const hook = process.argv[2] ?? 'state';
  const events = mapHook(hook, readStdin());
  await post(events);
}
