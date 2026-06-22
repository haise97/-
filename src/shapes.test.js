import { describe, expect, it } from 'vitest'
import { createShapeData, interpolatePositions, THEMES } from './shapes.js'

describe('createShapeData', () => {
  it('为每种形态生成匹配数量的坐标和颜色', () => {
    for (const mode of ['hypercube', 'dna', 'blackhole', 'heroine']) {
      const data = createShapeData({ mode, count: 120, theme: 'neon' })

      expect(data.positions).toHaveLength(360)
      expect(data.colors).toHaveLength(360)
      expect(data.label.length).toBeGreaterThan(0)
      expect([...data.positions].every(Number.isFinite)).toBe(true)
      expect([...data.colors].every((value) => value >= 0 && value <= 1)).toBe(true)
    }
  })

  it('为国风女主生成高挑人物和飘带裙摆轮廓', () => {
    const data = createShapeData({ mode: 'heroine', count: 900, theme: 'neon' })
    const points = Array.from({ length: data.positions.length / 3 }, (_, index) => ({
      x: data.positions[index * 3],
      y: data.positions[index * 3 + 1],
      z: data.positions[index * 3 + 2],
    }))
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    const zs = points.map((point) => point.z)
    const topPoints = points.filter((point) => point.y > 1.2)
    const lowerPoints = points.filter((point) => point.y < -1.1)
    const auraPoints = points.filter((point) => Math.hypot(point.x - 0.28, point.y - 0.3) > 1.65)

    expect(data.label).toBe('国风女主')
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(4)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(3)
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(1)
    expect(topPoints.length).toBeGreaterThan(80)
    expect(lowerPoints.length).toBeGreaterThan(110)
    expect(auraPoints.length).toBeGreaterThan(160)
  })

  it('不同主题会产生不同颜色调性', () => {
    const neon = createShapeData({ mode: 'hypercube', count: 12, theme: 'neon' })
    const ice = createShapeData({ mode: 'hypercube', count: 12, theme: 'ice' })

    expect(THEMES.neon.name).not.toBe(THEMES.ice.name)
    expect(Array.from(neon.colors.slice(0, 9))).not.toEqual(Array.from(ice.colors.slice(0, 9)))
  })
})

describe('interpolatePositions', () => {
  it('按进度在两个坐标数组之间插值', () => {
    const from = new Float32Array([0, 0, 0, 10, 10, 10])
    const to = new Float32Array([10, 20, 30, 20, 30, 40])
    const result = interpolatePositions(from, to, 0.5)

    expect(Array.from(result)).toEqual([5, 10, 15, 15, 20, 25])
  })

  it('将进度限制在 0 到 1 之间', () => {
    const from = new Float32Array([0, 0, 0])
    const to = new Float32Array([10, 10, 10])

    expect(Array.from(interpolatePositions(from, to, -1))).toEqual([0, 0, 0])
    expect(Array.from(interpolatePositions(from, to, 2))).toEqual([10, 10, 10])
  })
})
