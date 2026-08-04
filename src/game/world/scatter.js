import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'

const RANGE = 2
const MAX_BUILDINGS = 24
const MAX_TREES = 14

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

const BUILDING_COLORS = ['#8fa3b0', '#a3b3bd', '#7c8f9c', '#b5c2ca', '#93a8b8']

// 지형 위에 도시(빌딩 클러스터)랑 나무를 청크 단위로 뿌림
// 해시 기반 배치라 같은 자리로 돌아와도 똑같은 도시가 서 있음
export class ScatterField {
  constructor(scene, { snowy = false } = {}) {
    this.scene = scene
    this.pool = new Map()
    this.dummy = new THREE.Object3D()
    this.color = new THREE.Color()

    this.buildingGeo = new THREE.BoxGeometry(1, 1, 1)
    this.buildingMat = new THREE.MeshLambertMaterial({ flatShading: true })
    this.treeGeo = new THREE.ConeGeometry(2.2, 6, 6)
    this.treeMat = new THREE.MeshLambertMaterial({
      color: snowy ? '#b9cbb9' : '#3e7a44',
      flatShading: true,
    })
  }

  makeEntry() {
    const buildings = new THREE.InstancedMesh(this.buildingGeo, this.buildingMat, MAX_BUILDINGS)
    const trees = new THREE.InstancedMesh(this.treeGeo, this.treeMat, MAX_TREES)
    this.scene.add(buildings, trees)
    return { buildings, trees }
  }

  hideInstance(mesh, index) {
    this.dummy.position.set(0, -200, 0)
    this.dummy.scale.set(0.001, 0.001, 0.001)
    this.dummy.rotation.set(0, 0, 0)
    this.dummy.updateMatrix()
    mesh.setMatrixAt(index, this.dummy.matrix)
  }

  buildChunk(entry, cx, cz) {
    const ox = cx * CHUNK
    const oz = cz * CHUNK

    // 청크 3개 중 1개 꼴로 마을이 생김
    const isTown = hash(cx * 3 + 7, cz * 5 + 11) < 0.32
    const townX = ox + (hash(cx, cz * 2) - 0.5) * CHUNK * 0.5
    const townZ = oz + (hash(cx * 2, cz) - 0.5) * CHUNK * 0.5

    let bi = 0
    if (isTown) {
      const count = 10 + Math.floor(hash(cx + 99, cz + 99) * (MAX_BUILDINGS - 10))
      for (let i = 0; i < count; i++) {
        const r1 = hash(cx * 31 + i, cz * 17 - i)
        const r2 = hash(cx * 13 - i, cz * 41 + i)
        const r3 = hash(cx * 7 + i * 3, cz * 23 + i * 5)
        const wx = townX + (r1 - 0.5) * 95
        const wz = townZ + (r2 - 0.5) * 95
        const ground = terrainHeight(wx, wz)
        if (ground > 24) continue // 산 위엔 안 지음
        const w = 5 + r3 * 7
        const h = 8 + r3 * r1 * 36
        this.dummy.position.set(wx, ground + h / 2 - 0.5, wz)
        this.dummy.scale.set(w, h, 5 + r2 * 7)
        this.dummy.rotation.set(0, r2 * Math.PI, 0)
        this.dummy.updateMatrix()
        entry.buildings.setMatrixAt(bi, this.dummy.matrix)
        entry.buildings.setColorAt(
          bi,
          this.color.set(BUILDING_COLORS[Math.floor(r3 * BUILDING_COLORS.length)]),
        )
        bi++
      }
    }
    for (let i = bi; i < MAX_BUILDINGS; i++) this.hideInstance(entry.buildings, i)
    entry.buildings.instanceMatrix.needsUpdate = true
    if (entry.buildings.instanceColor) entry.buildings.instanceColor.needsUpdate = true

    let ti = 0
    for (let i = 0; i < MAX_TREES; i++) {
      const r1 = hash(cx * 53 + i * 7, cz * 29 - i * 3)
      const r2 = hash(cx * 19 - i * 11, cz * 61 + i)
      if (r1 < 0.25) continue // 듬성듬성
      const wx = ox + (r1 - 0.5) * CHUNK * 0.94
      const wz = oz + (r2 - 0.5) * CHUNK * 0.94
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

  update(px, pz) {
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
      this.scene.remove(entry.buildings, entry.trees)
      entry.buildings.dispose()
      entry.trees.dispose()
    }
    this.pool.clear()
    this.buildingGeo.dispose()
    this.buildingMat.dispose()
    this.treeGeo.dispose()
    this.treeMat.dispose()
  }
}
