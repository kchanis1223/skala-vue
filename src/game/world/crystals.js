import * as THREE from 'three'
import { terrainHeight, CHUNK, MAP_BOUND } from './terrain'

const CRYSTAL_SPAN = 2 // 크리스탈은 비행 경계 안쪽 청크에만
const TRAIL_STEP = 15 // 체인 간격

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

// 체인 앞쪽은 파랑, 중간 구간은 보라, 마지막은 금색
const TIERS = [
  { key: 't1', points: 1, color: '#6fd8ff', scale: 1, max: 12 },
  { key: 't3', points: 3, color: '#b97fff', scale: 1.25, max: 6 },
  { key: 't5', points: 5, color: '#ffc93a', scale: 1.55, max: 2 },
]

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
      const mesh = new THREE.InstancedMesh(this.geo, this.mats[tier.key], tier.max)
      mesh.frustumCulled = false
      this.scene.add(mesh)
      entry[tier.key] = mesh
    }
    return entry
  }

  buildChunk(entry, cx, cz) {
    entry.crystals = []
    const slotCount = { t1: 0, t3: 0, t5: 0 }

    // 청크당 체인 하나. 체인 구성은 파랑-보라-금-보라-파랑 대칭 (금색이 한가운데 정점)
    const trailCount = 1
    for (let t = 0; t < trailCount; t++) {
      const r1 = hash(cx * 31 + t * 7 + this.seed, cz * 17 - t * 3)
      const r2 = hash(cx * 13 - t * 11, cz * 41 + t * 5 + this.seed)
      const r3 = hash(cx * 7 + t * 13, cz * 23 - t * 9 - this.seed)
      const r4 = hash(cx * 61 + t * 29 + this.seed, cz * 37 + t * 41)
      const r5 = hash(cx * 53 - t * 3 + this.seed, cz * 67 + t * 19)

      // 파랑4-보라2-금1-보라2-파랑4 꼴인데 개수는 약간씩 흔들림
      const pattern = []
      const push = (key, count) => {
        for (let i = 0; i < count; i++) pattern.push(key)
      }
      push('t1', 3 + Math.floor(r4 * 3)) // 3~5
      push('t3', 1 + Math.floor(r5 * 2)) // 1~2
      push('t5', 1)
      push('t3', 1 + Math.floor(r1 * 2))
      push('t1', 3 + Math.floor(r2 * 3))

      // 체인 시작점/방향/휘어짐/하강률. 활공하며 그대로 따라갈 수 있는 라인
      let x = cx * CHUNK + (r1 - 0.5) * CHUNK * 0.85
      let z = cz * CHUNK + (r2 - 0.5) * CHUNK * 0.85
      let y = terrainHeight(x, z) + 45 + r3 * 80
      let heading = r4 * Math.PI * 2
      const curve = (r3 - 0.5) * 0.14 // 스텝당 선회량
      const slope = 1.3 + r1 * 0.8 // 스텝당 하강량 (활공 하강률이랑 비슷하게)

      for (let i = 0; i < pattern.length; i++) {
        // 경계 밖으로 나가는 체인은 거기서 끊음
        if (Math.abs(x) > MAP_BOUND - 15 || Math.abs(z) > MAP_BOUND - 15) break
        const tier = TIERS.find((tr) => tr.key === pattern[i])
        if (slotCount[tier.key] >= tier.max) break

        let py = Math.max(y, terrainHeight(x, z) + 7)
        let guard = 0
        while (this.city.collides(x, py, z) && guard++ < 30) py += 3

        entry.crystals.push({
          x,
          y: py,
          z,
          id: `${cx},${cz},${t},${i}`,
          phase: r1 * Math.PI * 2 + i * 0.7,
          tier: tier.key,
          slot: slotCount[tier.key]++,
          points: tier.points,
          scale: tier.scale,
        })

        heading += curve
        x += -Math.sin(heading) * TRAIL_STEP
        z += -Math.cos(heading) * TRAIL_STEP
        y -= slope
      }
    }
  }

  update(px, pz, time) {
    // 경계 안 청크에만 체인 생성. 한 번 만들고 끝 (재활용 없음)
    if (!this.built) {
      for (let cx = -CRYSTAL_SPAN; cx <= CRYSTAL_SPAN; cx++) {
        for (let cz = -CRYSTAL_SPAN; cz <= CRYSTAL_SPAN; cz++) {
          const entry = this.makeEntry()
          this.buildChunk(entry, cx, cz)
          this.pool.set(`${cx},${cz}`, entry)
        }
      }
      this.built = true
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
