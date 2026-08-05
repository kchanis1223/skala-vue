<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFlightDb } from '@/composables/useFlightDb'
import { useLeaderboardApi } from '@/composables/useLeaderboardApi'

const router = useRouter()
const flightDb = useFlightDb()
const boardApi = useLeaderboardApi()

const loading = ref(true)
const globalTop = ref(null) // null이면 서버 연결 실패
const stats = ref(null)
const myFlights = ref([])

// DB에 저장된 condition은 openweathermap의 main 값이라 우리말로 바꿔줌
const CONDITION_LABELS = {
  Clear: '☀️ 맑음',
  Clouds: '☁️ 구름/흐림',
  Rain: '🌧️ 비',
  Drizzle: '🌦️ 이슬비',
  Thunderstorm: '⛈️ 뇌우',
  Snow: '❄️ 눈',
}
const conditionLabel = (c) => CONDITION_LABELS[c] ?? '🌫️ 안개'

const formatDate = (ts) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const RANK_ICONS = ['🥇', '🥈', '🥉']
const rankLabel = (i) => RANK_ICONS[i] ?? `${i + 1}위`

onMounted(async () => {
  // 전역(서버) 데이터랑 내 기록(sql.js)을 같이 불러옴
  const [top, st, mine] = await Promise.all([
    boardApi.fetchLeaderboard(null, 10),
    boardApi.fetchStats(),
    flightDb.getRecentFlights(20),
  ])
  globalTop.value = top
  stats.value = st
  myFlights.value = mine
  loading.value = false
})

const goGlider = () => router.push('/glider')
</script>

<template>
  <div class="records-view">
    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else>
      <!-- 전역 랭킹 (서버) -->
      <el-card class="record-card wide">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">🌍 전역 TOP 10</h2>
            <span v-if="stats?.total" class="card-sub">
              전 세계 {{ stats.total.pilots }}명이 {{ stats.total.flights }}회 비행
            </span>
          </div>
        </template>

        <el-table v-if="globalTop?.length" :data="globalTop" size="small">
          <el-table-column label="순위" width="64">
            <template #default="{ $index }">{{ rankLabel($index) }}</template>
          </el-table-column>
          <el-table-column prop="pilot" label="조종사" min-width="100" show-overflow-tooltip />
          <el-table-column prop="city_name" label="도시" width="110" />
          <el-table-column label="점수" width="90" align="right">
            <template #default="{ row }">
              <b class="score">💎 {{ row.score }}</b>
            </template>
          </el-table-column>
          <el-table-column label="거리" width="90" align="right">
            <template #default="{ row }">{{ row.distance.toLocaleString() }}m</template>
          </el-table-column>
          <el-table-column label="결과" width="80">
            <template #default="{ row }">{{ row.crashed ? '💥 추락' : '🛬 착륙' }}</template>
          </el-table-column>
          <el-table-column label="일시" width="100">
            <template #default="{ row }">{{ formatDate(row.flown_at) }}</template>
          </el-table-column>
        </el-table>
        <el-empty
          v-else
          :description="
            globalTop === null
              ? '전역 랭킹 서버에 연결하지 못했어요'
              : '아직 전역 기록이 없어요 — 1등 찬스!'
          "
          :image-size="70"
        >
          <el-button v-if="globalTop !== null" type="primary" plain @click="goGlider">
            비행하러 가기
          </el-button>
        </el-empty>
      </el-card>

      <!-- 날씨 조건별 통계 (GROUP BY) -->
      <el-card class="record-card">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">🌦️ 날씨별 난이도 통계</h2>
          </div>
        </template>
        <el-table v-if="stats?.byCondition?.length" :data="stats.byCondition" size="small">
          <el-table-column label="날씨" min-width="110">
            <template #default="{ row }">{{ conditionLabel(row.condition) }}</template>
          </el-table-column>
          <el-table-column prop="plays" label="비행" width="60" align="right" />
          <el-table-column label="평균점수" width="86" align="right">
            <template #default="{ row }">💎 {{ row.avg_score }}</template>
          </el-table-column>
          <el-table-column label="추락률" width="76" align="right">
            <template #default="{ row }">{{ row.crash_rate }}%</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="통계를 낼 기록이 아직 없어요" :image-size="60" />
        <p v-if="stats?.byCondition?.length" class="card-note">
          같은 실력이라도 비 오는 날은 점수가 낮게 나오는지 확인해보세요
        </p>
      </el-card>

      <!-- 도시별 최고 기록 -->
      <el-card class="record-card">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">🏙️ 도시별 최고 기록</h2>
          </div>
        </template>
        <el-table v-if="stats?.cityBest?.length" :data="stats.cityBest" size="small">
          <el-table-column prop="city_name" label="도시" min-width="90" />
          <el-table-column prop="pilot" label="조종사" min-width="90" show-overflow-tooltip />
          <el-table-column label="점수" width="86" align="right">
            <template #default="{ row }">
              <b class="score">💎 {{ row.score }}</b>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="도시별 기록이 아직 없어요" :image-size="60" />
      </el-card>

      <!-- 내 기록 (이 브라우저의 sql.js) -->
      <el-card class="record-card wide">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">💾 나의 비행 이력</h2>
            <span class="card-sub">이 브라우저에 저장된 기록 (SQLite)</span>
          </div>
        </template>
        <el-table v-if="myFlights.length" :data="myFlights" size="small">
          <el-table-column prop="pilot" label="닉네임" min-width="90">
            <template #default="{ row }">{{ row.pilot || '이름없음' }}</template>
          </el-table-column>
          <el-table-column prop="city_name" label="도시" width="110" />
          <el-table-column label="점수" width="86" align="right">
            <template #default="{ row }">💎 {{ row.score }}</template>
          </el-table-column>
          <el-table-column label="거리" width="90" align="right">
            <template #default="{ row }">{{ row.distance.toLocaleString() }}m</template>
          </el-table-column>
          <el-table-column label="결과" width="80">
            <template #default="{ row }">{{ row.crashed ? '💥 추락' : '🛬 착륙' }}</template>
          </el-table-column>
          <el-table-column label="일시" width="100">
            <template #default="{ row }">{{ formatDate(row.flown_at) }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="아직 비행 기록이 없어요" :image-size="70">
          <el-button type="primary" plain @click="goGlider">첫 비행 하러 가기</el-button>
        </el-empty>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.records-view {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}

.record-card {
  width: 420px;
  max-width: 100%;
}

.record-card.wide {
  width: 720px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
}

.card-sub {
  font-size: 0.78rem;
  color: #909399;
  white-space: nowrap;
}

.card-note {
  margin: 10px 0 0;
  font-size: 0.76rem;
  color: #c0c4cc;
}

.score {
  color: #f5a623;
}
</style>
