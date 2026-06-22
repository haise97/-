import './styles.css'
import { GestureController } from './gestureController.js'
import { ParticleScene } from './particleScene.js'
import { createUiController } from './uiController.js'

const settings = {
  mode: 'hypercube',
  count: 7000,
  size: 0.035,
  speed: 1,
  theme: 'neon',
  gestureEnabled: false,
}

const canvas = document.querySelector('#particle-canvas')
const video = document.querySelector('#camera-video')
let ui = null

const updateStatus = ({ modeLabel, statusText, gestureLabel, gestureEnabled } = {}) => {
  ui?.setStatus({ modeLabel, statusText, gestureLabel, gestureEnabled })
}

const scene = new ParticleScene(canvas, settings, ({ modeLabel }) => {
  updateStatus({ modeLabel, statusText: '形态切换中，粒子正在重新编队。' })
})

const gesture = new GestureController({
  video,
  onSignal: (signal) => {
    scene.applyGesture(signal)
  },
  onStatus: (signal) => {
    updateStatus({
      gestureLabel: signal.label,
      statusText: signal.active ? '摄像头手势正在影响粒子场。' : '鼠标、触摸和摄像头手势可随时切换使用。',
    })
  },
})

ui = createUiController({
  settings,
  scene,
  onModeChange: (mode) => scene.setShape(mode),
  onGestureToggle: async () => {
    try {
      const enabled = await gesture.toggle()
      updateStatus({ gestureEnabled: enabled })
      return enabled
    } catch {
      updateStatus({ gestureEnabled: false })
      return false
    }
  },
})

scene.start()
updateStatus({ statusText: '拖拽旋转，滚轮缩放，双击重置；也可以开启摄像头手势。' })
