const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const applyGestureMotion = (currentVelocity, signal) => {
  if (!signal?.active) {
    return {
      velocity: { ...currentVelocity },
      zoomDelta: 0,
      disturbance: 0,
    }
  }

  return {
    velocity: {
      x: clamp(currentVelocity.x * 0.45 + signal.rotateX * 0.035, -0.055, 0.055),
      y: clamp(currentVelocity.y * 0.45 + signal.rotateY * 0.035, -0.055, 0.055),
    },
    zoomDelta: signal.zoomDelta * 0.18,
    disturbance: signal.disturbance,
  }
}
