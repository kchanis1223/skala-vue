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
