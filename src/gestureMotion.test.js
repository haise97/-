import { describe, expect, it } from 'vitest'
import { applyGestureMotion } from './gestureMotion.js'

describe('applyGestureMotion', () => {
  it('将手掌上下移动转换成明显的 X 轴旋转速度', () => {
    const result = applyGestureMotion({ x: 0, y: 0 }, {
      active: true,
      rotateX: 0.8,
      rotateY: 0,
      zoomDelta: 0,
      disturbance: 0,
    })

    expect(result.velocity.x).toBeGreaterThan(0.02)
    expect(Math.abs(result.velocity.y)).toBeLessThan(0.001)
  })

  it('将手掌左右移动转换成明显的 Y 轴旋转速度', () => {
    const result = applyGestureMotion({ x: 0, y: 0 }, {
      active: true,
      rotateX: 0,
      rotateY: -0.8,
      zoomDelta: 0,
      disturbance: 0,
    })

    expect(result.velocity.y).toBeLessThan(-0.02)
    expect(Math.abs(result.velocity.x)).toBeLessThan(0.001)
  })

  it('限制过大的手势速度，避免画面乱飞', () => {
    const result = applyGestureMotion({ x: 0.2, y: -0.2 }, {
      active: true,
      rotateX: 2,
      rotateY: -2,
      zoomDelta: 0,
      disturbance: 0,
    })

    expect(result.velocity.x).toBeLessThanOrEqual(0.055)
    expect(result.velocity.y).toBeGreaterThanOrEqual(-0.055)
  })
})
