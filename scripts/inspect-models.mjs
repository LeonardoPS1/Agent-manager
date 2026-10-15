#!/usr/bin/env node
/**
 * Scans `apps/web/public/models` and writes `manifest.json` next to it.
 *
 * Usage: npm run models:scan
 *
 * Why this exists: GLB is a binary container, so clip names and skeleton
 * information are invisible to text tooling. This script decodes the JSON chunk
 * of every model and reports the clip inventory, the rig signature (joint names)
 * and the nodes each animation actually drives. That makes it possible to verify
 * that a character and an animation library share a skeleton BEFORE loading them
 * in the browser.
 *
 * The output is purely a build-time artefact: nothing in the bundle imports it,
 * and the app keeps discovering clip names at runtime through the loader.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const MODELS_DIR = path.join(ROOT, 'apps', 'web', 'public', 'models')
const OUT_FILE = path.join(MODELS_DIR, 'manifest.json')

const GLB_MAGIC = 'glTF'
const CHUNK_JSON = 0x4e4f534a

async function walk(dir, found = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, found)
    } else if (entry.name.toLowerCase().endsWith('.glb') || entry.name.toLowerCase().endsWith('.gltf')) {
      found.push(full)
    }
  }
  return found
}

/** Reads the embedded JSON chunk of a binary GLB container. */
function readGlbJson(buffer) {
  if (buffer.toString('utf8', 0, 4) !== GLB_MAGIC) {
    throw new Error('missing glTF magic')
  }
  const version = buffer.readUInt32LE(4)
  const jsonLength = buffer.readUInt32LE(12)
  const chunkType = buffer.readUInt32LE(16)
  if (chunkType !== CHUNK_JSON) {
    throw new Error('first chunk is not JSON')
  }
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength))
  return { json, version }
}

function describe(json) {
  const animations = json.animations ?? []
  const nodes = json.nodes ?? []
  const skins = json.skins ?? []

  const clips = animations.map((animation, index) => ({
    name: animation.name ?? `(unnamed #${index})`,
    channels: (animation.channels ?? []).length
  }))

  // Node names targeted by the first clip = the rig the clips are authored for.
  const animatedTargets = []
  const seen = new Set()
  for (const channel of animations[0]?.channels ?? []) {
    const index = channel.target?.node
    const name = typeof index === 'number' ? nodes[index]?.name : undefined
    if (name && !seen.has(name)) {
      seen.add(name)
      animatedTargets.push(name)
    }
  }

  const joints = skins[0]?.joints ?? []
  const jointNames = joints.map((index) => nodes[index]?.name).filter(Boolean)

  return {
    clips,
    clipCount: clips.length,
    skinned: skins.length > 0,
    skinCount: skins.length,
    jointCount: joints.length,
    jointNames,
    animatedTargetCount: animatedTargets.length,
    animatedTargets,
    nodes: nodes.length,
    meshes: (json.meshes ?? []).length,
    materials: (json.materials ?? []).length,
    images: (json.images ?? []).length,
    generators: [json.asset?.generator, json.asset?.version].filter(Boolean).join(' ')
  }
}

function toUrl(absolutePath) {
  const relative = path.relative(MODELS_DIR, absolutePath).split(path.sep).join('/')
  const encoded = relative
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return { relative, url: `/models/${encoded}` }
}

async function main() {
  try {
    await readdir(MODELS_DIR)
  } catch {
    console.error(`Models directory not found: ${MODELS_DIR}`)
    console.error('Download the CC0 packs (see README) and run this again.')
    process.exitCode = 1
    return
  }

  const files = (await walk(MODELS_DIR)).sort()
  const models = {}
  const failures = []
  let totalClips = 0

  for (const file of files) {
    const { relative, url } = toUrl(file)
    try {
      const buffer = await readFile(file)
      const info = file.toLowerCase().endsWith('.glb')
        ? readGlbJson(buffer)
        : { json: JSON.parse(buffer.toString('utf8')), version: 2 }
      const described = describe(info.json)

      models[relative] = {
        url,
        container: file.toLowerCase().endsWith('.glb') ? 'glb' : 'gltf',
        bytes: (await stat(file)).size,
        assetVersion: described.generators,
        ...described
      }
      totalClips += described.clipCount
    } catch (error) {
      failures.push({ file: relative, message: error.message })
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    modelsDir: 'apps/web/public/models',
    fileCount: files.length,
    clipCount: totalClips,
    models
  }

  await writeFile(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  // --- Report -------------------------------------------------------------
  const animationFiles = Object.entries(models).filter(([, entry]) => entry.clipCount > 0)
  const characters = Object.entries(models).filter(([, entry]) => entry.skinned)

  console.log(`Scanned ${files.length} model files (${totalClips} clips total).`)
  console.log(`Manifest: ${path.relative(ROOT, OUT_FILE)}\n`)

  console.log(`Animation sources (${animationFiles.length}):`)
  for (const [relative, entry] of animationFiles) {
    console.log(`  ${relative}  [${entry.clipCount} clips]`)
    console.log(`    ${entry.clips.map((clip) => clip.name).join(', ')}`)
  }

  console.log(`\nRigged characters (${characters.length}):`)
  for (const [relative, entry] of characters) {
    console.log(`  ${relative}`)
    console.log(`    joints: ${entry.jointCount}  clips embedded: ${entry.clipCount}`)
    if (entry.jointNames.length > 0) {
      console.log(`    bones: ${entry.jointNames.slice(0, 12).join(', ')}${entry.jointCount > 12 ? ', …' : ''}`)
    }
  }

  if (failures.length > 0) {
    console.log(`\nCould not parse ${failures.length} file(s):`)
    for (const failure of failures) console.log(`  ${failure.file} — ${failure.message}`)
  }
}

await main()
