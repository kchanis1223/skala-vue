<script setup>
import { computed } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import { useDisplayTemp } from '@/composables/useDisplayTemp'
import { useClock } from '@/composables/useClock'
import { THEMES, conditionToTheme } from '@/utils/weatherTheme'

const props = defineProps({
  cityItem: { type: Object, required: true },
})

const emit = defineEmits(['select-card', 'click-detail', 'remove-card'])

const configStore = useConfigStore()
const { displayTemp } = useDisplayTemp(() => props.cityItem.temp)
const { displayTemp: displayFeels } = useDisplayTemp(() => props.cityItem.feelsLike)

const weatherEmoji = computed(() => THEMES[conditionToTheme(props.cityItem.condition)].emoji)

// 도시 현지 시각. api의 timezone(UTC 오프셋 초)을 더해서 UTC 기준으로 찍으면 됨
const now = useClock()
const localTime = computed(() => {
  if (props.cityItem.timezone == null) return null
  const d = new Date(now.value + props.cityItem.timezone * 1000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
})

const isNight = computed(() => {
  const { sunrise, sunset } = props.cityItem
  if (!sunrise || !sunset) return false
  const t = now.value / 1000
  return t < sunrise || t > sunset
})
</script>

<template>
  <article class="weather-card" @click="emit('select-card', cityItem)">
    <div class="card-head">
      <h3 class="city-name">{{ cityItem.flag }} {{ cityItem.name }}</h3>
      <div class="head-right">
        <span v-if="localTime" class="local-time">{{ isNight ? '🌙' : '🕓' }} {{ localTime }}</span>
        <el-tag size="small" effect="plain">{{ cityItem.status }}</el-tag>
        <!-- 직접 추가한 도시만 지울 수 있음 -->
        <button
          v-if="cityItem.custom"
          class="remove-btn"
          title="도시 삭제"
          @click.stop="emit('remove-card', cityItem)"
        >
          ✕
        </button>
      </div>
    </div>

    <p class="temp">
      <span class="weather-emoji">{{ weatherEmoji }}</span>
      {{ displayTemp }}{{ configStore.unitSymbol }}
    </p>

    <!-- 25도 기준. 화씨로 바꿔도 기준은 섭씨 원본값으로 -->
    <span v-if="cityItem.temp >= 25" class="temp-badge hot">🔥 더운 날씨</span>
    <span v-else class="temp-badge cool">❄️ 선선한 날씨</span>

    <p v-if="cityItem.feelsLike != null" class="card-extra">
      체감 {{ displayFeels }}{{ configStore.unitSymbol }} · 습도 {{ cityItem.humidity }}% · 바람
      {{ cityItem.windSpeed }}m/s
    </p>

    <!-- .stop 안 붙이면 카드 클릭(select-card)까지 같이 터짐 -->
    <button class="detail-btn" @click.stop="emit('click-detail', cityItem)">
      상세보기 <span class="detail-arrow">→</span>
    </button>
  </article>
</template>

<style scoped>
.weather-card {
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e7ed;
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  background: #fafcff;
}

.weather-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.18);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.local-time {
  font-size: 0.74rem;
  color: #909399;
  white-space: nowrap;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  font-size: 0.7rem;
  cursor: pointer;
  line-height: 1;
}

.remove-btn:hover {
  background: #f56c6c;
  color: #fff;
}

.city-name {
  margin: 0;
  font-size: 1.02rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.temp {
  margin: 10px 0 8px;
  font-size: 1.8rem;
  font-weight: 700;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weather-emoji {
  font-size: 1.4rem;
}

.temp-badge {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.temp-badge.hot {
  color: #d84315;
  background: rgba(244, 108, 60, 0.12);
}

.temp-badge.cool {
  color: #1565c0;
  background: rgba(64, 158, 255, 0.12);
}

.card-extra {
  margin: 10px 0 0;
  font-size: 0.78rem;
  color: #909399;
}

.detail-btn {
  margin-top: 12px;
  width: 100%;
  padding: 8px 0;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #606266;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s;
}

.detail-btn:hover {
  background: linear-gradient(90deg, #409eff, #66b1ff);
  border-color: transparent;
  color: #fff;
}

.detail-arrow {
  transition: transform 0.2s;
}

.detail-btn:hover .detail-arrow {
  transform: translateX(4px);
}
</style>
