import * as THREE from 'three'
import { terrainHeight, CHUNK } from './terrain'
import {
  BLOCK,
  ROAD_W,
  blockIndex,
  blockType,
  blockSeed,
  districtLevel,
  inRiver,
} from './cityLayout'

const RANGE = 2
const MAX_BUILDINGS = 64 // 계단식 타워는 인스턴스 2개 먹음
const MAX_GLASS = 24
const MAX_TREES = 16
const MAX_BUSHES = 14
const MAX_PONDS = 3
const MAX_TANKS = 14
const MAX_BILLBOARDS = 10
const MAX_HELIPADS = 8
const MAX_TOWERS = 10
const MAX_CRANES = 6 // 크레인 하나가 기둥+팔 2개
const MAX_DASHES = 150
const LAUNCH_HALF = 14

const BILLBOARD_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8fab']

// 창문 격자 텍스처. 밤이면 불 켜진 창이 많아짐
const makeWindowTexture = (isNight, glass = false) => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const g = canvas.getContext('2d')
  g.fillStyle = glass ? '#5b7d95' : '#3a4750'
  g.fillRect(0, 0, 64, 128)
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = Math.random() < (isNight ? 0.55 : glass ? 0.4 : 0.22)
      g.fillStyle = lit
        ? isNight
          ? '#ffd97a'
          : glass
            ? '#bfe3f5'
            : '#cfe3ee'
        : glass
          ? '#4a6a80'
          : '#2a333a'
      g.fillRect(4 + col * 12, 6 + row * 10, 8, 6)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const makeBuildingMats = (tex, isNight) => {
  const windowMat = new THREE.MeshLambertMaterial({
    map: tex,
    emissive: '#ffcf70',
    emissiveMap: tex,
    emissiveIntensity: isNight ? 0.85 : 0,
  })
  const roofMat = new THREE.MeshLambertMaterial({ color: '#606b74' })
  return [windowMat, windowMat, roofMat, roofMat, windowMat, windowMat]
}

// 맵 전체가 이어진 도시. 스타일(도시별 개성)에 따라 배치/높이/색이 다름
// 건물이랑 크레인에 부딪히면 추락. 시작은 발사 타워 옥상
export class CityField {
  constructor(scene, { style, snowy = false, isNight = false }) {
    this.scene = scene
    this.style = style
    this.seed = style.seed
    this.pool = new Map()
    this.dummy = new THREE.Object3D()
    this.color = new THREE.Color()

    this.concreteTex = makeWindowTexture(isNight, false)
    this.glassTex = makeWindowTexture(isNight, true)
    this.buildingMats = makeBuildingMats(this.concreteTex, isNight)
    this.glassMats = makeBuildingMats(this.glassTex, isNight)

    this.buildingGeo = new THREE.BoxGeometry(1, 1, 1)
    this.treeGeo = new THREE.ConeGeometry(2.2, 6, 6)
    this.treeMat = new THREE.MeshLambertMaterial({
      color: snowy ? '#b9cbb9' : '#3e7a44',
      flatShading: true,
    })
    this.bushGeo = new THREE.SphereGeometry(1.3, 6, 5)
    this.bushMat = new THREE.MeshLambertMaterial({
      color: snowy ? '#c5d4c5' : '#4e8a4a',
      flatShading: true,
    })
    this.pondGeo = new THREE.CylinderGeometry(7, 7, 0.4, 12)
    this.pondMat = new THREE.MeshLambertMaterial({ color: snowy ? '#a8c7d8' : '#4a90c2' })
    this.tankGeo = new THREE.BoxGeometry(3, 2.4, 3)
    this.tankMat = new THREE.MeshLambertMaterial({ color: '#7d8890' })
    this.billboardGeo = new THREE.BoxGeometry(7, 3.5, 0.5)
    this.billboardMat = new THREE.MeshLambertMaterial({
      emissive: '#222222',
      emissiveIntensity: isNight ? 0.6 : 0.15,
    })
    this.helipadGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.3, 10)
    this.helipadMat = new THREE.MeshLambertMaterial({ color: '#cfd8dc' })
    this.antennaGeo = new THREE.CylinderGeometry(0.18, 0.28, 7, 5)
    this.antennaMat = new THREE.MeshLambertMaterial({ color: '#37474f' })
    this.lightGeo = new THREE.SphereGeometry(0.55, 6, 6)
    this.lightMat = new THREE.MeshBasicMaterial({
      color: '#ff3b30',
      transparent: true,
      opacity: 0.9,
    })
    this.craneGeo = new THREE.BoxGeometry(1, 1, 1)
    this.craneMat = new THREE.MeshLambertMaterial({ color: '#e8a838', flatShading: true })
    this.dashGeo = new THREE.BoxGeometry(0.4, 0.14, 3)
    this.dashMat = new THREE.MeshLambertMaterial({ color: snowy ? '#c8ced4' : '#d8d43f' })

    // 발사 타워: 여기 옥상에서 종이비행기를 날림
    const ground0 = terrainHeight(0, 0)
    this.launchTop = ground0 + 95
    const towerMesh = new THREE.Mesh(this.buildingGeo, this.buildingMats)
    towerMesh.scale.set(LAUNCH_HALF * 2, 95, LAUNCH_HALF * 2)
    towerMesh.position.set(0, ground0 + 47.5, 0)
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
    const make = (geo, mat, count) => {
      const mesh = new THREE.InstancedMesh(geo, mat, count)
      this.scene.add(mesh)
      return mesh
    }
    return {
      buildings: make(this.buildingGeo, this.buildingMats, MAX_BUILDINGS),
      glass: make(this.buildingGeo, this.glassMats, MAX_GLASS),
      trees: make(this.treeGeo, this.treeMat, MAX_TREES),
      bushes: make(this.bushGeo, this.bushMat, MAX_BUSHES),
      ponds: make(this.pondGeo, this.pondMat, MAX_PONDS),
      tanks: make(this.tankGeo, this.tankMat, MAX_TANKS),
      billboards: make(this.billboardGeo, this.billboardMat, MAX_BILLBOARDS),
      helipads: make(this.helipadGeo, this.helipadMat, MAX_HELIPADS),
      antennas: make(this.antennaGeo, this.antennaMat, MAX_TOWERS),
      lights: make(this.lightGeo, this.lightMat, MAX_TOWERS),
      cranes: make(this.craneGeo, this.craneMat, MAX_CRANES * 2),
      dashes: make(this.dashGeo, this.dashMat, MAX_DASHES),
      boxes: [],
    }
  }

  hideRest(mesh, from, max) {
    this.dummy.position.set(0, -400, 0)
    this.dummy.scale.set(0.001, 0.001, 0.001)
    this.dummy.rotation.set(0, 0, 0)
    this.dummy.updateMatrix()
    for (let i = from; i < max; i++) mesh.setMatrixAt(i, this.dummy.matrix)
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  place(mesh, index, x, y, z, sx, sy, sz, rotY = 0) {
    this.dummy.position.set(x, y, z)
    this.dummy.scale.set(sx, sy, sz)
    this.dummy.rotation.set(0, rotY, 0)
    this.dummy.updateMatrix()
    mesh.setMatrixAt(index, this.dummy.matrix)
  }

  buildChunk(entry, cx, cz) {
    const { style, seed } = this
    const ox = cx * CHUNK
    const oz = cz * CHUNK
    const half = CHUNK / 2
    entry.boxes = []

    const n = {
      b: 0,
      g: 0,
      t: 0,
      bu: 0,
      po: 0,
      ta: 0,
      bb: 0,
      he: 0,
      an: 0,
      cr: 0,
      da: 0,
    }

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
        if (Math.hypot(centerX, centerZ) < 55) continue // 발사 타워 주변은 비움
        if (style.river && inRiver(centerX, centerZ, seed)) continue // 강엔 안 지음

        const type = blockType(bx, bz, seed, style.parkProb, style.plazaProb)
        const ground = terrainHeight(centerX, centerZ)
        const district = districtLevel(centerX, centerZ, seed)
        const r1 = blockSeed(bx, bz, seed)
        const r2 = blockSeed(bx, bz, seed, 1)
        const r3 = blockSeed(bx, bz, seed, 2)
        const r4 = blockSeed(bx, bz, seed, 3)

        if (type === 'park') {
          // 공원: 나무 + 덤불 + 가끔 연못
          for (let t = 0; t < 5 && n.t < MAX_TREES; t++) {
            const p1 = blockSeed(bx, bz, seed, t + 4)
            const p2 = blockSeed(bx, bz, seed, t + 11)
            const wx = centerX + (p1 - 0.5) * (BLOCK - ROAD_W - 6)
            const wz = centerZ + (p2 - 0.5) * (BLOCK - ROAD_W - 6)
            const sc = 0.8 + p2 * 1.1
            this.place(entry.trees, n.t++, wx, terrainHeight(wx, wz) + 3 * sc, wz, sc, sc, sc)
          }
          for (let t = 0; t < 4 && n.bu < MAX_BUSHES; t++) {
            const p1 = blockSeed(bx, bz, seed, t + 20)
            const p2 = blockSeed(bx, bz, seed, t + 27)
            const wx = centerX + (p1 - 0.5) * (BLOCK - ROAD_W - 4)
            const wz = centerZ + (p2 - 0.5) * (BLOCK - ROAD_W - 4)
            this.place(entry.bushes, n.bu++, wx, terrainHeight(wx, wz) + 0.9, wz, 1, 1, 1)
          }
          if (r1 < 0.45 && n.po < MAX_PONDS) {
            this.place(entry.ponds, n.po++, centerX, ground + 0.15, centerZ, 1, 1, 1)
          }
          continue
        }

        if (type === 'plaza') {
          // 공터엔 가끔 공사장 크레인 (부딪히면 추락이니 조심)
          if (district > 0.4 && r2 < 0.35 && n.cr < MAX_CRANES) {
            const mastH = 45 + r3 * 45
            const jibLen = 20
            this.place(
              entry.cranes,
              n.cr * 2,
              centerX,
              ground + mastH / 2,
              centerZ,
              1.4,
              mastH,
              1.4,
            )
            this.place(
              entry.cranes,
              n.cr * 2 + 1,
              centerX + jibLen / 2 - 2,
              ground + mastH - 1,
              centerZ,
              jibLen,
              1.2,
              1.2,
            )
            entry.boxes.push({ x: centerX, z: centerZ, hw: 1.2, hd: 1.2, top: ground + mastH })
            entry.boxes.push({
              x: centerX + jibLen / 2 - 2,
              z: centerZ,
              hw: jibLen / 2,
              hd: 1,
              top: ground + mastH,
              bottom: ground + mastH - 2.5,
            })
            n.cr++
          }
          continue
        }

        if (n.b >= MAX_BUILDINGS - 1) continue

        // 저층 상가 vs 타워. 다운타운에선 저층이 드묾
        const lowChance = district > 0.6 ? style.lowriseRatio * 0.3 : style.lowriseRatio
        const isLow = r3 < lowChance

        let h
        let w
        let d
        if (isLow) {
          h = 8 + r1 * 8
          w = 20 + r2 * 9
          d = 20 + r1 * 9
        } else {
          h =
            (18 + Math.pow(district, style.downtownPow) * 140 * (0.45 + r1 * 0.55)) *
            style.heightScale
          w = 16 + r1 * 13
          d = 16 + r2 * 13
        }

        const isGlass = !isLow && h > 45 && r4 < style.glassRatio
        const targetMesh = isGlass ? entry.glass : entry.buildings
        const idx = isGlass ? n.g : n.b
        if (isGlass && n.g >= MAX_GLASS - 1) continue

        const tiered = !isLow && h > 80 && r2 < 0.5
        if (tiered) {
          const baseH = h * 0.62
          const tierH = h * 0.38
          this.place(targetMesh, idx, centerX, ground + baseH / 2 - 0.5, centerZ, w, baseH, d)
          this.place(
            targetMesh,
            idx + 1,
            centerX,
            ground + baseH + tierH / 2 - 0.5,
            centerZ,
            w * 0.68,
            tierH,
            d * 0.68,
          )
          const tint = this.color.set(style.tints[Math.floor(r2 * style.tints.length)])
          targetMesh.setColorAt(idx, tint)
          targetMesh.setColorAt(idx + 1, tint)
          if (isGlass) n.g += 2
          else n.b += 2
        } else {
          this.place(targetMesh, idx, centerX, ground + h / 2 - 0.5, centerZ, w, h, d)
          targetMesh.setColorAt(
            idx,
            this.color.set(style.tints[Math.floor(r2 * style.tints.length)]),
          )
          if (isGlass) n.g++
          else n.b++
        }
        entry.boxes.push({ x: centerX, z: centerZ, hw: w / 2, hd: d / 2, top: ground + h })

        // 옥상 디테일: 높으면 안테나/헬리패드/광고판 중 하나, 중층이면 물탱크
        const roofY = ground + h - 0.5
        const r5 = blockSeed(bx, bz, seed, 5)
        if (h > 55) {
          if (r5 < 0.35 && n.an < MAX_TOWERS) {
            this.place(entry.antennas, n.an, centerX, roofY + 3.5, centerZ, 1, 1, 1)
            this.place(entry.lights, n.an, centerX, roofY + 7.2, centerZ, 1, 1, 1)
            n.an++
          } else if (r5 < 0.6 && n.he < MAX_HELIPADS) {
            this.place(entry.helipads, n.he++, centerX, roofY + 0.3, centerZ, 1, 1, 1)
          } else if (r5 < 0.85 && n.bb < MAX_BILLBOARDS) {
            this.place(entry.billboards, n.bb, centerX, roofY + 2.2, centerZ, 1, 1, 1, r1 * Math.PI)
            entry.billboards.setColorAt(
              n.bb,
              this.color.set(BILLBOARD_COLORS[Math.floor(r5 * 20) % BILLBOARD_COLORS.length]),
            )
            n.bb++
          }
        } else if (h > 20 && r5 < 0.5 && n.ta < MAX_TANKS) {
          this.place(
            entry.tanks,
            n.ta++,
            centerX + (r1 - 0.5) * w * 0.4,
            roofY + 1.2,
            centerZ + (r2 - 0.5) * d * 0.4,
            1,
            1,
            1,
          )
        }
      }
    }

    // 도로 중앙선 (점선). 다리 위에도 이어짐
    const lineStart = (v) => Math.ceil((v - half) / BLOCK) * BLOCK + ROAD_W / 2
    for (let lx = lineStart(ox); lx < ox + half && n.da < MAX_DASHES; lx += BLOCK) {
      for (let z = oz - half + 4; z < oz + half && n.da < MAX_DASHES; z += 15) {
        this.place(entry.dashes, n.da++, lx, terrainHeight(lx, z) + 0.1, z, 1, 1, 1)
      }
    }
    for (let lz = lineStart(oz); lz < oz + half && n.da < MAX_DASHES; lz += BLOCK) {
      for (let x = ox - half + 4; x < ox + half && n.da < MAX_DASHES; x += 15) {
        this.place(entry.dashes, n.da++, x, terrainHeight(x, lz) + 0.1, lz, 1, 1, 1, Math.PI / 2)
      }
    }

    this.hideRest(entry.buildings, n.b, MAX_BUILDINGS)
    this.hideRest(entry.glass, n.g, MAX_GLASS)
    this.hideRest(entry.trees, n.t, MAX_TREES)
    this.hideRest(entry.bushes, n.bu, MAX_BUSHES)
    this.hideRest(entry.ponds, n.po, MAX_PONDS)
    this.hideRest(entry.tanks, n.ta, MAX_TANKS)
    this.hideRest(entry.billboards, n.bb, MAX_BILLBOARDS)
    this.hideRest(entry.helipads, n.he, MAX_HELIPADS)
    this.hideRest(entry.antennas, n.an, MAX_TOWERS)
    this.hideRest(entry.lights, n.an, MAX_TOWERS)
    this.hideRest(entry.cranes, n.cr * 2, MAX_CRANES * 2)
    this.hideRest(entry.dashes, n.da, MAX_DASHES)
  }

  // 건물/크레인/발사 타워에 박았는지
  collides(x, y, z) {
    if (
      y < this.launchTop + 1 &&
      Math.abs(x) < LAUNCH_HALF + 0.8 &&
      Math.abs(z) < LAUNCH_HALF + 0.8
    )
      return true

    const ccx = Math.round(x / CHUNK)
    const ccz = Math.round(z / CHUNK)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const entry = this.pool.get(`${ccx + dx},${ccz + dz}`)
        if (!entry) continue
        for (const b of entry.boxes) {
          if (
            y < b.top + 0.4 &&
            y > (b.bottom ?? -Infinity) &&
            Math.abs(x - b.x) < b.hw + 0.8 &&
            Math.abs(z - b.z) < b.hd + 0.8
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  update(px, pz, time = 0) {
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
      for (const key of Object.keys(entry)) {
        if (key === 'boxes') continue
        this.scene.remove(entry[key])
        entry[key].dispose()
      }
    }
    this.pool.clear()
    this.scene.remove(this.launchGroup)
    this.launchGroup.children.forEach((obj) => {
      obj.geometry?.dispose()
      if (!Array.isArray(obj.material)) obj.material?.dispose()
    })
    this.buildingGeo.dispose()
    this.buildingMats.forEach((m) => m.dispose())
    this.glassMats.forEach((m) => m.dispose())
    this.concreteTex.dispose()
    this.glassTex.dispose()
    this.treeGeo.dispose()
    this.treeMat.dispose()
    this.bushGeo.dispose()
    this.bushMat.dispose()
    this.pondGeo.dispose()
    this.pondMat.dispose()
    this.tankGeo.dispose()
    this.tankMat.dispose()
    this.billboardGeo.dispose()
    this.billboardMat.dispose()
    this.helipadGeo.dispose()
    this.helipadMat.dispose()
    this.antennaGeo.dispose()
    this.antennaMat.dispose()
    this.lightGeo.dispose()
    this.lightMat.dispose()
    this.craneGeo.dispose()
    this.craneMat.dispose()
    this.dashGeo.dispose()
    this.dashMat.dispose()
  }
}
