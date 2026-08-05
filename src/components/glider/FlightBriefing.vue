<script setup>
import { computed } from 'vue'
import { THEMES } from '@/utils/weatherTheme'
import { flightDifficulty, windBonus } from '@/game/weatherMapping'

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

// 기상 조건 스탯 타일
const stats = computed(() => {
  const p = props.flightParams
  const list = [
    { emoji: themeInfo.value.emoji, label: '날씨', value: props.city.status },
    {
      emoji: '💨',
      label: '바람',
      value: `${windDirLabel.value}풍 ${p.wind.speed}m/s`,
      badge: windBonus(p.wind.speed),
    },
    {
      emoji: p.isNight ? '🌙' : '☀️',
      label: '시간대',
      value: p.isNight ? '야간 비행' : '주간 비행',
    },
  ]
  if (p.precip > 0) {
    list.push({
      emoji: p.precipType === 'snow' ? '❄️' : '🌧️',
      label: '강수',
      value: '기체가 젖어 잘 가라앉음',
    })
  } else {
    list.push({ emoji: '🌡️', label: '기온', value: `${props.city.temp}℃` })
  }
  return list
})

const cautions = [
  { emoji: '🏙️', text: '건물·랜드마크에 부딪히면 추락' },
  { emoji: '🎈', text: '열기구·새 떼는 스치면 감속만' },
  { emoji: '🧭', text: '파란 빛의 벽이 비행 구역 경계' },
  { emoji: '🛬', text: '땅에 닿으면 그대로 착륙 종료' },
]
</script>

<template>
  <div class="briefing">
    <el-card class="briefing-card">
      <template #header>
        <div class="briefing-head">
          <h2 class="briefing-title">🛫 비행 브리핑 — {{ city.flag }} {{ city.name }}</h2>
          <span class="difficulty" title="난이도">
            {{ '★'.repeat(difficulty) }}<span class="dim">{{ '☆'.repeat(5 - difficulty) }}</span>
          </span>
        </div>
      </template>

      <!-- 기상 조건 타일 -->
      <div class="stat-grid">
        <div v-for="s in stats" :key="s.label" class="stat-tile">
          <span class="stat-emoji">{{ s.emoji }}</span>
          <span class="stat-label">{{ s.label }}</span>
          <span class="stat-value">{{ s.value }}</span>
          <span v-if="s.badge" class="stat-bonus" :class="`bonus-${s.badge.type}`">
            {{ s.badge.emoji }} {{ s.badge.label }}
          </span>
        </div>
      </div>

      <!-- 목표: 크리스탈 점수 칩 -->
      <div class="goal-box">
        <p class="goal-title">💎 떨어지기 전에 크리스탈을 최대한 모으세요!</p>
        <div class="gem-chips">
          <span class="gem-chip gem-blue">파랑 1점</span>
          <span class="gem-chip gem-purple">보라 3점</span>
          <span class="gem-chip gem-gold">금색 5점</span>
        </div>
      </div>

      <!-- 주의사항 2열 -->
      <div class="caution-grid">
        <div v-for="c in cautions" :key="c.text" class="caution-item">
          <span class="caution-emoji">{{ c.emoji }}</span>
          <span>{{ c.text }}</span>
        </div>
      </div>

      <!-- 조작법 키캡 -->
      <div class="controls-help">
        <span class="controls-title">🎮 조작법</span>
        <span class="keycap">← →</span> 선회
        <span class="keycap">↑</span> 기수 올림
        <span class="keycap">↓</span> 기수 내림·가속
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
  max-width: 520px;
  width: 100%;
}

.briefing-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.briefing-title {
  margin: 0;
  font-size: 1.12rem;
}

.difficulty {
  color: #f5a623;
  font-size: 1.05rem;
  letter-spacing: 2px;
  white-space: nowrap;
}

.difficulty .dim {
  color: #dcdfe6;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.stat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 10px;
  background: #f5f7fa;
  text-align: center;
}

.stat-emoji {
  font-size: 1.35rem;
}

.stat-label {
  font-size: 0.7rem;
  color: #909399;
}

.stat-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: #303133;
  line-height: 1.3;
}

/* 바람 셀 때 뜨는 점수 찬스 배지 */
.stat-bonus {
  margin-top: 2px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
}

.bonus-warning {
  color: #b8860b;
  background: rgba(230, 162, 60, 0.16);
}

.bonus-danger {
  color: #c0392b;
  background: rgba(245, 108, 108, 0.16);
}

.goal-box {
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef6ff, #f3eeff);
  margin-bottom: 14px;
}

.goal-title {
  margin: 0 0 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #303133;
}

.gem-chips {
  display: flex;
  gap: 8px;
}

.gem-chip {
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
}

.gem-blue {
  background: #4aa8d8;
}

.gem-purple {
  background: #9268d8;
}

.gem-gold {
  background: #e0a52f;
}

.caution-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-bottom: 14px;
}

.caution-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  color: #606266;
}

.caution-emoji {
  font-size: 0.95rem;
}

.controls-help {
  padding: 11px 14px;
  border-radius: 10px;
  background: #f5f7fa;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #606266;
}

.controls-title {
  font-weight: 700;
  color: #303133;
  margin-right: 8px;
}

.keycap {
  display: inline-block;
  padding: 1px 8px;
  margin: 0 2px 0 8px;
  border: 1px solid #dcdfe6;
  border-bottom-width: 2.5px;
  border-radius: 6px;
  background: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  color: #303133;
}

.controls-tip {
  margin: 8px 0 0;
  font-size: 0.78rem;
  color: #909399;
}

.start-btn {
  width: 100%;
}
</style>
