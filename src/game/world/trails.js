import * as THREE from 'three'

const TRAIL_LEN = 42

// 날개 끝에서 나오는 기류 궤적 (좌우 한 줄씩)
class Trail {
  constructor(scene) {
    this.scene = scene
    const positions = new Float32Array(TRAIL_LEN * 3)
    const colors = new Float32Array(TRAIL_LEN * 3)
    // 꼬리로 갈수록 어두워지는 그라데이션
    for (let i = 0; i < TRAIL_LEN; i++) {
      const t = i / (TRAIL_LEN - 1)
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0.4 + t * 0.6
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
    })
    this.line = new THREE.Line(geo, this.material)
    this.line.frustumCulled = false
    scene.add(this.line)
    this.primed = false
  }

  push(tip) {
    const pos = this.line.geometry.attributes.position
    if (!this.primed) {
      // 처음엔 전부 날개끝 위치로 채워서 원점에서 선 튀는거 방지
      for (let i = 0; i < TRAIL_LEN; i++) pos.setXYZ(i, tip.x, tip.y, tip.z)
      this.primed = true
    } else {
      pos.array.copyWithin(0, 3)
      pos.setXYZ(TRAIL_LEN - 1, tip.x, tip.y, tip.z)
    }
    pos.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.line)
    this.line.geometry.dispose()
    this.material.dispose()
  }
}

export class WingtipTrails {
  constructor(scene) {
    this.left = new Trail(scene)
    this.right = new Trail(scene)
    this.tmp = new THREE.Vector3()
  }

  // glider: THREE.Group, intensity: 0~1 (속도/선회 반영)
  update(glider, intensity) {
    this.tmp.set(-4.6, 0.8, 3).applyEuler(glider.rotation).add(glider.position)
    this.left.push(this.tmp)
    this.tmp.set(4.6, 0.8, 3).applyEuler(glider.rotation).add(glider.position)
    this.right.push(this.tmp)

    const opacity = 0.1 + intensity * 0.55
    this.left.material.opacity = opacity
    this.right.material.opacity = opacity
  }

  dispose() {
    this.left.dispose()
    this.right.dispose()
  }
}
