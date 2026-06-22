export const THEMES = {
  neon: {
    name: '霓虹紫青',
    palette: [
      [0.34, 0.95, 1],
      [0.72, 0.24, 1],
      [0.12, 0.52, 1],
    ],
  },
  plasma: {
    name: '红白等离子',
    palette: [
      [1, 0.12, 0.08],
      [1, 0.62, 0.24],
      [1, 0.96, 0.88],
    ],
  },
  ice: {
    name: '冰蓝星尘',
    palette: [
      [0.45, 0.88, 1],
      [0.72, 0.98, 1],
      [0.18, 0.36, 1],
    ],
  },
}

export const MODE_LABELS = {
  hypercube: '粒子超立方',
  dna: 'DNA 双螺旋',
  blackhole: '黑洞圆环',
  heroine: '国风女主',
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const seeded = (index, salt = 1) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123
  return value - Math.floor(value)
}

const writeColor = (colors, index, palette, mix = 0) => {
  const color = palette[(index + Math.floor(mix * 10)) % palette.length]
  colors[index * 3] = color[0]
  colors[index * 3 + 1] = color[1]
  colors[index * 3 + 2] = color[2]
}

const createHypercubePoint = (index, count) => {
  const side = Math.ceil(Math.cbrt(count))
  const layer = Math.floor(index / (side * side))
  const row = Math.floor((index % (side * side)) / side)
  const column = index % side
  const u = side <= 1 ? 0 : column / (side - 1)
  const v = side <= 1 ? 0 : row / (side - 1)
  const w = side <= 1 ? 0 : layer / (side - 1)
  const edgePulse = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5), Math.abs(w - 0.5))
  const jitter = 0.03

  return [
    (u - 0.5) * 5 + (seeded(index, 1) - 0.5) * jitter,
    (v - 0.5) * 5 + (seeded(index, 2) - 0.5) * jitter,
    (w - 0.5) * 5 + Math.sin(edgePulse * Math.PI * 4) * 0.16 + (seeded(index, 3) - 0.5) * jitter,
  ]
}

const createDnaPoint = (index, count) => {
  const strand = index % 2 === 0 ? 1 : -1
  const t = index / Math.max(1, count - 1)
  const angle = t * Math.PI * 10 + strand * Math.PI
  const radius = 1.05 + seeded(index, 4) * 0.14
  const bridge = index % 9 === 0 ? 0.38 : 1

  return [
    Math.cos(angle) * radius * bridge,
    (t - 0.5) * 6,
    Math.sin(angle) * radius * bridge,
  ]
}

const createBlackholePoint = (index, count) => {
  const t = index / Math.max(1, count - 1)
  const arm = index % 5
  const angle = t * Math.PI * 18 + arm * 0.45
  const radius = 0.55 + Math.pow(seeded(index, 5), 0.42) * 2.75
  const spiral = radius + t * 0.55

  return [
    Math.cos(angle + radius * 1.2) * spiral,
    (seeded(index, 6) - 0.5) * 0.42 + Math.sin(angle) * 0.08,
    Math.sin(angle + radius * 1.2) * spiral,
  ]
}

const createHeroinePoint = (index, count) => {
  const t = index / Math.max(1, count - 1)
  const randomAngle = seeded(index, 8) * Math.PI * 2
  const jitter = 0.018

  if (t < 0.18) {
    const local = t / 0.18
    const strand = seeded(index, 9)
    const side = strand > 0.5 ? 1 : -1
    const wave = Math.sin(local * Math.PI * 5 + strand * 4.8)
    return [
      side * (0.26 + local * 0.96 + wave * 0.08) + (seeded(index, 11) - 0.5) * jitter,
      2.9 - local * 4.7,
      -0.12 + Math.sin(local * Math.PI * 3.2 + side) * 0.36,
    ]
  }

  if (t < 0.3) {
    const local = (t - 0.18) / 0.12
    const radiusX = 0.38 + seeded(index, 12) * 0.07
    const radiusY = 0.52 + seeded(index, 13) * 0.04
    return [
      Math.cos(randomAngle) * radiusX + (seeded(index, 14) - 0.5) * jitter,
      2.28 + Math.sin(randomAngle) * radiusY + local * 0.24,
      0.08 + Math.sin(randomAngle) * 0.18,
    ]
  }

  if (t < 0.46) {
    const local = (t - 0.3) / 0.16
    const width = 0.5 + local * 0.46
    const wrap = seeded(index, 15) * 2 - 1
    return [
      wrap * width * Math.pow(seeded(index, 16), 0.62),
      1.55 - local * 2.35,
      0.1 + Math.cos(wrap * Math.PI + local * 3.4) * 0.28,
    ]
  }

  if (t < 0.62) {
    const local = (t - 0.46) / 0.16
    const belt = (seeded(index, 17) - 0.5) * 2
    const sweep = Math.sin((belt + local) * Math.PI)
    return [
      belt * (0.72 + local * 0.42) + sweep * 0.28,
      -0.55 - local * 0.52 + Math.sin(belt * Math.PI) * 0.11,
      0.18 + Math.cos(belt * Math.PI * 1.4) * 0.32,
    ]
  }

  if (t < 0.78) {
    const local = (t - 0.62) / 0.16
    const side = index % 2 === 0 ? 1 : -1
    return [
      side * (0.78 + local * 1.45 + Math.sin(local * Math.PI * 2.4) * 0.18),
      0.62 - local * 2.65,
      -0.08 + Math.cos(local * Math.PI * 3 + side) * 0.48,
    ]
  }

  if (t < 0.92) {
    const local = (t - 0.78) / 0.14
    const ring = local * Math.PI * 2
    const radius = 1.85 + seeded(index, 19) * 0.2
    return [
      0.28 + Math.cos(ring) * radius,
      0.3 + Math.sin(ring) * 1.18,
      -0.2 + Math.sin(ring + Math.PI * 0.18) * 0.68,
    ]
  }

  const local = (t - 0.92) / 0.08
  const orbit = local * Math.PI * 8 + seeded(index, 20)
  const radius = 1.35 + local * 1.35
  return [
    0.28 + Math.cos(orbit) * radius,
    -1.2 + Math.sin(local * Math.PI * 2) * 2.15,
    Math.sin(orbit) * radius * 0.52,
  ]
}

export const createShapeData = ({ mode, count, theme }) => {
  const safeCount = Math.max(1, Math.floor(count))
  const positions = new Float32Array(safeCount * 3)
  const colors = new Float32Array(safeCount * 3)
  const palette = (THEMES[theme] || THEMES.neon).palette
  const factory = {
    hypercube: createHypercubePoint,
    dna: createDnaPoint,
    blackhole: createBlackholePoint,
    heroine: createHeroinePoint,
  }[mode] || createHypercubePoint

  for (let index = 0; index < safeCount; index += 1) {
    const [x, y, z] = factory(index, safeCount)
    positions[index * 3] = x
    positions[index * 3 + 1] = y
    positions[index * 3 + 2] = z
    writeColor(colors, index, palette, seeded(index, 7))
  }

  return {
    positions,
    colors,
    label: MODE_LABELS[mode] || MODE_LABELS.hypercube,
  }
}

export const interpolatePositions = (from, to, progress) => {
  const amount = clamp(progress, 0, 1)
  const length = Math.min(from.length, to.length)
  const result = new Float32Array(length)

  for (let index = 0; index < length; index += 1) {
    result[index] = from[index] + (to[index] - from[index]) * amount
  }

  return result
}
