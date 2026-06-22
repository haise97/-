import * as THREE from 'three'
import heroineImageUrl from './assets/heroine-reference.jpg'
import { applyGestureMotion } from './gestureMotion.js'
import { createShapeData, interpolatePositions } from './shapes.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export class ParticleScene {
  constructor(canvas, settings, onStatus) {
    this.canvas = canvas
    this.settings = { ...settings }
    this.onStatus = onStatus
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.geometry = new THREE.BufferGeometry()
    this.subjectGroup = new THREE.Group()
    this.material = new THREE.PointsMaterial({
      size: this.settings.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)
    this.heroineFigure = this.createHeroineFigure()
    this.clock = new THREE.Clock()
    this.rotationVelocity = new THREE.Vector2(0.002, 0.004)
    this.targetZoom = 8
    this.currentZoom = 8
    this.isDragging = false
    this.lastPointer = null
    this.touchDistance = 0
    this.transition = null
    this.disturbance = 0
    this.paused = false
    this.fingerAction = 'idle'
    this.fingerActionTarget = 'idle'
    this.fingerActionStrength = 0
    this.fingerActionTargetStrength = 0
    this.heroineFx = {
      spread: 0,
      spreadTarget: 0,
      spin: 0,
      spinTarget: 0,
      pulse: 0,
      pulseTarget: 0,
      scaleBoost: 0,
      scaleTarget: 0,
    }
    this.animationId = null

    this.camera.position.set(0, 0, this.currentZoom)
    this.subjectGroup.add(this.heroineFigure)
    this.subjectGroup.add(this.points)
    this.scene.add(this.subjectGroup)
    this.scene.add(this.createStarField())
    this.resize()
    this.bindEvents()
    this.setShape(this.settings.mode, true)
  }

  createHeroineFigure() {
    const group = new THREE.Group()
    const texture = new THREE.TextureLoader().load(heroineImageUrl, (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace
      loadedTexture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8)
      loadedTexture.needsUpdate = true
    })
    texture.colorSpace = THREE.SRGBColorSpace

    const width = 3.82
    const height = 6.8
    const portraitGeometry = new THREE.PlaneGeometry(width, height, 72, 112)
    const position = portraitGeometry.getAttribute('position')

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index) / (width * 0.5)
      const y = position.getY(index) / (height * 0.5)
      const bodyBulge = Math.max(0, 1 - x * x) * (0.16 + Math.max(0, 0.8 - Math.abs(y + 0.08)) * 0.2)
      const faceLift = Math.exp(-((x * 1.9) ** 2 + ((y - 0.43) * 3.1) ** 2)) * 0.22
      const clothFold = Math.sin((x + y) * 8.4) * 0.018 * Math.max(0, 0.9 - Math.abs(y + 0.35))
      position.setZ(index, bodyBulge + faceLift + clothFold)
    }

    portraitGeometry.computeVertexNormals()

    const portrait = new THREE.Mesh(
      portraitGeometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.97,
        side: THREE.DoubleSide,
      }),
    )
    portrait.position.set(0.35, -0.2, 0.08)

    const sideView = this.createHeroineViewMesh('side', width * 0.58, height)
    sideView.position.set(0.18, -0.2, 0.02)
    sideView.rotation.y = -0.18
    sideView.material.opacity = 0

    const backView = this.createHeroineViewMesh('back', width * 0.82, height)
    backView.position.set(0.25, -0.2, -0.02)
    backView.material.opacity = 0

    const backGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 1.1, height * 1.08, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0x9cc9ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    backGlow.position.set(0.35, -0.2, -0.36)

    const auraGeometry = new THREE.BufferGeometry()
    const auraCount = 1400
    const auraPositions = new Float32Array(auraCount * 3)
    const auraColors = new Float32Array(auraCount * 3)

    for (let index = 0; index < auraCount; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const radius = 1.25 + Math.random() * 2.15
      const y = -2.2 + Math.random() * 5.4
      const sidePull = Math.sin(y * 1.4) * 0.36
      auraPositions[index * 3] = 0.25 + Math.cos(angle) * radius * 0.48 + sidePull
      auraPositions[index * 3 + 1] = y
      auraPositions[index * 3 + 2] = Math.sin(angle) * radius * 0.46 + (Math.random() - 0.5) * 0.4
      auraColors[index * 3] = 0.56 + Math.random() * 0.24
      auraColors[index * 3 + 1] = 0.74 + Math.random() * 0.2
      auraColors[index * 3 + 2] = 1
    }

    auraGeometry.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3))
    auraGeometry.setAttribute('color', new THREE.BufferAttribute(auraColors, 3))
    const aura = new THREE.Points(
      auraGeometry,
      new THREE.PointsMaterial({
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.66,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )

    group.userData = { backGlow, portrait, sideView, backView, aura }
    group.add(backGlow, backView, sideView, portrait, aura)
    group.visible = false
    return group
  }

  createHeroineViewMesh(view, width, height) {
    const texture = this.createHeroineViewTexture(view)
    const geometry = new THREE.PlaneGeometry(width, height, 48, 96)
    const position = geometry.getAttribute('position')

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index) / (width * 0.5)
      const y = position.getY(index) / (height * 0.5)
      const torso = Math.max(0, 1 - x * x) * Math.max(0, 0.9 - Math.abs(y + 0.08)) * 0.2
      const hair = Math.exp(-((x * 1.5) ** 2 + ((y - 0.28) * 1.4) ** 2)) * 0.26
      position.setZ(index, torso + hair)
    }

    geometry.computeVertexNormals()

    return new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
  }

  createHeroineViewTexture(view) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.shadowBlur = 26
    ctx.shadowColor = 'rgba(196, 178, 255, 0.78)'

    const hairGradient = ctx.createLinearGradient(170, 90, 330, 820)
    hairGradient.addColorStop(0, 'rgba(235, 226, 255, 0.96)')
    hairGradient.addColorStop(0.38, 'rgba(184, 139, 244, 0.94)')
    hairGradient.addColorStop(1, 'rgba(110, 74, 183, 0.64)')

    const clothGradient = ctx.createLinearGradient(150, 280, 380, 980)
    clothGradient.addColorStop(0, 'rgba(248, 252, 255, 0.95)')
    clothGradient.addColorStop(0.55, 'rgba(210, 225, 255, 0.82)')
    clothGradient.addColorStop(1, 'rgba(150, 124, 214, 0.66)')

    if (view === 'back') {
      ctx.fillStyle = hairGradient
      ctx.beginPath()
      ctx.moveTo(256, 90)
      ctx.bezierCurveTo(118, 146, 122, 570, 98, 910)
      ctx.bezierCurveTo(180, 970, 336, 975, 418, 906)
      ctx.bezierCurveTo(390, 542, 408, 152, 256, 90)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = clothGradient
      ctx.beginPath()
      ctx.moveTo(182, 350)
      ctx.bezierCurveTo(86, 520, 78, 782, 48, 1000)
      ctx.lineTo(464, 1000)
      ctx.bezierCurveTo(424, 782, 420, 520, 330, 350)
      ctx.bezierCurveTo(288, 372, 224, 372, 182, 350)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(128, 82, 190, 0.72)'
      ctx.lineWidth = 16
      ctx.beginPath()
      ctx.moveTo(142, 638)
      ctx.bezierCurveTo(238, 590, 310, 590, 404, 642)
      ctx.stroke()
    } else {
      ctx.fillStyle = hairGradient
      ctx.beginPath()
      ctx.moveTo(288, 92)
      ctx.bezierCurveTo(168, 158, 178, 558, 138, 928)
      ctx.bezierCurveTo(212, 960, 306, 952, 356, 884)
      ctx.bezierCurveTo(324, 540, 390, 160, 288, 92)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(248, 239, 255, 0.98)'
      ctx.beginPath()
      ctx.ellipse(286, 202, 68, 92, -0.14, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = clothGradient
      ctx.beginPath()
      ctx.moveTo(235, 325)
      ctx.bezierCurveTo(122, 474, 94, 760, 66, 1000)
      ctx.lineTo(412, 1000)
      ctx.bezierCurveTo(382, 748, 364, 480, 306, 324)
      ctx.bezierCurveTo(285, 342, 256, 342, 235, 325)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(126, 78, 188, 0.76)'
      ctx.lineWidth = 14
      ctx.beginPath()
      ctx.moveTo(150, 632)
      ctx.bezierCurveTo(232, 590, 300, 602, 372, 654)
      ctx.stroke()
    }

    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(238, 248, 255, 0.72)'
    ctx.lineWidth = 5
    for (let index = 0; index < 7; index += 1) {
      const x = view === 'back' ? 168 + index * 28 : 194 + index * 18
      ctx.beginPath()
      ctx.moveTo(x, 168)
      ctx.bezierCurveTo(x - 34, 376, x - 10, 642, x - 50, 930)
      ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry()
    const count = 700
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let index = 0; index < count; index += 1) {
      const radius = 16 + Math.random() * 26
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[index * 3 + 2] = radius * Math.cos(phi)
      colors[index * 3] = 0.2 + Math.random() * 0.3
      colors[index * 3 + 1] = 0.55 + Math.random() * 0.4
      colors[index * 3 + 2] = 0.9 + Math.random() * 0.1
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
      size: 0.016,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    return new THREE.Points(geometry, material)
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize())
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event))
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event))
    window.addEventListener('pointerup', () => this.handlePointerUp())
    this.canvas.addEventListener('wheel', (event) => this.handleWheel(event), { passive: false })
    this.canvas.addEventListener('dblclick', () => this.resetView())
    this.canvas.addEventListener('touchmove', (event) => this.handleTouchMove(event), { passive: false })
  }

  resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  setShape(mode, immediate = false) {
    const data = createShapeData({ mode, count: this.settings.count, theme: this.settings.theme })
    const currentAttribute = this.geometry.getAttribute('position')
    const current = currentAttribute ? new Float32Array(currentAttribute.array) : data.positions

    this.settings.mode = mode
    this.targetData = data
    this.heroineFigure.visible = mode === 'heroine'
    this.material.opacity = mode === 'heroine' ? 0.72 : 0.92

    if (immediate || !currentAttribute || current.length !== data.positions.length) {
      this.geometry.setAttribute('position', new THREE.BufferAttribute(data.positions.slice(), 3))
      this.geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
      this.geometry.computeBoundingSphere()
      this.transition = null
    } else {
      this.transition = {
        from: current,
        to: data.positions,
        startedAt: performance.now(),
        duration: 980 / Math.max(0.2, this.settings.speed),
      }
      this.geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3))
    }

    this.onStatus?.({ modeLabel: data.label })
  }

  updateSettings(nextSettings) {
    const countChanged = nextSettings.count !== this.settings.count
    const themeChanged = nextSettings.theme !== this.settings.theme
    this.settings = { ...this.settings, ...nextSettings }
    this.material.size = this.settings.size

    if (countChanged || themeChanged) {
      this.setShape(this.settings.mode, true)
    }
  }

  randomize() {
    const modes = ['hypercube', 'dna', 'blackhole', 'heroine']
    const themes = ['neon', 'plasma', 'ice']
    const mode = modes[Math.floor(Math.random() * modes.length)]
    const theme = themes[Math.floor(Math.random() * themes.length)]
    const count = 3000 + Math.floor(Math.random() * 18) * 500
    const size = Number((0.018 + Math.random() * 0.048).toFixed(3))
    const speed = Number((0.55 + Math.random() * 1.45).toFixed(2))

    this.updateSettings({ mode, theme, count, size, speed })
    this.setShape(mode)
    return { ...this.settings }
  }

  handlePointerDown(event) {
    this.isDragging = true
    this.lastPointer = { x: event.clientX, y: event.clientY }
    this.canvas.setPointerCapture?.(event.pointerId)
  }

  handlePointerMove(event) {
    if (!this.isDragging || !this.lastPointer) return
    const dx = event.clientX - this.lastPointer.x
    const dy = event.clientY - this.lastPointer.y
    this.rotationVelocity.x = dy * 0.0009
    this.rotationVelocity.y = dx * 0.0009
    this.lastPointer = { x: event.clientX, y: event.clientY }
    this.disturbance = Math.min(1, this.disturbance + 0.025)
  }

  handlePointerUp() {
    this.isDragging = false
    this.lastPointer = null
  }

  handleWheel(event) {
    event.preventDefault()
    this.targetZoom = clamp(this.targetZoom + event.deltaY * 0.004, 3.6, 15)
  }

  handleTouchMove(event) {
    if (event.touches.length !== 2) return
    event.preventDefault()
    const [first, second] = event.touches
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)

    if (this.touchDistance) {
      this.targetZoom = clamp(this.targetZoom - (distance - this.touchDistance) * 0.015, 3.6, 15)
    }

    this.touchDistance = distance
  }

  resetView() {
    this.subjectGroup.rotation.set(0, 0, 0)
    this.points.rotation.set(0, 0, 0)
    this.heroineFigure.scale.setScalar(1)
    this.heroineFx.spreadTarget = 0
    this.heroineFx.spinTarget = 0
    this.heroineFx.pulseTarget = 0
    this.heroineFx.scaleTarget = 0
    this.rotationVelocity.set(0.002, 0.004)
    this.targetZoom = 8
    this.currentZoom = 8
  }

  applyGesture(signal) {
    if (!signal?.active) return
    this.paused = Boolean(signal.paused)
    this.fingerActionTarget = signal.action || 'idle'
    this.fingerActionTargetStrength = Math.min(1, Math.max(0, (signal.raisedCount || 0) / 5))
    const motion = applyGestureMotion({ x: this.rotationVelocity.x, y: this.rotationVelocity.y }, signal)
    this.rotationVelocity.x = motion.velocity.x
    this.rotationVelocity.y = motion.velocity.y
    this.targetZoom = clamp(this.targetZoom - motion.zoomDelta, 3.6, 15)
    this.disturbance = Math.max(this.disturbance, motion.disturbance)
    if (signal.action === 'zoomIn') {
      this.targetZoom = clamp(this.targetZoom - 0.5, 3.6, 15)
    } else if (signal.action === 'shrink') {
      this.targetZoom = clamp(this.targetZoom + 0.45, 3.6, 15)
    }

    if (this.settings.mode === 'heroine') {
      const strength = clamp(signal.effectStrength ?? 0, 0, 1)
      this.heroineFx.spreadTarget = signal.effect === 'spreadDepth' ? strength : this.heroineFx.spreadTarget * 0.72
      this.heroineFx.spinTarget = signal.effect === 'orbitSpin' ? strength : this.heroineFx.spinTarget * 0.8
      this.heroineFx.pulseTarget = signal.effect === 'depthPulse' ? Math.max(0.35, strength) : this.heroineFx.pulseTarget * 0.82
      this.heroineFx.scaleTarget = signal.effect === 'spreadDepth'
        ? strength * 0.1
        : signal.effect === 'depthPulse'
          ? clamp(Math.abs(signal.zoomDelta) * 0.18, 0.04, 0.13)
          : this.heroineFx.scaleTarget * 0.78
    }
  }

  updateHeroineFx(elapsed) {
    const fx = this.heroineFx
    const visible = this.settings.mode === 'heroine'
    const follow = visible ? 0.12 : 0.18

    if (!visible) {
      fx.spreadTarget = 0
      fx.spinTarget = 0
      fx.pulseTarget = 0
      fx.scaleTarget = 0
    }

    fx.spread += (fx.spreadTarget - fx.spread) * follow
    fx.spin += (fx.spinTarget - fx.spin) * follow
    fx.pulse += (fx.pulseTarget - fx.pulse) * follow
    fx.scaleBoost += (fx.scaleTarget - fx.scaleBoost) * follow
    fx.spreadTarget *= 0.965
    fx.spinTarget *= 0.975
    fx.pulseTarget *= 0.97
    fx.scaleTarget *= 0.97

    const { backGlow, portrait, sideView, backView, aura } = this.heroineFigure.userData
    const breath = (Math.sin(elapsed * (1.65 + fx.pulse * 2.2)) * 0.5 + 0.5) * fx.pulse
    const spreadScale = 1 + fx.spread * 0.34
    const figureScale = 1 + fx.scaleBoost + breath * 0.035
    const yaw = Math.atan2(Math.sin(this.subjectGroup.rotation.y), Math.cos(this.subjectGroup.rotation.y))
    const absYaw = Math.abs(yaw)
    const smoothstep = (edge0, edge1, value) => {
      const x = clamp((value - edge0) / (edge1 - edge0), 0, 1)
      return x * x * (3 - 2 * x)
    }
    const sideMix = smoothstep(0.36, 1.08, absYaw) * (1 - smoothstep(1.32, 2.22, absYaw))
    const backMix = smoothstep(1.45, 2.75, absYaw)
    const frontMix = Math.max(0, 1 - sideMix * 0.88 - backMix)
    const turnCover = Math.max(sideMix, backMix) * 0.38

    this.heroineFigure.scale.setScalar(figureScale)
    this.heroineFigure.position.z = fx.spread * 0.34 - fx.pulse * 0.16

    if (aura) {
      aura.scale.set(1 + fx.spread * 0.62 + turnCover, 1 + fx.spread * 0.42 + turnCover * 0.6, 1 + fx.spread * 0.95 + turnCover)
      aura.rotation.y += (0.003 + fx.spin * 0.05 + fx.spread * 0.018) * this.settings.speed
      aura.rotation.z += (0.0015 + fx.spin * 0.035) * this.settings.speed
      aura.material.opacity = 0.48 + fx.spread * 0.28 + breath * 0.24 + turnCover
      aura.material.size = 0.025 + fx.spread * 0.014 + fx.pulse * 0.01
    }

    if (backGlow) {
      backGlow.scale.setScalar(spreadScale + breath * 0.12)
      backGlow.position.z = -0.36 - fx.spread * 0.5
      backGlow.material.opacity = 0.13 + fx.spread * 0.2 + breath * 0.18
    }

    if (portrait) {
      portrait.material.opacity = (0.94 + breath * 0.04) * frontMix
      portrait.position.x = 0.35 - Math.sign(yaw || 1) * sideMix * 0.14
    }

    if (sideView) {
      sideView.material.opacity = 0.84 * sideMix
      sideView.scale.x = Math.sign(yaw || 1)
      sideView.rotation.y = -Math.sign(yaw || 1) * (0.18 + sideMix * 0.26)
      sideView.position.x = 0.18 + Math.sign(yaw || 1) * 0.16
    }

    if (backView) {
      backView.material.opacity = 0.88 * backMix
      backView.rotation.y = Math.sign(yaw || 1) * 0.08
      backView.position.z = -0.08 - backMix * 0.12
    }

    this.points.scale.set(1 + fx.spread * 0.24, 1 + fx.spread * 0.18, 1 + fx.spread * 0.5)
    this.points.rotation.y += fx.spin * 0.026 * this.settings.speed
    this.material.opacity = visible ? 0.56 + fx.spread * 0.18 + breath * 0.16 : 0.92
    this.material.size = this.settings.size * (visible ? 1 + fx.pulse * 0.45 + fx.spread * 0.22 : 1)
  }

  updateFingerAction(elapsed) {
    this.fingerActionStrength += (this.fingerActionTargetStrength - this.fingerActionStrength) * 0.16
    this.fingerActionTargetStrength *= 0.95
    this.fingerAction = this.fingerActionTarget

    const pulse = Math.sin(elapsed * (2.5 + this.fingerActionStrength * 2)) * 0.5 + 0.5
    const actionScale = 1 + this.fingerActionStrength * 0.1 + pulse * 0.03

    if (this.fingerAction === 'fingers-1') {
      this.points.rotation.z += 0.003
      this.material.opacity = Math.min(0.98, this.material.opacity + 0.004)
    } else if (this.fingerAction === 'fingers-2') {
      this.points.scale.setScalar(actionScale)
    } else if (this.fingerAction === 'fingers-3') {
      this.subjectGroup.rotation.z += 0.002
    } else if (this.fingerAction === 'fingers-4') {
      this.camera.position.z += Math.sin(elapsed * 3.2) * 0.01
    } else if (this.fingerAction === 'fingers-5') {
      this.heroineFigure.rotation.y += 0.004
      this.heroineFx.spreadTarget = Math.max(this.heroineFx.spreadTarget, 0.35)
    }
  }

  animate = () => {
    const elapsed = this.clock.getElapsedTime()
    this.currentZoom += (this.targetZoom - this.currentZoom) * 0.08
    this.camera.position.z = this.currentZoom
    if (!this.paused) {
      this.rotationVelocity.multiplyScalar(this.isDragging ? 0.96 : 0.985)
      this.subjectGroup.rotation.x += this.rotationVelocity.x * this.settings.speed
      this.subjectGroup.rotation.y += this.rotationVelocity.y * this.settings.speed
      this.subjectGroup.rotation.z = Math.sin(elapsed * 0.18) * 0.06
      this.points.rotation.z = Math.sin(elapsed * 0.28) * 0.1
      this.heroineFigure.rotation.y = Math.sin(elapsed * 0.33) * 0.035
      this.heroineFigure.rotation.x = Math.cos(elapsed * 0.25) * 0.018
      this.updateHeroineFx(elapsed)
      this.updateFingerAction(elapsed)
    } else {
      this.rotationVelocity.set(0, 0)
    }

    if (this.transition) {
      const progress = (performance.now() - this.transition.startedAt) / this.transition.duration
      const positions = interpolatePositions(this.transition.from, this.transition.to, progress)
      this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      this.geometry.attributes.position.needsUpdate = true

      if (progress >= 1) {
        this.transition = null
      }
    }

    const position = this.geometry.getAttribute('position')
    if (position && this.disturbance > 0.001) {
      for (let index = 0; index < position.count; index += 7) {
        const offset = Math.sin(elapsed * 3 + index) * this.disturbance * 0.006
        position.array[index * 3] += offset
        position.array[index * 3 + 1] -= offset * 0.6
      }
      position.needsUpdate = true
      this.disturbance *= 0.94
    }

    this.renderer.render(this.scene, this.camera)
    this.animationId = requestAnimationFrame(this.animate)
  }

  start() {
    if (!this.animationId) this.animate()
  }
}
