import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { stateToRoles } from '../../utils/animations'
import { LOOPING_ROLES, pickClipForRoles, resolveRoleClips } from '../../utils/clips'
import { assetUrl, type CharacterModel } from '../../utils/characters'
import { AgentTag } from './AgentTag'
import type { CharacterProps, CharacterStatus } from './types'

const NO_URLS: string[] = []
const FADE = 0.3
const DEFAULT_ROTATION = Math.PI / 4
const MOVE_LERP = 0.08

export interface GltfCharacterProps extends CharacterProps {
  model: CharacterModel & { file: string }
  onStatus?: (status: CharacterStatus) => void
}

interface PreparedModel {
  object: THREE.Object3D
  scale: number
  offsetY: number
  tagHeight: number
}

/**
 * Instantiates a rigged or static GLB model for one agent.
 *
 * The source scene is cloned with `SkeletonUtils.clone`, because several agents
 * may share the same file and a skinned mesh cannot belong to two mixers.
 */
export function GltfCharacter({
  model,
  agent,
  state,
  position,
  rotationY = DEFAULT_ROTATION,
  selected,
  speech,
  onSelect,
  onStatus
}: GltfCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group>(null)

  const modelUrl = useMemo(() => assetUrl(model.file), [model.file])
  const animUrls = useMemo(
    () => (model.animationSources.length > 0 ? model.animationSources.map(assetUrl) : NO_URLS),
    [model.animationSources]
  )

  const gltf = useLoader(GLTFLoader, modelUrl)
  const animationGltfs = useLoader(GLTFLoader, animUrls)

  const prepared = useMemo(() => prepareModel(gltf.scene, model), [gltf, model])

  const clips = useMemo(() => {
    const merged: THREE.AnimationClip[] = []
    const seen = new Set<string>()
    for (const entry of animationGltfs) {
      for (const clip of entry.animations) {
        if (!clip.name || seen.has(clip.name)) continue
        seen.add(clip.name)
        merged.push(clip)
      }
    }
    return merged
  }, [animationGltfs])

  const clipNames = useMemo(() => clips.map((clip) => clip.name), [clips])
  const resolution = useMemo(() => resolveRoleClips(clipNames), [clipNames])

  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.object), [prepared.object])

  useEffect(() => {
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(prepared.object)
    }
  }, [mixer, prepared.object])

  // --- Rig diagnostics ----------------------------------------------------

  const status = useMemo<CharacterStatus>(() => {
    if (clips.length === 0) return model.kind === 'static' ? 'static' : 'no-clips'

    // Sample the clip we would actually play first and check that its tracks
    // address nodes that exist in this skeleton.
    const probeName = resolution.roles.idle ?? clipNames[0]
    const probe = clips.find((clip) => clip.name === probeName) ?? clips[0]
    const nodeNames = new Set<string>()
    prepared.object.traverse((node) => {
      if (node.name) nodeNames.add(node.name)
    })

    for (const track of probe.tracks) {
      if (nodeNames.has(trackNodeName(track.name))) return 'ok'
    }
    return 'rig-mismatch'
  }, [clips, clipNames, resolution, prepared.object, model.kind])

  useEffect(() => {
    onStatus?.(status)
  }, [status, onStatus])

  // --- Clip playback ------------------------------------------------------

  const chosen = useMemo(() => pickClipForRoles(resolution, stateToRoles(state)), [resolution, state])
  const activeRef = useRef<{ name: string; action: THREE.AnimationAction } | null>(null)

  useEffect(() => {
    const clip = chosen.clip
    if (!clip) return

    const action = mixer.clipAction(getClipByName(clips, clip))
    if (!action) return
    if (activeRef.current?.name === clip) return

    const loops = chosen.role ? LOOPING_ROLES.includes(chosen.role) : true

    action.reset()
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(1)
    action.enabled = true
    action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1)
    action.clampWhenFinished = !loops
    action.fadeIn(FADE)
    action.play()

    const previous = activeRef.current?.action
    if (previous && previous !== action) previous.fadeOut(FADE)

    activeRef.current = { name: clip, action }
  }, [chosen.clip, chosen.role, clips, mixer])

  // One-shot roles clamp on their last frame; drop back to idle afterwards.
  useEffect(() => {
    const idleName = resolution.roles.idle
    if (!idleName) return

    const handleFinished = (event: { action: THREE.AnimationAction }) => {
      const current = activeRef.current
      if (!current || current.action !== event.action) return

      const idleAction = mixer.clipAction(getClipByName(clips, idleName))
      if (!idleAction || current.name === idleName) return

      idleAction.reset().setEffectiveWeight(1).fadeIn(0.4).play()
      current.action.fadeOut(0.4)
      activeRef.current = { name: idleName, action: idleAction }
    }

    mixer.addEventListener('finished', handleFinished)
    return () => mixer.removeEventListener('finished', handleFinished)
  }, [mixer, clips, resolution])

  // --- Frame loop ---------------------------------------------------------

  useFrame(({ clock }, delta) => {
    mixer.update(Math.min(delta, 0.1))

    const group = groupRef.current
    if (group) {
      group.position.x += (position[0] - group.position.x) * MOVE_LERP
      group.position.z += (position[2] - group.position.z) * MOVE_LERP
    }

    // Models whose clips did not bind would otherwise sit perfectly still.
    const modelGroup = modelRef.current
    if (modelGroup) {
      modelGroup.position.y = status === 'ok' ? 0 : Math.sin(clock.elapsedTime * 1.8) * 0.015
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
    >
      <group ref={modelRef} rotation={[0, rotationY, 0]}>
        <primitive
          object={prepared.object}
          position={[0, prepared.offsetY, 0]}
          scale={prepared.scale}
        />
      </group>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.52, 32]} />
          <meshBasicMaterial color="#60a5fa" side={THREE.DoubleSide} />
        </mesh>
      )}

      <AgentTag name={agent.name} state={state} speech={speech} y={prepared.tagHeight} />
    </group>
  )
}

// --- helpers --------------------------------------------------------------

/** Clones the source scene and normalises its height to the catalog value. */
function prepareModel(source: THREE.Object3D, model: CharacterModel): PreparedModel {
  const object = cloneSkinned(source)

  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = false
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      // Skinned bounds come from the bind pose, so culling hides characters
      // mid-animation.
      mesh.frustumCulled = false
    }
  })

  const bounds = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  bounds.getSize(size)

  const height = size.y
  if (!Number.isFinite(height) || height < 0.01 || height > 1000) {
    return { object, scale: model.scale, offsetY: 0, tagHeight: model.height + 0.35 }
  }

  const scale = (model.height / height) * model.scale
  return {
    object,
    scale,
    offsetY: -bounds.min.y * scale,
    tagHeight: model.height + 0.35
  }
}

function getClipByName(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip {
  return clips.find((clip) => clip.name === name) as THREE.AnimationClip
}

/** `Armature|Hips.quaternion` / `Rig/Hips.quaternion` -> `Hips`. */
function trackNodeName(trackName: string): string {
  const dot = trackName.lastIndexOf('.')
  const withoutProperty = dot > 0 ? trackName.slice(0, dot) : trackName
  const segments = withoutProperty.split('|')
  const tail = segments[segments.length - 1]
  const slash = tail.lastIndexOf('/')
  return (slash >= 0 ? tail.slice(slash + 1) : tail).trim()
}
