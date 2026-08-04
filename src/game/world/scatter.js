import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'

const RANGE = 2
const MAX_BUILDINGS = 26
const MAX_TREES = 14
const MAX_TOWERS = 8 // 안테나/경고등 달리는 고층 수

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

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

// 지형 위에 다운타운(격자 블록 마천루)이랑 나무를 청크 단위로 뿌림
// 해시 기반 배치라 같은 자리로 돌아와도 똑같은 도시가 서 있음
export class ScatterField {
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
    // 박스 면 순서: +x -x +y(지붕) -y 순이라 옆면만 창문 텍스처
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
    // 항공 장애등. 깜빡임은 update에서 opacity로
    this.lightMat = new THREE.MeshBasicMaterial({
      color: '#ff3b30',
      transparent: true,
      opacity: 0.9,
    })
  }

  makeEntry() {
    const buildings = new THREE.InstancedMesh(this.buildingGeo, this.buildingMats, MAX_BUILDINGS)
    const trees = new THREE.InstancedMesh(this.treeGeo, this.treeMat, MAX_TREES)
    const antennas = new THREE.InstancedMesh(this.antennaGeo, this.antennaMat, MAX_TOWERS)
    const lights = new THREE.InstancedMesh(this.lightGeo, this.lightMat, MAX_TOWERS)
    this.scene.add(buildings, trees, antennas, lights)
    return { buildings, trees, antennas, lights }
  }

  hideInstance(mesh, index) {
    this.dummy.position.set(0, -300, 0)
    this.dummy.scale.set(0.001, 0.001, 0.001)
    this.dummy.rotation.set(0, 0, 0)
    this.dummy.updateMatrix()
    mesh.setMatrixAt(index, this.dummy.matrix)
  }

  buildChunk(entry, cx, cz) {
    const ox = cx * CHUNK
    const oz = cz * CHUNK

    const isTown = hash(cx * 3 + 7, cz * 5 + 11) < 0.34
    const townX = ox + (hash(cx, cz * 2) - 0.5) * CHUNK * 0.4
    const townZ = oz + (hash(cx * 2, cz) - 0.5) * CHUNK * 0.4

    let bi = 0
    let towerIdx = 0
    if (isTown) {
      // 5x5 블록 격자. 가운데일수록 마천루, 가장자리는 낮은 건물
      const CELL = 24
      for (let gx = -2; gx <= 2; gx++) {
        for (let gz = -2; gz <= 2; gz++) {
          const r1 = hash(cx * 31 + gx * 7 + gz, cz * 17 - gz * 5 + gx)
          const r2 = hash(cx * 13 - gx * 3 + gz * 9, cz * 41 + gx * 11 - gz)
          if (r1 < 0.24 || bi >= MAX_BUILDINGS) continue // 빈 블록(공터/도로)

          const wx = townX + gx * CELL + (r2 - 0.5) * 5
          const wz = townZ + gz * CELL + (r1 - 0.5) * 5
          const ground = terrainHeight(wx, wz)
          if (ground > 24) continue

          // 중심부 프리미엄: 가운데 블록일수록 높이 뻥튀기
          const centerness = 1 - Math.hypot(gx, gz) / 3
          const h = 10 + centerness * centerness * 80 * (0.4 + r2 * 0.6)
          const w = 9 + r1 * 8
          const d = 9 + r2 * 8
          this.dummy.position.set(wx, ground + h / 2 - 0.5, wz)
          this.dummy.scale.set(w, h, d)
          this.dummy.rotation.set(0, 0, 0)
          this.dummy.updateMatrix()
          entry.buildings.setMatrixAt(bi, this.dummy.matrix)
          entry.buildings.setColorAt(bi, this.color.set(TINTS[Math.floor(r1 * TINTS.length)]))
          bi++

          // 높은 타워엔 안테나 + 빨간 경고등
          if (h > 45 && towerIdx < MAX_TOWERS) {
            const roofY = ground + h - 0.5
            this.dummy.position.set(wx, roofY + 3.5, wz)
            this.dummy.scale.set(1, 1, 1)
            this.dummy.updateMatrix()
            entry.antennas.setMatrixAt(towerIdx, this.dummy.matrix)
            this.dummy.position.set(wx, roofY + 7.2, wz)
            this.dummy.updateMatrix()
            entry.lights.setMatrixAt(towerIdx, this.dummy.matrix)
            towerIdx++
          }
        }
      }
    }
    for (let i = bi; i < MAX_BUILDINGS; i++) this.hideInstance(entry.buildings, i)
    for (let i = towerIdx; i < MAX_TOWERS; i++) {
      this.hideInstance(entry.antennas, i)
      this.hideInstance(entry.lights, i)
    }
    entry.buildings.instanceMatrix.needsUpdate = true
    if (entry.buildings.instanceColor) entry.buildings.instanceColor.needsUpdate = true
    entry.antennas.instanceMatrix.needsUpdate = true
    entry.lights.instanceMatrix.needsUpdate = true

    let ti = 0
    for (let i = 0; i < MAX_TREES; i++) {
      const r1 = hash(cx * 53 + i * 7, cz * 29 - i * 3)
      const r2 = hash(cx * 19 - i * 11, cz * 61 + i)
      if (r1 < 0.25) continue // 듬성듬성
      const wx = ox + (r1 - 0.5) * CHUNK * 0.94
      const wz = oz + (r2 - 0.5) * CHUNK * 0.94
      // 도심 한복판엔 나무 안 심음
      if (isTown && Math.hypot(wx - townX, wz - townZ) < 70) continue
      const ground = terrainHeight(wx, wz)
      if (ground > 22) continue
      const sc = 0.7 + r2 * 1.2
      this.dummy.position.set(wx, ground + 3 * sc, wz)
      this.dummy.scale.set(sc, sc, sc)
      this.dummy.rotation.set(0, 0, 0)
      this.dummy.updateMatrix()
      entry.trees.setMatrixAt(ti, this.dummy.matrix)
      ti++
    }
    for (let i = ti; i < MAX_TREES; i++) this.hideInstance(entry.trees, i)
    entry.trees.instanceMatrix.needsUpdate = true
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
