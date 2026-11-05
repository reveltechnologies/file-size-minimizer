import { describe, expect, it } from 'vitest'
import type { ProgressStep } from '../engines'
import {
  applyTick,
  applyUpdate,
  CREEP_LEAD,
  FIRST_SHRINK_END,
  initialProgress,
  passTarget,
  STEP_END,
} from './useSmoothProgress'

/** Replays what the hook does: engine updates, each followed by some 100 ms ticks. */
function simulate(updates: [step: ProgressStep, ratio: number, ticks?: number][]) {
  let state = initialProgress('prepare')
  const history: number[] = []
  for (const [step, ratio, ticks = 5] of updates) {
    state = applyUpdate(state, step, ratio)
    for (let i = 0; i < ticks; i++) {
      state = applyTick(state)
      history.push(state.shown)
    }
  }
  return { ...state, history }
}

const neverGoesBack = (history: number[]) => history.every((value, i) => i === 0 || value >= history[i - 1])

describe('smooth progress', () => {
  it('never goes backwards, even when a retry restarts the engine at 0', () => {
    const { history } = simulate([
      ['prepare', 0.5],
      ['prepare', 1],
      ['shrink', 0],
      ['shrink', 0.5],
      ['shrink', 1],
      ['shrink', 0], // retry
      ['shrink', 0.4],
      ['shrink', 0], // second retry
      ['shrink', 1, 200],
    ])

    expect(neverGoesBack(history)).toBe(true)
  })

  it('ignores a small dip in the engine progress instead of aiming lower', () => {
    const before = simulate([['shrink', 0.5]])
    const after = simulate([
      ['shrink', 0.5],
      ['shrink', 0.4],
    ])

    expect(after.pass.start).toBe(before.pass.start) // still the same pass, not a retry
    expect(after.target).toBe(before.target)
  })

  it('stays within the preparing part of the bar', () => {
    const { shown } = simulate([['prepare', 1, 1000]])

    expect(shown).toBeLessThanOrEqual(STEP_END.prepare)
  })

  it('ends the first shrink pass at 85%, keeping room for retries', () => {
    const { pass, target } = simulate([
      ['prepare', 1],
      ['shrink', 0],
      ['shrink', 1],
    ])

    expect(pass.end).toBe(FIRST_SHRINK_END)
    expect(target).toBeCloseTo(FIRST_SHRINK_END)
  })

  it('gives a retry half of the room that is left, and never reaches 100% before done', () => {
    const { pass, shown } = simulate([
      ['prepare', 1],
      ['shrink', 1, 100],
      ['shrink', 0], // retry
      ['shrink', 1, 1000],
    ])

    expect(pass.start).toBeGreaterThanOrEqual(FIRST_SHRINK_END)
    expect(pass.end).toBeCloseTo(pass.start + (STEP_END.shrink - pass.start) / 2)
    expect(shown).toBeLessThanOrEqual(STEP_END.shrink)
  })

  it('eases out: half the work fills three quarters of the pass', () => {
    expect(passTarget({ step: 'shrink', start: 0.2, end: 0.6, ratio: 0.5 })).toBeCloseTo(0.2 + 0.4 * 0.75)
  })

  it('keeps creeping while the work is quiet, slower and slower, but not too far ahead', () => {
    const { history, target } = simulate([['shrink', 0.3, 600]])
    const steps = history.slice(100).map((value, i, all) => (i === 0 ? 0 : value - all[i - 1])).slice(1)

    expect(history.at(-1)).toBeGreaterThan(history[99])
    expect(steps.every((step, i) => i === 0 || step <= steps[i - 1] + 1e-12)).toBe(true)
    expect(history.at(-1)).toBeLessThanOrEqual(target + CREEP_LEAD)
  })
})
