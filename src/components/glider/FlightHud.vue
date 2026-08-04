<script setup>
import { computed } from 'vue'

const props = defineProps({
  tick: { type: Object, required: true },
  wind: { type: Object, required: true },
  hitFlash: { type: Boolean, default: false },
})

// 내 진행 방향 기준으로 바람이 어느 쪽에서 부는지 계산
// relDeg 0 = 순풍(등 뒤에서 밀어줌), 180 = 역풍
const relDeg = computed(() => {
  const blowTo = (props.wind.deg + 180) % 360
  return (blowTo - (props.tick.heading ?? 0) + 360) % 360
})

const windKind = computed(() => {
  const off = Math.min(relDeg.value, 360 - relDeg.value)
  if (props.wind.speed < 0.5) return { label: '무풍', cls: 'calm' }
  if (off < 45) return { label: '순풍', cls: 'tail' }
  if (off > 135) return { label: '역풍', cls: 'head' }
  return { label: '측풍', cls: 'cross' }
})

const windArrowStyle = computed(() => ({
  transform: `rotate(${relDeg.value}deg)`,
}))
</script>

<template>
  <div class="hud" :class="{ 'hit-flash': hitFlash }">
    <div class="hud-item">
      <span class="hud-label">고도</span>
      <span class="hud-value">{{ tick.altitude }}m</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">속도</span>
      <span class="hud-value">{{ tick.speed }}km/h</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">비행거리</span>
      <span class="hud-value">{{ tick.distance.toLocaleString() }}m</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">바람 {{ wind.speed }}m/s</span>
      <span class="hud-value wind-value" :class="`wind-${windKind.cls}`">
        <span class="wind-arrow" :style="windArrowStyle">↑</span>
        {{ windKind.label }}
      </span>
    </div>
    <div v-if="tick.hits > 0" class="hud-item">
      <span class="hud-label">충돌</span>
      <span class="hud-value">💥 {{ tick.hits }}</span>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 18px;
  padding: 10px 22px;
  border-radius: 999px;
  background: rgba(20, 30, 40, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  transition: box-shadow 0.15s;
}

.hud.hit-flash {
  box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.9);
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
}

.hud-label {
  font-size: 0.65rem;
  opacity: 0.7;
}

.hud-value {
  font-size: 0.95rem;
  font-weight: 700;
}

.wind-value {
  display: flex;
  align-items: center;
  gap: 5px;
}

.wind-arrow {
  display: inline-block;
  font-size: 1.05rem;
  transition: transform 0.2s;
}

/* 순풍=초록, 역풍=빨강, 측풍=주황 */
.wind-tail {
  color: #7ee08a;
}

.wind-head {
  color: #ff8a80;
}

.wind-cross {
  color: #ffd27a;
}

.wind-calm {
  color: #cfd8dc;
}
</style>
