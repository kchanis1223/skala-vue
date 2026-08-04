import * as THREE from 'three'

// 라이브러리 없이 해시 기반 밸류 노이즈로 언덕 높이 만들기
const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

const smooth = (t) => t * t * (3 - 2 * t)

const noise2d = (x, z, scale) => {
  const fx = x / scale
  const fz = z / scale
  const ix = Math.floor(fx)
  const iz = Math.floor(fz)
  const tx = smooth(fx - ix)
  const tz = smooth(fz - iz)
  const a = hash(ix, iz)
  const b = hash(ix + 1, iz)
  const c = hash(ix, iz + 1)
  const d = hash(ix + 1, iz + 1)
  return a + (b - a) * tx + (c - a + (a - b + d - c) * tx) * tz
}

// 지형 높이. 물리 충돌이랑 메쉬가 같은 함수를 써야 안 뚫림
export const terrainHeight = (x, z) => {
  const big = noise2d(x, z, 160) * 26
  const small = noise2d(x + 999, z - 999, 48) * 6
  return big + small
}

export const CHUNK = 220
const SEGS = 22
const RANGE = 2 // 플레이어 주변 5x5 청크 유지

// 청크를 풀로 돌려쓰면서 무한 지형처럼 보이게 함
export class TerrainManager {
  constructor(scene, { lowColor = '#79aa4e', highColor = '#8d6e63', snowy = false } = {}) {
    this.scene = scene
    this.low = new THREE.Color(snowy ? '#dfe8ee' : lowColor)
    this.high = new THREE.Color(snowy ? '#ffffff' : highColor)
    this.pool = new Map() // "cx,cz" -> mesh
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  }

  buildChunk(mesh, cx, cz) {
    const geo = mesh.geometry
    const pos = geo.attributes.position
    const colors = geo.attributes.color
    const ox = cx * CHUNK
    const oz = cz * CHUNK
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox
      const wz = pos.getZ(i) + oz
      const h = terrainHeight(wx, wz)
      pos.setY(i, h)
      tmp.lerpColors(this.low, this.high, Math.min(h / 30, 1))
      colors.setXYZ(i, tmp.r, tmp.g, tmp.b)
    }
    pos.needsUpdate = true
    colors.needsUpdate = true
    geo.computeVertexNormals()
    mesh.position.set(ox, 0, oz)
  }

  makeMesh() {
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, SEGS, SEGS)
    geo.rotateX(-Math.PI / 2)
    geo.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3),
    )
    const mesh = new THREE.Mesh(geo, this.material)
    this.scene.add(mesh)
    return mesh
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
    // 안 쓰는 청크 회수
    const free = []
    for (const [key, mesh] of this.pool) {
      if (!needed.has(key)) {
        this.pool.delete(key)
        free.push(mesh)
      }
    }
    // 새로 필요한 자리 채우기
    for (const key of needed) {
      if (this.pool.has(key)) continue
      const [cx, cz] = key.split(',').map(Number)
      const mesh = free.pop() ?? this.makeMesh()
      this.buildChunk(mesh, cx, cz)
      this.pool.set(key, mesh)
    }
  }

  dispose() {
    for (const mesh of this.pool.values()) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
    }
    this.material.dispose()
    this.pool.clear()
  }
}
