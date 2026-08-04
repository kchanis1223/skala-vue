<script setup>
import { useConfigStore } from '@/stores/configStore'
import { useDisplayTemp } from '@/composables/useDisplayTemp'

// 단계 3 필수 — props로 도시 객체를 받고 select-card / click-detail 이벤트를 emit
const props = defineProps({
  cityItem: { type: Object, required: true },
})

const emit = defineEmits(['select-card', 'click-detail'])

const configStore = useConfigStore()
const { displayTemp } = useDisplayTemp(() => props.cityItem.temp)
</script>

<template>
  <article class="weather-card" @click="emit('select-card', cityItem)">
    <div class="card-head">
      <h3 class="city-name">{{ cityItem.name }}</h3>
      <el-tag size="small" effect="plain">{{ cityItem.status }}</el-tag>
    </div>

    <p class="temp">{{ displayTemp }}{{ configStore.unitSymbol }}</p>

    <!-- 단계 1 필수 — 기온 25도 기준 v-if / v-else 라벨 (기준은 섭씨 원본값) -->
    <p v-if="cityItem.temp >= 25" class="temp-label hot">🔥 더움 (25도 이상)</p>
    <p v-else class="temp-label cool">❄️ 선선함 (25도 미만)</p>

    <!-- .stop — 카드의 select-card 클릭으로 버블링되지 않도록 차단 -->
    <el-button size="small" plain @click.stop="emit('click-detail', cityItem)">
      상세보기
    </el-button>
  </article>
</template>

<style scoped>
.weather-card {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 16px 18px;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
  background: #fafcff;
}

.weather-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.city-name {
  margin: 0;
  font-size: 1.05rem;
}

.temp {
  margin: 10px 0 4px;
  font-size: 1.8rem;
  font-weight: 700;
  color: #303133;
}

.temp-label {
  margin: 0 0 12px;
  font-size: 0.85rem;
}

.temp-label.hot {
  color: #f56c6c;
}

.temp-label.cool {
  color: #409eff;
}
</style>
