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
const SEGS = 32 // 높이용 정점. 색은 텍스처가 담당해서 이 정도면 충분
const TEX = 256 // 청크당 텍스처 해상도 (픽셀당 0.86m)
const RANGE = 2 // 플레이어 주변 5x5 청크 유지

// 청크를 풀로 돌려쓰면서 무한 도시 바닥처럼 보이게 함
// 바닥색은 정점색이 아니라 청크마다 캔버스 텍스처에 픽셀로 그림
// (정점색은 보간 때문에 도로가 흐릿한 띠로 번져서 격자처럼 보였음)
export class TerrainManager {
  constructor(scene, { snowy = false, style = null, anisotropy = 4 } = {}) {
    this.scene = scene
    this.style = style
    this.anisotropy = anisotropy
    const rgb = (hex) => {
      const c = new THREE.Color(hex)
      return [c.r * 255, c.g * 255, c.b * 255]
    }
    this.palette = {
      road: rgb(snowy ? '#565e66' : '#43494f'),
      park: rgb(snowy ? '#c8d6cc' : '#5f9450'),
      lot: rgb(snowy ? '#e8edf1' : (style?.lotColor ?? '#989ea6')),
      water: rgb(snowy ? '#a8c7d8' : '#3f7fae'),
      sand: rgb(snowy ? '#ded8c8' : '#d8c58f'),
    }
    this.pool = new Map() // "cx,cz" -> mesh
    this.free = []
    this.queue = []
    this.queued = new Set()
  }

  makeMesh() {
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, SEGS, SEGS)
    geo.rotateX(-Math.PI / 2)
    const canvas = document.createElement('canvas')
    canvas.width = TEX
    canvas.height = TEX
    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = this.anisotropy
    const material = new THREE.MeshLambertMaterial({ map: texture, flatShading: true })
    const mesh = new THREE.Mesh(geo, material)
    mesh.userData.ctx = canvas.getContext('2d')
    mesh.userData.texture = texture
    this.scene.add(mesh)
    return mesh
  }

  paint(mesh, ox, oz) {
    const { ctx, texture } = mesh.userData
    const img = ctx.createImageData(TEX, TEX)
    const data = img.data
    const seed = this.style?.seed ?? 0
    const step = CHUNK / TEX
    let p = 0
    for (let j = 0; j < TEX; j++) {
      const wz = oz - CHUNK / 2 + (j + 0.5) * step
      for (let i = 0; i < TEX; i++) {
        const wx = ox - CHUNK / 2 + (i + 0.5) * step
        const kind = groundKind(wx, wz, seed, this.style)
        let base
        let shade = 1
        if (kind === 'lot') {
          base = this.palette.lot
          shade = lotShade(wx, wz, seed)
        } else if (kind === 'parking') {
          base = this.palette.lot
          shade = lotShade(wx, wz, seed) * 0.93
        } else if (kind === 'park') {
          base = this.palette.park
          shade = 0.88 + lotShade(wx, wz, seed + 5) * 0.2
        } else {
          base = this.palette[kind]
        }
        data[p++] = base[0] * shade
        data[p++] = base[1] * shade
        data[p++] = base[2] * shade
        data[p++] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    texture.needsUpdate = true
  }

  buildChunk(mesh, cx, cz) {
    const geo = mesh.geometry
    const pos = geo.attributes.position
    const ox = cx * CHUNK
    const oz = cz * CHUNK
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i) + ox, pos.getZ(i) + oz))
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    mesh.position.set(ox, 0, oz)
    this.paint(mesh, ox, oz)
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
    for (const [key, mesh] of this.pool) {
      if (!needed.has(key)) {
        this.pool.delete(key)
        this.free.push(mesh)
      }
    }
    for (const key of needed) {
      if (!this.pool.has(key) && !this.queued.has(key)) {
        this.queue.push(key)
        this.queued.add(key)
      }
    }
    // 텍스처 그리기가 무거워서 프레임당 몇 개씩만 처리 (안 그러면 뚝뚝 끊김)
    let budget = 3
    while (budget > 0 && this.queue.length > 0) {
      const key = this.queue.shift()
      this.queued.delete(key)
      if (this.pool.has(key) || !needed.has(key)) continue
      const [cx, cz] = key.split(',').map(Number)
      const mesh = this.free.pop() ?? this.makeMesh()
      this.buildChunk(mesh, cx, cz)
      this.pool.set(key, mesh)
      budget--
    }
  }

  dispose() {
    const all = [...this.pool.values(), ...this.free]
    for (const mesh of all) {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.userData.texture.dispose()
      mesh.material.dispose()
    }
    this.pool.clear()
    this.free = []
  }
}
