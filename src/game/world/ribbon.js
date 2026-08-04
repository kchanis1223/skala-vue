import * as THREE from 'three'

// 폭 있는 리본 메쉬. 날개 트레일이랑 바람 리본이 공용으로 씀
// webgl은 선 두께가 1px 고정이라 두꺼운 궤적은 이렇게 띠(삼각형 스트립)로 만들어야 함
// 매 프레임 점 목록을 받아 카메라를 향하도록 띠를 다시 깔아줌
export class Ribbon {
  constructor(scene, pointCount, { color = '#ffffff', alphaFn, widthFn }) {
    this.scene = scene
    this.pointCount = pointCount
    this.widthFn = widthFn

    const vertCount = pointCount * 2
    const positions = new Float32Array(vertCount * 3)
    const colors = new Float32Array(vertCount * 4)
    const c = new THREE.Color(color)
    for (let i = 0; i < pointCount; i++) {
      const alpha = alphaFn(i / (pointCount - 1))
      for (let k = 0; k < 2; k++) {
        const o = (i * 2 + k) * 4
        colors[o] = c.r
        colors[o + 1] = c.g
        colors[o + 2] = c.b
        colors[o + 3] = alpha
      }
    }
    const indices = []
    for (let i = 0; i < pointCount - 1; i++) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4))
    geo.setIndex(indices)

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.frustumCulled = false
    scene.add(this.mesh)

    this._dir = new THREE.Vector3()
    this._toCam = new THREE.Vector3()
    this._side = new THREE.Vector3()
  }

  // points: Vector3 배열 (pointCount개)
  rebuild(points, camPos, widthScale = 1) {
    const pos = this.mesh.geometry.attributes.position
    const n = this.pointCount
    for (let i = 0; i < n; i++) {
      const p = points[i]
      const prev = points[Math.max(i - 1, 0)]
      const next = points[Math.min(i + 1, n - 1)]
      this._dir.subVectors(next, prev)
      this._toCam.subVectors(camPos, p)
      this._side.crossVectors(this._dir, this._toCam)
      const len = this._side.length()
      if (len < 1e-5) this._side.set(0, 1, 0)
      else this._side.divideScalar(len)
      const w = this.widthFn(i / (n - 1)) * widthScale
      pos.setXYZ(i * 2, p.x + this._side.x * w, p.y + this._side.y * w, p.z + this._side.z * w)
      pos.setXYZ(i * 2 + 1, p.x - this._side.x * w, p.y - this._side.y * w, p.z - this._side.z * w)
    }
    pos.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
