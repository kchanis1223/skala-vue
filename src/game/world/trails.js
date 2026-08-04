import * as THREE from 'three'
import { Ribbon } from './ribbon'

const TRAIL_LEN = 40

// 날개 끝 트레일. 선 대신 폭 있는 리본이라 제트기 수증기 궤적처럼 보임
class TipTrail {
  constructor(scene) {
    this.ribbon = new Ribbon(scene, TRAIL_LEN, {
      // t=0이 날개끝(최신), 꼬리로 갈수록 흐려짐
      alphaFn: (t) => (1 - t) ** 1.4,
      // 날개끝에선 얇게 시작해서 부풀었다가 꼬리에서 가늘어지는 물방울 모양
      widthFn: (t) => 0.04 + 0.5 * Math.pow(t, 0.35) * (1 - t * 0.8),
    })
    this.pts = Array.from({ length: TRAIL_LEN }, () => new THREE.Vector3())
    this.primed = false
  }

  push(tip) {
    if (!this.primed) {
      for (const p of this.pts) p.copy(tip)
      this.primed = true
      return
    }
    for (let i = TRAIL_LEN - 1; i > 0; i--) this.pts[i].copy(this.pts[i - 1])
    this.pts[0].copy(tip)
  }

  update(tip, camPos, opacity) {
    this.push(tip)
    this.ribbon.material.opacity = opacity
    this.ribbon.rebuild(this.pts, camPos)
  }

  dispose() {
    this.ribbon.dispose()
  }
}

export class WingtipTrails {
  constructor(scene) {
    this.left = new TipTrail(scene)
    this.right = new TipTrail(scene)
    this.tmp = new THREE.Vector3()
  }

  // glider: THREE.Group, intensity: 0~1 (속도/선회 반영)
  update(glider, camPos, intensity) {
    const opacity = 0.3 + intensity * 0.55
    this.tmp.set(-1.7, 0.3, 1.1).applyEuler(glider.rotation).add(glider.position)
    this.left.update(this.tmp, camPos, opacity)
    this.tmp.set(1.7, 0.3, 1.1).applyEuler(glider.rotation).add(glider.position)
    this.right.update(this.tmp, camPos, opacity)
  }

  dispose() {
    this.left.dispose()
    this.right.dispose()
  }
}
