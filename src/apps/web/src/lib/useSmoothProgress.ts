import { useEffect, useRef, useState } from 'react'
import type { ProgressStep } from '../engines'

/** How far the bar may go in each step. It stays short of 100% until the file is really ready. */
export const STEP_END: Record<ProgressStep, number> = { prepare: 0.15, shrink: 0.97, done: 1 }
/**
 * The first shrink pass stops here, keeping room for retries. When none is
 * needed the bar jumps to 100%, which feels like finishing early.
 */
export const FIRST_SHRINK_END = 0.85
const TICK_MS = 100
/** Share of the gap to the real progress closed each tick, so jumps glide instead of snapping. */
const CATCH_UP = 0.3
/** While the work is quiet the bar creeps toward this far ahead of the real progress… */
export const CREEP_LEAD = 0.15
/** …closing this share of the remaining gap each tick, so it slows down the nearer it gets. */
const CREEP = 0.004

interface Pass {
  step: ProgressStep
  start: number
  end: number
  ratio: number
}

export interface ProgressState {
  pass: Pass
  /** Where the engine's progress puts the bar. Never goes down. */
  target: number
  /** What the bar shows. Never goes down. */
  shown: number
}

export function initialProgress(step: ProgressStep): ProgressState {
  return { pass: { step, start: 0, end: STEP_END[step], ratio: 0 }, target: 0, shown: 0 }
}

/**
 * Applies an engine update. A new pass starts from where the bar has got to
 * when the step changes, or when the engine starts again at 0 (a retry),
 * which gets half of the room left in the step instead of jumping back.
 */
export function applyUpdate(state: ProgressState, step: ProgressStep, ratio: number): ProgressState {
  const { pass } = state
  let next: Pass
  if (step === pass.step && ratio >= pass.ratio - 0.2) {
    next = { ...pass, ratio }
  } else {
    const start = Math.max(state.shown, state.target)
    const end =
      step === pass.step
        ? start + (STEP_END[step] - start) / 2
        : step === 'shrink'
          ? FIRST_SHRINK_END
          : STEP_END[step]
    next = { step, start, end: Math.max(start, end), ratio }
  }
  return { ...state, pass: next, target: Math.max(state.target, passTarget(next)) }
}

/** One animation frame: glide toward the target, or creep on while the work is quiet. */
export function applyTick(state: ProgressState): ProgressState {
  const { shown, target, pass } = state
  const creepTo = Math.min(STEP_END[pass.step], target + CREEP_LEAD)
  const next = Math.max(shown, shown + (target - shown) * CATCH_UP, shown + (creepTo - shown) * CREEP)
  return { ...state, shown: next }
}

/** Ease out: quick at first, slowing toward the end of each pass. */
export function passTarget({ start, end, ratio }: Pass): number {
  return start + (end - start) * (1 - (1 - ratio) ** 2)
}

/**
 * Turns the engines' raw 0…1 progress into a bar that only moves forward
 * and never looks stuck.
 */
export function useSmoothProgress(step: ProgressStep, ratio: number): number {
  const [shown, setShown] = useState(0)
  const stateRef = useRef(initialProgress(step))

  useEffect(() => {
    stateRef.current = applyUpdate(stateRef.current, step, ratio)
  }, [step, ratio])

  useEffect(() => {
    const id = setInterval(() => {
      stateRef.current = applyTick(stateRef.current)
      setShown(stateRef.current.shown)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  return step === 'done' ? 1 : shown
}
