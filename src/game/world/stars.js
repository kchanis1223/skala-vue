import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'

const RANGE = 2
const PER_CHUNK = 6

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

// 도시 상공에 뿌려진 별들. 떨어지기 전에 최대한 모으는게 게임 목표
// 배치는 해시 기반이라 같은 도시에선 같은 자리에 뜸
export class StarField {
  constructor(scene, city, seed = 0) {
    this.scene = scene
    this.city = city
    this.seed = seed
    this.geo = new THREE.OctahedronGeometry(1.7)
    // 조명 영향 없이 반짝여 보이게 Basic
    this.mat = new THREE.MeshBasicMaterial({ color: '#ffd54a' })
    this.pool = new Map()
    this.free = []
    this.collected = new Set()
    this.dummy = new THREE.Object3D()
  }

  makeEntry() {
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, PER_CHUNK)
    mesh.frustumCulled = false
    this.scene.add(mesh)
    return { mesh, stars: [] }
  }

  buildChunk(entry, cx, cz) {
    entry.stars = []
    for (let i = 0; i < PER_CHUNK; i++) {
      const r1 = hash(cx * 31 + i * 7 + this.seed, cz * 17 - i * 3)
      const r2 = hash(cx * 13 - i * 11, cz * 41 + i * 5 + this.seed)
      const r3 = hash(cx * 7 + i * 13, cz * 23 - i * 9 - this.seed)
      const x = cx * CHUNK + (r1 - 0.5) * CHUNK * 0.94
      const z = cz * CHUNK + (r2 - 0.5) * CHUNK * 0.94
      let y = terrainHeight(x, z) + 12 + r3 * 130
      // 건물 속에 박히면 지붕 위로 올림
      let guard = 0
      while (this.city.collides(x, y, z) && guard < 50) {
        y += 4
        guard++
      }
      entry.stars.push({ x, y, z, id: `${cx},${cz},${i}`, phase: r1 * Math.PI * 2 })
    }
  }

  update(px, pz, time) {
    const ccx = Math.round(px / CHUNK)
    const ccz = Math.round(pz / CHUNK)
    const needed = new Set()
    for (let dx = -RANGE; dx <= RANGE; dx++) {
      for (let dz = -RANGE; dz <= RANGE; dz++) {
        needed.add(`${ccx + dx},${ccz + dz}`)
      }
    }
    for (const [key, entry] of this.pool) {
      if (!needed.has(key)) {
        this.pool.delete(key)
        this.free.push(entry)
      }
    }
    for (const key of needed) {
      if (this.pool.has(key)) continue
      const [cx, cz] = key.split(',').map(Number)
      const entry = this.free.pop() ?? this.makeEntry()
      this.buildChunk(entry, cx, cz)
      this.pool.set(key, entry)
    }

    // 뱅글뱅글 돌면서 둥실거림
    for (const entry of this.pool.values()) {
      for (let i = 0; i < entry.stars.length; i++) {
        const star = entry.stars[i]
        if (this.collected.has(star.id)) {
          this.dummy.position.set(0, -500, 0)
          this.dummy.scale.set(0.001, 0.001, 0.001)
          this.dummy.rotation.set(0, 0, 0)
        } else {
          this.dummy.position.set(star.x, star.y + Math.sin(time * 2 + star.phase) * 0.9, star.z)
          this.dummy.scale.set(1, 1.4, 1)
          this.dummy.rotation.set(0, time * 1.8 + star.phase, 0)
        }
        this.dummy.updateMatrix()
        entry.mesh.setMatrixAt(i, this.dummy.matrix)
      }
      entry.mesh.instanceMatrix.needsUpdate = true
    }
  }

  // 기체 근처 별 수집. 이번 프레임에 주운 개수 반환
  tryCollect(pos, radius = 5) {
    let got = 0
    for (const entry of this.pool.values()) {
      for (const star of entry.stars) {
        if (this.collected.has(star.id)) continue
        const d = Math.hypot(star.x - pos.x, star.y - pos.y, star.z - pos.z)
        if (d < radius) {
          this.collected.add(star.id)
          got++
        }
      }
    }
    return got
  }

  dispose() {
    for (const entry of [...this.pool.values(), ...this.free]) {
      this.scene.remove(entry.mesh)
      entry.mesh.dispose()
    }
    this.pool.clear()
    this.free = []
    this.geo.dispose()
    this.mat.dispose()
  }
}
