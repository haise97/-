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

const fingerStates = (landmarks) => {
  const wrist = landmarks[0]
  const thumbTip = landmarks[4]
  const thumbIp = landmarks[3]
  const thumbMcp = landmarks[2]
  const indexTip = landmarks[8]
  const indexPip = landmarks[6]
  const middleTip = landmarks[12]
  const middlePip = landmarks[10]
  const ringTip = landmarks[16]
  const ringPip = landmarks[14]
  const pinkyTip = landmarks[20]
  const pinkyPip = landmarks[18]

  return {
    thumb: distance2d(thumbTip, wrist) > distance2d(thumbIp, wrist) + 0.05 || thumbTip.x > thumbMcp.x + 0.06,
    index: indexTip.y < indexPip.y - 0.04,
    middle: middleTip.y < middlePip.y - 0.04,
    ring: ringTip.y < ringPip.y - 0.04,
    pinky: pinkyTip.y < pinkyPip.y - 0.04,
  }
}

const countRaisedFingers = (states) => ['thumb', 'index', 'middle', 'ring', 'pinky'].reduce(
  (count, key) => count + (states[key] ? 1 : 0),
  0,
)

const getPalmCenter = (landmarks) => {
  const wrist = landmarks[0]
  const indexBase = landmarks[5]
  const pinkyBase = landmarks[17]

  return {
    x: (wrist.x + indexBase.x + pinkyBase.x) / 3,
    y: (wrist.y + indexBase.y + pinkyBase.y) / 3,
  }
}

const makeFingerLabel = (raisedCount) => {
  const labels = ['小指动作', '双指动作', '三指动作', '四指动作', '五指全开']
  return labels[Math.max(0, Math.min(labels.length - 1, raisedCount - 1))]
}

export const createEmptyGestureSignal = (label = '未开启') => ({
  active: false,
  paused: false,
  action: 'idle',
  raisedCount: 0,
  fingerStates: null,
  rotateX: 0,
  rotateY: 0,
  zoomDelta: 0,
  disturbance: 0,
  effect: 'idle',
  effectStrength: 0,
  label,
})

export const mapHandLandmarksToGesture = (landmarks) => {
  if (!Array.isArray(landmarks) || landmarks.length < 21) {
    return createEmptyGestureSignal('未检测到手')
  }

  const states = fingerStates(landmarks)
  const raisedCount = countRaisedFingers(states)
  const palm = getPalmCenter(landmarks)
  const rawRotateY = clamp((palm.x - 0.5) * 2.2, -1, 1)
  const rawRotateX = clamp((0.5 - palm.y) * 2.2, -1, 1)
  const rotateY = amplify(applyDeadZone(rawRotateY))
  const rotateX = amplify(applyDeadZone(rawRotateX))
  const pinchDistance = distance2d(landmarks[4], landmarks[8])
  const tipXs = [landmarks[4].x, landmarks[8].x, landmarks[12].x, landmarks[16].x, landmarks[20].x]
  const tipYs = [landmarks[4].y, landmarks[8].y, landmarks[12].y, landmarks[16].y, landmarks[20].y]
  const tipSpan = Math.max(...tipXs) - Math.min(...tipXs)
  const tipHeightSpan = Math.max(...tipYs) - Math.min(...tipYs)
  const isFist = raisedCount === 0
  const isPinch = pinchDistance < 0.055 && raisedCount <= 2 && !states.middle && !states.ring && !states.pinky
  const isClosedFive = raisedCount === 5 && tipSpan < 0.16 && tipHeightSpan < 0.24

  let action = 'idle'
  let label = makeFingerLabel(raisedCount)

  if (isFist) {
    action = 'pause'
    label = '拳头：暂停动画'
  } else if (isPinch) {
    action = 'shrink'
    label = '拇指+食指捏合：缩小'
  } else if (isClosedFive) {
    action = 'zoomIn'
    label = '五指并拢：放大'
  } else {
    action = `fingers-${raisedCount}`
    label = makeFingerLabel(raisedCount)
  }

  return {
    active: true,
    paused: isFist,
    action,
    raisedCount,
    fingerStates: states,
    rotateX,
    rotateY,
    zoomDelta: action === 'shrink' ? -0.35 : action === 'zoomIn' ? 0.42 : 0,
    disturbance: clamp(raisedCount / 5, 0, 1),
    effect: action === 'zoomIn' ? 'depthPulse' : action === 'shrink' ? 'orbitSpin' : 'idle',
    effectStrength: action === 'zoomIn' ? 0.8 : action === 'shrink' ? 0.6 : raisedCount / 5,
    label,
  }
}

export const mapHandsLandmarksToGesture = (handsLandmarks) => {
  if (!Array.isArray(handsLandmarks) || handsLandmarks.length === 0) {
    return createEmptyGestureSignal('未检测到手')
  }

  return mapHandLandmarksToGesture(handsLandmarks[0])
}
