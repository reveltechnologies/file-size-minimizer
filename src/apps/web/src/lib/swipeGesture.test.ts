import { describe, expect, it } from 'vitest'
import {
  clampProgressWithRubberBand,
  detectSwipeAxis,
  resolveSwipeTargetIndex,
} from './swipeGesture'

describe('swipeGesture helpers', () => {
  it('waits for lock threshold before committing an axis', () => {
    expect(detectSwipeAxis(3, 4)).toBe('none')
    expect(detectSwipeAxis(-5, 5)).toBe('none')
    expect(detectSwipeAxis(8, 5)).toBe('x')
    expect(detectSwipeAxis(-7, 6)).toBe('x')
    expect(detectSwipeAxis(4, 9)).toBe('y')
    expect(detectSwipeAxis(6, -6)).toBe('y')
  })

  it('applies rubber-band clamping at edges', () => {
    expect(clampProgressWithRubberBand(-0.4, 3)).toBeCloseTo(-0.1)
    expect(clampProgressWithRubberBand(-2, 3)).toBe(-0.25)
    expect(clampProgressWithRubberBand(1.4, 3)).toBe(1.4)
    expect(clampProgressWithRubberBand(2.4, 3)).toBeCloseTo(2.1)
    expect(clampProgressWithRubberBand(5, 3)).toBe(2.25)
  })

  it('resolves fast flicks, hold-to-stop, 30% distance threshold, and bounds', () => {
    expect(
      resolveSwipeTargetIndex({
        startProgress: 1,
        currentProgress: 1.05,
        velocityPxPerMs: -0.5,
        idleMs: 20,
        sceneCount: 3,
      }),
    ).toBe(2)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 1,
        currentProgress: 1.05,
        velocityPxPerMs: 0.5,
        idleMs: 20,
        sceneCount: 3,
      }),
    ).toBe(0)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 1,
        currentProgress: 1.1,
        velocityPxPerMs: -0.6,
        idleMs: 150,
        sceneCount: 3,
      }),
    ).toBe(1)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 1,
        currentProgress: 1.32,
        velocityPxPerMs: 0,
        idleMs: 0,
        sceneCount: 3,
      }),
    ).toBe(2)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 1,
        currentProgress: 0.68,
        velocityPxPerMs: 0,
        idleMs: 0,
        sceneCount: 3,
      }),
    ).toBe(0)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 1,
        currentProgress: 1.2,
        velocityPxPerMs: 0,
        idleMs: 0,
        sceneCount: 3,
      }),
    ).toBe(1)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 0,
        currentProgress: -0.2,
        velocityPxPerMs: 0.8,
        idleMs: 10,
        sceneCount: 3,
      }),
    ).toBe(0)

    expect(
      resolveSwipeTargetIndex({
        startProgress: 2,
        currentProgress: 2.2,
        velocityPxPerMs: -0.8,
        idleMs: 10,
        sceneCount: 3,
      }),
    ).toBe(2)
  })
})
