import * as THREE from 'three'

const BOX = 140 // 카메라 주변 이 범위 안에서만 파티클을 돌려씀

// 비/눈 파티클. 카메라 따라다니면서 범위 벗어나면 위로 재활용
export class Precipitation {
  constructor(scene, { type = 'rain', intensity = 0.5 }) {
    this.scene = scene
    this.type = type
    this.count = Math.floor(500 * intensity) + 80
    this.speeds = new Float32Array(this.count)

    const positions = new Float32Array(this.count * 3)
    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOX
      positions[i * 3 + 1] = (Math.random() - 0.5) * BOX
      positions[i * 3 + 2] = (Math.random() - 0.5) * BOX
      this.speeds[i] = type === 'rain' ? 45 + Math.random() * 25 : 4 + Math.random() * 4
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.material = new THREE.PointsMaterial({
      color: type === 'rain' ? '#bcd8f0' : '#ffffff',
      size: type === 'rain' ? 0.5 : 1.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geo, this.material)
    this.points.frustumCulled = false
    scene.add(this.points)
  }

  update(center, dt) {
    const pos = this.points.geometry.attributes.position
    for (let i = 0; i < this.count; i++) {
      let y = pos.getY(i) - this.speeds[i] * dt
      let x = pos.getX(i)
      let z = pos.getZ(i)
      if (this.type === 'snow') x += Math.sin(y * 0.4 + i) * dt * 2 // 눈은 살랑살랑
      // 범위 벗어나면 카메라 근처로 재활용
      if (y < center.y - BOX / 2) {
        y += BOX
        x = center.x + (Math.random() - 0.5) * BOX
        z = center.z + (Math.random() - 0.5) * BOX
      }
      if (Math.abs(x - center.x) > BOX / 2) x = center.x + (Math.random() - 0.5) * BOX
      if (Math.abs(z - center.z) > BOX / 2) z = center.z + (Math.random() - 0.5) * BOX
      pos.setY(i, y)
      pos.setX(i, x)
      pos.setZ(i, z)
    }
    pos.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.points)
    this.points.geometry.dispose()
    this.material.dispose()
  }
}
