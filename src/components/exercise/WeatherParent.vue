<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import { cityList } from '@/data/cities'
import { useWeatherApi } from '@/composables/useWeatherApi'
import { useFlightStore } from '@/stores/flightStore'

const router = useRouter()
const { isLoading, usingMock, fetchAllCities } = useWeatherApi()
const flightStore = useFlightStore()

// 상태는 전부 여기(부모)서 관리하고 자식한테는 props로 내려줌
const weatherList = ref([...cityList])
const searchQuery = ref('')
const selectedCityInfo = ref(null)

const loadWeather = async () => {
  weatherList.value = await fetchAllCities(cityList)
}

onMounted(loadWeather)

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
  // 배경 테마도 선택한 도시 날씨로 바뀌게 스토어에도 올림
  flightStore.selectCity(city)
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
        v-if="usingMock"
        class="status-bar"
        type="warning"
        :closable="false"
        title="지금은 예시 데이터입니다. API 연결이 안돼서 실제 날씨가 아니에요."
      />
      <el-skeleton v-if="isLoading" :rows="3" animated />

      <template v-else>
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

        <div class="refresh-row">
          <el-button size="small" text @click="loadWeather">🔄 날씨 새로고침</el-button>
        </div>
      </template>
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

.refresh-row {
  margin-top: 14px;
  text-align: right;
}
</style>
