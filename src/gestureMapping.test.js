import { describe, expect, it } from 'vitest'
import { createEmptyGestureSignal, mapHandLandmarksToGesture } from './gestureMapping.js'

const makeLandmarks = ({ thumb = false, index = false, middle = false, ring = false, pinky = false, pinch = 0.08, closedFive = false } = {}) => {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6, z: 0 }))
  points[0] = { x: 0.5, y: 0.78, z: 0 }
  points[1] = { x: 0.48, y: 0.72, z: 0 }
  points[2] = { x: 0.46, y: 0.66, z: 0 }
  points[3] = { x: 0.44, y: 0.61, z: 0 }
  points[4] = { x: thumb ? 0.65 : 0.42, y: thumb ? 0.46 : 0.62, z: 0 }

  points[5] = { x: 0.46, y: 0.62, z: 0 }
  points[6] = { x: 0.46, y: 0.56, z: 0 }
  points[7] = { x: 0.46, y: 0.49, z: 0 }
  const indexTipY = index ? 0.28 : 0.63
  points[8] = { x: 0.46, y: indexTipY, z: 0 }

  points[9] = { x: 0.50, y: 0.61, z: 0 }
  points[10] = { x: 0.50, y: 0.54, z: 0 }
  points[11] = { x: 0.50, y: 0.46, z: 0 }
  points[12] = { x: 0.50, y: middle ? 0.25 : 0.64, z: 0 }

  points[13] = { x: 0.54, y: 0.62, z: 0 }
  points[14] = { x: 0.54, y: 0.56, z: 0 }
  points[15] = { x: 0.54, y: 0.49, z: 0 }
  points[16] = { x: 0.54, y: ring ? 0.27 : 0.64, z: 0 }

  points[17] = { x: 0.58, y: 0.63, z: 0 }
  points[18] = { x: 0.58, y: 0.57, z: 0 }
  points[19] = { x: 0.58, y: 0.50, z: 0 }
  points[20] = { x: 0.58, y: pinky ? 0.26 : 0.65, z: 0 }

  points[8].x = 0.5 + pinch / 2
  points[4].x = 0.5 - pinch / 2
  points[4].y = thumb ? indexTipY : 0.62

  if (closedFive) {
    points[4] = { x: 0.43, y: 0.42, z: 0 }
    points[8] = { x: 0.46, y: 0.3, z: 0 }
    points[12] = { x: 0.49, y: 0.28, z: 0 }
    points[16] = { x: 0.52, y: 0.3, z: 0 }
    points[20] = { x: 0.55, y: 0.33, z: 0 }
  }
  return points
}

const scaleLandmarks = (landmarks, scale) => landmarks.map((point) => ({
  x: 0.5 + (point.x - 0.5) * scale,
  y: 0.5 + (point.y - 0.5) * scale,
  z: point.z,
}))

describe('mapHandLandmarksToGesture', () => {
  it('空输入返回未检测到手', () => {
    expect(mapHandLandmarksToGesture(null)).toEqual(createEmptyGestureSignal('未检测到手'))
  })

  it('拳头会暂停', () => {
    const signal = mapHandLandmarksToGesture(makeLandmarks({ thumb: false, index: false, middle: false, ring: false, pinky: false }))
    expect(signal.paused).toBe(true)
    expect(signal.action).toBe('pause')
  })

  it('只伸小指时识别为第一档动作', () => {
    const signal = mapHandLandmarksToGesture(makeLandmarks({ pinky: true }))
    expect(signal.raisedCount).toBe(1)
    expect(signal.action).toBe('fingers-1')
  })

  it('只伸两根手指时识别为第二档动作', () => {
    const signal = mapHandLandmarksToGesture(makeLandmarks({ index: true, pinky: true }))
    expect(signal.raisedCount).toBe(2)
    expect(signal.action).toBe('fingers-2')
  })

  it('五指全开时识别为放大', () => {
    const signal = mapHandLandmarksToGesture(makeLandmarks({ thumb: true, index: true, middle: true, ring: true, pinky: true, pinch: 0.3 }))
    expect(signal.raisedCount).toBe(5)
    expect(signal.action).toBe('fingers-5')
  })

  it('closed five fingers zoom in', () => {
    const signal = mapHandLandmarksToGesture(makeLandmarks({ thumb: true, index: true, middle: true, ring: true, pinky: true, closedFive: true }))
    expect(signal.raisedCount).toBe(5)
    expect(signal.action).toBe('zoomIn')
  })

  it('closed five fingers stays zoom in when the hand is farther away', () => {
    const signal = mapHandLandmarksToGesture(scaleLandmarks(makeLandmarks({ thumb: true, index: true, middle: true, ring: true, pinky: true, closedFive: true }), 0.7))
    expect(signal.raisedCount).toBe(5)
    expect(signal.action).toBe('zoomIn')
  })

  it('open five fingers stays fingers-5 when the hand is closer', () => {
    const signal = mapHandLandmarksToGesture(scaleLandmarks(makeLandmarks({ thumb: true, index: true, middle: true, ring: true, pinky: true, pinch: 0.3 }), 1.25))
    expect(signal.raisedCount).toBe(5)
    expect(signal.action).toBe('fingers-5')
  })

  it('拇指加食指捏合时识别为缩小', () => {
    const signal = mapHandLandmarksToGesture(makeLandmarks({ thumb: true, index: true, middle: false, ring: false, pinky: false, pinch: 0.01 }))
    expect(signal.action).toBe('shrink')
    expect(signal.action).not.toBe('fingers-2')
    expect(signal.zoomDelta).toBeLessThan(0)
  })
})
