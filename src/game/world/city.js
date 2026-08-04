import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'
import { BLOCK, ROAD_W, blockIndex, blockType, blockSeed, districtLevel } from './cityLayout'

const RANGE = 2
const MAX_BUILDINGS = 40
const MAX_TREES = 16
const MAX_TOWERS = 10
const LAUNCH_HALF = 14 // 발사 타워 반폭

const TINTS = ['#ffffff', '#dfe7ee', '#cdd8e3', '#e8e2d5', '#f2f5f8']

// 창문 격자 텍스처를 캔버스로 그림. 밤이면 불 켜진 창이 많아짐
const makeWindowTexture = (isNight) => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const g = canvas.getContext('2d')
  g.fillStyle = '#3a4750'
  g.fillRect(0, 0, 64, 128)
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = Math.random() < (isNight ? 0.55 : 0.22)
      g.fillStyle = lit ? (isNight ? '#ffd97a' : '#cfe3ee') : '#2a333a'
      g.fillRect(4 + col * 12, 6 + row * 10, 8, 6)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 맵 전체가 이어진 도시. 격자 블록마다 건물이 서고 건물과 부딪히면 추락임
// 시작 지점엔 발사 타워(초고층)가 있고 비행기는 그 옥상에서 출발
export class CityField {
  constructor(scene, { snowy = false, isNight = false } = {}) {
    this.scene = scene
    this.pool = new Map()
    this.dummy = new THREE.Object3D()
    this.color = new THREE.Color()

    const windowTex = makeWindowTexture(isNight)
    this.windowTex = windowTex
    const windowMat = new THREE.MeshLambertMaterial({
      map: windowTex,
      emissive: '#ffcf70',
      emissiveMap: windowTex,
      emissiveIntensity: isNight ? 0.85 : 0,
    })
    const roofMat = new THREE.MeshLambertMaterial({ color: '#606b74' })
    this.buildingMats = [windowMat, windowMat, roofMat, roofMat, windowMat, windowMat]

    this.buildingGeo = new THREE.BoxGeometry(1, 1, 1)
    this.treeGeo = new THREE.ConeGeometry(2.2, 6, 6)
    this.treeMat = new THREE.MeshLambertMaterial({
      color: snowy ? '#b9cbb9' : '#3e7a44',
      flatShading: true,
    })
    this.antennaGeo = new THREE.CylinderGeometry(0.18, 0.28, 7, 5)
    this.antennaMat = new THREE.MeshLambertMaterial({ color: '#37474f' })
    this.lightGeo = new THREE.SphereGeometry(0.55, 6, 6)
    this.lightMat = new THREE.MeshBasicMaterial({
      color: '#ff3b30',
      transparent: true,
      opacity: 0.9,
    })

    // 발사 타워: 도시에서 제일 높은 초고층. 옥상이 이륙장
    const ground0 = terrainHeight(0, 0)
    this.launchTop = ground0 + 200
    const towerMesh = new THREE.Mesh(this.buildingGeo, this.buildingMats)
    towerMesh.scale.set(LAUNCH_HALF * 2, 200, LAUNCH_HALF * 2)
    towerMesh.position.set(0, ground0 + 100, 0)
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(LAUNCH_HALF * 2 + 2, 1, LAUNCH_HALF * 2 + 2),
      new THREE.MeshLambertMaterial({ color: '#39424a' }),
    )
    pad.position.set(0, this.launchTop + 0.5, 0)
    this.launchGroup = new THREE.Group()
    this.launchGroup.add(towerMesh, pad)
    scene.add(this.launchGroup)
  }

  makeEntry() {
    const buildings = new THREE.InstancedMesh(this.buildingGeo, this.buildingMats, MAX_BUILDINGS)
    const trees = new THREE.InstancedMesh(this.treeGeo, this.treeMat, MAX_TREES)
    const antennas = new THREE.InstancedMesh(this.antennaGeo, this.antennaMat, MAX_TOWERS)
    const lights = new THREE.InstancedMesh(this.lightGeo, this.lightMat, MAX_TOWERS)
    this.scene.add(buildings, trees, antennas, lights)
    return { buildings, trees, antennas, lights, boxes: [] }
  }

  hideInstance(mesh, index) {
    this.dummy.position.set(0, -400, 0)
    this.dummy.scale.set(0.001, 0.001, 0.001)
    this.dummy.rotation.set(0, 0, 0)
    this.dummy.updateMatrix()
    mesh.setMatrixAt(index, this.dummy.matrix)
  }

  buildChunk(entry, cx, cz) {
    const ox = cx * CHUNK
    const oz = cz * CHUNK
    const half = CHUNK / 2
    entry.boxes = []

    let bi = 0
    let towerIdx = 0
    let ti = 0

    // 이 청크 범위에 중심이 들어오는 블록들만 담당 (청크끼리 중복 안 생기게)
    const bx0 = blockIndex(ox - half)
    const bx1 = blockIndex(ox + half)
    const bz0 = blockIndex(oz - half)
    const bz1 = blockIndex(oz + half)

    for (let bx = bx0; bx <= bx1; bx++) {
      for (let bz = bz0; bz <= bz1; bz++) {
        const centerX = bx * BLOCK + ROAD_W + (BLOCK - ROAD_W) / 2
        const centerZ = bz * BLOCK + ROAD_W + (BLOCK - ROAD_W) / 2
        if (centerX < ox - half || centerX >= ox + half) continue
        if (centerZ < oz - half || centerZ >= oz + half) continue
        // 발사 타워 주변 블록은 비워둠
        if (Math.hypot(centerX, centerZ) < 55) continue

        const type = blockType(bx, bz)
        const ground = terrainHeight(centerX, centerZ)

        if (type === 'park') {
          // 공원: 나무 몇 그루
          for (let t = 0; t < 5 && ti < MAX_TREES; t++) {
            const r1 = blockSeed(bx, bz, t + 2)
            const r2 = blockSeed(bx, bz, t + 9)
            const wx = centerX + (r1 - 0.5) * (BLOCK - ROAD_W - 6)
            const wz = centerZ + (r2 - 0.5) * (BLOCK - ROAD_W - 6)
            const sc = 0.8 + r2 * 1.1
            this.dummy.position.set(wx, terrainHeight(wx, wz) + 3 * sc, wz)
            this.dummy.scale.set(sc, sc, sc)
            this.dummy.rotation.set(0, 0, 0)
            this.dummy.updateMatrix()
            entry.trees.setMatrixAt(ti, this.dummy.matrix)
            ti++
          }
          continue
        }
        if (type === 'plaza' || bi >= MAX_BUILDINGS) continue

        const r1 = blockSeed(bx, bz)
        const r2 = blockSeed(bx, bz, 1)
        // 고층지구일수록 마천루. 외곽은 저층
        const district = districtLevel(centerX, centerZ)
        const h = 10 + district * district * 165 * (0.45 + r1 * 0.55)
        const w = 16 + r1 * 13
        const d = 16 + r2 * 13
        this.dummy.position.set(centerX, ground + h / 2 - 0.5, centerZ)
        this.dummy.scale.set(w, h, d)
        this.dummy.rotation.set(0, 0, 0)
        this.dummy.updateMatrix()
        entry.buildings.setMatrixAt(bi, this.dummy.matrix)
        entry.buildings.setColorAt(bi, this.color.set(TINTS[Math.floor(r2 * TINTS.length)]))
        bi++
        entry.boxes.push({ x: centerX, z: centerZ, hw: w / 2, hd: d / 2, top: ground + h })

        // 높은 타워엔 안테나 + 빨간 경고등
        if (h > 60 && towerIdx < MAX_TOWERS) {
          const roofY = ground + h - 0.5
          this.dummy.position.set(centerX, roofY + 3.5, centerZ)
          this.dummy.scale.set(1, 1, 1)
          this.dummy.updateMatrix()
          entry.antennas.setMatrixAt(towerIdx, this.dummy.matrix)
          this.dummy.position.set(centerX, roofY + 7.2, centerZ)
          this.dummy.updateMatrix()
          entry.lights.setMatrixAt(towerIdx, this.dummy.matrix)
          towerIdx++
        }
      }
    }

    for (let i = bi; i < MAX_BUILDINGS; i++) this.hideInstance(entry.buildings, i)
    for (let i = ti; i < MAX_TREES; i++) this.hideInstance(entry.trees, i)
    for (let i = towerIdx; i < MAX_TOWERS; i++) {
      this.hideInstance(entry.antennas, i)
      this.hideInstance(entry.lights, i)
    }
    entry.buildings.instanceMatrix.needsUpdate = true
    if (entry.buildings.instanceColor) entry.buildings.instanceColor.needsUpdate = true
    entry.trees.instanceMatrix.needsUpdate = true
    entry.antennas.instanceMatrix.needsUpdate = true
    entry.lights.instanceMatrix.needsUpdate = true
  }

  // 건물이나 발사 타워에 박았는지 (기체 반경 약간 포함)
  collides(x, y, z) {
    if (
      y < this.launchTop + 1 &&
      Math.abs(x) < LAUNCH_HALF + 1.5 &&
      Math.abs(z) < LAUNCH_HALF + 1.5
    )
      return true

    const ccx = Math.round(x / CHUNK)
    const ccz = Math.round(z / CHUNK)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const entry = this.pool.get(`${ccx + dx},${ccz + dz}`)
        if (!entry) continue
        for (const b of entry.boxes) {
          if (y < b.top + 0.5 && Math.abs(x - b.x) < b.hw + 1.5 && Math.abs(z - b.z) < b.hd + 1.5) {
            return true
          }
        }
      }
    }
    return false
  }

  update(px, pz, time = 0) {
    // 항공 장애등 깜빡임
    this.lightMat.opacity = 0.35 + 0.65 * Math.abs(Math.sin(time * 2.4))

    const ccx = Math.round(px / CHUNK)
    const ccz = Math.round(pz / CHUNK)
    const needed = new Set()
    for (let dx = -RANGE; dx <= RANGE; dx++) {
      for (let dz = -RANGE; dz <= RANGE; dz++) {
        needed.add(`${ccx + dx},${ccz + dz}`)
      }
    }
    const free = []
    for (const [key, entry] of this.pool) {
      if (!needed.has(key)) {
        this.pool.delete(key)
        free.push(entry)
      }
    }
    for (const key of needed) {
      if (this.pool.has(key)) continue
      const [cx, cz] = key.split(',').map(Number)
      const entry = free.pop() ?? this.makeEntry()
      this.buildChunk(entry, cx, cz)
      this.pool.set(key, entry)
    }
  }

  dispose() {
    for (const entry of this.pool.values()) {
      this.scene.remove(entry.buildings, entry.trees, entry.antennas, entry.lights)
      entry.buildings.dispose()
      entry.trees.dispose()
      entry.antennas.dispose()
      entry.lights.dispose()
    }
    this.pool.clear()
    this.scene.remove(this.launchGroup)
    this.launchGroup.children.forEach((obj) => {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) return // 공용 재질은 아래서 정리
      obj.material?.dispose()
    })
    this.buildingGeo.dispose()
    this.buildingMats.forEach((m) => m.dispose())
    this.windowTex.dispose()
    this.treeGeo.dispose()
    this.treeMat.dispose()
    this.antennaGeo.dispose()
    this.antennaMat.dispose()
    this.lightGeo.dispose()
    this.lightMat.dispose()
  }
}
