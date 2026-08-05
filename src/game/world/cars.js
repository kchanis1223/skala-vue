import * as THREE from 'three'
import { terrainHeight } from './terrain'
import {
  BLOCK,
  MAJOR_W,
  worldFromLogical,
  inSea,
  isMajorX,
  isMajorZ,
  linePosX,
  linePosZ,
  mountainLevel,
} from './cityLayout'

const COUNT = 34
const CAR_COLORS = ['#d64541', '#f5f5f5', '#37474f', '#3f6fb5', '#e8b23a', '#8d6e63', '#5cb85c']

// 도로 격자를 따라 달리는 자동차들. 도시가 살아있는 느낌용
// 멀어지면 플레이어 근처 도로에 재배치해서 돌려씀
export class CarField {
  constructor(scene, style = null) {
    this.scene = scene
    this.style = style
    this.seed = style?.seed ?? 0
    this.geo = new THREE.BoxGeometry(1.7, 1.3, 3.6)
    this.mat = new THREE.MeshLambertMaterial({ flatShading: true })
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, COUNT)
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
    this.dummy = new THREE.Object3D()
    const color = new THREE.Color()
    this.cars = []
    for (let i = 0; i < COUNT; i++) {
      this.cars.push({ axis: 'x', line: 0, pos: 0, dir: 1, speed: 8, needsSpawn: true })
      this.mesh.setColorAt(i, color.set(CAR_COLORS[i % CAR_COLORS.length]))
    }
  }

  respawn(car, px, pz) {
    car.axis = Math.random() < 0.5 ? 'x' : 'z'
    const near = car.axis === 'x' ? pz : px
    // 차는 넓은 대로만 다님 (골목은 끊겨있어서). 근처에서 대로를 찾음
    let k = Math.round((near + (Math.random() - 0.5) * 320) / BLOCK)
    for (let d = 0; d < 12; d++) {
      const isMajor = car.axis === 'x' ? isMajorZ(k + d, this.seed) : isMajorX(k + d, this.seed)
      if (isMajor) {
        k += d
        break
      }
    }
    car.line = (car.axis === 'x' ? linePosZ(k, this.seed) : linePosX(k, this.seed)) + MAJOR_W / 2
    const along = car.axis === 'x' ? px : pz
    car.pos = along + (Math.random() - 0.5) * 420
    car.dir = Math.random() < 0.5 ? 1 : -1
    car.speed = 6 + Math.random() * 6
    car.needsSpawn = false
  }

  update(center, dt) {
    for (let i = 0; i < COUNT; i++) {
      const car = this.cars[i]
      if (car.needsSpawn) this.respawn(car, center.x, center.z)
      car.pos += car.dir * car.speed * dt

      // 우측통행처럼 차선 약간 치우침. 도로는 논리 격자라서 워프 적용해서 놓음
      const laneOffset = car.dir * 1.4
      const lx = car.axis === 'x' ? car.pos : car.line + laneOffset
      const lz = car.axis === 'x' ? car.line - laneOffset : car.pos

      if (inSea(lx, lz, this.seed, this.style)) {
        car.needsSpawn = true
        continue
      }
      const { x, z } = worldFromLogical(lx, lz, this.seed)

      // 산에는 도로가 없으니 차도 안 다님
      if (mountainLevel(x, z) > 0.22) {
        car.needsSpawn = true
        continue
      }

      if (Math.hypot(x - center.x, z - center.z) > 340) {
        car.needsSpawn = true
        continue
      }

      const rotY =
        car.axis === 'x' ? (car.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : car.dir > 0 ? Math.PI : 0
      // 강 위(다리)에선 상판 높이로
      this.dummy.position.set(x, Math.max(terrainHeight(x, z), 0.4) + 0.75, z)
      this.dummy.rotation.set(0, rotY, 0)
      this.dummy.scale.set(1, 1, 1)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.dispose()
    this.geo.dispose()
    this.mat.dispose()
  }
}
