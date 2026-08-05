import * as THREE from 'three'
import { createFlightState, stepFlight, applyHitPenalty } from './physics'
import { createInput } from './input'
import { TerrainManager, terrainHeight, setTerrainStyle, MAP_BOUND } from './world/terrain'
import { setupSky } from './world/sky'
import { Precipitation } from './world/particles'
import { WindStreaks, CrossGusts } from './world/streaks'
import { WingtipTrails } from './world/trails'
import { CityField } from './world/city'
import { CarField } from './world/cars'
import { CrystalField } from './world/crystals'
import { Landmarks } from './world/landmarks'
import { ObstacleField } from './world/obstacles'

// 종이비행기 모양을 삼각형 몇 개로 직접 만듦. 날개폭 3.3m쯤 되는 진짜 종이비행기 스케일
const buildGlider = () => {
  const geo = new THREE.BufferGeometry()
  // 기수 / 좌우 날개끝 / 꼬리 접힘부
  const v = new Float32Array([
    // 왼쪽 날개
    0, 0, -1.8, -1.66, 0.29, 1.08, 0, 0.11, 0.86,
    // 오른쪽 날개
    0, 0, -1.8, 0, 0.11, 0.86, 1.66, 0.29, 1.08,
    // 아래 접힌 몸통
    0, 0, -1.8, 0, -0.4, 1.08, 0, 0.11, 0.86,
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
  constructor(canvas, params, { onTick, onEnd, onHit, onStar, onProgress, onReady } = {}) {
    this.canvas = canvas
    this.params = params
    this.onTick = onTick
    this.onEnd = onEnd
    this.onHit = onHit
    this.onStar = onStar
    this.onProgress = onProgress
    this.onReady = onReady
    this.running = false
    this.finished = false
    this.hitCooldown = 0
    this.tickTimer = 0

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(66, 1, 0.1, 2000)

    // 지형 함수가 도시 스타일(언덕/해안/강)을 알아야 해서 제일 먼저 세팅
    setTerrainStyle(params.style)

    this.sky = setupSky(this.scene, { theme: params.theme, isNight: params.isNight })
    // 모스크바처럼 날씨와 무관하게 늘 눈 덮인 도시도 있음
    const snowy = params.theme === 'snow' || !!params.style?.alwaysSnowy
    this.terrain = new TerrainManager(this.scene, {
      snowy,
      style: params.style,
      anisotropy: this.renderer.capabilities.getMaxAnisotropy(),
    })
    this.city = new CityField(this.scene, {
      style: params.style,
      snowy,
      isNight: params.isNight,
    })
    this.cars = new CarField(this.scene, params.style)
    this.landmarks = new Landmarks(this.scene, params.style, { isNight: params.isNight })
    this.crystalField = new CrystalField(this.scene, this.city, params.style)

    // 발사 타워 옥상에서 출발. 타워를 바로 벗어나게 살짝 앞에서 시작
    this.state = createFlightState(this.city.launchTop + 5)
    this.state.pos.z = -20
    this.input = createInput()

    // 시작부터 기체 뒤에 카메라 배치 (안 그러면 건물 속에서 시작함)
    this.camera.position.set(0, this.state.pos.y + 2.6, this.state.pos.z + 8)

    this.obstacles = new ObstacleField(this.scene)
    this.precip =
      params.precip > 0
        ? new Precipitation(this.scene, { type: params.precipType, intensity: params.precip })
        : null
    this.streaks = new WindStreaks(this.scene)
    this.trails = new WingtipTrails(this.scene)
    this.gusts = new CrossGusts(this.scene)

    this.glider = buildGlider()
    this.scene.add(this.glider)

    // 비행 경계를 알려주는 은은한 빛의 벽 4면
    const wallGeo = new THREE.PlaneGeometry(MAP_BOUND * 2, 320)
    const wallMat = new THREE.MeshBasicMaterial({
      color: '#7fd8ff',
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.walls = new THREE.Group()
    const wallDefs = [
      [0, -MAP_BOUND, 0],
      [0, MAP_BOUND, 0],
      [-MAP_BOUND, 0, Math.PI / 2],
      [MAP_BOUND, 0, Math.PI / 2],
    ]
    for (const [wx, wz, rot] of wallDefs) {
      const wall = new THREE.Mesh(wallGeo, wallMat)
      wall.position.set(wx, 140, wz)
      wall.rotation.y = rot
      this.walls.add(wall)
    }
    this.scene.add(this.walls)
    this.wallGeo = wallGeo
    this.wallMat = wallMat

    this.clock = new THREE.Clock()
    this.resize = this.resize.bind(this)
    this.loop = this.loop.bind(this)
    this.warmup = this.warmup.bind(this)
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
    // 바로 날리지 않고 맵을 다 만든 다음 비행 시작 (그동안 로딩창)
    this.warmup()
  }

  // 지형 → 도시 → 크리스탈 순으로 프레임마다 조금씩 생성.
  // 도중에도 렌더해서 로딩창 뒤로 도시가 깔리는 게 보임
  warmup() {
    if (!this.running) return
    if (this.terrain.remaining > 0) {
      this.terrain.update(6)
    } else if (!this.city.built) {
      this.city.buildStep(5)
    } else {
      this.crystalField.update(this.state.pos.x, this.state.pos.z, 0)
      this.renderer.render(this.scene, this.camera)
      this.onProgress?.(1)
      this.onReady?.()
      this.clock.start()
      this.loop()
      return
    }
    const total = this.terrain.total + this.city.total
    this.onProgress?.((total - this.terrain.remaining - this.city.remaining) / (total + 1))
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.warmup)
  }

  loop() {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.loop)

    const dt = Math.min(this.clock.getDelta(), 0.033)
    const s = this.state

    stepFlight(s, this.input, { wind: this.params.wind, precip: this.params.precip }, dt)

    // 경계 밖으로는 못 나감 (벽 따라 미끄러짐)
    s.pos.x = THREE.MathUtils.clamp(s.pos.x, -MAP_BOUND, MAP_BOUND)
    s.pos.z = THREE.MathUtils.clamp(s.pos.z, -MAP_BOUND, MAP_BOUND)

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
      Math.min(Math.abs(s.crosswind ?? 0) * 0.1, 0.9) * (0.85 + 0.15 * Math.sin(s.time * 2.2))
    this.glider.position.set(s.pos.x, s.pos.y + lift, s.pos.z)
    // 순풍이면 기수가 살짝 들리고 역풍이면 눌림
    const windPitch = THREE.MathUtils.clamp((s.alongWind ?? 0) * 0.012, -0.1, 0.1)
    this.glider.rotation.set(s.pitch + windPitch, s.yaw, s.roll)

    // 카메라는 기체 뒤에 바짝 붙어서 따라감 (종이비행기 시점)
    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const camTarget = new THREE.Vector3(s.pos.x - fx * 8, s.pos.y + 2.6, s.pos.z - fz * 8)
    this.camera.position.lerp(camTarget, Math.min(dt * 4.5, 1))
    this.camera.lookAt(s.pos.x + fx * 10, s.pos.y, s.pos.z + fz * 10)

    // 속도 붙으면 화각이 넓어지면서 빨라지는 느낌 남
    const targetFov = 66 + THREE.MathUtils.clamp((s.speed - 8) / 20, 0, 1) * 12
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(dt * 3, 1)
    this.camera.updateProjectionMatrix()

    this.terrain.update(s.pos.x, s.pos.z)
    this.city.update(s.pos.x, s.pos.z, s.time)
    this.cars.update(s.pos, dt)
    this.crystalField.update(s.pos.x, s.pos.z, s.time)

    // 크리스탈 줍기 (점수 합산)
    const got = this.crystalField.tryCollect(s.pos)
    if (got > 0) {
      s.stars += got
      this.onStar?.(s.stars)
    }
    this.precip?.update(s.pos, dt)

    // 기류 선: 기체의 지면 속도를 넘겨서 상대 기류를 그림
    const horiz = s.speed * Math.cos(s.pitch)
    this.streaks.update(
      s.pos,
      this.params.wind,
      { x: fx * horiz + this.params.wind.x, y: s.vy, z: fz * horiz + this.params.wind.z },
      dt,
    )

    // 날개끝 궤적: 속도가 지배적으로 반영되고 선회는 살짝만 보탬
    const speedFactor = THREE.MathUtils.clamp((s.speed - 6) / 18, 0, 1)
    const trailIntensity = Math.min(speedFactor + Math.abs(s.roll) * 0.25, 1)
    this.trails.update(this.glider, this.camera.position, trailIntensity)
    this.gusts.update(
      this.glider.position,
      this.params.wind,
      s.crosswind ?? 0,
      this.camera.position,
      dt,
    )

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
        stars: s.stars,
        // 나침반 방위 (0=북). yaw는 반시계라서 부호 뒤집음
        heading: ((((-s.yaw * 180) / Math.PI) % 360) + 360) % 360,
      })
    }

    // 건물에 박으면 추락, 땅에 닿으면 착륙. 둘 다 게임 끝
    if (!this.finished) {
      const ground = terrainHeight(s.pos.x, s.pos.z)
      const crashed =
        this.city.collides(s.pos.x, s.pos.y, s.pos.z) ||
        this.landmarks.collides(s.pos.x, s.pos.y, s.pos.z)
      if (crashed || s.pos.y <= ground + 0.8) {
        this.finished = true
        this.running = false
        this.onEnd?.({
          distance: Math.round(s.distance),
          duration: Math.round(s.time * 10) / 10,
          hits: s.hits,
          stars: s.stars,
          crashed,
        })
      }
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
    this.city.dispose()
    this.cars.dispose()
    this.landmarks.dispose()
    this.crystalField.dispose()
    this.scene.remove(this.walls)
    this.wallGeo.dispose()
    this.wallMat.dispose()
    this.glider.traverse((obj) => {
      obj.geometry?.dispose()
      obj.material?.dispose()
    })
    this.renderer.dispose()
  }
}
