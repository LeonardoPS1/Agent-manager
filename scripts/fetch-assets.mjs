#!/usr/bin/env node
/**
 * Downloads the CC0 3D assets Aicore Office needs into apps/web/public/models.
 *
 * Usage:
 *   node scripts/fetch-assets.mjs          # download whatever is missing
 *   node scripts/fetch-assets.mjs --force  # re-download everything
 *   node scripts/fetch-assets.mjs --list   # print the manifest and exit
 *
 * Assets are pinned by direct URL. To extend the set, add an entry to ASSETS
 * below. Quaternius / KayKit / Kenney packs work the same way as long as the
 * URL points straight at a .glb file (itch.io and kenney.nl serve zip archives
 * behind a page, so those need a manual download into apps/web/public/models).
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(here, '..', 'apps', 'web', 'public', 'models')

/** @typedef {{file:string,url:string,bytes?:number,license:string,author:string,source:string,clips?:string[],note?:string}} Asset */

const KAYKIT_CHARACTERS =
  'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf'

/**
 * Pinned assets. Every URL below was verified to return the GLB directly
 * (HTTP 200, application/octet-stream) so no browser or account is needed.
 *
 * Two character families ship here:
 *   - robot-expressive.glb  : 464 KB, 13 clips, desired over exactly the states we need
 *   - KayKit Adventurers    : ~3.6 MB each, 75 clips, ready for Mixamo-style retargeting
 * Phase 2 picks one via apps/web/src/utils/characters.ts; both can stay on disk.
 */
/** @type {Asset[]} */
const ASSETS = [
  {
    file: 'robot-expressive.glb',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    bytes: 463988,
    license: 'CC0-1.0',
    author: 'Tomas Laulhe, modified by Don McCurdy',
    source: 'three.js examples/models/gltf/RobotExpressive',
    clips: [
      'Dance',
      'Death',
      'Idle',
      'Jump',
      'No',
      'Punch',
      'Running',
      'Sitting',
      'Standing',
      'ThumbsUp',
      'Walking',
      'Wave',
      'Yes'
    ],
    note: 'Rigged humanoid, cheapest option. Clips cover most of the office state machine.'
  },
  {
    file: 'Barbarian.glb',
    url: `${KAYKIT_CHARACTERS}/Barbarian.glb`,
    bytes: 3613268,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Pack - Adventures 1.0',
    note: 'Rig_Medium, 75 baked clips. Clip names are discovered at runtime.'
  },
  {
    file: 'Knight.glb',
    url: `${KAYKIT_CHARACTERS}/Knight.glb`,
    bytes: 3659532,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Pack - Adventures 1.0',
    note: 'Rig_Medium, 75 baked clips. Clip names are discovered at runtime.'
  },
  {
    file: 'Mage.glb',
    url: `${KAYKIT_CHARACTERS}/Mage.glb`,
    bytes: 3589240,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Pack - Adventures 1.0',
    note: 'Rig_Medium, 75 baked clips. Clip names are discovered at runtime.'
  },
  {
    file: 'Rogue.glb',
    url: `${KAYKIT_CHARACTERS}/Rogue.glb`,
    bytes: 3616284,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Pack - Adventures 1.0',
    note: 'Rig_Medium, 75 baked clips. Clip names are discovered at runtime.'
  },
  {
    file: 'Rogue_Hooded.glb',
    url: `${KAYKIT_CHARACTERS}/Rogue_Hooded.glb`,
    bytes: 3597652,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Pack - Adventures 1.0',
    note: 'Rig_Medium, 75 baked clips. Clip names are discovered at runtime.'
  }
]

const GLB_MAGIC = 'glTF'

/**
 * Downloads one asset, validates the GLB header, and writes it to OUT_DIR.
 * Returns 'downloaded' | 'skipped'.
 */
async function fetchAsset(asset, force) {
  const dest = join(OUT_DIR, asset.file)

  if (!force) {
    try {
      const existing = await readFile(dest)
      if (existing.length > 4 && existing.subarray(0, 4).toString('utf8') === GLB_MAGIC) {
        if (asset.bytes && existing.length !== asset.bytes) {
          console.log(`  ~ ${asset.file} present but ${existing.length} bytes (expected ${asset.bytes}) - re-downloading`)
        } else {
          console.log(`  = ${asset.file} already present (${existing.length} bytes)`)
          return 'skipped'
        }
      }
    } catch {
      // not there yet - fall through and download
    }
  }

  process.stdout.write(`  + ${asset.file} ... `)
  const res = await fetch(asset.url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${asset.file}: HTTP ${res.status} ${res.statusText}`)

  const buf = Buffer.from(await res.arrayBuffer())
  const magic = buf.subarray(0, 4).toString('utf8')
  if (magic !== GLB_MAGIC || buf.length < 12) {
    throw new Error(`${asset.file}: not a valid GLB (magic "${magic}", ${buf.length} bytes)`)
  }
  if (asset.bytes && buf.length !== asset.bytes) {
    console.log(`\n    note: ${buf.length} bytes, manifest says ${asset.bytes} (upstream may have changed)`)
  }

  await writeFile(dest, buf)
  console.log(`ok (${buf.length} bytes)`)
  return 'downloaded'
}

function printManifest() {
  console.log('Pinned assets:\n')
  for (const a of ASSETS) {
    console.log(`  ${a.file}`)
    console.log(`    license : ${a.license}`)
    console.log(`    author  : ${a.author}`)
    console.log(`    source  : ${a.source}`)
    if (a.clips?.length) console.log(`    clips   : ${a.clips.join(', ')}`)
    console.log(`    url     : ${a.url}\n`)
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (args('--list')) {
    printManifest()
    return
  }
  const force = args.has('--force')

  console.log(`Aicore Office assets -> ${OUT_DIR}\n`)
  await mkdir(OUT_DIR, { recursive: true })

  let downloaded = 0
  let failed = 0
  for (const asset of ASSETS) {
    try {
      if ((await fetchAsset(asset, flags.force)) === 'downloaded') downloaded++
    } catch (err) {
      console.error(`\n    FAILED: ${err.message}`)
      failures.push(asset)
    }
  }

  const present = (await readdir(OUT_DIR).catch(() => [])).filter(f => f.endsWith('.glb'))
  console.log(`\n${OUT_DIR}`)
  console.log(`  ${present.length} .glb file(s) available: ${present.join(', ') || '(none)'}`)
  console.log(`  downloaded: ${downloaded}, already present: ${ASSETS.length - downloaded - failures.length}`)

  if (failures.length) {
    console.error(`\n${failures.length} asset(s) failed. Re-run, or download them manually:`)
    for (const f of failures) console.error(`  ${f.license} - ${f.source} - ${f.url}`)
    process.exitCode = 1
  }
}
