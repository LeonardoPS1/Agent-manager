/**
 * Verifies that every asset the character catalog references exists on disk.
 *
 * Usage: npm run models:verify
 *
 * Why: `apps/web/public/models` only keeps the files the catalog needs (the
 * curated CC0 subset), so a rename or a missing copy silently downgrades an
 * agent to the procedural fallback. This check turns that into a build error
 * instead of a surprise in the browser.
 */
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CHARACTER_FAMILIES,
  CHARACTER_MODELS,
  DEFAULT_CHARACTER_ID,
  getCharacterModel
} from '../apps/web/src/utils/characters'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const PUBLIC_DIR = path.join(ROOT, 'apps', 'web', 'public')

/** Turns a `/models/...` URL (already encoded the way the browser asks for it) into a disk path. */
function toDiskPath(url: string): string {
  const segments = url.replace(/^\//, '').split('/').map((segment) => decodeURIComponent(segment))
  return path.join(PUBLIC_DIR, ...segments)
}

const missing: string[] = []
const checked = new Set<string>()

for (const model of CHARACTER_MODELS) {
  const urls = [model.file, model.preview, ...model.animationSources].filter(
    (url): url is string => typeof url === 'string' && url.length > 0
  )

  for (const url of urls) {
    if (checked.has(url)) continue
    checked.add(url)

    const diskPath = toDiskPath(url)
    if (!existsSync(diskPath) || !statSync(diskPath).isFile()) {
      missing.push(`${model.id} -> ${url}`)
    }
  }
}

const defaultModel = getCharacterModel(DEFAULT_CHARACTER_ID)
const problems: string[] = []

if (defaultModel.id !== DEFAULT_CHARACTER_ID) {
  problems.push(`default character "${DEFAULT_CHARACTER_ID}" is not in the catalog`)
}

for (const family of CHARACTER_FAMILIES) {
  const count = CHARACTER_MODELS.filter((model) => model.family === family.id).length
  if (count === 0) problems.push(`family "${family.id}" has no models`)
}

console.log(`catalog entries       : ${CHARACTER_MODELS.length}`)
console.log(`unique assets checked : ${checked.size}`)
console.log(`missing assets        : ${missing.length}`)

for (const entry of missing) console.log(`  MISSING  ${entry}`)
for (const entry of problems) console.log(`  INVALID  ${entry}`)

if (missing.length > 0 || problems.length > 0) {
  console.error('\nCatalog and apps/web/public/models are out of sync.')
  process.exitCode = 1
} else {
  console.log('\nEvery catalog reference resolves on disk.')
}
