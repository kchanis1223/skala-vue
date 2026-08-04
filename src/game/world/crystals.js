import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'

const RANGE = 2
const PER_CHUNK = 7 // 청크당 크리스탈 수 (등급은 확률로)

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

// 육각 기둥 + 위아래 뾰족한 팁 크리스탈 모양을 직접 만듦
const makeCrystalGeo = () => {
  const R = 0.9
  const MID = 0.9
  const TIP = 2.4
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
    push([0, TIP, 0], ringTop[j], ringTop[i])
    push(ringTop[i], ringTop[j], ringBot[j])
    push(ringTop[i], ringBot[j], ringBot[i])
    push([0, -TIP, 0], ringBot[i], ringBot[j])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.computeVertexNormals()
  return geo
}

// 파랑:보라:금색 = 7 : 2.5 : 1
const TIERS = [
  { key: 't1', points: 1, color: '#6fd8ff', scale: 1 },
  { key: 't3', points: 3, color: '#b97fff', scale: 1.25 },
  { key: 't5', points: 5, color: '#ffc93a', scale: 1.55 },
]
const pickTier = (r) => (r < 7 / 10.5 ? TIERS[0] : r < 9.5 / 10.5 ? TIERS[1] : TIERS[2])

// 도시에 뿌려진 크리스탈. 떨어지기 전에 최대한 모으는게 게임 목표
export class CrystalField {
  constructor(scene, city, style) {
    this.scene = scene
    this.city = city
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
      const mesh = new THREE.InstancedMesh(this.geo, this.mats[tier.key], PER_CHUNK)
      mesh.frustumCulled = false
      this.scene.add(mesh)
      entry[tier.key] = mesh
    }
    return entry
  }

  buildChunk(entry, cx, cz) {
    entry.crystals = []
    const slotCount = { t1: 0, t3: 0, t5: 0 }
    for (let i = 0; i < PER_CHUNK; i++) {
      const r1 = hash(cx * 31 + i * 7 + this.seed, cz * 17 - i * 3)
      const r2 = hash(cx * 13 - i * 11, cz * 41 + i * 5 + this.seed)
      const r3 = hash(cx * 7 + i * 13, cz * 23 - i * 9 - this.seed)
      const tier = pickTier(hash(cx * 61 + i * 29 + this.seed, cz * 37 + i * 41))

      const x = cx * CHUNK + (r1 - 0.5) * CHUNK * 0.94
      const z = cz * CHUNK + (r2 - 0.5) * CHUNK * 0.94
      let y = terrainHeight(x, z) + 14 + r3 * 120
      let guard = 0
      while (this.city.collides(x, y, z) && guard++ < 50) y += 4

      entry.crystals.push({
        x,
        y,
        z,
        id: `${cx},${cz},${i}`,
        phase: r1 * Math.PI * 2,
        tier: tier.key,
        slot: slotCount[tier.key]++,
        points: tier.points,
        scale: tier.scale,
      })
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

    // 회전 + 둥실거림. 금색은 은은하게 맥동까지
    for (const entry of this.pool.values()) {
      const used = { t1: new Set(), t3: new Set(), t5: new Set() }
      for (const c of entry.crystals) {
        used[c.tier].add(c.slot)
        if (this.collected.has(c.id)) {
          this.dummy.position.set(0, -500, 0)
          this.dummy.scale.set(0.001, 0.001, 0.001)
          this.dummy.rotation.set(0, 0, 0)
        } else {
          const pulse = c.tier === 't5' ? 1 + Math.sin(time * 3 + c.phase) * 0.12 : 1
          const s = c.scale * pulse
          this.dummy.position.set(c.x, c.y + Math.sin(time * 2 + c.phase) * 0.8, c.z)
          this.dummy.scale.set(s, s, s)
          this.dummy.rotation.set(0, time * 1.6 + c.phase, 0)
        }
        this.dummy.updateMatrix()
        entry[c.tier].setMatrixAt(c.slot, this.dummy.matrix)
      }
      for (const tier of TIERS) {
        for (let i = 0; i < PER_CHUNK; i++) {
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
