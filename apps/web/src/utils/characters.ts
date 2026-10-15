/**
 * Character catalog for the Aicore Office 3D scene.
 *
 * Every entry points at a CC0 asset that lives under `apps/web/public/models`.
 * Agents store the chosen model id in `agent.appearance.character`, so changing
 * how an agent looks is a data change (a PATCH on the agent), never a code change.
 *
 * Upstream packs keep spaces and brackets in their folder names, so the raw
 * strings below mirror the on-disk layout. Always resolve them through
 * `assetUrl()` before handing them to a loader.
 */

export type CharacterFamilyId = 'office' | 'adventurers' | 'mannequins' | 'mini' | 'classic'

/** `rigged` models are skinned and driven by real animation clips. */
export type CharacterKind = 'rigged' | 'static'

export interface CharacterFamily {
  id: CharacterFamilyId
  label: string
  description: string
}

export interface CharacterModel {
  id: string
  label: string
  family: CharacterFamilyId
  kind: CharacterKind
  /** Path under `/models`. `null` for the procedural fallback character. */
  file: string | null
  /** Thumbnail shipped by the upstream pack, when there is one. */
  preview?: string
  rig?: string
  /** Skinned models keep their clips in separate GLB files. */
  animationSources: string[]
  /** Scene height in world units; loaded models are rescaled to match. */
  height: number
  /** Extra scale multiplier applied on top of the height normalisation. */
  scale: number
  /** Yaw in radians applied to the model root. */
  rotationY?: number
  license: string
  author: string
  source: string
  tags: string[]
}

const MODELS = '/models'

// --- Upstream packs -------------------------------------------------------

const KAYKIT_ADVENTURERS = `${MODELS}/KayKit_Adventurers_2.0_FREE/Characters/gltf`
const KAYKIT_SAMPLES = `${MODELS}/KayKit_Adventurers_2.0_FREE/Samples`
const KAYKIT_CLIPS = `${MODELS}/KayKit_Character_Animations_1.1/Animations/gltf`
const KAYKIT_MANNEQUINS = `${MODELS}/KayKit_Character_Animations_1.1/Mannequin Character/characters`
const QUATERNIUS_BASE = `${MODELS}/Universal Base Characters[Standard]/Base Characters/Godot - UE`
const QUATERNIUS_PREVIEW = `${MODELS}/Universal Base Characters[Standard]/Preview.png`
const QUATERNIUS_CLIPS = [`${MODELS}/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb`]
const KENNEY_MINI = `${MODELS}/kenney_mini-characters/Models/GLB format`
const KENNEY_PREVIEWS = `${MODELS}/kenney_mini-characters/Previews`

/**
 * KayKit ships its animation library as one GLB per category, all bound to the
 * same rig. We load the three categories that cover the office state machine:
 * `General` (idling, talking, interacting), `MovementBasic` (walking, running)
 * and `Special` (sitting, resting, reactions).
 */
const RIG_MEDIUM_CLIPS = [
  `${KAYKIT_CLIPS}/Rig_Medium/Rig_Medium_General.glb`,
  `${KAYKIT_CLIPS}/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  `${KAYKIT_CLIPS}/Rig_Medium/Rig_Medium_Special.glb`
]

const RIG_LARGE_CLIPS = [
  `${KAYKIT_CLIPS}/Rig_Large/Rig_Large_General.glb`,
  `${KAYKIT_CLIPS}/Rig_Large/Rig_Large_MovementBasic.glb`,
  `${KAYKIT_CLIPS}/Rig_Large/Rig_Large_Special.glb`
]

export const CHARACTER_FAMILIES: CharacterFamily[] = [
  {
    id: 'office',
    label: 'Office',
    description: 'Modern Quaternius base characters driven by the Universal Animation Library.'
  },
  {
    id: 'adventurers',
    label: 'Adventurers',
    description: 'KayKit fantasy characters on the Rig_Medium skeleton (75 clips).'
  },
  {
    id: 'mannequins',
    label: 'Mannequins',
    description: 'KayKit mannequins, useful for rig and scale checks.'
  },
  {
    id: 'mini',
    label: 'Mini',
    description: 'Kenney mini characters. Static meshes with procedural idle motion.'
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Procedural fallback that needs no downloaded assets.'
  }
]

const KAYKIT_ADVENTURER_ATTRS = {
  family: 'adventurers' as const,
  kind: 'rigged' as const,
  rig: 'Rig_Medium',
  animationSources: RIG_MEDIUM_CLIPS,
  height: 1.75,
  scale: 1,
  license: 'CC0-1.0',
  author: 'Kay Lousberg (KayKit)',
  source: 'KayKit Adventurers 2.0 FREE + Character Animations 1.1'
}

const KENNEY_ATTRS = {
  family: 'mini' as const,
  kind: 'static' as const,
  animationSources: [] as string[],
  height: 1.15,
  scale: 1,
  license: 'CC0-1.0',
  author: 'Kenney',
  source: 'Kenney Mini Characters'
}

/** Mini character variants: `a` to `f` for each body. */
const MINI_VARIANTS = ['a', 'b', 'c', 'd', 'e', 'f'] as const

const MINI_MODELS: CharacterModel[] = (['male', 'female'] as const).flatMap((body) =>
  MINI_VARIANTS.map((variant) => {
    const slug = `character-${body}-${variant}`
    return {
      ...KENNEY_ATTRS,
      id: `mini-${body}-${variant}`,
      label: `Mini ${body === 'male' ? 'M' : 'F'}-${variant.toUpperCase()}`,
      file: `${KENNEY_MINI}/${slug}.glb`,
      preview: `${KENNEY_PREVIEWS}/${slug}.png`,
      tags: ['mini', 'static', body]
    }
  })
)

export const CHARACTER_MODELS: CharacterModel[] = [
  // --- Office: modern humanoid base meshes on the Quaternius universal rig ---
  {
    id: 'office-male',
    label: 'Employee M',
    family: 'office',
    kind: 'rigged',
    file: `${QUATERNIUS_BASE}/Superhero_Male_FullBody.gltf`,
    preview: QUATERNIUS_PREVIEW,
    rig: 'Universal',
    animationSources: QUATERNIUS_CLIPS,
    height: 1.8,
    scale: 1,
    license: 'CC0-1.0',
    author: 'Quaternius',
    source: 'Universal Base Characters [Standard] + Universal Animation Library',
    tags: ['office', 'm', 'modern']
  },
  {
    id: 'office-female',
    label: 'Employee F',
    family: 'office',
    kind: 'rigged',
    file: `${QUATERNIUS_BASE}/Superhero_Female_FullBody.gltf`,
    preview: QUATERNIUS_PREVIEW,
    rig: 'Universal',
    animationSources: QUATERNIUS_CLIPS,
    height: 1.72,
    scale: 1,
    license: 'CC0-1.0',
    author: 'Quaternius',
    source: 'Universal Base Characters [Standard] + Universal Animation Library',
    tags: ['office', 'f', 'modern']
  },

  // --- KayKit Adventurers (Rig_Medium) ---
  adventurer('barbarian', 'Barbarian', 'm'),
  adventurer('knight', 'Knight', 'm'),
  adventurer('mage', 'Mage', 'f'),
  adventurer('ranger', 'Ranger', 'f'),
  adventurer('rogue', 'Rogue', 'f'),
  adventurer('rogue-hooded', 'Rogue (hooded)', 'f', 'rogue'),

  // --- KayKit mannequins ---
  {
    id: 'mannequin-medium',
    label: 'Mannequin M',
    family: 'mannequins',
    kind: 'rigged',
    file: `${KAYKIT_MANNEQUINS}/Mannequin_Medium.glb`,
    rig: 'Rig_Medium',
    animationSources: RIG_MEDIUM_CLIPS,
    height: 1.75,
    scale: 1,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Animations 1.1',
    tags: ['mannequin', 'rig-medium']
  },
  {
    id: 'mannequin-large',
    label: 'Mannequin L',
    family: 'mannequins',
    kind: 'rigged',
    file: `${KAYKIT_MANNEQUINS}/Mannequin_Large.glb`,
    rig: 'Rig_Large',
    animationSources: RIG_LARGE_CLIPS,
    height: 1.8,
    scale: 1,
    license: 'CC0-1.0',
    author: 'Kay Lousberg (KayKit)',
    source: 'KayKit Character Animations 1.1',
    tags: ['mannequin', 'rig-large']
  },

  // --- Kenney mini characters (static) ---
  ...MINI_MODELS,

  // --- Procedural fallback ---
  {
    id: 'classic',
    label: 'Classic',
    family: 'classic',
    kind: 'static',
    file: null,
    animationSources: [],
    height: 1.75,
    scale: 1,
    license: 'n/a',
    author: 'Aicore',
    source: 'Built in',
    tags: ['procedural', 'fallback']
  }
]

function adventurer(
  slug: string,
  label: string,
  body: string,
  sampleSlug = slug
): CharacterModel {
  return {
    ...KAYKIT_ADVENTURER_ATTRS,
    id: `adventurer-${slug}`,
    label,
    file: `${KAYKIT_ADVENTURERS}/${capitalise(slug === 'rogue-hooded' ? 'Rogue_Hooded' : slug)}.glb`,
    preview: `${KAYKIT_SAMPLES}/${sampleSlug}.png`,
    tags: ['adventurer', 'fantasy', body]
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Advertised as available so the UI can list families before models load. */
export const CHARACTER_MODEL_COUNT = CHARACTER_MODELS.length

// --- Lookups & helpers ----------------------------------------------------

export const DEFAULT_CHARACTER_ID = 'office-male'

const BY_ID = new Map(CHARACTER_MODELS.map((model) => [model.id, model]))

/** Resolves any unknown/missing id back to the default character. */
export function getCharacterModel(id: unknown): CharacterModel {
  if (typeof id === 'string') {
    const found = BY_ID.get(id)
    if (found) return found
  }
  return BY_ID.get(DEFAULT_CHARACTER_ID) as CharacterModel
}

export function getCharacterModelsByFamily(family: CharacterFamilyId): CharacterModel[] {
  return CHARACTER_MODELS.filter((model) => model.family === family)
}

export function randomCharacterModel(family?: CharacterFamilyId): CharacterModel {
  const pool = family ? getCharacterModelsByFamily(family) : CHARACTER_MODELS
  const candidates = pool.filter((model) => model.file !== null)
  const source = candidates.length > 0 ? candidates : CHARACTER_MODELS
  return source[Math.floor(Math.random() * source.length)]
}

/**
 * URL-encodes a `public/models` path. The upstream packs use spaces and square
 * brackets in folder names, which browsers would otherwise mangle.
 */
export function assetUrl(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

/** Deterministic swatch colour for models whose pack ships no thumbnail. */
export function characterSwatch(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360
  }
  return `hsl(${hash} 45% 45%)`
}

// --- Runtime status -------------------------------------------------------

/**
 * Reported by each character instance so the UI can explain why a model looks
 * the way it does.
 *
 * - `ok`           clips bound to the skeleton and play normally
 * - `static`       mesh-only model, animated procedurally
 * - `no-clips`     the model shipped no animations at all
 * - `rig-mismatch` clips loaded but their bones do not exist in this skeleton
 * - `error`        the model failed to load or render
 */
export type CharacterStatus = 'loading' | 'ok' | 'static' | 'no-clips' | 'rig-mismatch' | 'error'

export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  loading: 'Loading',
  ok: 'Animated',
  static: 'Static',
  'no-clips': 'No clips',
  'rig-mismatch': 'Rig mismatch',
  error: 'Load error'
}

/** Statuses that mean the model cannot be driven by real animation clips. */
export const CHARACTER_STATUS_WARNING: CharacterStatus[] = ['no-clips', 'rig-mismatch', 'error']
