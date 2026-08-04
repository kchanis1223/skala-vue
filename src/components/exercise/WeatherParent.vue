<script setup>
import { ref, computed, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import { mockWeatherList } from '@/data/mockWeather'

const router = useRouter()

// 상태는 전부 여기(부모)서 관리하고 자식한테는 props로 내려줌
const weatherList = ref([...mockWeatherList])
const searchQuery = ref('')
const selectedCityInfo = ref(null)

// 검색어가 도시 이름에 들어있는 것만 필터
const filteredWeatherList = computed(() => {
  if (!searchQuery.value) return weatherList.value
  return weatherList.value.filter((city) => city.name.includes(searchQuery.value))
})

// 선택 도시 바뀔 때 확인용 로그
watch(selectedCityInfo, (newCity, oldCity) => {
  console.log(`[watch] 선택 도시 변경: ${oldCity?.name ?? '없음'} → ${newCity?.name ?? '없음'}`)
})

// watchEffect는 안에서 쓴 값을 알아서 추적함 (처음에 한 번 바로 실행됨)
watchEffect(() => {
  console.log(`[watchEffect] 현재 검색어: "${searchQuery.value}"`)
})

const updateQuery = (query) => {
  searchQuery.value = query
}

const selectCard = (city) => {
  selectedCityInfo.value = city
}

// 상세보기는 원래 alert였는데 라우터 배우고 페이지 이동으로 바꿈
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
