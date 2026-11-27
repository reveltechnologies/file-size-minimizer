export const SWIPE_LOCK_PX = 6
export const SWIPE_FLICK_VELOCITY = 0.3
export const SWIPE_DISTANCE_RATIO = 0.3
export const SWIPE_IDLE_MS = 100

export type SwipeAxis = 'none' | 'x' | 'y'

export function detectSwipeAxis(
  dx: number,
  dy: number,
  lockPx: number = SWIPE_LOCK_PX,
): SwipeAxis {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  if (absX < lockPx && absY < lockPx) return 'none'
  return absX > absY ? 'x' : 'y'
}

export function clampProgressWithRubberBand(rawProgress: number, sceneCount: number): number {
  if (rawProgress < 0) return Math.max(-0.25, rawProgress * 0.25)
  const max = Math.max(0, sceneCount - 1)
  if (rawProgress > max) return Math.min(max + 0.25, max + (rawProgress - max) * 0.25)
  return rawProgress
}

export interface ResolveSwipeTargetParams {
  startProgress: number
  currentProgress: number
  velocityPxPerMs: number
  idleMs: number
  sceneCount: number
}

export function resolveSwipeTargetIndex({
  startProgress,
  currentProgress,
  velocityPxPerMs,
  idleMs,
  sceneCount,
}: ResolveSwipeTargetParams): number {
  const maxIndex = Math.max(0, sceneCount - 1)
  const clamp = (idx: number) => Math.max(0, Math.min(maxIndex, idx))
  const startIndex = clamp(Math.round(startProgress))
  const effectiveVelocity = idleMs > SWIPE_IDLE_MS ? 0 : velocityPxPerMs

  if (Math.abs(effectiveVelocity) > SWIPE_FLICK_VELOCITY) {
    return clamp(startIndex + (effectiveVelocity < 0 ? 1 : -1))
  }

  const delta = currentProgress - startIndex
  if (Math.abs(delta) >= 0.5) {
    return clamp(Math.round(currentProgress))
  }
  if (Math.abs(delta) >= SWIPE_DISTANCE_RATIO) {
    return clamp(startIndex + (delta > 0 ? 1 : -1))
  }
  return startIndex
}
