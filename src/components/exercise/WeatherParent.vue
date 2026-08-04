<script setup>
import { ref, computed, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import { mockWeatherList } from '@/data/mockWeather'

const router = useRouter()

// 단계 2·3 필수 — 모든 반응형 상태의 단일 소유자
const weatherList = ref([...mockWeatherList])
const searchQuery = ref('')
const selectedCityInfo = ref(null)

// 단계 2 필수 — 검색어가 도시 이름에 포함된 항목만 필터링 (computed 캐싱)
const filteredWeatherList = computed(() => {
  if (!searchQuery.value) return weatherList.value
  return weatherList.value.filter((city) => city.name.includes(searchQuery.value))
})

// 단계 2 필수 — watch: 선택 도시 변경 감시 (이전 값과 함께 추적)
watch(selectedCityInfo, (newCity, oldCity) => {
  console.log(`[watch] 선택 도시 변경: ${oldCity?.name ?? '없음'} → ${newCity?.name ?? '없음'}`)
})

// 단계 2 필수 — watchEffect: 검색어 타이핑 추적 (의존성 자동 추적 + 즉시 1회 실행)
watchEffect(() => {
  console.log(`[watchEffect] 현재 검색어: "${searchQuery.value}"`)
})

const updateQuery = (query) => {
  searchQuery.value = query
}

const selectCard = (city) => {
  selectedCityInfo.value = city
}

// 단계 4 필수 — 상세보기 alert 제거, 동적 경로로 이동
const goDetail = (city) => {
  router.push(`/weather/${city.id}`)
}
</script>

<template>
  <div class="weather-parent">
    <BaseDashboardCard title="🔍 도시 검색">
      <SearchBar :search-query="searchQuery" @update-query="updateQuery" />
    </BaseDashboardCard>

    <BaseDashboardCard title="🌏 도시별 날씨">
      <el-alert
        v-if="selectedCityInfo"
        class="status-bar"
        type="info"
        :closable="false"
        :title="`${selectedCityInfo.name}이 선택되었습니다.`"
      />

      <div v-if="filteredWeatherList.length > 0" class="card-grid">
        <WeatherCard
          v-for="city in filteredWeatherList"
          :key="city.id"
          :city-item="city"
          @select-card="selectCard"
          @click-detail="goDetail"
        />
      </div>
      <el-empty v-else description="일치하는 도시가 없습니다" />
    </BaseDashboardCard>
  </div>
</template>

<style scoped>
.status-bar {
  margin-bottom: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
</style>
