<script setup>
import { computed } from 'vue'

// 배그처럼 위에 붙는 나침반. 기수 돌리면 눈금이 옆으로 흐름
const props = defineProps({
  heading: { type: Number, default: 0 },
})

const LABELS = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }
const POINTS = []
for (let deg = 0; deg < 360; deg += 15) {
  POINTS.push({ deg, label: LABELS[deg] ?? null })
}

const HALF_RANGE = 60 // 화면에 좌우 60도씩 보임

const visibleMarks = computed(() =>
  POINTS.map((p) => {
    const diff = ((p.deg - props.heading + 540) % 360) - 180
    return { ...p, diff }
  })
    .filter((p) => Math.abs(p.diff) <= HALF_RANGE)
    .map((p) => ({ ...p, left: 50 + (p.diff / HALF_RANGE) * 50 })),
)

const headingDeg = computed(() => `${Math.round(props.heading)}°`)
</script>

<template>
  <div class="compass">
    <span
      v-for="mark in visibleMarks"
      :key="mark.deg"
      class="mark"
      :class="{ major: mark.label, cardinal: ['N', 'E', 'S', 'W'].includes(mark.label) }"
      :style="{ left: `${mark.left}%` }"
    >
      {{ mark.label ?? '|' }}
    </span>
    <div class="center-pointer">▾</div>
    <div class="center-deg">{{ headingDeg }}</div>
  </div>
</template>

<style scoped>
.compass {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 30px;
  border-radius: 8px;
  background: rgba(20, 30, 40, 0.5);
  backdrop-filter: blur(6px);
  overflow: hidden;
}

.mark {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.35);
  user-select: none;
}

.mark.major {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 600;
}

.mark.cardinal {
  font-size: 0.88rem;
  color: #fff;
  font-weight: 800;
}

.center-pointer {
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd04b;
  font-size: 0.8rem;
}

.center-deg {
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.55rem;
  color: #ffd04b;
  font-weight: 700;
}
</style>
