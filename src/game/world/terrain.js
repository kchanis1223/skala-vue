import * as THREE from 'three'
import {
  groundKind,
  toLogical,
  seaStartX,
  inRiver,
  riverCenterX,
  RIVER_HALF,
  lotShade,
} from './cityLayout'

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

// 지형은 도시 스타일(시드/해안/강)에 따라 달라져서 비행 시작 때 세팅해줌
let activeStyle = null
export const setTerrainStyle = (style) => {
  activeStyle = style
}

// 지형 높이. 완만한 언덕 위에 도시가 얹혀 있음
// 물리 충돌이랑 메쉬가 같은 함수를 써야 안 뚫림
export const terrainHeight = (x, z) => {
  const seed = activeStyle?.seed ?? 0
  let h = noise2d(x + seed * 13, z - seed * 7, 420) * 14 + noise2d(x + 999, z - 999, 90) * 3

  const { lx, lz } = toLogical(x, z, seed)
  // 해안 도시는 바다 쪽으로 갈수록 낮아지다가 물속으로
  if (activeStyle?.coast) {
    const s = seaStartX(lz, seed)
    const t = Math.min(Math.max((lx - (s - 50)) / 50, 0), 1)
    h = h * (1 - t) - t * 2.4
  }
  // 강 주변은 저지대로 깎임
  if (activeStyle?.river) {
    const dist = Math.abs(lx - riverCenterX(lz, seed))
    const t = Math.min(Math.max((RIVER_HALF + 16 - dist) / 16, 0), 1)
    if (t > 0) h = h * (1 - t) + (inRiver(lx, lz, seed) ? -1.5 : 0) * t
  }
  return h
}

export const CHUNK = 220
const SEGS = 60 // 정점이 촘촘해야 저공에서 도로 경계가 덜 뭉개짐
const RANGE = 2 // 플레이어 주변 5x5 청크 유지

// 청크를 풀로 돌려쓰면서 무한 도시 바닥처럼 보이게 함
export class TerrainManager {
  constructor(scene, { snowy = false, style = null } = {}) {
    this.scene = scene
    this.style = style
    // 도로 / 공원 / 건물 부지 / 물 바닥색
    this.road = new THREE.Color(snowy ? '#565e66' : '#43494f')
    this.park = new THREE.Color(snowy ? '#c8d6cc' : '#5f9450')
    this.lot = new THREE.Color(snowy ? '#e8edf1' : (style?.lotColor ?? '#989ea6'))
    this.water = new THREE.Color(snowy ? '#a8c7d8' : '#3f7fae')
    this.sand = new THREE.Color(snowy ? '#ded8c8' : '#d8c58f')
    this.parking = new THREE.Color(snowy ? '#767e86' : '#5b6167')
    this.tmpColor = new THREE.Color()
    this.pool = new Map() // "cx,cz" -> mesh
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  }

  buildChunk(mesh, cx, cz) {
    const geo = mesh.geometry
    const pos = geo.attributes.position
    const colors = geo.attributes.color
    const ox = cx * CHUNK
    const oz = cz * CHUNK
    const seed = this.style?.seed ?? 0
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox
      const wz = pos.getZ(i) + oz
      const kind = groundKind(wx, wz, seed, this.style)
      pos.setY(i, terrainHeight(wx, wz))
      let c
      if (kind === 'road') c = this.road
      else if (kind === 'park') c = this.park
      else if (kind === 'water') c = this.water
      else if (kind === 'sand') c = this.sand
      else if (kind === 'parking') c = this.parking
      else {
        // 부지는 블록마다 톤이 다르고 건물 발밑은 어둡게
        const { lx, lz } = toLogical(wx, wz, seed)
        c = this.tmpColor.copy(this.lot).multiplyScalar(lotShade(lx, lz, seed))
      }
      colors.setXYZ(i, c.r, c.g, c.b)
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
