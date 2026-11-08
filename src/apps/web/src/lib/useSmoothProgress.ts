import { useEffect, useRef, useState } from 'react'
import type { ProgressStep } from '../engines'

export const STEP_END: Record<ProgressStep, number> = { prepare: 0.15, shrink: 0.97, done: 1 }
export const FIRST_SHRINK_END = 0.85
const TICK_MS = 100
const CATCH_UP = 0.3
export const CREEP_LEAD = 0.15
const CREEP = 0.004

interface Pass {
  step: ProgressStep
  start: number
  end: number
  ratio: number
}

export interface ProgressState {
  pass: Pass
  target: number
  shown: number
}

export function initialProgress(step: ProgressStep): ProgressState {
  return { pass: { step, start: 0, end: STEP_END[step], ratio: 0 }, target: 0, shown: 0 }
}

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

export function applyTick(state: ProgressState): ProgressState {
  const { shown, target, pass } = state
  const creepTo = Math.min(STEP_END[pass.step], target + CREEP_LEAD)
  const next = Math.max(shown, shown + (target - shown) * CATCH_UP, shown + (creepTo - shown) * CREEP)
  return { ...state, shown: next }
}

export function passTarget({ start, end, ratio }: Pass): number {
  return start + (end - start) * (1 - (1 - ratio) ** 2)
}

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
