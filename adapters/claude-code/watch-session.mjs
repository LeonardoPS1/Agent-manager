#!/usr/bin/env node
/**
 * Claude Code session watcher.
 *
 * Tails a Claude Code session `.jsonl` transcript and emits Aicore Office events.
 * Sub-agents (Task tool invocations) are surfaced as `message` handoffs so they
 * appear as linked characters in the office.
 *
 * Usage:
 *   node watch-session.mjs <path-to-session.jsonl>
 *   node watch-session.mjs --latest            # newest transcript for $CLAUDE_PROJECT_DIR
 *
 * Env:
 *   OFFICE_API_URL      default http://localhost:3000
 *   OFFICE_AGENT_ID     agent slug or uuid (default: claude-code)
 *   OFFICE_AGENT_TOKEN  bearer token (only when OFFICE_REQUIRE_AUTH=true)
 *   CLAUDE_PROJECT_DIR  used by --latest to locate the transcript directory
 */

import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { watch } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import readline from 'node:readline';

const API_URL = process.env.OFFICE_API_URL ?? 'http://localhost:3000';
const AGENT_ID = process.env.OFFICE_AGENT_ID ?? 'claude-code';
const TOKEN = process.env.OFFICE_AGENT_TOKEN ?? '';

/** Summarize a tool input for `args_summary`. */
function summarize(input) {
  if (input == null) return '';
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

/**
 * Map one transcript JSONL entry to Office events.
 * Pure function — exported for unit tests.
 * @param {any} entry
 * @returns {Array<{type: string, payload: object}>}
 */
export function mapTranscriptEntry(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const out = [];

  if (entry.type === 'user') {
    out.push({ type: 'state', payload: { state: 'thinking' } });
    return out;
  }

  if (entry.type === 'assistant' && entry.message) {
    const msg = entry.message;

    if (msg.usage) {
      out.push({
        type: 'usage',
        payload: {
          model: msg.model ?? 'claude',
          tokens_in: msg.usage.input_tokens ?? 0,
          tokens_out: msg.usage.output_tokens ?? 0,
          cost: 0,
        },
      });
    }

    const blocks = Array.isArray(msg.content) ? msg.content : [];
    for (const block of blocks) {
      if (block?.type !== 'tool_use') continue;
      out.push({
        type: 'tool_call',
        payload: { name: block.name, args_summary: summarize(block.input) },
      });
      // Task tool = sub-agent dispatch → visible handoff.
      if (block.name === 'Task' || block.name === 'Agent') {
        out.push({
          type: 'message',
          payload: {
            from: AGENT_ID,
            to: block.input?.subagent_type ?? 'subagent',
            content: block.input?.description ?? block.input?.prompt ?? 'Delegated task',
            object: 'file',
          },
        });
      }
      out.push({ type: 'state', payload: { state: 'typing' } });
    }

    if (blocks.some((b) => b?.type === 'text' && b.text?.trim())) {
      out.push({ type: 'state', payload: { state: 'thinking' } });
    }
    return out;
  }

  return out;
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
      if (!res.ok) process.stderr.write(`[office] emit ${ev.type} failed: ${res.status}\n`);
    } catch (err) {
      process.stderr.write(`[office] emit ${ev.type} error: ${err?.message ?? err}\n`);
    }
  }
}

/** Locate the newest transcript for a project directory. */
function latestTranscript() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const slug = projectDir.replace(/[:\\/]/g, '-');
  const dir = join(homedir(), '.claude', 'projects', slug);
  if (!existsSync(dir)) {
    throw new Error(`No transcript directory at ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ f, m: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!files.length) throw new Error(`No .jsonl transcripts in ${dir}`);
  return join(dir, files[0].f);
}

/** Tail a file, invoking onLine for every new complete line. */
function tail(file) {
  let offset = 0;
  let busy = false;

  async function readNew() {
    if (busy) return;
    busy = true;
    try {
      const { size } = statSync(file);
      if (size <= offset) return;
      const stream = createReadStream(file, { start: offset, end: size - 1, encoding: 'utf8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          await post(mapTranscriptEntry(JSON.parse(trimmed)));
        } catch {
          /* skip malformed line */
        }
      }
      offset = size;
    } finally {
      busy = false;
    }
  }

  void readNew();
  watch(file, () => void readNew());
  process.stderr.write(`[office] watching ${file}\n`);
}

const invokedDirectly = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (invokedDirectly) {
  const arg = process.argv[2];
  const file = arg === '--latest' || !arg ? latestTranscript() : resolve(arg);
  if (!existsSync(file)) {
    process.stderr.write(`[office] transcript not found: ${file}\n`);
    process.exit(1);
  }
  tail(file);
}
