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
