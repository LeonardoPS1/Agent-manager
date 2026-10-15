import { useMemo } from 'react'
import * as THREE from 'three'
import { FurnitureView } from './Furniture'
import type { LayoutJSON } from '../../utils/layout'

export function Office({
  layout,
  rackActive = false,
  agents
}: {
  layout: LayoutJSON
  rackActive?: boolean
  agents: { deskId?: string; id: string; state?: string }[]
}) {
  const floorColor = useMemo(() => new THREE.Color('#141a24'), [])
  const occupiedDesks = useMemo(
    () => new Set(agents.map((a) => a.deskId).filter(Boolean) as string[]),
    [agents]
  )

  return (
    <group name="office">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>

      {layout.rooms.map((room) => (
        <mesh
          key={room.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[room.x + room.w / 2 - room.w / 2, 0, room.z]}
          receiveShadow
        >
          <planeGeometry args={[room.w, room.d]} />
          <meshStandardMaterial color={room.color ?? '#18202e'} />
        </mesh>
      ))}

      {layout.furniture.map((item) => (
        <FurnitureView
          key={item.id}
          item={item}
          rackActive={rackActive}
          occupied={item.deskId ? occupiedDesks.has(item.deskId) : false}
        />
      ))}
    </group>
  )
}
