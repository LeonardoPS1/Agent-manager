import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mapStateToAnim } from '../../utils/animations'
import { AgentTag } from './AgentTag'
import type { CharacterProps } from './types'

const DEFAULT_ROTATION = Math.PI / 4

/**
 * Boxy placeholder character built from primitives.
 *
 * Used as the default for the `classic` model and as the Suspense/error
 * fallback while a real GLB loads, so the office never looks empty.
 */
export function ProceduralCharacter({
  agent,
  state,
  position,
  rotationY = DEFAULT_ROTATION,
  selected,
  speech,
  onSelect
}: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)

  const appearance = (agent.appearance ?? {}) as Record<string, unknown>
  const outfit = typeof appearance.outfitColor === 'string' ? appearance.outfitColor : '#3b82f6'
  const skin = typeof appearance.skinColor === 'string' ? appearance.skinColor : '#f1c8a0'
  const hair = typeof appearance.hairColor === 'string' ? appearance.hairColor : '#2b2118'

  const mapping = mapStateToAnim(state)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const g = groupRef.current
    if (!g) return

    g.position.x += (position[0] - g.position.x) * 0.08
    g.position.z += (position[2] - g.position.z) * 0.08

    const breathe = Math.sin(t * 2) * 0.02
    if (torsoRef.current) torsoRef.current.position.y = 0.95 + breathe
    if (headRef.current) headRef.current.rotation.set(0, 0, 0)

    switch (mapping.clip) {
      case 'typing':
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.9 + Math.sin(t * 12) * 0.12
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.9 + Math.cos(t * 12) * 0.12
        break
      case 'thinking':
        if (rightArmRef.current) rightArmRef.current.rotation.x = -2.2 + Math.sin(t * 3) * 0.1
        if (headRef.current) headRef.current.rotation.z = Math.sin(t * 1.5) * 0.12
        break
      case 'reading':
        if (headRef.current) headRef.current.rotation.x = 0.35
        break
      case 'calling':
        if (rightArmRef.current) rightArmRef.current.rotation.x = -2.4
        break
      case 'celebrate':
        if (leftArmRef.current) leftArmRef.current.rotation.x = -2.6 + Math.sin(t * 10) * 0.3
        if (rightArmRef.current) rightArmRef.current.rotation.x = -2.6 + Math.cos(t * 10) * 0.3
        break
      case 'error':
        if (torsoRef.current) torsoRef.current.rotation.z = Math.sin(t * 30) * 0.04
        break
      case 'walk':
      case 'sorting':
      case 'printing':
      case 'saving':
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 8) * 0.5
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 8) * 0.5
        break
      default:
        break
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
    >
      <mesh ref={torsoRef} position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.3]} />
        <meshStandardMaterial color={outfit} />
      </mesh>

      <mesh ref={headRef} position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hair} />
      </mesh>

      <mesh ref={leftArmRef} position={[-0.34, 0.95, 0]} castShadow>
        <boxGeometry args={[0.14, 0.62, 0.2]} />
        <meshStandardMaterial color={outfit} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.34, 0.95, 0]} castShadow>
        <boxGeometry args={[0.14, 0.62, 0.2]} />
        <meshStandardMaterial color={outfit} />
      </mesh>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.42, 0.52, 32]} />
          <meshBasicMaterial color="#60a5fa" side={THREE.DoubleSide} />
        </mesh>
      )}

      <AgentTag name={agent.name} state={state} speech={speech} y={2.1} />
    </group>
  )
}
