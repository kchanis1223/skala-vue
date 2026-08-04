import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'
import { lineIndexX, lineIndexZ, buildingPlan, worldFromLogical } from './cityLayout'

const RANGE = 2
// 등급별 청크당 최대 개수
const MAX_T1 = 5
const MAX_T3 = 2
const MAX_T5 = 1

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

// 육각 기둥 + 위아래 뾰족한 팁 크리스탈 모양을 직접 만듦
const makeCrystalGeo = () => {
  const R = 0.9 // 몸통 반지름
  const MID = 0.9 // 몸통 절반 높이
  const TIP = 2.4 // 팁 끝 높이
  const ringTop = []
  const ringBot = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ringTop.push([Math.cos(a) * R, MID, Math.sin(a) * R])
    ringBot.push([Math.cos(a) * R, -MID, Math.sin(a) * R])
  }
  const verts = []
  const push = (...points) => {
    for (const p of points) verts.push(p[0], p[1], p[2])
  }
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6
    push([0, TIP, 0], ringTop[j], ringTop[i]) // 위 팁
    push(ringTop[i], ringTop[j], ringBot[j]) // 몸통
    push(ringTop[i], ringBot[j], ringBot[i])
    push([0, -TIP, 0], ringBot[i], ringBot[j]) // 아래 팁
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.computeVertexNormals()
  return geo
}

const TIERS = [
  { key: 't1', points: 1, color: '#6fd8ff', scale: 1, max: MAX_T1 },
  { key: 't3', points: 3, color: '#b97fff', scale: 1.25, max: MAX_T3 },
  { key: 't5', points: 5, color: '#ffc93a', scale: 1.55, max: MAX_T5 },
]

// 도시에 뿌려진 크리스탈. 떨어지기 전에 최대한 모으는게 게임 목표
// 파랑 1점은 아무데나, 보라 3점/금색 5점은 고층 빌딩 옆 낮은 데(위험한 곳)에만
export class CrystalField {
  constructor(scene, city, style) {
    this.scene = scene
    this.city = city
    this.style = style
    this.seed = style?.seed ?? 0
    this.geo = makeCrystalGeo()
    this.mats = {}
    for (const tier of TIERS) {
      this.mats[tier.key] = new THREE.MeshPhongMaterial({
        color: tier.color,
        emissive: tier.color,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.88,
        shininess: 90,
        flatShading: true,
      })
    }
    this.pool = new Map()
    this.free = []
    this.collected = new Set()
    this.dummy = new THREE.Object3D()
  }

  makeEntry() {
    const entry = { crystals: [] }
    for (const tier of TIERS) {
      const mesh = new THREE.InstancedMesh(this.geo, this.mats[tier.key], tier.max)
      mesh.frustumCulled = false
      this.scene.add(mesh)
      entry[tier.key] = mesh
    }
    return entry
  }

  // 고층 건물 옆 낮은 자리(위험 지대)를 찾음
  findRiskySpot(cx, cz, salt, minH) {
    for (let attempt = 0; attempt < 7; attempt++) {
      const r1 = hash(cx * 41 + salt * 13 + attempt + this.seed, cz * 27 - attempt * 5)
      const r2 = hash(cx * 19 - salt * 7 + attempt * 3, cz * 53 + attempt + this.seed)
      const bx = lineIndexX(cx * CHUNK + (r1 - 0.5) * CHUNK * 0.9, this.seed)
      const bz = lineIndexZ(cz * CHUNK + (r2 - 0.5) * CHUNK * 0.9, this.seed)
      const plan = buildingPlan(bx, bz, this.seed, this.style)
      if (!plan || plan.h < minH) continue
      // 건물 옆구리에 붙임
      const angle = hash(bx * 3 + salt, bz * 5 - salt) * Math.PI * 2
      const lx = plan.cx + Math.cos(angle) * (plan.w / 2 + 6)
      const lz = plan.cz + Math.sin(angle) * (plan.d / 2 + 6)
      const world = worldFromLogical(lx, lz, this.seed)
      return { x: world.x, z: world.z, r: hash(bx * 7, bz * 11 + salt) }
    }
    return null
  }

  buildChunk(entry, cx, cz) {
    entry.crystals = []

    // 1점: 아무데나, 다양한 고도
    for (let i = 0; i < MAX_T1; i++) {
      const r1 = hash(cx * 31 + i * 7 + this.seed, cz * 17 - i * 3)
      const r2 = hash(cx * 13 - i * 11, cz * 41 + i * 5 + this.seed)
      const r3 = hash(cx * 7 + i * 13, cz * 23 - i * 9 - this.seed)
      const x = cx * CHUNK + (r1 - 0.5) * CHUNK * 0.94
      const z = cz * CHUNK + (r2 - 0.5) * CHUNK * 0.94
      let y = terrainHeight(x, z) + 14 + r3 * 120
      let guard = 0
      while (this.city.collides(x, y, z) && guard++ < 50) y += 4
      entry.crystals.push({
        x,
        y,
        z,
        id: `${cx},${cz},1,${i}`,
        phase: r1 * Math.PI * 2,
        tier: 't1',
        slot: i,
        points: 1,
      })
    }

    // 3점: 55m 넘는 건물 옆 저고도. 확률 낮음
    for (let i = 0; i < MAX_T3; i++) {
      if (hash(cx * 61 + i * 17 + this.seed, cz * 37 - i) > 0.3) continue
      const spot = this.findRiskySpot(cx, cz, 100 + i, 55)
      if (!spot) continue
      let y = terrainHeight(spot.x, spot.z) + 9 + spot.r * 14
      let guard = 0
      while (this.city.collides(spot.x, y, spot.z) && guard++ < 30) y += 3
      entry.crystals.push({
        x: spot.x,
        y,
        z: spot.z,
        id: `${cx},${cz},3,${i}`,
        phase: spot.r * Math.PI * 2,
        tier: 't3',
        slot: i,
        points: 3,
      })
    }

    // 5점: 75m 넘는 마천루 옆 초저고도. 더 희귀함
    if (hash(cx * 83 + this.seed, cz * 71 + 9) < 0.16) {
      const spot = this.findRiskySpot(cx, cz, 500, 75)
      if (spot) {
        let y = terrainHeight(spot.x, spot.z) + 6 + spot.r * 8
        let guard = 0
        while (this.city.collides(spot.x, y, spot.z) && guard++ < 30) y += 3
        entry.crystals.push({
          x: spot.x,
          y,
          z: spot.z,
          id: `${cx},${cz},5,0`,
          phase: spot.r * Math.PI * 2,
          tier: 't5',
          slot: 0,
          points: 5,
        })
      }
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

    // 회전 + 둥실거림. 5점짜리는 은은하게 맥동까지
    for (const entry of this.pool.values()) {
      const used = { t1: new Set(), t3: new Set(), t5: new Set() }
      for (const c of entry.crystals) {
        used[c.tier].add(c.slot)
        const mesh = entry[c.tier]
        if (this.collected.has(c.id)) {
          this.dummy.position.set(0, -500, 0)
          this.dummy.scale.set(0.001, 0.001, 0.001)
          this.dummy.rotation.set(0, 0, 0)
        } else {
          const base = TIERS.find((t) => t.key === c.tier).scale
          const pulse = c.tier === 't5' ? 1 + Math.sin(time * 3 + c.phase) * 0.12 : 1
          this.dummy.position.set(c.x, c.y + Math.sin(time * 2 + c.phase) * 0.8, c.z)
          this.dummy.scale.set(base * pulse, base * pulse, base * pulse)
          this.dummy.rotation.set(0, time * 1.6 + c.phase, 0)
        }
        this.dummy.updateMatrix()
        mesh.setMatrixAt(c.slot, this.dummy.matrix)
      }
      // 안 쓰는 슬롯 숨김
      for (const tier of TIERS) {
        for (let i = 0; i < tier.max; i++) {
          if (used[tier.key].has(i)) continue
          this.dummy.position.set(0, -500, 0)
          this.dummy.scale.set(0.001, 0.001, 0.001)
          this.dummy.updateMatrix()
          entry[tier.key].setMatrixAt(i, this.dummy.matrix)
        }
        entry[tier.key].instanceMatrix.needsUpdate = true
      }
    }
  }

  // 기체 근처 크리스탈 수집. 이번 프레임에 얻은 점수 반환
  tryCollect(pos, radius = 5.5) {
    let points = 0
    for (const entry of this.pool.values()) {
      for (const c of entry.crystals) {
        if (this.collected.has(c.id)) continue
        const d = Math.hypot(c.x - pos.x, c.y - pos.y, c.z - pos.z)
        if (d < radius) {
          this.collected.add(c.id)
          points += c.points
        }
      }
    }
    return points
  }

  dispose() {
    for (const entry of [...this.pool.values(), ...this.free]) {
      for (const tier of TIERS) {
        this.scene.remove(entry[tier.key])
        entry[tier.key].dispose()
      }
    }
    this.pool.clear()
    this.free = []
    this.geo.dispose()
    for (const tier of TIERS) this.mats[tier.key].dispose()
  }
}
