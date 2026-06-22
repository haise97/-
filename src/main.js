import './styles.css'
import { AudioController } from './audioController.js'
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

const audio = new AudioController({
  onLevel: (level) => scene.updateAudioLevel(level),
  onState: ({ playing }) => updateStatus({
    statusText: playing ? 'BGM 已开启，粒子正在跟随节奏呼吸。' : 'BGM 已关闭。',
  }),
})

const gesture = new GestureController({
  video,
  onSignal: (signal) => {
    scene.applyGesture(signal)
    if (signal.paused) {
      updateStatus({ gestureLabel: '拳头：动画已暂停' })
    } else {
      updateStatus({ gestureLabel: signal.label })
    }
  },
  onStatus: (signal) => {
    updateStatus({
      gestureLabel: signal.label,
      statusText: signal.active ? '摄像头已连接，正在识别手势。' : '拖拽旋转，滚轮缩放，点击开启手势。',
    })
  },
})

ui = createUiController({
  settings,
  scene,
  onModeChange: (mode) => scene.setShape(mode),
  onAudioToggle: () => audio.toggle(),
  onVolumeChange: (volume) => audio.setVolume(volume),
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
updateStatus({ statusText: '拖拽旋转，滚轮缩放，点击开启手势。' })
