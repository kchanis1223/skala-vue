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
    const len = Math.min(mag * 0.14, 7)
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
