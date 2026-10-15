import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import { Lights } from './Lights'
import { Office } from './Office'
import { Character } from './Character'
import { useStore, type AgentState } from '../../store/useStore'
import { DEFAULT_LAYOUT, type LayoutJSON } from '../../utils/layout'
import type { Agent } from '../../store/useStore'

function deskPosition(deskId: string | undefined, index: number): [number, number, number] {
  const desk = DEFAULT_LAYOUT.furniture.find((f) => f.deskId === deskId)
  if (desk) return [desk.x, 0, desk.z + 0.9]
  // fallback grid
  const col = index % 4
  const row = Math.floor(index / 4)
  return [-6 + col * 3, 0, -4 + row * 3]
}

function AgentsLayer({
  layout,
  selectedAgentId,
  selectAgent,
  agentState,
  agents,
  latestMessage
}: {
  layout: LayoutJSON
  selectedAgentId: string | null
  selectAgent: (id: string | null) => void
  agentState: Record<string, AgentState>
  agents: Agent[]
  latestMessage: Record<string, string>
}) {
  return (
    <>
      {agents.map((agent, i) => (
        <Character
          key={agent.id}
          agent={agent}
          state={agentState[agent.id] ?? 'idle'}
          position={deskPosition(agent.deskId, i)}
          selected={selectedAgentId === agent.id}
          speech={latestMessage[agent.id]}
          onSelect={() => selectAgent(agent.id)}
        />
      ))}
      <Office
        layout={layout}
        rackActive={Object.values(agentState).includes('saving')}
        agents={agents.map((a) => ({ id: a.id, deskId: a.deskId, state: agentState[a.id] }))}
      />
    </>
  )
}

export function Scene() {
  const agentsMap = useStore((s) => s.agents)
  const agentState = useStore((s) => s.agentState)
  const selectedAgentId = useStore((s) => s.selectedAgentId)
  const selectAgent = useStore((s) => s.selectAgent)
  const messages = useStore((s) => s.messages)

  const agents = useMemo(() => Object.values(agentsMap), [agentsMap])

  const latestMessage = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of messages) {
      if (m.to) map[m.to] = m.content
    }
    return map
  }, [messages])

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <OrthographicCamera
        makeDefault
        position={[18, 20, 18]}
        zoom={34}
        near={-100}
        far={200}
      />
      <color attach="background" args={['#0b0e14']} />
      <fog attach="fog" args={['#0b0e14', 40, 90]} />

      <Lights />
      <AgentsLayer
        layout={DEFAULT_LAYOUT}
        selectedAgentId={selectedAgentId}
        selectAgent={selectAgent}
        agentState={agentState}
        agents={agents}
        latestMessage={latestMessage}
      />

      <OrbitControls
        enablePan
        minZoom={16}
        maxZoom={80}
        maxPolarAngle={Math.PI / 2.35}
        minPolarAngle={Math.PI / 6}
        target={[0, 0, 0]}
      />

      <EffectComposer>
        {/*
          The four `world*` props are declared as REQUIRED by the SSAO type that
          ships with this @react-three/postprocessing version, even though
          SSAOEffect itself only reads distanceThreshold, distanceFalloff,
          rangeThreshold and rangeFalloff. They are mirrored here to satisfy the
          type; passing them has no runtime effect. Do not remove them.
        */}
        <SSAO
          intensity={5}
          radius={0.08}
          luminanceInfluence={0.4}
          worldDistanceThreshold={1}
          worldDistanceFalloff={1}
          worldProximityThreshold={0.5}
          worldProximityFalloff={1}
        />
        <Bloom intensity={0.35} luminanceThreshold={0.55} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}

export { deskPosition }
