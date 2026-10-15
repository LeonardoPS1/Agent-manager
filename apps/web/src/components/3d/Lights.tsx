import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Day/night cycle driven by the local clock.
 * Returns a color + intensity for the directional light.
 */
function computeDayNight(hours: number) {
  // 0-24 => sun elevation curve
  const t = (hours - 6) / 24 // sunrise at 6am
  const elevation = Math.sin(t * Math.PI * 2)
  const day = Math.max(0, elevation)
  const intensity = 0.15 + day * 1.15
  const warmth = new THREE.Color().setHSL(0.09, 0.5, 0.5 + day * 0.25)
  return { intensity, color: warmth }
}

export function Lights({ animated = true }: { animated?: boolean }) {
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)

  const initial = useMemo(() => computeDayNight(new Date().getHours()), [])

  useFrame(({ clock }) => {
    if (!animated) return
    const hours = new Date().getHours() + new Date().getMinutes() / 60
    const { intensity, color } = computeDayNight(hours)
    if (dirRef.current) {
      dirRef.current.intensity = intensity
      dirRef.current.color = color
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.25 + Math.max(0, intensity - 0.5) * 0.2
    }
    void clock
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.35} />
      <directionalLight
        ref={dirRef}
        position={[12, 18, 8]}
        intensity={initial.intensity}
        color={initial.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <hemisphereLight intensity={0.25} groundColor="#1a1f2b" color="#dbe4ff" />
    </>
  )
}

export { computeDayNight }
