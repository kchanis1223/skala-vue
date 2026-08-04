<script setup>
import { computed } from 'vue'

const props = defineProps({
  tick: { type: Object, required: true },
  wind: { type: Object, required: true },
  hitFlash: { type: Boolean, default: false },
})

// 바람 화살표: 불어가는 방향을 가리키게 +180
const windArrowStyle = computed(() => ({
  transform: `rotate(${(props.wind.deg + 180) % 360}deg)`,
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
      <span class="hud-label">바람</span>
      <span class="hud-value">
        <span class="wind-arrow" :style="windArrowStyle">↑</span>
        {{ wind.speed }}m/s
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

.wind-arrow {
  display: inline-block;
}
</style>
