import { THEMES } from './shapes.js'

export const createUiController = ({ settings, scene, onModeChange, onAudioToggle, onVolumeChange, onGestureToggle }) => {
  const elements = {
    modeTitle: document.querySelector('#mode-title'),
    statusText: document.querySelector('#status-text'),
    hintText: document.querySelector('#hint-text'),
    panel: document.querySelector('.panel'),
    openPanel: document.querySelector('#open-panel'),
    collapsePanel: document.querySelector('#collapse-panel'),
    modeButtons: [...document.querySelectorAll('.mode-button')],
    count: document.querySelector('#particle-count'),
    countValue: document.querySelector('#particle-count-value'),
    size: document.querySelector('#particle-size'),
    sizeValue: document.querySelector('#particle-size-value'),
    speed: document.querySelector('#animation-speed'),
    speedValue: document.querySelector('#animation-speed-value'),
    theme: document.querySelector('#theme-select'),
    randomize: document.querySelector('#randomize'),
    resetView: document.querySelector('#reset-view'),
    toggleMusic: document.querySelector('#toggle-music'),
    musicLabel: document.querySelector('#music-label'),
    musicVolume: document.querySelector('#music-volume'),
    musicVolumeValue: document.querySelector('#music-volume-value'),
    toggleGesture: document.querySelector('#toggle-gesture'),
    gestureLabel: document.querySelector('#gesture-label'),
  }

  const syncControls = (nextSettings = settings) => {
    elements.count.value = nextSettings.count
    elements.countValue.value = nextSettings.count
    elements.size.value = nextSettings.size
    elements.sizeValue.value = Number(nextSettings.size).toFixed(3)
    elements.speed.value = nextSettings.speed
    elements.speedValue.value = Number(nextSettings.speed).toFixed(2)
    elements.theme.value = nextSettings.theme
    elements.modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === nextSettings.mode)
    })
    document.documentElement.dataset.theme = nextSettings.theme
    elements.hintText.textContent = `${THEMES[nextSettings.theme]?.name || THEMES.neon.name} | 双击重置视角 | 拖拽旋转 | 捏合缩放`
  }

  elements.modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      settings.mode = button.dataset.mode
      onModeChange(settings.mode)
      syncControls(settings)
    })
  })

  elements.count.addEventListener('input', () => {
    settings.count = Number(elements.count.value)
    elements.countValue.value = settings.count
    scene.updateSettings(settings)
  })

  elements.size.addEventListener('input', () => {
    settings.size = Number(elements.size.value)
    elements.sizeValue.value = settings.size.toFixed(3)
    scene.updateSettings(settings)
  })

  elements.speed.addEventListener('input', () => {
    settings.speed = Number(elements.speed.value)
    elements.speedValue.value = settings.speed.toFixed(2)
    scene.updateSettings(settings)
  })

  elements.theme.addEventListener('change', () => {
    settings.theme = elements.theme.value
    scene.updateSettings(settings)
    syncControls(settings)
  })

  elements.randomize.addEventListener('click', () => {
    const nextSettings = scene.randomize()
    Object.assign(settings, nextSettings)
    syncControls(settings)
  })

  elements.resetView.addEventListener('click', () => scene.resetView())

  elements.toggleMusic.addEventListener('click', async () => {
    if (elements.toggleMusic.disabled) return
    elements.toggleMusic.disabled = true

    try {
      const playing = await onAudioToggle()
      elements.toggleMusic.textContent = playing ? '暂停 BGM' : '播放 BGM'
      elements.musicLabel.textContent = playing ? '节奏粒子运行中' : '节奏粒子未开启'
    } catch {
      elements.musicLabel.textContent = 'BGM 启动失败'
    } finally {
      elements.toggleMusic.disabled = false
    }
  })

  elements.musicVolume.addEventListener('input', () => {
    const volume = Number(elements.musicVolume.value)
    elements.musicVolumeValue.value = `${Math.round(volume * 100)}%`
    onVolumeChange(volume)
  })

  elements.collapsePanel.addEventListener('click', () => {
    elements.panel.classList.add('collapsed')
    elements.openPanel.classList.add('visible')
  })

  elements.openPanel.addEventListener('click', () => {
    elements.panel.classList.remove('collapsed')
    elements.openPanel.classList.remove('visible')
  })

  elements.toggleGesture.addEventListener('click', async () => {
    if (elements.toggleGesture.disabled) return
    elements.toggleGesture.disabled = true
    const originalText = elements.toggleGesture.textContent
    elements.toggleGesture.textContent = '正在启动...'
    elements.gestureLabel.textContent = '正在请求权限'

    try {
      const enabled = await onGestureToggle()
      settings.gestureEnabled = enabled
      elements.toggleGesture.textContent = enabled ? '关闭手势' : '开启手势'
    } catch {
      settings.gestureEnabled = false
      elements.toggleGesture.textContent = originalText
      elements.gestureLabel.textContent = '手势启动失败'
    } finally {
      elements.toggleGesture.disabled = false
    }
  })

  const setStatus = ({ modeLabel, statusText, gestureLabel, gestureEnabled }) => {
    if (modeLabel) elements.modeTitle.textContent = modeLabel
    if (statusText) elements.statusText.textContent = statusText
    if (gestureLabel) elements.gestureLabel.textContent = gestureLabel
    if (typeof gestureEnabled === 'boolean') {
      elements.toggleGesture.textContent = gestureEnabled ? '关闭手势' : '开启手势'
    }
  }

  syncControls(settings)

  return {
    setStatus,
    syncControls,
  }
}
