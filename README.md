# Aicore Office

Self-hosted web app that visualizes AI agents as animated 3D characters working in a detailed isometric office, driven by REAL events from real agents, with a full management dashboard.

## Architecture

- **Monorepo**: apps/web, apps/api, apps/mcp-server, packages/sdk, sdk-python, adapters/
- **Web**: Vite + React + TypeScript + react-three-fiber + @react-three/drei + zustand + tailwindcss
- **API**: Fastify + @fastify/websocket + zod + pino
- **DB**: PostgreSQL 16 + Redis 7 (pub/sub)
- **3D**: Isometric orthographic view with rigged GLB characters, animation state machine, A* pathfinding
- **Infra**: Docker + docker-compose.yml, Dokploy-ready

## Quick Start

```bash
# Clone and setup
cp .env.example .env
# Edit .env with your values

# Start with Docker
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000/health

## Event Contract

All events: `POST /v1/events` with `Authorization: Bearer <token>`

Event types:
- `state` (thinking|typing|reading|sorting|printing|saving|meeting|calling|error|done|idle)
- `task_start`, `task_end`
- `message` (with handoff visual)
- `tool_call`, `usage`
- `heartbeat`, `command_ack`, `layout_update`

WebSocket: `ws://host/v1/stream?agent_id=...&token=...&since=<event_id>` (replay supported)

## Adapters

- **n8n**: See `adapters/n8n/README.md`
- **Claude Code**: See `adapters/claude-code/README.md`
- **MCP**: `office_emit` tool in `apps/mcp-server/`

## SDKs

- **TypeScript**: `packages/sdk/`
- **Python**: `sdk-python/`

## Development

```bash
# API
cd apps/api && npm run dev

# Web
cd apps/web && npm run dev

# Seed demo agents
npx tsx scripts/seed.ts

# Mock events generator
npx tsx scripts/mock-events.ts
```

## 3D Characters

Agents are rendered by rigged CC0 GLB models. The model an agent uses is stored
in `agent.appearance.character`, so assigning a character is a data change, not a
code change.

The catalog lives in `apps/web/src/utils/characters.ts` and groups models into
families:

| Family | Models | Animation |
| --- | --- | --- |
| `office` | Quaternius Universal Base (male / female) | Universal Animation Library (`UAL1_Standard.glb`) |
| `adventurers` | 6 KayKit Adventurers | KayKit `Rig_Medium` clips |
| `mannequins` | KayKit Mannequin M / L | KayKit `Rig_Medium` / `Rig_Large` clips |
| `mini` | 12 Kenney Mini Characters | none (static mesh, procedural idle motion) |
| `classic` | procedural fallback | none |

Pick a character from the dashboard: select an agent, then open the **Character**
tab in the agent panel. The same tab exposes a size slider, a rotation slider,
randomise and reset. Everything persists through `PATCH /v1/agents/:id`.

### Clip resolution

Asset packs name their clips however they like, so the scene never hardcodes clip
names. Each agent state maps to a preference chain of abstract roles
(`apps/web/src/utils/animations.ts` -> `STATE_TO_ROLES`), and
`apps/web/src/utils/clips.ts` scores every clip the loaded model provides to pick
the best match, then cross-fades between them. The agent panel reports the
resulting animation status per agent (`Animated`, `Static`, `No clips`,
`Rig mismatch`, `Load error`).

Models that fail to load, or whose clips do not bind to their skeleton, fall back
to the procedural character, so the office never renders an empty desk.

### Asset packs

The repository ships a **curated CC0 subset** of the character packs under
`apps/web/public/models/` (26 MB, 72 files). It contains exactly the files the
catalog references:

```
KayKit_Adventurers_2.0_FREE/Characters/gltf/   6 character GLBs
KayKit_Adventurers_2.0_FREE/Samples/           5 preview images
KayKit_Character_Animations_1.1/Animations/    Rig_Medium + Rig_Large clip GLBs
KayKit_Character_Animations_1.1/Mannequin Character/
Universal Base Characters[Standard]/           2 characters + their textures
Universal Animation Library[Standard]/         UAL1_Standard.glb
kenney_mini-characters/                        12 characters + 12 previews
```

Textures were downscaled (2048 -> 1024 for colour maps, 1024 -> 512 for normal
maps) and maps that no material references were dropped. Models are loaded on
demand, so none of this affects the JavaScript bundle; the size only matters when
the static files are served.

Two of the shipped `.gltf` files needed a local fix: their `images[].uri` entries
pointed at `T_*_Normal_png.png` names that do not exist in the upstream pack, so
they were rewritten to the real `T_*_Normal.png` files. Keep that in mind when
updating those assets.

`npm run models:scan` reads the GLB/glTF containers and writes the generated,
git-ignored `apps/web/public/models/manifest.json` with clip names, joint counts
and the nodes each animation drives - the fastest way to inspect a new pack
without starting the app.

To add a character, drop the GLB into that folder and register it in
`apps/web/src/utils/characters.ts`. The full archives stay outside the repository.
Without the packs the app still runs: every agent falls back to the procedural
character and the Character tab reports a load error.

## License

MIT License - see LICENSE file. Assets are CC0 as listed in assets-license.md
