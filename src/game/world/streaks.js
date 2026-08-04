import * as THREE from 'three'
import { Ribbon } from './ribbon'

const BOX = 100 // 기체 주변 이 범위에서 기류 선을 돌려씀

// 공기 흐름을 보여주는 가는 선들. 입자는 바람 따라 떠다니고
// 기체가 그 사이를 지나가면서 속도감이 생김
export class WindStreaks {
  constructor(scene, count = 80) {
    this.scene = scene
    this.count = count
    this.bases = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      this.bases[i * 3] = (Math.random() - 0.5) * BOX
      this.bases[i * 3 + 1] = 100 + (Math.random() - 0.5) * BOX
      this.bases[i * 3 + 2] = (Math.random() - 0.5) * BOX
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3))
    this.material = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.32,
    })
    this.lines = new THREE.LineSegments(geo, this.material)
    this.lines.frustumCulled = false
    scene.add(this.lines)
  }

  // vel: 기체의 지면 속도, wind: 바람 벡터
  update(center, wind, vel, dt) {
    // 기체가 느끼는 상대 기류 = 바람 - 기체 속도
    const ax = wind.x - vel.x
    const ay = -vel.y
    const az = wind.z - vel.z
    const mag = Math.hypot(ax, ay, az) || 1
    // 빠를수록 선이 길어지고 진해짐
    const len = Math.min(mag * 0.28, 8)
    this.material.opacity = 0.15 + Math.min(mag / 25, 1) * 0.42
    const dx = (ax / mag) * len
    const dy = (ay / mag) * len
    const dz = (az / mag) * len

    const pos = this.lines.geometry.attributes.position
    for (let i = 0; i < this.count; i++) {
      // 공기 입자는 바람 따라 흘러감
      let bx = this.bases[i * 3] + wind.x * dt
      let by = this.bases[i * 3 + 1]
      let bz = this.bases[i * 3 + 2] + wind.z * dt

      // 기체에서 멀어지면 근처로 재활용
      if (
        Math.abs(bx - center.x) > BOX / 2 ||
        Math.abs(by - center.y) > BOX / 2 ||
        Math.abs(bz - center.z) > BOX / 2
      ) {
        bx = center.x + (Math.random() - 0.5) * BOX
        by = center.y + (Math.random() - 0.5) * BOX
        bz = center.z + (Math.random() - 0.5) * BOX
      }
      this.bases[i * 3] = bx
      this.bases[i * 3 + 1] = by
      this.bases[i * 3 + 2] = bz

      pos.setXYZ(i * 2, bx, by, bz)
      pos.setXYZ(i * 2 + 1, bx + dx, by + dy, bz + dz)
    }
    pos.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.lines)
    this.lines.geometry.dispose()
    this.material.dispose()
  }
}

const GUST_POINTS = 14

// 측풍이 날개 아래를 치고 올라가는 잔결. 선 대신 얇은 리본이라 두께감이 있음
export class CrossGusts {
  constructor(scene, count = 8) {
    this.items = []
    for (let i = 0; i < count; i++) {
      this.items.push({
        ribbon: new Ribbon(scene, GUST_POINTS, {
          alphaFn: (t) => Math.sin(Math.PI * t),
          widthFn: (t) => 0.08 + Math.sin(Math.PI * t) * 0.16,
        }),
        base: new THREE.Vector3(),
        phase: Math.random() * Math.PI * 2,
        age: 10, // 크게 시작해서 첫 프레임에 재배치되게
        pts: Array.from({ length: GUST_POINTS }, () => new THREE.Vector3()),
      })
    }
  }

  respawn(item, center, ux, uz) {
    // 바람 불어오는 쪽(-u)에서 시작, 날개보다 약간 아래
    item.base.set(
      center.x - ux * (5 + Math.random() * 7) + (Math.random() - 0.5) * 14,
      center.y - 1 - Math.random() * 2.5,
      center.z - uz * (5 + Math.random() * 7) + (Math.random() - 0.5) * 14,
    )
    item.age = 0
  }

  update(center, wind, crosswind, camPos, dt) {
    const strength = Math.min(Math.abs(crosswind) / 7, 1)
    const mag = Math.hypot(wind.x, wind.z) || 1
    const ux = wind.x / mag
    const uz = wind.z / mag
    const px = -uz
    const pz = ux

    for (const item of this.items) {
      item.ribbon.material.opacity = strength * 0.45
      if (strength < 0.08) continue

      item.age += dt
      item.phase += dt * 3
      // 바람보다 살짝 빠르게 흘러서 기체 밑을 스침
      item.base.x += wind.x * 2 * dt
      item.base.y += 0.7 * dt
      item.base.z += wind.z * 2 * dt

      const passed = (item.base.x - center.x) * ux + (item.base.z - center.z) * uz
      if (passed > 9 || item.age > 3) this.respawn(item, center, ux, uz)

      for (let j = 0; j < GUST_POINTS; j++) {
        const t = j / (GUST_POINTS - 1)
        const wave = Math.sin(item.phase + j * 0.7) * 0.25
        item.pts[j].set(
          item.base.x + ux * j * 0.4 + px * wave,
          item.base.y + t * 1.2, // 끝으로 갈수록 위로 쓸려 올라감
          item.base.z + uz * j * 0.4 + pz * wave,
        )
      }
      item.ribbon.rebuild(item.pts, camPos)
    }
  }

  dispose() {
    for (const item of this.items) item.ribbon.dispose()
  }
}
