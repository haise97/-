import { describe, expect, it } from 'vitest'
import { createEmptyGestureSignal, mapHandLandmarksToGesture, mapHandsLandmarksToGesture } from './gestureMapping.js'

const makeLandmarks = ({ palmX = 0.5, palmY = 0.5, pinch = 0.05, spread = 0.2 } = {}) => {
  const points = Array.from({ length: 21 }, () => ({ x: palmX, y: palmY, z: 0 }))
  points[0] = { x: palmX, y: palmY + 0.08, z: 0 }
  points[4] = { x: palmX - pinch / 2, y: palmY, z: 0 }
  points[5] = { x: palmX - 0.04, y: palmY + 0.01, z: 0 }
  points[8] = { x: palmX + pinch / 2, y: palmY, z: 0 }
  points[12] = { x: palmX, y: palmY - spread, z: 0 }
  points[16] = { x: palmX - spread * 0.55, y: palmY - spread * 0.8, z: 0 }
  points[17] = { x: palmX + 0.04, y: palmY + 0.01, z: 0 }
  points[20] = { x: palmX + spread * 0.55, y: palmY - spread * 0.8, z: 0 }
  return points
}

describe('mapHandLandmarksToGesture', () => {
  it('没有关键点时返回非活跃手势', () => {
    const signal = mapHandLandmarksToGesture(null)

    expect(signal).toEqual(createEmptyGestureSignal('未检测到手'))
  })

  it('将手掌位置映射为旋转方向，并忽略中心小幅抖动', () => {
    const centered = mapHandLandmarksToGesture(makeLandmarks({ palmX: 0.52, palmY: 0.49 }))
    const moved = mapHandLandmarksToGesture(makeLandmarks({ palmX: 0.8, palmY: 0.2 }))

    expect(centered.active).toBe(true)
    expect(Math.abs(centered.rotateX)).toBeLessThan(0.01)
    expect(Math.abs(centered.rotateY)).toBeLessThan(0.01)
    expect(moved.rotateY).toBeGreaterThan(0.4)
    expect(moved.rotateX).toBeGreaterThan(0.4)
    expect(moved.effect).toBe('orbitSpin')
  })

  it('将捏合距离和张开程度映射为缩放和扰动', () => {
    const pinched = mapHandLandmarksToGesture(makeLandmarks({ pinch: 0.02, spread: 0.08 }))
    const open = mapHandLandmarksToGesture(makeLandmarks({ pinch: 0.18, spread: 0.35 }))

    expect(pinched.zoomDelta).toBeLessThan(0)
    expect(open.zoomDelta).toBeGreaterThan(0)
    expect(open.disturbance).toBeGreaterThan(pinched.disturbance)
    expect(open.disturbance).toBeLessThanOrEqual(1)
    expect(open.effect).toBe('depthPulse')
  })
})

describe('mapHandsLandmarksToGesture', () => {
  it('将双手拉开映射为光轨放大和景深增强特效', () => {
    const leftHand = makeLandmarks({ palmX: 0.25, palmY: 0.52, pinch: 0.1, spread: 0.22 })
    const rightHand = makeLandmarks({ palmX: 0.78, palmY: 0.5, pinch: 0.1, spread: 0.22 })
    const signal = mapHandsLandmarksToGesture([leftHand, rightHand])

    expect(signal.active).toBe(true)
    expect(signal.effect).toBe('spreadDepth')
    expect(signal.effectStrength).toBeGreaterThan(0.5)
    expect(signal.zoomDelta).toBeGreaterThan(0)
  })
})
