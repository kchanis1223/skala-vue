import * as THREE from 'three'
import { terrainHeight } from './terrain'

// 도시별 랜드마크 모델. 스타일에 landmark 정의가 있으면 그걸 세움
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
    if (spec?.type === 'stalin') for (const t of spec.towers) this.buildStalin(t, isNight)
    if (spec?.type === 'cristo') this.buildCristo(spec, isNight)
    if (spec?.type === 'sydney') this.buildSydney(spec, isNight)
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

    const base = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(7, 9, 6, 8)), this.mat('#8a9199'))
    base.position.set(spec.x, ground + 3, spec.z)

    const shaft = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(2.4, 3.1, 34, 8)),
      this.mat('#cfd6dc'),
    )
    shaft.position.set(spec.x, ground + 23, spec.z)

    const deck = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(7.5, 6.2, 7, 10)),
      this.mat('#e8ecef', {
        emissive: isNight ? '#ffd97a' : '#000000',
        emissiveIntensity: isNight ? 0.5 : 0,
      }),
    )
    deck.position.set(spec.x, ground + 43.5, spec.z)

    const spire = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(0.16, 0.7, 22, 6)),
      this.mat('#d64541'),
    )
    spire.position.set(spec.x, ground + 58, spec.z)

    g.add(base, shaft, deck, spire)

    this.boxes.push(
      { x: spec.x, z: spec.z, hw: 3.2, hd: 3.2, top: ground + 40 },
      { x: spec.x, z: spec.z, hw: 7.5, hd: 7.5, top: ground + 47, bottom: ground + 40 },
      { x: spec.x, z: spec.z, hw: 0.9, hd: 0.9, top: ground + 69, bottom: ground + 47 },
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
    const towerH = 52
    for (const tz of [spec.z - spec.len * 0.25, spec.z + spec.len * 0.25]) {
      for (const dx of [-5, 5]) {
        const leg = new THREE.Mesh(this.geo(new THREE.BoxGeometry(2, towerH, 2.4)), towerMat)
        leg.position.set(spec.x + dx, spec.deckY + towerH / 2 - 14, tz)
        g.add(leg)
      }
      const beam = new THREE.Mesh(this.geo(new THREE.BoxGeometry(12.4, 2, 2.4)), towerMat)
      beam.position.set(spec.x, spec.deckY + towerH - 16, tz)
      g.add(beam)
      this.boxes.push({
        x: spec.x,
        z: tz,
        hw: 6.5,
        hd: 1.6,
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
      { w: 42, h: 110 },
      { w: 30, h: 62 },
      { w: 19, h: 40 },
      { w: 10, h: 18 },
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
      this.geo(new THREE.CylinderGeometry(0.3, 1.2, 26, 6)),
      this.mat('#aeb6bd'),
    )
    spire.position.set(spec.x, y + 13, spec.z)
    g.add(spire)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 1.2, hd: 1.2, top: y + 26 })

    // 꼭대기 항공 장애등
    const beacon = new THREE.Mesh(
      this.geo(new THREE.SphereGeometry(0.8, 6, 6)),
      this.mat('#ff3b30', { emissive: '#ff3b30', emissiveIntensity: isNight ? 1 : 0.4 }),
    )
    beacon.position.set(spec.x, y + 26.8, spec.z)
    g.add(beacon)
  }

  // 부르즈풍 초고층. 발사 타워보다 3배 높아서 스카이라인을 지배함
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
      const seg = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(t.r * 0.72, t.r, t.h, 6)), glass)
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
    const legH = 40
    const spread0 = 15
    const spread1 = 5
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const leg = new THREE.Mesh(this.geo(new THREE.BoxGeometry(2.6, legH + 6, 2.6)), iron)
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
        hw: 2.4,
        hd: 2.4,
        top: ground + legH * 0.55,
      })
    }

    // 1층/2층 전망대
    const deck1 = new THREE.Mesh(this.geo(new THREE.BoxGeometry(22, 2.4, 22)), iron)
    deck1.position.set(spec.x, ground + legH, spec.z)
    const deck2 = new THREE.Mesh(this.geo(new THREE.BoxGeometry(13, 2, 13)), iron)
    deck2.position.set(spec.x, ground + 66, spec.z)
    g.add(deck1, deck2)

    // 상부 첨탑 (4각 뿔대)
    const upper = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(1.6, 5, 52, 4)), iron)
    upper.rotation.y = Math.PI / 4
    upper.position.set(spec.x, ground + legH + 26, spec.z)
    const antenna = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.15, 0.5, 14, 5)), iron)
    antenna.position.set(spec.x, ground + legH + 52 + 7, spec.z)
    g.add(upper, antenna)

    // 상부 충돌 (전망대 위쪽 몸통 전체)
    this.boxes.push(
      { x: spec.x, z: spec.z, hw: 11, hd: 11, top: ground + legH + 2, bottom: ground + legH - 2 },
      { x: spec.x, z: spec.z, hw: 4.5, hd: 4.5, top: ground + legH + 66, bottom: ground + legH },
    )
  }

  // 스탈린 양식 첨탑 빌딩 (웨딩케이크식 3단 + 금색 첨탑)
  buildStalin(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const stone = this.mat('#b8aa96')
    const tiers = [
      { w: 40, h: 42 },
      { w: 26, h: 34 },
      { w: 14, h: 28 },
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
      this.geo(new THREE.CylinderGeometry(0.2, 2, 24, 6)),
      this.mat('#d8b02f', { emissive: '#d8b02f', emissiveIntensity: isNight ? 0.7 : 0.25 }),
    )
    spire.position.set(spec.x, y + 12, spec.z)
    g.add(spire)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 1.6, hd: 1.6, top: y + 24 })
  }

  // 산 정상의 양팔 벌린 상. 밤엔 위에서 빛남
  buildCristo(spec, isNight) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const white = this.mat('#e8e4da', {
      emissive: isNight ? '#fff3d0' : '#000000',
      emissiveIntensity: isNight ? 0.55 : 0,
    })
    const base = new THREE.Mesh(this.geo(new THREE.BoxGeometry(6, 8, 6)), this.mat('#a89f90'))
    base.position.set(spec.x, ground + 4, spec.z)
    const body = new THREE.Mesh(this.geo(new THREE.BoxGeometry(3, 16, 3)), white)
    body.position.set(spec.x, ground + 16, spec.z)
    const arms = new THREE.Mesh(this.geo(new THREE.BoxGeometry(18, 2.4, 2.4)), white)
    arms.position.set(spec.x, ground + 20, spec.z)
    const head = new THREE.Mesh(this.geo(new THREE.SphereGeometry(1.4, 6, 6)), white)
    head.position.set(spec.x, ground + 25.4, spec.z)
    g.add(base, body, arms, head)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 9, hd: 2, top: ground + 26 })
  }

  // 오페라하우스(겹치는 쉘 지붕) + 만 위 하버브리지(아치)
  buildSydney(spec, isNight) {
    const g = this.group
    const shellMat = this.mat('#f4f1e8', { side: THREE.DoubleSide })

    // 물가 받침 플랫폼
    const podium = new THREE.Mesh(this.geo(new THREE.BoxGeometry(40, 4, 26)), this.mat('#cfc9b8'))
    podium.position.set(spec.operaX, 2, spec.operaZ)
    g.add(podium)
    // 쉘 3장: 반구를 4분의 1만 잘라서 겹쳐 세움
    for (let i = 0; i < 3; i++) {
      const r = 13 - i * 3
      const shell = new THREE.Mesh(
        this.geo(new THREE.SphereGeometry(r, 10, 8, 0, Math.PI, 0, Math.PI / 2)),
        shellMat,
      )
      shell.position.set(spec.operaX - 12 + i * 11, 4, spec.operaZ)
      shell.rotation.y = -Math.PI / 2
      shell.rotation.x = -0.18
      g.add(shell)
    }
    this.boxes.push({ x: spec.operaX, z: spec.operaZ, hw: 20, hd: 13, top: 17 })

    // 하버브리지: 만 위 상판 + 반원 아치 2개
    const deckY = 14
    const deck = new THREE.Mesh(
      this.geo(new THREE.BoxGeometry(spec.bridgeLen, 1.5, 11)),
      this.mat('#5b6672'),
    )
    deck.position.set(spec.bridgeX, deckY, spec.bridgeZ)
    g.add(deck)
    this.boxes.push({
      x: spec.bridgeX,
      z: spec.bridgeZ,
      hw: spec.bridgeLen / 2,
      hd: 5.5,
      top: deckY + 0.8,
      bottom: deckY - 1.2,
    })
    const archMat = this.mat('#3f4a52', {
      emissive: isNight ? '#7fd8ff' : '#000000',
      emissiveIntensity: isNight ? 0.5 : 0,
    })
    for (const dz of [-5, 5]) {
      const arch = new THREE.Mesh(
        this.geo(new THREE.TorusGeometry(spec.bridgeLen * 0.36, 1.1, 6, 24, Math.PI)),
        archMat,
      )
      arch.position.set(spec.bridgeX, deckY, spec.bridgeZ + dz)
      g.add(arch)
    }
    // 아치 정점 충돌 (대충 가운데 상단만)
    this.boxes.push({
      x: spec.bridgeX,
      z: spec.bridgeZ,
      hw: spec.bridgeLen * 0.2,
      hd: 7,
      top: deckY + spec.bridgeLen * 0.36 + 2,
      bottom: deckY + spec.bridgeLen * 0.2,
    })
  }

  // 테이블마운틴 정상의 케이블카 상부역
  buildCableStation(spec) {
    const ground = terrainHeight(spec.x, spec.z)
    const g = this.group
    const hut = new THREE.Mesh(this.geo(new THREE.BoxGeometry(10, 6, 8)), this.mat('#8a9199'))
    hut.position.set(spec.x, ground + 3, spec.z)
    const roof = new THREE.Mesh(this.geo(new THREE.BoxGeometry(12, 1, 10)), this.mat('#5b6672'))
    roof.position.set(spec.x, ground + 6.5, spec.z)
    g.add(hut, roof)
    this.boxes.push({ x: spec.x, z: spec.z, hw: 6, hd: 5, top: ground + 7 })
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
