<script setup>
import { computed } from 'vue'
import { THEMES } from '@/utils/weatherTheme'
import { flightDifficulty } from '@/game/weatherMapping'

const props = defineProps({
  city: { type: Object, required: true },
  flightParams: { type: Object, required: true },
})

const emit = defineEmits(['start'])

const difficulty = computed(() => flightDifficulty(props.flightParams))
const themeInfo = computed(() => THEMES[props.flightParams.theme])

// 바람 16방위 표기
const windDirLabel = computed(() => {
  const dirs = ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
  const idx = Math.round(props.flightParams.wind.deg / 45) % 8
  return dirs[idx]
})
</script>

<template>
  <div class="briefing">
    <el-card class="briefing-card">
      <template #header>
        <h2 class="briefing-title">🛫 비행 브리핑 — {{ city.flag }} {{ city.name }}</h2>
      </template>

      <ul class="briefing-list">
        <li>
          {{ themeInfo.emoji }} 날씨: <strong>{{ city.status }}</strong>
          <template v-if="flightParams.isNight"> · 🌙 야간 비행</template>
        </li>
        <li>
          💨 바람: <strong>{{ windDirLabel }}풍 {{ flightParams.wind.speed }}m/s</strong>
          — 순풍을 타면 멀리, 역풍이면 고전합니다
        </li>
        <li v-if="flightParams.precip > 0">
          {{ flightParams.precipType === 'snow' ? '❄️ 눈' : '🌧️ 비' }}: 기체가 젖어
          <strong>더 빨리 가라앉습니다</strong>
        </li>
        <li>🏙️ 200m 타워 옥상에서 이륙합니다. <strong>건물에 부딪히면 추락!</strong></li>
        <li>🎈 열기구·새 떼는 스치면 속도와 고도만 잃습니다</li>
        <li>
          난이도:
          <strong>{{ '★'.repeat(difficulty) }}{{ '☆'.repeat(5 - difficulty) }}</strong>
        </li>
      </ul>

      <div class="controls-help">
        <p class="controls-title">조작법</p>
        <p>← → 선회 · ↑ 기수 올림(감속) · ↓ 기수 내림(가속)</p>
        <p class="controls-tip">💡 기수를 내려 속도를 얻고, 순풍 방향으로 활공하세요</p>
      </div>

      <el-button type="primary" size="large" class="start-btn" @click="emit('start')">
        ✈️ 이륙
      </el-button>
    </el-card>
  </div>
</template>

<style scoped>
.briefing {
  display: flex;
  justify-content: center;
}

.briefing-card {
  max-width: 480px;
  width: 100%;
}

.briefing-title {
  margin: 0;
  font-size: 1.15rem;
}

.briefing-list {
  margin: 0 0 18px;
  padding-left: 4px;
  list-style: none;
  line-height: 2.1;
}

.controls-help {
  padding: 12px 16px;
  border-radius: 10px;
  background: #f5f7fa;
  margin-bottom: 18px;
  font-size: 0.9rem;
  color: #606266;
}

.controls-help p {
  margin: 0;
}

.controls-title {
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.controls-tip {
  margin-top: 6px;
  font-size: 0.82rem;
  color: #909399;
}

.start-btn {
  width: 100%;
}
</style>
