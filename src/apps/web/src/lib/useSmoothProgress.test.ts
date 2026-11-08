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
  it('never goes backwards across retries', () => {
    const { history } = simulate([
      ['prepare', 0.5],
      ['prepare', 1],
      ['shrink', 0],
      ['shrink', 0.5],
      ['shrink', 1],
      ['shrink', 0],
      ['shrink', 0.4],
      ['shrink', 0],
      ['shrink', 1, 200],
    ])

    expect(neverGoesBack(history)).toBe(true)
  })

  it('caps first shrink pass and retry bounds', () => {
    const first = simulate([
      ['prepare', 1],
      ['shrink', 0],
      ['shrink', 1],
    ])
    expect(first.pass.end).toBe(FIRST_SHRINK_END)

    const retry = simulate([
      ['prepare', 1],
      ['shrink', 1, 100],
      ['shrink', 0],
      ['shrink', 1, 1000],
    ])
    expect(retry.pass.start).toBeGreaterThanOrEqual(FIRST_SHRINK_END)
    expect(retry.shown).toBeLessThanOrEqual(STEP_END.shrink)
  })

  it('eases out and creeps within lead cap', () => {
    expect(passTarget({ step: 'shrink', start: 0.2, end: 0.6, ratio: 0.5 })).toBeCloseTo(0.2 + 0.4 * 0.75)
    const { history, target } = simulate([['shrink', 0.3, 600]])
    expect(history.at(-1)).toBeLessThanOrEqual(target + CREEP_LEAD)
  })
})
