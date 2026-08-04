<script setup>
import { useConfigStore } from '@/stores/configStore'
import { useDisplayTemp } from '@/composables/useDisplayTemp'

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
      <h3 class="city-name">{{ cityItem.flag }} {{ cityItem.name }}</h3>
      <el-tag size="small" effect="plain">{{ cityItem.status }}</el-tag>
    </div>

    <p class="temp">{{ displayTemp }}{{ configStore.unitSymbol }}</p>

    <!-- 25도 기준 라벨. 화씨로 바꿔도 기준은 섭씨 원본값으로 -->
    <p v-if="cityItem.temp >= 25" class="temp-label hot">🔥 더움 (25도 이상)</p>
    <p v-else class="temp-label cool">❄️ 선선함 (25도 미만)</p>

    <!-- .stop 안 붙이면 카드 클릭(select-card)까지 같이 터짐 -->
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
