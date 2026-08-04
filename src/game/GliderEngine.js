import * as THREE from 'three'
import { createFlightState, stepFlight, applyHitPenalty } from './physics'
import { createInput } from './input'
import { TerrainManager, terrainHeight } from './world/terrain'
import { setupSky } from './world/sky'
import { Precipitation } from './world/particles'
import { WindStreaks, CrossGusts } from './world/streaks'
import { WingtipTrails } from './world/trails'
import { WindRibbons } from './world/windRibbons'
import { ObstacleField } from './world/obstacles'

// 종이비행기 모양을 삼각형 몇 개로 직접 만듦
const buildGlider = () => {
  const geo = new THREE.BufferGeometry()
  // 기수 / 좌우 날개끝 / 꼬리 접힘부
  const v = new Float32Array([
    // 왼쪽 날개
    0, 0, -5, -4.6, 0.8, 3, 0, 0.3, 2.4,
    // 오른쪽 날개
    0, 0, -5, 0, 0.3, 2.4, 4.6, 0.8, 3,
    // 아래 접힌 몸통
    0, 0, -5, 0, -1.1, 3, 0, 0.3, 2.4,
  ])
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3))
  geo.computeVertexNormals()
  const mat = new THREE.MeshLambertMaterial({
    color: '#f5f5f5',
    side: THREE.DoubleSide,
    flatShading: true,
  })
  const mesh = new THREE.Mesh(geo, mat)
  const group = new THREE.Group()
  group.add(mesh)
  group.rotation.order = 'YXZ'
  return group
}

export class GliderEngine {
  constructor(canvas, params, { onTick, onEnd, onHit } = {}) {
    this.canvas = canvas
    this.params = params
    this.onTick = onTick
    this.onEnd = onEnd
    this.onHit = onHit
    this.running = false
    this.finished = false
    this.hitCooldown = 0
    this.tickTimer = 0

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.1, 2000)

    this.state = createFlightState(130)
    this.input = createInput()

    // 시작부터 기체 뒤에 카메라 배치 (안 그러면 지형 속에서 시작함)
    this.camera.position.set(0, this.state.pos.y + 7, 20)

    this.sky = setupSky(this.scene, { theme: params.theme, isNight: params.isNight })
    this.terrain = new TerrainManager(this.scene, { snowy: params.theme === 'snow' })
    this.obstacles = new ObstacleField(this.scene)
    this.precip =
      params.precip > 0
        ? new Precipitation(this.scene, { type: params.precipType, intensity: params.precip })
        : null
    this.streaks = new WindStreaks(this.scene)
    this.trails = new WingtipTrails(this.scene)
    this.gusts = new CrossGusts(this.scene)
    this.windRibbons = new WindRibbons(this.scene)

    this.glider = buildGlider()
    this.scene.add(this.glider)

    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
  }

  resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  start() {
    this.input.attach()
    window.addEventListener('resize', this.resize)
    this.resize()
    this.running = true
    this.clock.start()
    this.loop()
  }

  loop() {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)

    const dt = Math.min(this.clock.getDelta(), 0.033)
    const s = this.state

    stepFlight(s, this.input, { wind: this.params.wind, precip: this.params.precip }, dt)

    // 장애물 충돌 (맞은 직후엔 잠깐 무적)
    this.hitCooldown = Math.max(this.hitCooldown - dt, 0)
    const collided = this.obstacles.update(s, dt)
    if (collided && this.hitCooldown === 0) {
      applyHitPenalty(s)
      this.hitCooldown = 1.2
      this.onHit?.()
    }

    // 기체 위치/자세 반영. 측풍 세기만큼 살짝 떠오르는 부유감 추가
    const lift =
      Math.min(Math.abs(s.crosswind ?? 0) * 0.14, 1.3) * (0.85 + 0.15 * Math.sin(s.time * 2.2))
    this.glider.position.set(s.pos.x, s.pos.y + lift, s.pos.z)
    // 순풍이면 기수가 살짝 들리고 역풍이면 눌림
    const windPitch = THREE.MathUtils.clamp((s.alongWind ?? 0) * 0.012, -0.1, 0.1)
    this.glider.rotation.set(s.pitch + windPitch, s.yaw, s.roll)

    // 카메라는 기체 뒤를 부드럽게 따라감
    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const camTarget = new THREE.Vector3(s.pos.x - fx * 20, s.pos.y + 7, s.pos.z - fz * 20)
    this.camera.position.lerp(camTarget, Math.min(dt * 4, 1))
    this.camera.lookAt(s.pos.x + fx * 18, s.pos.y, s.pos.z + fz * 18)

    // 속도 붙으면 화각이 넓어지면서 빨라지는 느낌 남
    const targetFov = 68 + THREE.MathUtils.clamp((s.speed - 16) / 36, 0, 1) * 14
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(dt * 3, 1)
    this.camera.updateProjectionMatrix()

    this.terrain.update(s.pos.x, s.pos.z)
    this.precip?.update(s.pos, dt)

    // 기류 선: 기체의 지면 속도를 넘겨서 상대 기류를 그림
    const horiz = s.speed * Math.cos(s.pitch)
    this.streaks.update(
      s.pos,
      this.params.wind,
      { x: fx * horiz + this.params.wind.x, y: s.vy, z: fz * horiz + this.params.wind.z },
      dt,
    )

    // 날개끝 궤적: 빠르거나 선회 중일수록 진하게
    const trailIntensity = Math.min(Math.max((s.speed - 10) / 22, 0) + Math.abs(s.roll), 1)
    this.trails.update(this.glider, this.camera.position, trailIntensity)
    this.gusts.update(this.glider.position, this.params.wind, s.crosswind ?? 0, dt)
    this.windRibbons.update(s.pos, this.params.wind, this.camera.position, dt)

    // HUD는 10Hz면 충분
    this.tickTimer += dt
    if (this.tickTimer > 0.1) {
      this.tickTimer = 0
      const ground = terrainHeight(s.pos.x, s.pos.z)
      this.onTick?.({
        altitude: Math.max(Math.round(s.pos.y - ground), 0),
        speed: Math.round(s.speed * 3.6),
        distance: Math.round(s.distance),
        time: s.time,
        hits: s.hits,
        // 나침반 방위 (0=북). yaw는 반시계라서 부호 뒤집음
        heading: ((((-s.yaw * 180) / Math.PI) % 360) + 360) % 360,
      })
    }

    // 착지 판정
    const ground = terrainHeight(s.pos.x, s.pos.z)
    if (s.pos.y <= ground + 1.2 && !this.finished) {
      this.finished = true
      this.running = false
      this.onEnd?.({
        distance: Math.round(s.distance),
        duration: Math.round(s.time * 10) / 10,
        hits: s.hits,
      })
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    window.removeEventListener('resize', this.resize)
    this.sky.dispose()
    this.terrain.dispose()
    this.obstacles.dispose()
    this.precip?.dispose()
    this.streaks.dispose()
    this.trails.dispose()
    this.gusts.dispose()
    this.windRibbons.dispose()
    this.glider.traverse((obj) => {
      obj.geometry?.dispose()
      obj.material?.dispose()
    })
    this.renderer.dispose()
  }
}
