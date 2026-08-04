import * as THREE from 'three'

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
    const len = Math.min(mag * 0.22, 12)
    this.material.opacity = 0.15 + Math.min(mag / 45, 1) * 0.42
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

const GUST_BOX = 26

// 측풍이 날개 아래를 치고 지나가는 걸 보여주는 짧은 기류 선들
// 바람 불어오는 쪽 아래에서 생겨서 바람 따라 기체 밑을 스치고 사라짐
export class CrossGusts {
  constructor(scene, count = 14) {
    this.scene = scene
    this.count = count
    this.bases = new Float32Array(count * 3)
    this.ages = new Float32Array(count)
    for (let i = 0; i < count; i++) this.ages[i] = Math.random() * 2

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3))
    this.material = new THREE.LineBasicMaterial({
      color: '#eaf6ff',
      transparent: true,
      opacity: 0,
    })
    this.lines = new THREE.LineSegments(geo, this.material)
    this.lines.frustumCulled = false
    scene.add(this.lines)
  }

  respawn(i, center, ux, uz) {
    // 바람 불어오는 쪽(-u)에서 시작, 날개보다 약간 아래
    this.bases[i * 3] = center.x - ux * (10 + Math.random() * 10) + (Math.random() - 0.5) * GUST_BOX
    this.bases[i * 3 + 1] = center.y - 2 - Math.random() * 4
    this.bases[i * 3 + 2] =
      center.z - uz * (10 + Math.random() * 10) + (Math.random() - 0.5) * GUST_BOX
    this.ages[i] = 0
  }

  update(center, wind, crosswind, dt) {
    const strength = Math.min(Math.abs(crosswind) / 7, 1)
    this.material.opacity = strength * 0.5
    if (strength < 0.08) return

    const mag = Math.hypot(wind.x, wind.z) || 1
    const ux = wind.x / mag
    const uz = wind.z / mag
    // 위로 비스듬히 치고 올라가는 방향
    const len = 3.5
    const dx = ux * len
    const dy = 0.4 * len
    const dz = uz * len

    const pos = this.lines.geometry.attributes.position
    for (let i = 0; i < this.count; i++) {
      this.ages[i] += dt
      // 바람보다 살짝 빠르게 흘러서 기체 밑을 스침
      this.bases[i * 3] += wind.x * 2.2 * dt
      this.bases[i * 3 + 1] += 0.8 * dt
      this.bases[i * 3 + 2] += wind.z * 2.2 * dt

      const bx = this.bases[i * 3]
      const bz = this.bases[i * 3 + 2]
      const passed = (bx - center.x) * ux + (bz - center.z) * uz
      if (passed > 14 || this.ages[i] > 3) this.respawn(i, center, ux, uz)

      pos.setXYZ(i * 2, this.bases[i * 3], this.bases[i * 3 + 1], this.bases[i * 3 + 2])
      pos.setXYZ(
        i * 2 + 1,
        this.bases[i * 3] + dx,
        this.bases[i * 3 + 1] + dy,
        this.bases[i * 3 + 2] + dz,
      )
    }
    pos.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.lines)
    this.lines.geometry.dispose()
    this.material.dispose()
  }
}
