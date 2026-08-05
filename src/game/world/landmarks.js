import * as THREE from 'three'
import { terrainHeight } from './terrain'

// 도시별 랜드마크. 맵마다 딱 하나씩, 멀리서도 보이게 큼직하게 세움
// 부딪히면 추락이라 충돌 박스도 같이 등록함
export class Landmarks {
  constructor(scene, style, { isNight = false } = {}) {
    this.scene = scene
    this.group = new THREE.Group()
    this.boxes = []
    this.disposables = []

    const spec = style?.landmark
    if (spec?.type === 'ntower') this.buildNTower(spec, isNight)
    if (spec?.type === 'gwangan') this.buildGwangan(spec, isNight)
    if (spec?.type === 'empire') this.buildEmpire(spec, isNight)
    if (spec?.type === 'burj') this.buildBurj(spec, isNight)
    if (spec?.type === 'eiffel') this.buildEiffel(spec, isNight)
    if (spec?.type === 'stalin') this.buildStalin(spec, isNight)
    if (spec?.type === 'cristo') this.buildCristo(spec, isNight)
    if (spec?.type === 'opera') this.buildOpera(spec)
    if (spec?.type === 'cable') this.buildCableStation(spec)

    scene.add(this.group)
  }

  mat(color, opts = {}) {
    const m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts })
    this.disposables.push(m)
    return m
  }

  geo(g) {
    this.disposables.push(g)
    return g
  }

  box(x, y, z, w, h, d, matOrColor, rotY = 0) {
    const m = typeof matOrColor === 'string' ? this.mat(matOrColor) : matOrColor
    const mesh = new THREE.Mesh(this.geo(new THREE.BoxGeometry(w, h, d)), m)
    mesh.position.set(x, y, z)
    mesh.rotation.y = rotY
    this.group.add(mesh)
    return mesh
  }

  cyl(x, y, z, rTop, rBot, h, seg, matOrColor) {
    const m = typeof matOrColor === 'string' ? this.mat(matOrColor) : matOrColor
    const mesh = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(rTop, rBot, h, seg)), m)
    mesh.position.set(x, y, z)
    this.group.add(mesh)
    return mesh
  }

  // 남산타워: 받침 언덕 위 4개 버팀다리 + 몸통 + 2단 전망대 + 빨간 첨탑
  buildNTower(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = ground
    const white = this.mat('#e2e8ec')
    const deckMat = this.mat('#eef2f4', {
      emissive: isNight ? '#ffd97a' : '#000000',
      emissiveIntensity: isNight ? 0.55 : 0,
    })

    this.cyl(spec.x, g + 4, spec.z, 10, 13, 8, 8, '#8a9199')
    // 버팀다리 4개 (몸통 밑동을 감싸는 사선 기둥)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const strut = this.box(spec.x + sx * 5.5, g + 14, spec.z + sz * 5.5, 1.6, 14, 1.6, white)
      strut.rotation.x = -sz * 0.28
      strut.rotation.z = sx * 0.28
    }
    this.cyl(spec.x, g + 34, spec.z, 3.4, 4.6, 44, 8, white)
    // 전망대 2단 + 아래 링
    this.cyl(spec.x, g + 56, spec.z, 11.5, 11.5, 1.6, 10, '#aeb9c0')
    this.cyl(spec.x, g + 62, spec.z, 11, 9, 10, 10, deckMat)
    this.cyl(spec.x, g + 69.5, spec.z, 6.5, 8, 5, 10, deckMat)
    // 첨탑 (빨강 아래 + 흰 위 + 항공등)
    this.cyl(spec.x, g + 82, spec.z, 0.7, 1.1, 20, 6, '#d64541')
    this.cyl(spec.x, g + 97, spec.z, 0.2, 0.6, 12, 6, '#eef1f3')
    const beacon = this.cyl(spec.x, g + 103.6, spec.z, 0.8, 0.8, 1.2, 6, this.mat('#ff3b30', {
      emissive: '#ff3b30',
      emissiveIntensity: isNight ? 1 : 0.4,
    }))
    beacon.visible = true

    this.boxes.push(
      { x: spec.x, z: spec.z, hw: 5, hd: 5, top: g + 56 },
      { x: spec.x, z: spec.z, hw: 11.5, hd: 11.5, top: g + 75, bottom: g + 55 },
      { x: spec.x, z: spec.z, hw: 1.2, hd: 1.2, top: g + 104, bottom: g + 75 },
    )
  }

  // 광안대교: 상판 + 난간 + H주탑 2개 + 사선 케이블 + 수직 행어 + 주탑 항공등
  buildGwangan(spec, isNight) {
    const deckMat = this.mat('#5b6672')
    const towerMat = this.mat('#dfe5ea')
    const cableMat = this.mat('#e8edf1', {
      emissive: isNight ? '#7fd8ff' : '#000000',
      emissiveIntensity: isNight ? 0.7 : 0,
    })
    const beaconMat = this.mat('#ff3b30', {
      emissive: '#ff3b30',
      emissiveIntensity: isNight ? 1 : 0.35,
    })

    this.box(spec.x, spec.deckY, spec.z, 13, 1.6, spec.len, deckMat)
    // 난간 2줄
    for (const dx of [-6, 6]) {
      this.box(spec.x + dx, spec.deckY + 1.3, spec.z, 0.5, 1, spec.len, towerMat)
    }
    this.boxes.push({
      x: spec.x,
      z: spec.z,
      hw: 6.5,
      hd: spec.len / 2,
      top: spec.deckY + 1,
      bottom: spec.deckY - 1.2,
    })

    const towerH = 66
    for (const tz of [spec.z - spec.len * 0.25, spec.z + spec.len * 0.25]) {
      for (const dx of [-5.5, 5.5]) {
        this.box(spec.x + dx, spec.deckY + towerH / 2 - 14, tz, 2.4, towerH, 2.8, towerMat)
      }
      this.box(spec.x, spec.deckY + towerH - 16, tz, 13.4, 2.4, 2.8, towerMat)
      this.box(spec.x, spec.deckY + towerH / 2 - 4, tz, 13, 2, 2.6, towerMat)
      this.cyl(spec.x - 5.5, spec.deckY + towerH - 13, tz, 0.5, 0.5, 1, 6, beaconMat)
      this.cyl(spec.x + 5.5, spec.deckY + towerH - 13, tz, 0.5, 0.5, 1, 6, beaconMat)
      this.boxes.push({
        x: spec.x,
        z: tz,
        hw: 7,
        hd: 1.8,
        top: spec.deckY + towerH - 12,
        bottom: spec.deckY - 14,
      })

      // 주탑에서 앞뒤로 내려가는 메인 케이블 + 수직 행어
      for (const dir of [-1, 1]) {
        const span = spec.len * 0.22
        const topY = spec.deckY + towerH - 16
        const cable = this.box(
          spec.x,
          (topY + spec.deckY + 1) / 2,
          tz + (dir * span) / 2,
          0.5,
          0.5,
          span,
          cableMat,
        )
        cable.rotation.x = dir * Math.atan2(topY - spec.deckY - 1, span)
        for (const f of [0.3, 0.55, 0.8]) {
          const hy = spec.deckY + (topY - spec.deckY) * (1 - f)
          this.box(spec.x, (hy + spec.deckY) / 2 + 0.5, tz + dir * span * f, 0.25, hy - spec.deckY, 0.25, cableMat)
        }
      }
    }
  }

  // 엠파이어: 계단식 타워 + 모서리 기둥 장식 + 아르데코 왕관 + 첨탑
  buildEmpire(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const stone = this.mat('#d9d2c4')
    const stoneDark = this.mat('#c4bba8')
    const tiers = [
      { w: 56, h: 150 },
      { w: 40, h: 86 },
      { w: 26, h: 54 },
      { w: 13, h: 24 },
    ]
    let y = ground
    for (const t of tiers) {
      this.box(spec.x, y + t.h / 2, spec.z, t.w, t.h, t.w, stone)
      // 모서리 세로 기둥 (파사드에 살짝 튀어나온 장식)
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        this.box(
          spec.x + (sx * t.w) / 2,
          y + t.h / 2,
          spec.z + (sz * t.w) / 2,
          2.2,
          t.h * 0.96,
          2.2,
          stoneDark,
        )
      }
      this.boxes.push({ x: spec.x, z: spec.z, hw: t.w / 2 + 1, hd: t.w / 2 + 1, top: y + t.h })
      y += t.h
    }
    // 아르데코 왕관 (둥근 캡 2단) + 첨탑
    this.cyl(spec.x, y + 4, spec.z, 5, 6.5, 8, 8, stoneDark)
    this.cyl(spec.x, y + 10, spec.z, 2.5, 4.5, 5, 8, stoneDark)
    this.cyl(spec.x, y + 26, spec.z, 0.35, 1.6, 26, 6, '#aeb6bd')
    this.boxes.push({ x: spec.x, z: spec.z, hw: 1.6, hd: 1.6, top: y + 39 })
    this.cyl(spec.x, y + 40, spec.z, 1, 1, 1.6, 6, this.mat('#ff3b30', {
      emissive: '#ff3b30',
      emissiveIntensity: isNight ? 1 : 0.4,
    }))
  }

  // 부르즈: 3엽(클로버) 밑동 + 나선 테이퍼 본탑 + 발광 링 + 초장 첨탑
  buildBurj(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const glass = this.mat('#bcd8e8', {
      emissive: isNight ? '#ffd97a' : '#000000',
      emissiveIntensity: isNight ? 0.3 : 0,
    })
    const ringMat = this.mat('#dff3fb', {
      emissive: '#7fd8ff',
      emissiveIntensity: isNight ? 0.9 : 0.25,
    })

    // 3엽 밑동: 본탑 둘레에 낮은 원통 세 개가 클로버처럼 붙음
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      const px = spec.x + Math.cos(a) * 20
      const pz = spec.z + Math.sin(a) * 20
      this.cyl(px, ground + 32, pz, 8, 11, 64, 6, glass)
      this.boxes.push({ x: px, z: pz, hw: 10, hd: 10, top: ground + 64 })
    }

    const tiers = [
      { r: 24, h: 130 },
      { r: 16, h: 95 },
      { r: 9, h: 65 },
    ]
    let y = ground
    for (const t of tiers) {
      this.cyl(spec.x, y + t.h / 2, spec.z, t.r * 0.72, t.r, t.h, 6, glass)
      // 단 경계마다 발광 링
      this.cyl(spec.x, y + t.h, spec.z, t.r * 0.76, t.r * 0.76, 1.4, 6, ringMat)
      this.boxes.push({ x: spec.x, z: spec.z, hw: t.r * 0.9, hd: t.r * 0.9, top: y + t.h })
      y += t.h
    }
    this.cyl(spec.x, y + 27, spec.z, 0.25, 2.4, 54, 6, '#9fb3bf')
    this.boxes.push({ x: spec.x, z: spec.z, hw: 2, hd: 2, top: y + 54 })
    this.cyl(spec.x, y + 55, spec.z, 1, 1, 1.6, 6, this.mat('#ff3b30', {
      emissive: '#ff3b30',
      emissiveIntensity: isNight ? 1 : 0.4,
    }))
  }

  // 에펠탑: 안쪽으로 기운 다리 4개 + 아치 보강재 + 전망대 2단 + 격자 첨탑
  buildEiffel(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const iron = this.mat('#7a5f43', {
      emissive: isNight ? '#ffca5f' : '#000000',
      emissiveIntensity: isNight ? 0.45 : 0,
    })

    const legH = 58
    const spread0 = 23
    const spread1 = 7.5
    const lean = Math.atan2(spread0 - spread1, legH)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const midOff = (spread0 + spread1) / 2
      const leg = this.box(
        spec.x + sx * midOff,
        ground + legH / 2,
        spec.z + sz * midOff,
        3.6,
        legH + 8,
        3.6,
        iron,
      )
      // 위가 안쪽(중심)으로 모이게 기울임
      leg.rotation.x = -sz * lean
      leg.rotation.z = sx * lean
      this.boxes.push({
        x: spec.x + sx * spread0,
        z: spec.z + sz * spread0,
        hw: 3.2,
        hd: 3.2,
        top: ground + legH * 0.55,
      })
    }
    // 다리 사이 아치 보강재 (사각 링 2단)
    for (const [ay, off, th] of [
      [ground + 20, spread0 * 0.68, 2.2],
      [ground + 40, spread0 * 0.45, 1.8],
    ]) {
      for (const side of [-1, 1]) {
        this.box(spec.x + side * off, ay, spec.z, th, th, off * 2 + th, iron)
        this.box(spec.x, ay, spec.z + side * off, off * 2 + th, th, th, iron)
      }
    }

    // 1층/2층 전망대 (테두리가 살짝 넓음)
    this.box(spec.x, ground + legH, spec.z, 32, 3.2, 32, iron)
    this.box(spec.x, ground + legH + 2.6, spec.z, 26, 1.4, 26, iron)
    this.box(spec.x, ground + legH + 38, spec.z, 18, 2.8, 18, iron)

    // 상부 격자 첨탑 (4각 뿔대 2단) + 꼭대기 전망대 + 안테나
    const upper = this.cyl(spec.x, ground + legH + 40, spec.z, 3.4, 7, 76, 4, iron)
    upper.rotation.y = Math.PI / 4
    const tip = this.cyl(spec.x, ground + legH + 80, spec.z, 1.2, 3.2, 14, 4, iron)
    tip.rotation.y = Math.PI / 4
    this.box(spec.x, ground + legH + 88, spec.z, 6, 2, 6, iron)
    this.cyl(spec.x, ground + legH + 97, spec.z, 0.18, 0.65, 16, 5, iron)
    this.cyl(spec.x, ground + legH + 105.5, spec.z, 0.7, 0.7, 1.2, 6, this.mat('#ff3b30', {
      emissive: '#ff3b30',
      emissiveIntensity: isNight ? 1 : 0.4,
    }))

    this.boxes.push(
      { x: spec.x, z: spec.z, hw: 16, hd: 16, top: ground + legH + 3, bottom: ground + legH - 2 },
      { x: spec.x, z: spec.z, hw: 7, hd: 7, top: ground + legH + 105, bottom: ground + legH + 3 },
    )
  }

  // 스탈린 첨탑: 3단 웨딩케이크 + 모서리 작은 탑 4개 + 금 첨탑 + 별
  buildStalin(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const stone = this.mat('#b8aa96')
    const stoneDark = this.mat('#a2947f')
    const gold = this.mat('#d8b02f', {
      emissive: '#d8b02f',
      emissiveIntensity: isNight ? 0.7 : 0.25,
    })
    const tiers = [
      { w: 64, h: 64 },
      { w: 42, h: 52 },
      { w: 22, h: 44 },
    ]
    let y = ground
    for (const [ti, t] of tiers.entries()) {
      this.box(spec.x, y + t.h / 2, spec.z, t.w, t.h, t.w, stone)
      this.boxes.push({ x: spec.x, z: spec.z, hw: t.w / 2, hd: t.w / 2, top: y + t.h })
      // 1단 꼭대기 모서리엔 작은 탑 4개
      if (ti === 0) {
        for (const [sx, sz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          const tx = spec.x + (sx * (t.w - 8)) / 2
          const tz2 = spec.z + (sz * (t.w - 8)) / 2
          this.box(tx, y + t.h + 7, tz2, 6, 14, 6, stoneDark)
          this.cyl(tx, y + t.h + 17.5, tz2, 0.2, 1.6, 7, 6, gold)
          this.boxes.push({ x: tx, z: tz2, hw: 3.5, hd: 3.5, top: y + t.h + 21 })
        }
      }
      y += t.h
    }
    this.cyl(spec.x, y + 19, spec.z, 0.3, 3, 38, 6, gold)
    // 꼭대기 별 (8면체)
    const star = new THREE.Mesh(this.geo(new THREE.OctahedronGeometry(2.6)), gold)
    star.position.set(spec.x, y + 40, spec.z)
    this.group.add(star)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 2.2, hd: 2.2, top: y + 42 })
  }

  // 그리스도상: 2단 받침 + 치마처럼 퍼지는 몸 + 양팔 + 머리. 밤엔 하얗게 빛남
  buildCristo(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const white = this.mat('#e8e4da', {
      emissive: isNight ? '#fff3d0' : '#000000',
      emissiveIntensity: isNight ? 0.55 : 0,
    })
    this.box(spec.x, ground + 5, spec.z, 14, 10, 14, '#a89f90')
    this.box(spec.x, ground + 12.5, spec.z, 9, 5, 9, '#948b7c')
    // 몸통 (아래로 퍼지는 로브)
    this.cyl(spec.x, ground + 26, spec.z, 3.2, 5.6, 22, 6, white)
    this.box(spec.x, ground + 40, spec.z, 6, 7, 5, white)
    // 양팔 (살짝 아래로 처지게)
    for (const side of [-1, 1]) {
      const arm = this.box(spec.x + side * 10.5, ground + 42.5, spec.z, 19, 3.4, 3.4, white)
      arm.rotation.z = side * 0.06
    }
    const head = new THREE.Mesh(this.geo(new THREE.SphereGeometry(2.8, 7, 6)), white)
    head.position.set(spec.x, ground + 47, spec.z)
    this.group.add(head)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 20, hd: 3.5, top: ground + 50 })
  }

  // 오페라하우스: 2단 포디움 + 큰 쉘 줄 + 작은 쉘 줄 (실물처럼 두 세트)
  buildOpera(spec) {
    const shellMat = this.mat('#f4f1e8', { side: THREE.DoubleSide })
    const shellDark = this.mat('#e3dfd2', { side: THREE.DoubleSide })

    this.box(spec.x, 2, spec.z, 76, 4, 48, '#cfc9b8')
    this.box(spec.x, 5, spec.z, 62, 3, 38, '#dcd6c6')

    const shell = (px, pz, r, m) => {
      const s = new THREE.Mesh(
        this.geo(new THREE.SphereGeometry(r, 10, 8, 0, Math.PI, 0, Math.PI / 2)),
        m,
      )
      s.position.set(px, 6.5, pz)
      s.rotation.y = -Math.PI / 2
      s.rotation.x = -0.18
      this.group.add(s)
    }
    // 큰 쉘 4장 + 뒤에 작은 쉘 3장
    for (let i = 0; i < 4; i++) shell(spec.x - 24 + i * 15, spec.z - 8, 22 - i * 3.6, shellMat)
    for (let i = 0; i < 3; i++) shell(spec.x - 12 + i * 12, spec.z + 12, 13 - i * 2.6, shellDark)

    this.boxes.push({ x: spec.x, z: spec.z, hw: 38, hd: 24, top: 28 })
  }

  // 테이블마운틴 케이블카: 상부역 + 산 아래로 내려가는 케이블 + 곤돌라 2개 + 하부역
  buildCableStation(spec) {
    const topG = terrainHeight(spec.x, spec.z)
    this.box(spec.x, topG + 4.5, spec.z, 15, 9, 12, '#8a9199')
    this.box(spec.x, topG + 9.6, spec.z, 17, 1.4, 14, '#5b6672')
    this.boxes.push({ x: spec.x, z: spec.z, hw: 8.5, hd: 7, top: topG + 10.3 })

    // 하부역: 동쪽 산기슭
    const bx = spec.x + 170
    const bz = spec.z + 40
    const botG = terrainHeight(bx, bz)
    this.box(bx, botG + 3.5, bz, 10, 7, 9, '#8a9199')
    this.box(bx, botG + 7.4, bz, 12, 1.2, 11, '#5b6672')

    // 케이블 (상부역 → 하부역 직선) + 곤돌라 2개
    const topY = topG + 9
    const botY = botG + 7
    const dx = bx - spec.x
    const dz = bz - spec.z
    const len = Math.hypot(dx, dz, topY - botY)
    const cable = this.box(
      (spec.x + bx) / 2,
      (topY + botY) / 2,
      (spec.z + bz) / 2,
      0.35,
      0.35,
      len,
      '#4b555e',
    )
    cable.lookAt(bx, botY, bz)
    for (const f of [0.32, 0.72]) {
      this.box(
        spec.x + dx * f,
        topY + (botY - topY) * f - 2,
        spec.z + dz * f,
        2.6,
        3,
        2.6,
        '#c8452f',
      )
    }
  }

  collides(x, y, z) {
    for (const b of this.boxes) {
      if (
        y < b.top + 0.4 &&
        y > (b.bottom ?? -Infinity) &&
        Math.abs(x - b.x) < b.hw + 0.8 &&
        Math.abs(z - b.z) < b.hd + 0.8
      ) {
        return true
      }
    }
    return false
  }

  dispose() {
    this.scene.remove(this.group)
    for (const d of this.disposables) d.dispose()
  }
}
