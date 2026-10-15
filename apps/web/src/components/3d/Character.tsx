import { Component, Suspense, useCallback, type ErrorInfo, type ReactNode } from 'react'
import { useStore } from '../../store/useStore'
import { getCharacterModel, type CharacterStatus } from '../../utils/characters'
import { GltfCharacter } from './GltfCharacter'
import { ProceduralCharacter } from './ProceduralCharacter'
import type { CharacterProps } from './types'

/**
 * Status colours are re-exported here because the side panels have always
 * imported them from `Character`.
 */
export { STATE_COLORS } from '../../utils/animations'
export { CHARACTER_STATUS_LABELS, CHARACTER_STATUS_WARNING } from '../../utils/characters'
export type { CharacterStatus } from '../../utils/characters'

interface BoundaryProps {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error) => void
}

interface BoundaryState {
  failed: boolean
}

/** A broken asset must not take the whole Canvas down with it. */
class CharacterErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Character] model failed, using the procedural fallback:', error.message)
    console.warn(info.componentStack)
    this.props.onError?.(error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Renders the character an agent has been assigned.
 *
 * The model id lives in `agent.appearance.character`; anything unknown (or
 * missing) resolves to the default from the catalog, so adding a model is a
 * data change and never a code change.
 */
export function Character(props: CharacterProps) {
  const setCharacterStatus = useStore((state) => state.setCharacterStatus)
  const { agent } = props

  const appearance = (agent.appearance ?? {}) as Record<string, unknown>
  const model = getCharacterModel(appearance.character)
  const rotationY = typeof appearance.rotationY === 'number' ? appearance.rotationY : undefined

  const handleStatus = useCallback(
    (status: CharacterStatus) => setCharacterStatus(agent.id, status),
    [agent.id, setCharacterStatus]
  )

  const handleError = useCallback(
    (error: Error) => {
      console.warn(`[Character] ${agent.id}: ${error.message}`)
      setCharacterStatus(agent.id, 'error')
    },
    [agent.id, setCharacterStatus]
  )

  const fallback = <ProceduralCharacter {...props} rotationY={rotationY} />

  if (!model.file) return fallback
  const modelFile = model.file

  return (
    <CharacterErrorBoundary key={model.id} fallback={fallback} onError={handleError}>
      <Suspense fallback={fallback}>
        <GltfCharacter
          {...props}
          rotationY={rotationY}
          model={{ ...model, file: modelFile }}
          onStatus={handleStatus}
        />
      </Suspense>
    </CharacterErrorBoundary>
  )
}
