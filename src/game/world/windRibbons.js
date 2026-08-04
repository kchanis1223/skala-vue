import * as THREE from 'three'
import { Ribbon } from './ribbon'

const POINTS = 46

// 하늘에 흐르는 바람 결 리본. 바람 방향 따라 물결치며 흘러가서
// 멀리서도 바람이 어느 쪽으로 부는지 읽을 수 있음
export class WindRibbons {
  constructor(scene, count = 4) {
    this.items = []
    for (let i = 0; i < count; i++) {
      this.items.push({
        ribbon: new Ribbon(scene, POINTS, {
          alphaFn: (t) => Math.sin(Math.PI * t) ** 1.3, // 양끝은 투명하게
          widthFn: () => 0.42,
        }),
        base: new THREE.Vector3(
          (Math.random() - 0.5) * 300,
          105 + (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 300,
        ),
        phase: Math.random() * Math.PI * 2,
        amp: 2 + Math.random() * 3,
        pts: Array.from({ length: POINTS }, () => new THREE.Vector3()),
      })
    }
  }

  update(center, wind, camPos, dt) {
    const speed = Math.hypot(wind.x, wind.z)
    const opacity = speed < 0.5 ? 0 : Math.min(speed / 8, 1) * 0.34
    const mag = speed || 1
    const ux = wind.x / mag
    const uz = wind.z / mag
    // 수평으로 수직인 방향 (물결용)
    const px = -uz
    const pz = ux
    const seg = 2.2 + speed * 0.35

    for (const item of this.items) {
      item.ribbon.material.opacity = opacity
      if (opacity === 0) continue

      item.base.x += wind.x * dt
      item.base.z += wind.z * dt
      item.phase += dt * (0.8 + speed * 0.08)

      // 플레이어에서 너무 멀어지면 근처로 재배치
      const dx = item.base.x - center.x
      const dz = item.base.z - center.z
      if (Math.hypot(dx, dz) > 320) {
        item.base.set(
          center.x - ux * (120 + Math.random() * 150) + (Math.random() - 0.5) * 260,
          center.y + (Math.random() - 0.5) * 90,
          center.z - uz * (120 + Math.random() * 150) + (Math.random() - 0.5) * 260,
        )
      }

      for (let j = 0; j < POINTS; j++) {
        const wave = Math.sin(item.phase + j * 0.32) * item.amp
        const bob = Math.sin(item.phase * 0.7 + j * 0.21) * item.amp * 0.4
        item.pts[j].set(
          item.base.x + ux * j * seg + px * wave,
          item.base.y + bob,
          item.base.z + uz * j * seg + pz * wave,
        )
      }
      item.ribbon.rebuild(item.pts, camPos)
    }
  }

  dispose() {
    for (const item of this.items) item.ribbon.dispose()
  }
}
