import * as THREE from 'three'
import { terrainHeight } from './terrain'

const BALLOON_COLORS = ['#ef5350', '#ffb300', '#66bb6a', '#5c6bc0', '#ec407a']

// 공중 장애물 (열기구, 새 떼). 일정 거리마다 진행 방향 앞에 뿌려줌
export class ObstacleField {
  constructor(scene) {
    this.scene = scene
    this.items = []
    this.nextSpawnAt = 150
    this.balloonGeo = new THREE.SphereGeometry(3.2, 10, 10)
    this.basketGeo = new THREE.BoxGeometry(1.4, 1.2, 1.4)
    this.birdGeo = new THREE.ConeGeometry(0.9, 2.4, 4)
    this.basketMat = new THREE.MeshLambertMaterial({ color: '#795548' })
    this.birdMat = new THREE.MeshLambertMaterial({ color: '#37474f' })
    this.balloonMats = BALLOON_COLORS.map(
      (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }),
    )
  }

  spawnCluster(state) {
    const fx = -Math.sin(state.yaw)
    const fz = -Math.cos(state.yaw)
    const count = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const ahead = 120 + Math.random() * 160
      const side = (Math.random() - 0.5) * 100
      const x = state.pos.x + fx * ahead - fz * side
      const z = state.pos.z + fz * ahead + fx * side
      const ground = terrainHeight(x, z)
      const y = Math.max(ground + 14, state.pos.y + (Math.random() - 0.5) * 35)

      const isBalloon = Math.random() < 0.55
      const group = new THREE.Group()
      if (isBalloon) {
        const balloon = new THREE.Mesh(
          this.balloonGeo,
          this.balloonMats[Math.floor(Math.random() * this.balloonMats.length)],
        )
        const basket = new THREE.Mesh(this.basketGeo, this.basketMat)
        basket.position.y = -4.4
        group.add(balloon, basket)
      } else {
        // 새 떼는 콘 세 마리
        for (let b = 0; b < 3; b++) {
          const bird = new THREE.Mesh(this.birdGeo, this.birdMat)
          bird.rotation.x = Math.PI / 2
          bird.position.set((b - 1) * 3, (b % 2) * 1.2, Math.abs(b - 1) * 2)
          group.add(bird)
        }
      }
      group.position.set(x, y, z)
      this.scene.add(group)
      this.items.push({
        group,
        type: isBalloon ? 'balloon' : 'bird',
        radius: isBalloon ? 5 : 3.8,
        drift: isBalloon ? 0.6 + Math.random() : 0,
        birdDir: Math.random() < 0.5 ? 1 : -1,
        hit: false,
      })
    }
  }

  // 부딪힌 장애물이 있으면 true 반환
  update(state, dt) {
    if (state.distance > this.nextSpawnAt) {
      this.spawnCluster(state)
      this.nextSpawnAt += 120
    }

    let collided = false
    for (const item of this.items) {
      const p = item.group.position
      if (item.type === 'balloon') {
        p.y += item.drift * dt
        item.group.rotation.y += dt * 0.3
      } else {
        p.x += item.birdDir * 7 * dt
        item.group.children.forEach((bird, i) => {
          bird.position.y = Math.sin(state.time * 8 + i) * 0.9
        })
      }
      if (!item.hit) {
        const d = Math.hypot(p.x - state.pos.x, p.y - state.pos.y, p.z - state.pos.z)
        if (d < item.radius + 1.2) {
          item.hit = true
          collided = true
          // 맞은 건 떨어뜨림
          item.drift = -14
          item.type = 'balloon'
        }
      }
    }

    // 한참 지나친 건 정리
    this.items = this.items.filter((item) => {
      const p = item.group.position
      const far = Math.hypot(p.x - state.pos.x, p.z - state.pos.z) > 900
      const sunk = p.y < terrainHeight(p.x, p.z) - 10
      if (far || sunk) {
        this.scene.remove(item.group)
        return false
      }
      return true
    })

    return collided
  }

  dispose() {
    for (const item of this.items) this.scene.remove(item.group)
    this.items = []
    this.balloonGeo.dispose()
    this.basketGeo.dispose()
    this.birdGeo.dispose()
    this.basketMat.dispose()
    this.birdMat.dispose()
    this.balloonMats.forEach((m) => m.dispose())
  }
}
