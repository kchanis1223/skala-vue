<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import AddCityDialog from '@/components/AddCityDialog.vue'
import { useWeatherApi } from '@/composables/useWeatherApi'
import { useFlightStore } from '@/stores/flightStore'
import { useCityStore } from '@/stores/cityStore'
import { conditionToTheme } from '@/utils/weatherTheme'

const router = useRouter()
const { isLoading, usingMock, fetchAllCities } = useWeatherApi()
const flightStore = useFlightStore()
const cityStore = useCityStore()

// 상태는 전부 여기(부모)서 관리하고 자식한테는 props로 내려줌
const weatherList = ref([...cityStore.allCities])
const searchQuery = ref('')
const selectedCityInfo = ref(null)
const conditionFilter = ref('all')
const sortKey = ref('default')
const showAddDialog = ref(false)

const loadWeather = async () => {
  weatherList.value = await fetchAllCities(cityStore.allCities)
}

onMounted(loadWeather)

// 도시가 추가/삭제되면 다시 불러옴
watch(() => cityStore.allCities.length, loadWeather)

// 검색어 → 날씨 필터 → 정렬 순서로 걸러냄
// toSorted는 원본 안 건드리는 정렬이라 weatherList가 안 망가짐
const filteredWeatherList = computed(() => {
  let list = weatherList.value
  if (searchQuery.value) {
    list = list.filter((city) => city.name.includes(searchQuery.value))
  }
  if (conditionFilter.value !== 'all') {
    list = list.filter((city) => conditionToTheme(city.condition) === conditionFilter.value)
  }
  if (sortKey.value === 'name') {
    list = list.toSorted((a, b) => a.name.localeCompare(b.name, 'ko'))
  } else if (sortKey.value === 'temp') {
    list = list.toSorted((a, b) => b.temp - a.temp)
  } else if (sortKey.value === 'feels') {
    list = list.toSorted((a, b) => (b.feelsLike ?? b.temp) - (a.feelsLike ?? a.temp))
  }
  return list
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

// 직접 추가한 도시만 삭제 가능
const removeCity = (city) => {
  cityStore.removeCity(city.id)
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

      <div class="toolbar">
        <el-radio-group v-model="conditionFilter" size="small">
          <el-radio-button value="all">전체</el-radio-button>
          <el-radio-button value="clear">☀️ 맑음</el-radio-button>
          <el-radio-button value="clouds">☁️ 흐림</el-radio-button>
          <el-radio-button value="rain">🌧️ 비</el-radio-button>
          <el-radio-button value="snow">❄️ 눈</el-radio-button>
        </el-radio-group>

        <div class="toolbar-right">
          <el-select v-model="sortKey" size="small" class="sort-select">
            <el-option value="default" label="기본 순서" />
            <el-option value="name" label="이름순" />
            <el-option value="temp" label="기온 높은순" />
            <el-option value="feels" label="체감온도 높은순" />
          </el-select>
          <el-button size="small" type="primary" plain @click="showAddDialog = true">
            ＋ 도시 추가
          </el-button>
        </div>
      </div>

      <el-skeleton v-if="isLoading" :rows="3" animated />

      <template v-else>
        <div v-if="filteredWeatherList.length > 0" class="card-grid">
          <WeatherCard
            v-for="city in filteredWeatherList"
            :key="city.id"
            :city-item="city"
            @select-card="selectCard"
            @click-detail="goDetail"
            @remove-card="removeCity"
          />
        </div>
        <el-empty v-else description="일치하는 도시가 없습니다" />

        <div class="refresh-row">
          <el-button size="small" text @click="loadWeather">🔄 날씨 새로고침</el-button>
        </div>
      </template>
    </BaseDashboardCard>

    <AddCityDialog v-model="showAddDialog" />
  </div>
</template>

<style scoped>
.status-bar {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  width: 140px;
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
