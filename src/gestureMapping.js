const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const distance2d = (a, b) => {
  if (!a || !b) return 0
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const applyDeadZone = (value, deadZone = 0.08) => {
  const magnitude = Math.abs(value)
  if (magnitude <= deadZone) return 0
  return Math.sign(value) * ((magnitude - deadZone) / (1 - deadZone))
}

const amplify = (value, power = 1.35) => Math.sign(value) * Math.abs(value) ** power

export const createEmptyGestureSignal = (label = '未开启') => ({
  active: false,
  rotateX: 0,
  rotateY: 0,
  zoomDelta: 0,
  disturbance: 0,
  effect: 'idle',
  effectStrength: 0,
  label,
})

const getPalmCenter = (landmarks) => {
  const wrist = landmarks[0]
  const indexBase = landmarks[5]
  const pinkyBase = landmarks[17]

  return {
    x: (wrist.x + indexBase.x + pinkyBase.x) / 3,
    y: (wrist.y + indexBase.y + pinkyBase.y) / 3,
  }
}

export const mapHandLandmarksToGesture = (landmarks) => {
  if (!Array.isArray(landmarks) || landmarks.length < 21) {
    return createEmptyGestureSignal('未检测到手')
  }

  const wrist = landmarks[0]
  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const ringTip = landmarks[16]
  const pinkyTip = landmarks[20]
  const { x: palmX, y: palmY } = getPalmCenter(landmarks)
  const pinchDistance = distance2d(thumbTip, indexTip)
  const spread = [indexTip, middleTip, ringTip, pinkyTip].reduce((total, point) => total + distance2d(wrist, point), 0) / 4
  const rawRotateY = clamp((palmX - 0.5) * 2.2, -1, 1)
  const rawRotateX = clamp((0.5 - palmY) * 2.2, -1, 1)
  const rotateY = amplify(applyDeadZone(rawRotateY))
  const rotateX = amplify(applyDeadZone(rawRotateX))
  const zoomDelta = clamp((pinchDistance - 0.08) * 5, -0.35, 0.5)
  const disturbance = clamp((spread - 0.18) * 3.2, 0, 1)
  const spinStrength = clamp((Math.abs(rotateX) + Math.abs(rotateY) - 0.35) * 1.35, 0, 1)
  const zoomStrength = clamp(Math.abs(zoomDelta) * 2.4, 0, 1)
  const direction = Math.abs(rotateY) > Math.abs(rotateX)
    ? (rotateY > 0 ? '右移：Y轴旋转' : '左移：Y轴旋转')
    : (rotateX > 0 ? '上移：X轴旋转' : '下移：X轴旋转')
  const effect = zoomStrength > spinStrength ? 'depthPulse' : spinStrength > 0.08 ? 'orbitSpin' : 'idle'
  const label = effect === 'depthPulse'
    ? '靠近/远离：同步缩放与呼吸光效'
    : effect === 'orbitSpin'
      ? '旋转手势：外圈粒子绕人物旋转'
      : disturbance > 0.55
        ? '张开手掌：扰动粒子'
        : pinchDistance < 0.055
          ? '捏合：收缩缩放'
          : direction

  return {
    active: true,
    rotateX,
    rotateY,
    zoomDelta,
    disturbance,
    effect,
    effectStrength: Math.max(spinStrength, zoomStrength, disturbance * 0.45),
    label,
  }
}

export const mapHandsLandmarksToGesture = (handsLandmarks) => {
  if (!Array.isArray(handsLandmarks) || handsLandmarks.length === 0) {
    return createEmptyGestureSignal('未检测到手')
  }

  if (handsLandmarks.length < 2) {
    return mapHandLandmarksToGesture(handsLandmarks[0])
  }

  const [firstHand, secondHand] = handsLandmarks
  if (!Array.isArray(firstHand) || !Array.isArray(secondHand) || firstHand.length < 21 || secondHand.length < 21) {
    return mapHandLandmarksToGesture(firstHand)
  }

  const first = getPalmCenter(firstHand)
  const second = getPalmCenter(secondHand)
  const centerX = (first.x + second.x) / 2
  const centerY = (first.y + second.y) / 2
  const handDistance = distance2d(first, second)
  const baseSignal = mapHandLandmarksToGesture(firstHand)
  const spreadStrength = clamp((handDistance - 0.22) * 2.4, 0, 1)

  return {
    ...baseSignal,
    rotateX: amplify(applyDeadZone(clamp((0.5 - centerY) * 2.1, -1, 1))),
    rotateY: amplify(applyDeadZone(clamp((centerX - 0.5) * 2.1, -1, 1))),
    zoomDelta: clamp((handDistance - 0.34) * 2.2, -0.25, 0.46),
    disturbance: Math.max(baseSignal.disturbance, spreadStrength),
    effect: 'spreadDepth',
    effectStrength: Math.max(0.35, spreadStrength),
    label: '双手拉开：光轨放大与景深增强',
  }
}
