<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCityStore } from '@/stores/cityStore'
import { useConfigStore } from '@/stores/configStore'
import { useDisplayTemp } from '@/composables/useDisplayTemp'
import { useWeatherApi } from '@/composables/useWeatherApi'
import { useFlightDb } from '@/composables/useFlightDb'
import { useFlightStore } from '@/stores/flightStore'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()
const { isLoading, usingMock, fetchCityDetail } = useWeatherApi()
const flightStore = useFlightStore()
const cityStore = useCityStore()
const flightDb = useFlightDb()

const cityInfo = ref(null)
const notFound = ref(false)
const leaderboard = ref([])
const cityStats = ref(null)

// 마운트될 때 url의 cityId로 도시 찾고 실제 날씨 + 미세먼지 + 리더보드 가져옴
onMounted(async () => {
  const baseCity = cityStore.allCities.find((city) => city.id === route.params.cityId)
  if (!baseCity) {
    notFound.value = true
    return
  }
  cityInfo.value = baseCity
  // 리더보드는 날씨 로딩이랑 상관없이 바로 불러옴
  flightDb.getLeaderboard(baseCity.id).then((list) => (leaderboard.value = list))
  flightDb.getCityStats(baseCity.id).then((stats) => (cityStats.value = stats))
  cityInfo.value = await fetchCityDetail(baseCity)
  // 상세 페이지 들어와도 배경 테마 맞춰줌
  flightStore.selectCity(cityInfo.value)
})

const { displayTemp } = useDisplayTemp(() => cityInfo.value?.temp)

// 미세먼지 등급 (환경부 기준 참고)
const pmGrade = computed(() => {
  const pm = cityInfo.value?.pm25
  if (pm == null) return null
  if (pm <= 15) return { label: '좋음', type: 'success' }
  if (pm <= 35) return { label: '보통', type: 'info' }
  if (pm <= 75) return { label: '나쁨', type: 'warning' }
  return { label: '매우나쁨', type: 'danger' }
})

const RANK_ICONS = ['🥇', '🥈', '🥉']

const formatDate = (ts) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const goGlider = () => {
  router.push({ path: '/glider', query: { city: cityInfo.value.id } })
}
</script>

<template>
  <div class="detail-view">
    <el-skeleton v-if="isLoading && !cityInfo" :rows="5" animated />

    <template v-else-if="cityInfo">
      <el-card class="weather-card">
        <template #header>
          <div class="detail-head">
            <h2 class="detail-title">{{ cityInfo.flag }} {{ cityInfo.name }} 상세 날씨</h2>
            <el-tag effect="dark">{{ cityInfo.status }}</el-tag>
          </div>
        </template>

        <el-alert
          v-if="usingMock"
          class="mock-alert"
          type="warning"
          :closable="false"
          title="API 연결이 안돼서 예시 데이터를 보여주는 중입니다."
        />

        <p class="detail-temp">{{ displayTemp }}{{ configStore.unitSymbol }}</p>
        <p v-if="cityInfo.temp >= 25" class="detail-label">🔥 더움 (25도 이상)</p>
        <p v-else class="detail-label">❄️ 선선함 (25도 미만)</p>

        <ul class="detail-info">
          <li v-if="cityInfo.feelsLike != null">🌡️ 체감 {{ cityInfo.feelsLike }}℃</li>
          <li v-if="cityInfo.windSpeed != null">💨 바람 {{ cityInfo.windSpeed }}m/s</li>
          <li v-if="cityInfo.humidity != null">💧 습도 {{ cityInfo.humidity }}%</li>
          <li v-if="pmGrade">
            😷 미세먼지(PM2.5)
            <el-tag size="small" :type="pmGrade.type">{{ pmGrade.label }}</el-tag>
            {{ cityInfo.pm25 }}㎍/㎥
          </li>
        </ul>

        <div class="detail-actions">
          <el-button type="primary" @click="goGlider">✈️ 이 날씨로 비행하기</el-button>
          <el-button @click="router.push('/')">← 메인으로</el-button>
        </div>
      </el-card>

      <!-- 이 도시에서 날린 기록 리더보드 -->
      <el-card class="board-card">
        <template #header>
          <div class="detail-head">
            <h2 class="detail-title">🏆 {{ cityInfo.name }} 리더보드</h2>
            <span v-if="cityStats?.plays" class="board-stats">
              {{ cityStats.plays }}회 비행 · 평균 💎{{ cityStats.avg }}
            </span>
          </div>
        </template>

        <ol v-if="leaderboard.length" class="board-list">
          <li v-for="(row, i) in leaderboard" :key="i" class="board-row">
            <span class="board-rank">{{ RANK_ICONS[i] ?? `${i + 1}위` }}</span>
            <span class="board-score">💎 {{ row.score }}점</span>
            <span class="board-meta">
              {{ row.distance.toLocaleString() }}m · {{ row.crashed ? '💥 추락' : '🛬 착륙' }}
            </span>
            <span class="board-date">{{ formatDate(row.flown_at) }}</span>
          </li>
        </ol>

        <el-empty v-else description="아직 비행 기록이 없어요" :image-size="70">
          <el-button type="primary" plain @click="goGlider">첫 비행 하러 가기</el-button>
        </el-empty>
      </el-card>
    </template>

    <el-empty v-else-if="notFound" description="존재하지 않는 도시입니다">
      <el-button type="primary" @click="router.push('/')">메인으로 돌아가기</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.detail-view {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}

.weather-card {
  width: 440px;
  max-width: 100%;
}

.board-card {
  width: 420px;
  max-width: 100%;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.detail-title {
  margin: 0;
  font-size: 1.2rem;
}

.board-stats {
  font-size: 0.78rem;
  color: #909399;
  white-space: nowrap;
}

.mock-alert {
  margin-bottom: 14px;
}

.detail-temp {
  margin: 0;
  font-size: 2.4rem;
  font-weight: 700;
}

.detail-label {
  margin: 4px 0 14px;
  color: #606266;
}

.detail-info {
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
  line-height: 2;
  color: #606266;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.board-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.board-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid #f0f2f5;
}

.board-row:last-child {
  border-bottom: none;
}

.board-rank {
  width: 34px;
  font-size: 0.95rem;
}

.board-score {
  font-weight: 700;
  color: #f5a623;
  min-width: 68px;
}

.board-meta {
  flex: 1;
  font-size: 0.82rem;
  color: #606266;
}

.board-date {
  font-size: 0.75rem;
  color: #c0c4cc;
}
</style>
