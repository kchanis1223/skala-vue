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

  // 남산타워: 산꼭대기 받침 + 기둥 + 전망대 원반 + 첨탑
  buildNTower(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group

    const base = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(9, 12, 8, 8)),
      this.mat('#8a9199'),
    )
    base.position.set(spec.x, ground + 4, spec.z)

    const shaft = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(3.4, 4.4, 48, 8)),
      this.mat('#cfd6dc'),
    )
    shaft.position.set(spec.x, ground + 32, spec.z)

    const deck = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(10.5, 8.6, 10, 10)),
      this.mat('#e8ecef', {
        emissive: isNight ? '#ffd97a' : '#000000',
        emissiveIntensity: isNight ? 0.5 : 0,
      }),
    )
    deck.position.set(spec.x, ground + 61, spec.z)

    const spire = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(0.2, 0.9, 30, 6)),
      this.mat('#d64541'),
    )
    spire.position.set(spec.x, ground + 81, spec.z)

    g.add(base, shaft, deck, spire)

    this.boxes.push(
      { x: spec.x, z: spec.z, hw: 4.5, hd: 4.5, top: ground + 56 },
      { x: spec.x, z: spec.z, hw: 10.5, hd: 10.5, top: ground + 66, bottom: ground + 56 },
      { x: spec.x, z: spec.z, hw: 1.1, hd: 1.1, top: ground + 96, bottom: ground + 66 },
    )
  }

  // 광안대교풍 현수교: 바다 위 긴 상판 + 주탑 2개 + 사선 케이블
  // 상판 아래로 지나가는 것도 가능 (deckY 높이만 피하면 됨)
  buildGwangan(spec, isNight) {
    const g = this.group
    const deckMat = this.mat('#5b6672')
    const towerMat = this.mat('#dfe5ea')
    const cableMat = this.mat('#e8edf1', {
      emissive: isNight ? '#7fd8ff' : '#000000',
      emissiveIntensity: isNight ? 0.7 : 0,
    })

    const deck = new THREE.Mesh(this.geo(new THREE.BoxGeometry(12, 1.6, spec.len)), deckMat)
    deck.position.set(spec.x, spec.deckY, spec.z)
    g.add(deck)
    this.boxes.push({
      x: spec.x,
      z: spec.z,
      hw: 6,
      hd: spec.len / 2,
      top: spec.deckY + 1,
      bottom: spec.deckY - 1.2,
    })

    // 주탑 2개 (H형: 기둥 둘 + 보)
    const towerH = 64
    for (const tz of [spec.z - spec.len * 0.25, spec.z + spec.len * 0.25]) {
      for (const dx of [-5, 5]) {
        const leg = new THREE.Mesh(this.geo(new THREE.BoxGeometry(2.2, towerH, 2.6)), towerMat)
        leg.position.set(spec.x + dx, spec.deckY + towerH / 2 - 14, tz)
        g.add(leg)
      }
      const beam = new THREE.Mesh(this.geo(new THREE.BoxGeometry(12.6, 2.2, 2.6)), towerMat)
      beam.position.set(spec.x, spec.deckY + towerH - 16, tz)
      g.add(beam)
      this.boxes.push({
        x: spec.x,
        z: tz,
        hw: 6.5,
        hd: 1.7,
        top: spec.deckY + towerH - 14,
        bottom: spec.deckY - 14,
      })

      // 주탑 꼭대기에서 상판으로 내려가는 사선 케이블 (앞뒤 2가닥씩)
      for (const dir of [-1, 1]) {
        const span = spec.len * 0.22
        const cable = new THREE.Mesh(this.geo(new THREE.BoxGeometry(0.5, 0.5, span)), cableMat)
        const topY = spec.deckY + towerH - 16
        cable.position.set(spec.x, (topY + spec.deckY + 1) / 2, tz + (dir * span) / 2)
        cable.rotation.x = dir * Math.atan2(topY - spec.deckY - 1, span)
        g.add(cable)
      }
    }
  }

  // 엠파이어풍 계단식 첨탑 타워. 도시에서 제일 높음
  buildEmpire(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const stone = this.mat('#d9d2c4')
    const tiers = [
      { w: 52, h: 136 },
      { w: 37, h: 78 },
      { w: 24, h: 50 },
      { w: 12, h: 22 },
    ]
    let y = ground
    for (const t of tiers) {
      const box = new THREE.Mesh(this.geo(new THREE.BoxGeometry(t.w, t.h, t.w)), stone)
      box.position.set(spec.x, y + t.h / 2, spec.z)
      g.add(box)
      this.boxes.push({ x: spec.x, z: spec.z, hw: t.w / 2, hd: t.w / 2, top: y + t.h })
      y += t.h
    }
    const spire = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(0.35, 1.5, 32, 6)),
      this.mat('#aeb6bd'),
    )
    spire.position.set(spec.x, y + 16, spec.z)
    g.add(spire)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 1.5, hd: 1.5, top: y + 32 })

    // 꼭대기 항공 장애등
    const beacon = new THREE.Mesh(
      this.geo(new THREE.SphereGeometry(1, 6, 6)),
      this.mat('#ff3b30', { emissive: '#ff3b30', emissiveIntensity: isNight ? 1 : 0.4 }),
    )
    beacon.position.set(spec.x, y + 33, spec.z)
    g.add(beacon)
  }

  // 부르즈풍 초고층. 발사 타워 3배 높이로 스카이라인을 지배함
  buildBurj(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const glass = this.mat('#bcd8e8', {
      emissive: isNight ? '#ffd97a' : '#000000',
      emissiveIntensity: isNight ? 0.3 : 0,
    })
    // 6각 기둥이 위로 갈수록 좁아지는 3단 테이퍼
    const tiers = [
      { r: 26, h: 120 },
      { r: 17, h: 90 },
      { r: 9, h: 60 },
    ]
    let y = ground
    for (const t of tiers) {
      const seg = new THREE.Mesh(
        this.geo(new THREE.CylinderGeometry(t.r * 0.72, t.r, t.h, 6)),
        glass,
      )
      seg.position.set(spec.x, y + t.h / 2, spec.z)
      g.add(seg)
      this.boxes.push({ x: spec.x, z: spec.z, hw: t.r * 0.9, hd: t.r * 0.9, top: y + t.h })
      y += t.h
    }
    const spire = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(0.25, 2.2, 45, 6)),
      this.mat('#9fb3bf'),
    )
    spire.position.set(spec.x, y + 22.5, spec.z)
    g.add(spire)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 2, hd: 2, top: y + 45 })

    const beacon = new THREE.Mesh(
      this.geo(new THREE.SphereGeometry(1, 6, 6)),
      this.mat('#ff3b30', { emissive: '#ff3b30', emissiveIntensity: isNight ? 1 : 0.4 }),
    )
    beacon.position.set(spec.x, y + 46, spec.z)
    g.add(beacon)
  }

  // 에펠탑. 다리 4개가 벌어져 있어서 아치 아래로 저공 통과가 됨
  buildEiffel(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const iron = this.mat('#7a5f43', {
      emissive: isNight ? '#ffca5f' : '#000000',
      emissiveIntensity: isNight ? 0.45 : 0,
    })

    // 벌어진 다리 4개 (아래 넓고 위에서 모임)
    const legH = 56
    const spread0 = 21
    const spread1 = 7
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const leg = new THREE.Mesh(this.geo(new THREE.BoxGeometry(3.4, legH + 8, 3.4)), iron)
      const midOff = (spread0 + spread1) / 2
      leg.position.set(spec.x + sx * midOff, ground + legH / 2, spec.z + sz * midOff)
      // 다리를 안쪽으로 기울임
      const lean = Math.atan2(spread0 - spread1, legH)
      leg.rotation.x = sz * lean
      leg.rotation.z = -sx * lean
      g.add(leg)
      // 다리 하부 충돌 (아치 가운데는 뚫려 있음)
      this.boxes.push({
        x: spec.x + sx * spread0,
        z: spec.z + sz * spread0,
        hw: 3,
        hd: 3,
        top: ground + legH * 0.55,
      })
    }

    // 1층/2층 전망대
    const deck1 = new THREE.Mesh(this.geo(new THREE.BoxGeometry(30, 3, 30)), iron)
    deck1.position.set(spec.x, ground + legH, spec.z)
    const deck2 = new THREE.Mesh(this.geo(new THREE.BoxGeometry(17, 2.6, 17)), iron)
    deck2.position.set(spec.x, ground + legH + 36, spec.z)
    g.add(deck1, deck2)

    // 상부 첨탑 (4각 뿔대)
    const upper = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(2, 6.6, 72, 4)), iron)
    upper.rotation.y = Math.PI / 4
    upper.position.set(spec.x, ground + legH + 36, spec.z)
    const antenna = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.18, 0.6, 18, 5)), iron)
    antenna.position.set(spec.x, ground + legH + 72 + 9, spec.z)
    g.add(upper, antenna)

    // 상부 충돌 (전망대 위쪽 몸통 전체)
    this.boxes.push(
      { x: spec.x, z: spec.z, hw: 15, hd: 15, top: ground + legH + 2, bottom: ground + legH - 2 },
      { x: spec.x, z: spec.z, hw: 6, hd: 6, top: ground + legH + 90, bottom: ground + legH },
    )
  }

  // 스탈린 양식 첨탑 빌딩 (웨딩케이크식 3단 + 금색 첨탑)
  buildStalin(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const stone = this.mat('#b8aa96')
    const tiers = [
      { w: 58, h: 60 },
      { w: 38, h: 48 },
      { w: 20, h: 40 },
    ]
    let y = ground
    for (const t of tiers) {
      const box = new THREE.Mesh(this.geo(new THREE.BoxGeometry(t.w, t.h, t.w)), stone)
      box.position.set(spec.x, y + t.h / 2, spec.z)
      g.add(box)
      this.boxes.push({ x: spec.x, z: spec.z, hw: t.w / 2, hd: t.w / 2, top: y + t.h })
      y += t.h
    }
    const spire = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(0.25, 2.6, 34, 6)),
      this.mat('#d8b02f', { emissive: '#d8b02f', emissiveIntensity: isNight ? 0.7 : 0.25 }),
    )
    spire.position.set(spec.x, y + 17, spec.z)
    g.add(spire)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 2, hd: 2, top: y + 34 })
  }

  // 산 정상의 양팔 벌린 상. 밤엔 위에서 빛남
  buildCristo(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const white = this.mat('#e8e4da', {
      emissive: isNight ? '#fff3d0' : '#000000',
      emissiveIntensity: isNight ? 0.55 : 0,
    })
    const base = new THREE.Mesh(this.geo(new THREE.BoxGeometry(10, 14, 10)), this.mat('#a89f90'))
    base.position.set(spec.x, ground + 7, spec.z)
    const body = new THREE.Mesh(this.geo(new THREE.BoxGeometry(5, 28, 5)), white)
    body.position.set(spec.x, ground + 28, spec.z)
    const arms = new THREE.Mesh(this.geo(new THREE.BoxGeometry(32, 4, 4)), white)
    arms.position.set(spec.x, ground + 35, spec.z)
    const head = new THREE.Mesh(this.geo(new THREE.SphereGeometry(2.4, 6, 6)), white)
    head.position.set(spec.x, ground + 44.5, spec.z)
    g.add(base, body, arms, head)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 16, hd: 3, top: ground + 46 })
  }

  // 오페라하우스: 물가에 겹치는 흰 쉘 지붕
  buildOpera(spec) {
    const g = this.group
    const shellMat = this.mat('#f4f1e8', { side: THREE.DoubleSide })

    const podium = new THREE.Mesh(this.geo(new THREE.BoxGeometry(62, 5, 40)), this.mat('#cfc9b8'))
    podium.position.set(spec.x, 2.5, spec.z)
    g.add(podium)
    // 쉘 4장: 반구를 4분의 1만 잘라서 겹쳐 세움
    for (let i = 0; i < 4; i++) {
      const r = 20 - i * 3.5
      const shell = new THREE.Mesh(
        this.geo(new THREE.SphereGeometry(r, 10, 8, 0, Math.PI, 0, Math.PI / 2)),
        shellMat,
      )
      shell.position.set(spec.x - 20 + i * 13, 5, spec.z)
      shell.rotation.y = -Math.PI / 2
      shell.rotation.x = -0.18
      g.add(shell)
    }
    this.boxes.push({ x: spec.x, z: spec.z, hw: 31, hd: 20, top: 26 })
  }

  // 테이블마운틴 정상의 케이블카 상부역
  buildCableStation(spec) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const hut = new THREE.Mesh(this.geo(new THREE.BoxGeometry(14, 8, 11)), this.mat('#8a9199'))
    hut.position.set(spec.x, ground + 4, spec.z)
    const roof = new THREE.Mesh(this.geo(new THREE.BoxGeometry(16, 1.2, 13)), this.mat('#5b6672'))
    roof.position.set(spec.x, ground + 8.6, spec.z)
    g.add(hut, roof)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 8, hd: 6.5, top: ground + 9.2 })
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
