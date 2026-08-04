<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mockWeatherList } from '@/data/mockWeather'
import { useConfigStore } from '@/stores/configStore'
import { useDisplayTemp } from '@/composables/useDisplayTemp'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()

const cityInfo = ref(null)

// 마운트될 때 url의 cityId로 도시 찾기
onMounted(() => {
  cityInfo.value = mockWeatherList.find((city) => city.id === route.params.cityId) ?? null
})

const { displayTemp } = useDisplayTemp(() => cityInfo.value?.temp)

const goGlider = () => {
  router.push({ path: '/glider', query: { city: cityInfo.value.id } })
}
</script>

<template>
  <div class="detail-view">
    <el-card v-if="cityInfo">
      <template #header>
        <div class="detail-head">
          <h2 class="detail-title">{{ cityInfo.name }} 상세 날씨</h2>
          <el-tag effect="dark">{{ cityInfo.status }}</el-tag>
        </div>
      </template>

      <p class="detail-temp">{{ displayTemp }}{{ configStore.unitSymbol }}</p>
      <p v-if="cityInfo.temp >= 25" class="detail-label">🔥 더움 (25도 이상)</p>
      <p v-else class="detail-label">❄️ 선선함 (25도 미만)</p>

      <div class="detail-actions">
        <el-button type="primary" @click="goGlider">✈️ 이 날씨로 비행하기</el-button>
        <el-button @click="router.push('/')">← 메인으로</el-button>
      </div>
    </el-card>

    <el-empty v-else description="존재하지 않는 도시입니다">
      <el-button type="primary" @click="router.push('/')">메인으로 돌아가기</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.detail-view {
  max-width: 480px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-title {
  margin: 0;
  font-size: 1.2rem;
}

.detail-temp {
  margin: 0;
  font-size: 2.4rem;
  font-weight: 700;
}

.detail-label {
  margin: 4px 0 20px;
  color: #606266;
}

.detail-actions {
  display: flex;
  gap: 8px;
}
</style>
