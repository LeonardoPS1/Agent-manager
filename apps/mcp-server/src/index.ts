#!/usr/bin/env node
/**
 * Aicore Office MCP server.
 *
 * Exposes a single tool — `office_emit` — so any MCP-capable agent can report
 * its state, current task, and messages to the office dashboard.
 *
 * Environment:
 *   OFFICE_API_URL      Base URL of the office API (default http://localhost:3000)
 *   OFFICE_AGENT_ID     Agent slug or uuid to report as (default mcp-agent)
 *   OFFICE_AGENT_TOKEN  Bearer token (only required when OFFICE_REQUIRE_AUTH=true)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = process.env.OFFICE_API_URL ?? 'http://localhost:3000';
const AGENT_ID = process.env.OFFICE_AGENT_ID ?? 'mcp-agent';
const TOKEN = process.env.OFFICE_AGENT_TOKEN ?? '';

const STATES = [
  'thinking',
  'typing',
  'reading',
  'sorting',
  'printing',
  'saving',
  'meeting',
  'calling',
  'error',
  'done',
  'idle',
] as const;

/** POST a single event to the office API. */
async function emit(type: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${API_URL}/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ agent_id: AGENT_ID, type, payload, source: 'mcp' }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`office emit failed: ${res.status} ${detail}`);
  }
  return res.json();
}

/** Tracks the task started by the most recent office_emit call. */
let currentTaskId = '';

const server = new McpServer({
  name: 'aicore-office',
  version: '0.1.0',
});

server.tool(
  'office_emit',
  'Report agent activity to the Aicore Office dashboard. Use `state` to animate the ' +
    'character, `task` to start/finish a task, and `message` to send a handoff to another agent.',
  {
    state: z.enum(STATES).optional().describe('Current agent state (drives the character animation).'),
    task: z.string().optional().describe('Task title to start; prefix with "done:" or "error:" to end it.'),
    message: z.string().optional().describe('Message to another agent; use "to: <agent> — <text>".'),
    tokens_in: z.number().int().nonnegative().optional().describe('Prompt tokens used for this step.'),
    tokens_out: z.number().int().nonnegative().optional().describe('Completion tokens produced for this step.'),
    model: z.string().optional().describe('Model name, for the cost/metrics tab.'),
  },
  async ({ state, task, message, tokens_in, tokens_out, model }) => {
    const results: string[] = [];
    try {
      if (state) {
        await emit('state', { state });
        results.push(`state → ${state}`);
      }

      if (task) {
        const lowered = task.toLowerCase();
        if (lowered.startsWith('done:')) {
          await emit('task_end', { task_id: currentTaskId, title: task.slice(5).trim(), status: 'done' });
          results.push('task_end (done)');
          currentTaskId = '';
        } else if (lowered.startsWith('error:')) {
          await emit('task_end', { task_id: currentTaskId, title: task.slice(6).trim(), status: 'failed' });
          results.push('task_end (failed)');
          currentTaskId = '';
        } else {
          currentTaskId = `mcp-${Date.now()}`;
          await emit('task_start', { task_id: currentTaskId, title: task, priority: 'med' });
          results.push(`task_start → ${task}`);
        }
      }

      if (message) {
        const match = /^to:\s*([^—-]+)\s*[—-]\s*(.*)$/i.exec(message.trim());
        const to = match ? match[1].trim() : null;
        const content = match ? match[2].trim() : message;
        if (!to) {
          throw new Error('message must use the form "to: <agent> — <text>"');
        }
        await emit('message', { from: AGENT_ID, to, content, object: 'file' });
        results.push(`message → ${to}`);
      }

      if (typeof tokens_in === 'number' || typeof tokens_out === 'number') {
        await emit('usage', {
          model: model ?? 'unknown',
          tokens_in: tokens_in ?? 0,
          tokens_out: tokens_out ?? 0,
          cost: 0,
        });
        results.push('usage');
      }

      if (!results.length) {
        return {
          content: [
            { type: 'text' as const, text: 'Nothing to emit — pass at least one of state/task/message/usage.' },
          ],
        };
      }

      return {
        content: [{ type: 'text' as const, text: `Emitted: ${results.join(', ')}` }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          { type: 'text' as const, text: err instanceof Error ? err.message : String(err) },
        ],
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[office-mcp] listening on stdio\n');
}

main().catch((err) => {
  process.stderr.write(`[office-mcp] fatal: ${err?.message ?? err}\n`);
  process.exit(1);
});
