import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FurnitureItem } from '../../utils/layout'

function Box({
  args,
  color,
  position,
  rotation,
  emissive
}: {
  args: [number, number, number]
  color: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  emissive?: string
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissive ? 0.6 : 0} />
    </mesh>
  )
}

/** Y-axis rotation helper (radians). */
function rotationY(rotation?: number): [number, number, number] {
  return [0, rotation ?? 0, 0]
}

/** Blinking LED strip used by server racks (triggered on `saving` events). */
function RackLEDs({ active = false, color = '#4ade80' }: { active?: boolean; color?: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    const speed = active ? 8 : 1.5
    const base = active ? 0.4 : 0.15
    mat.emissiveIntensity = base + Math.abs(Math.sin(clock.elapsedTime * speed)) * (active ? 0.9 : 0.3)
  })
  return (
    <mesh ref={ref} position={[0, 0.85, 0.31]}>
      <boxGeometry args={[0.5, 0.06, 0.02]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
    </mesh>
  )
}

export function FurnitureView({
  item,
  rackActive = false,
  occupied = false
}: {
  item: FurnitureItem
  rackActive?: boolean
  occupied?: boolean
}) {
  switch (item.kind) {
    case 'desk':
      return (
        <group position={[item.x, 0, item.z]} rotation={rotationY(item.rotation)}>
          <Box args={[1.8, 0.08, 0.9]} color="#3b3f4a" position={[0, 0.75, 0]} />
          <Box args={[0.08, 0.75, 0.08]} color="#2a2f3a" position={[-0.8, 0.37, -0.35]} />
          <Box args={[0.08, 0.75, 0.08]} color="#2a2f3a" position={[0.8, 0.37, -0.35]} />
          <Box args={[0.08, 0.75, 0.08]} color="#2a2f2b" position={[-0.8, 0.37, 0.35]} />
          <Box args={[0.08, 0.75, 0.08]} color="#2a2a2a" position={[0.8, 0.75, 0.35]} />
          {/* monitor */}
          <group position={[0, 0.75, -0.2]}>
            <Box
              args={[0.7, 0.45, 0.03]}
              color="#0d1117"
              emissive={occupied ? '#22c55e' : '#1d4ed8'}
              position={[0, 0.35, 0]}
            />
            <Box args={[0.5, 0.03, 0.18]} color="#2a2f38" position={[0, 0.05, 0.08]} />
          </group>
          {/* chair */}
          <group position={[0, 0, 0.75]}>
            <Box args={[0.45, 0.08, 0.45]} color="#334155" position={[0, 0.45, 0]} />
            <Box args={[0.45, 0.5, 0.08]} color="#334155" position={[0, 0.7, -0.2]} />
            <Box args={[0.08, 0.45, 0.08]} color="#1f2937" position={[0, 0.22, 0]} />
          </group>
        </group>
      )

    case 'rack':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[0.8, 1.7, 0.6]} color="#111827" position={[0, 0.85, 0]} />
          <RackLEDs active={rackActive} />
        </group>
      )

    case 'cabinet':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[0.9, 1.4, 0.5]} color="#374151" position={[0, 0.7, 0]} />
          <Box args={[0.7, 0.06, 0.06]} color="#9ca3af" position={[0, 0.9, 0.28]} />
        </group>
      )

    case 'printer':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[0.7, 0.5, 0.6]} color="#1f2937" position={[0, 0.5, 0]} />
          <Box args={[0.5, 0.08, 0.4]} color="#0f172a" position={[0, 0.78, 0.05]} />
        </group>
      )

    case 'table':
      return (
        <group position={[item.x, 0, item.z]}>
          <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.6, 1.6, 0.1, 32]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
          <Box args={[0.2, 0.75, 0.2]} color="#27272a" position={[0, 0.38, 0]} />
        </group>
      )

    case 'whiteboard':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[2.4, 1.3, 0.08]} color="#e5e7eb" position={[0, 1.5, 0]} />
        </group>
      )

    case 'coffee':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[0.6, 0.9, 0.5]} color="#292524" position={[0, 0.45, 0]} />
          <Box args={[0.25, 0.3, 0.2]} color="#111827" position={[0, 0.95, 0]} />
        </group>
      )

    case 'plant':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[0.4, 0.35, 0.4]} color="#78350f" position={[0, 0.18, 0]} />
          <mesh position={[0, 0.7, 0]} castShadow>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </group>
      )

    case 'sofa':
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[1.6, 0.5, 0.8]} color="#3b82f6" position={[0, 0.4, 0]} />
        </group>
      )

    default:
      return (
        <group position={[item.x, 0, item.z]}>
          <Box args={[0.6, 0.6, 0.6]} color="#475569" position={[0, 0.3, 0]} />
        </group>
      )
  }
}
