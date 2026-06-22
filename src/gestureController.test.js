import { beforeEach, describe, expect, it, vi } from 'vitest'

const handsInstance = {
  setOptions: vi.fn(),
  onResults: vi.fn(),
  initialize: vi.fn(() => Promise.resolve()),
}

const handsConstructor = vi.fn(() => handsInstance)

const createVideo = () => ({
  readyState: 2,
  videoWidth: 320,
  videoHeight: 240,
  muted: false,
  playsInline: false,
  srcObject: null,
  setAttribute: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
})

const setupBrowser = () => {
  const stream = {
    getTracks: () => [{ stop: vi.fn() }],
  }
  const getUserMedia = vi.fn(() => Promise.resolve(stream))
  const appendedScripts = []

  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia },
  })
  vi.stubGlobal('window', {
    isSecureContext: true,
    location: { hostname: '127.0.0.1' },
    Hands: handsConstructor,
    requestAnimationFrame: vi.fn(),
    cancelAnimationFrame: vi.fn(),
    setTimeout,
    clearTimeout,
  })
  vi.stubGlobal('document', {
    querySelector: vi.fn(() => null),
    createElement: vi.fn(() => ({
      src: '',
      async: false,
      onload: null,
      onerror: null,
    })),
    head: {
      appendChild: vi.fn((script) => {
        appendedScripts.push(script)
      }),
    },
  })

  return { getUserMedia, appendedScripts }
}

describe('GestureController', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('从浏览器全局对象创建 MediaPipe Hands，避免生产包构造函数兼容问题', async () => {
    const { GestureController } = await import('./gestureController.js')
    setupBrowser()

    const controller = new GestureController({
      video: createVideo(),
      onSignal: vi.fn(),
      onStatus: vi.fn(),
    })

    await expect(controller.start()).resolves.toBeUndefined()
    expect(handsConstructor).toHaveBeenCalled()
    expect(handsInstance.initialize).toHaveBeenCalled()
  })

  it('启动时先请求摄像头，再初始化手势模型', async () => {
    const { GestureController } = await import('./gestureController.js')
    const { getUserMedia } = setupBrowser()

    const controller = new GestureController({
      video: createVideo(),
      onSignal: vi.fn(),
      onStatus: vi.fn(),
    })

    await controller.start()

    expect(getUserMedia.mock.invocationCallOrder[0]).toBeLessThan(handsConstructor.mock.invocationCallOrder[0])
  })

  it('没有全局 Hands 时加载官方 MediaPipe 脚本', async () => {
    const { GestureController } = await import('./gestureController.js')
    const { appendedScripts } = setupBrowser()
    window.Hands = undefined

    const controller = new GestureController({
      video: createVideo(),
      onSignal: vi.fn(),
      onStatus: vi.fn(),
    })

    const startPromise = controller.start()
    await vi.waitFor(() => expect(appendedScripts.length).toBe(1))
    window.Hands = handsConstructor
    appendedScripts[0].onload()
    await startPromise

    expect(appendedScripts[0].src).toBe('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
  })
})
