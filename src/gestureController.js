import { getCameraErrorLabel } from './cameraErrors.js'
import { createEmptyGestureSignal, mapHandsLandmarksToGesture } from './gestureMapping.js'

const waitForVideoReady = (video) => new Promise((resolve) => {
  if (video.readyState >= 2 || (video.videoWidth && video.videoHeight)) {
    resolve()
    return
  }

  let done = false
  const handleReady = () => {
    if (done) return
    done = true
    window.clearTimeout(timer)
    video.removeEventListener('loadedmetadata', handleReady)
    video.removeEventListener('canplay', handleReady)
    resolve()
  }
  const timer = window.setTimeout(handleReady, 1200)
  video.addEventListener('loadedmetadata', handleReady)
  video.addEventListener('canplay', handleReady)
})

const requestCameraStream = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('此浏览器不支持摄像头 API', 'NotFoundError')
  }

  const tryRequest = (constraints) => navigator.mediaDevices.getUserMedia(constraints)

  try {
    return await tryRequest({ audio: false, video: true })
  } catch {
    try {
      return await tryRequest({ audio: false, video: { facingMode: 'user' } })
    } catch {
      return await tryRequest({ audio: false, video: { width: 320, height: 240 } })
    }
  }
}

const HANDS_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'

const loadHandsConstructor = () => new Promise((resolve, reject) => {
  if (typeof window.Hands === 'function') {
    resolve(window.Hands)
    return
  }

  const existingScript = document.querySelector(`script[src="${HANDS_SCRIPT_URL}"]`)
  if (existingScript) {
    existingScript.addEventListener('load', () => resolve(window.Hands), { once: true })
    existingScript.addEventListener('error', () => reject(new Error('MediaPipe Hands script failed')), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = HANDS_SCRIPT_URL
  script.async = true
  script.onload = () => {
    if (typeof window.Hands === 'function') {
      resolve(window.Hands)
    } else {
      reject(new TypeError('MediaPipe Hands constructor unavailable'))
    }
  }
  script.onerror = () => reject(new Error('MediaPipe Hands script failed'))
  document.head.appendChild(script)
})

const loadMediaPipe = async () => {
  const HandsConstructor = await loadHandsConstructor()
  const hands = new HandsConstructor({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  })

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.72,
    minTrackingConfidence: 0.7,
  })

  await hands.initialize()
  return hands
}

const normalizeAction = (signal) => {
  if (!signal?.active) return 'idle'
  if (signal.paused) return 'pause'
  return signal.action || 'idle'
}

export class GestureController {
  constructor({ video, onSignal, onStatus }) {
    this.video = video
    this.onSignal = onSignal
    this.onStatus = onStatus
    this.stream = null
    this.hands = null
    this.enabled = false
    this.lastSignalAt = 0
    this.frameRequest = null
    this.sendingFrame = false
    this.smoothedSignal = createEmptyGestureSignal('未开启')
    this.stableAction = 'idle'
    this.stableFrames = 0
    this.lastDispatchAt = 0
  }

  async toggle() {
    if (this.enabled) {
      this.stop()
      return false
    }

    await this.start()
    return true
  }

  async start() {
    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new DOMException('摄像头需要本地或 HTTPS 环境', 'NotAllowedError')
      }

      this.onStatus?.(createEmptyGestureSignal('1/3 正在请求摄像头权限'))
      this.stream = await requestCameraStream()

      this.onStatus?.(createEmptyGestureSignal('2/3 摄像头已启用，开始识别手势'))
      this.video.srcObject = this.stream
      this.video.muted = true
      this.video.playsInline = true
      this.video.setAttribute('autoplay', '')

      try {
        await this.video.play()
      } catch {
        this.onStatus?.(createEmptyGestureSignal('2/3 浏览器阻止自动播放，继续尝试'))
      }

      await waitForVideoReady(this.video)

      this.onStatus?.(createEmptyGestureSignal('3/3 正在加载手势识别模型（首次约需10-60秒）'))
      this.hands = await loadMediaPipe()

      this.hands.onResults((results) => this.handleResults(results))
      this.enabled = true
      this.onStatus?.({ ...createEmptyGestureSignal('摄像头与手势识别已就绪'), active: false })
      this.readFrames()
    } catch (error) {
      this.stopTracks()
      this.enabled = false
      const raw = error?.message ? `（${error.name}）${String(error.message).slice(0, 40)}` : ''
      this.onStatus?.(createEmptyGestureSignal(getCameraErrorLabel(error) + raw))
      throw error
    }
  }

  readFrames = async () => {
    if (!this.enabled || !this.hands || this.sendingFrame) {
      if (this.enabled) {
        this.frameRequest = window.requestAnimationFrame(this.readFrames)
      }
      return
    }

    this.sendingFrame = true

    try {
      await this.hands.send({ image: this.video })
    } catch {
      this.onStatus?.(createEmptyGestureSignal('手势识别运行失败'))
    } finally {
      this.sendingFrame = false
      if (this.enabled) {
        this.frameRequest = window.requestAnimationFrame(this.readFrames)
      }
    }
  }

  stopTracks() {
    if (this.frameRequest) {
      window.cancelAnimationFrame(this.frameRequest)
      this.frameRequest = null
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
      this.stream = null
    }

    if (this.video?.srcObject) {
      this.video.srcObject = null
    }
  }

  stop() {
    this.enabled = false
    this.stopTracks()
    this.stableAction = 'idle'
    this.stableFrames = 0
    this.onSignal?.(createEmptyGestureSignal('未开启'))
    this.onStatus?.(createEmptyGestureSignal('未开启'))
  }

  handleResults(results) {
    const signal = mapHandsLandmarksToGesture(results.multiHandLandmarks)
    const now = performance.now()
    const nextAction = normalizeAction(signal)

    if (signal.active) {
      const alpha = this.smoothedSignal.active ? 0.2 : 1
      this.smoothedSignal = {
        ...signal,
        rotateX: this.smoothedSignal.rotateX + (signal.rotateX - this.smoothedSignal.rotateX) * alpha,
        rotateY: this.smoothedSignal.rotateY + (signal.rotateY - this.smoothedSignal.rotateY) * alpha,
        zoomDelta: this.smoothedSignal.zoomDelta + (signal.zoomDelta - this.smoothedSignal.zoomDelta) * alpha,
        disturbance: Math.max(signal.disturbance, this.smoothedSignal.disturbance * 0.88),
        effect: signal.effect,
        effectStrength: this.smoothedSignal.effectStrength + (signal.effectStrength - this.smoothedSignal.effectStrength) * alpha,
        paused: signal.paused,
        action: signal.action,
        raisedCount: signal.raisedCount,
        fingerStates: signal.fingerStates,
      }
    } else {
      this.smoothedSignal = signal
      this.stableAction = 'idle'
      this.stableFrames = 0
    }

    if (!signal.active) {
      if (now - this.lastSignalAt > 250) {
        this.onSignal?.(this.smoothedSignal)
        this.onStatus?.(this.smoothedSignal)
        this.lastSignalAt = now
      }
      return
    }

    if (nextAction === this.stableAction) {
      this.stableFrames += 1
    } else {
      this.stableAction = nextAction
      this.stableFrames = 1
    }

    const stableEnough = this.stableFrames >= 3
    const cooledDown = now - this.lastDispatchAt > 180

    if ((stableEnough && cooledDown) || nextAction === 'pause') {
      this.onSignal?.(this.smoothedSignal)
      this.onStatus?.(this.smoothedSignal)
      this.lastSignalAt = now
      this.lastDispatchAt = now
    }
  }
}
