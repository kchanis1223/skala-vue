<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFlightDb } from '@/composables/useFlightDb'
import { useLeaderboardApi } from '@/composables/useLeaderboardApi'

const router = useRouter()
const flightDb = useFlightDb()
const boardApi = useLeaderboardApi()

const loading = ref(true)
const weekly = ref(null) // { top, me, totalPilots } / null이면 서버 연결 실패
const stats = ref(null)
const myFlights = ref([])

// 결과창에서 마지막으로 쓴 닉네임 = 이 브라우저의 "나"
const myPilot = localStorage.getItem('weather-glider:pilot-name') ?? ''

// DB에 저장된 condition은 openweathermap의 main 값이라 우리말로 바꿔줌
const CONDITION_LABELS = {
  Clear: '☀️ 맑음',
  Clouds: '☁️ 흐림',
  Rain: '🌧️ 비',
  Drizzle: '🌦️ 이슬비',
  Thunderstorm: '⛈️ 뇌우',
  Snow: '❄️ 눈',
}
const conditionLabel = (c) => (c ? (CONDITION_LABELS[c] ?? '🌫️ 안개') : '-')

const formatDate = (ts) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatDuration = (sec) => (sec == null ? '-' : `${Math.round(sec)}초`)
const formatWind = (w) => (w == null ? '-' : `${w}m/s`)

const MEDALS = ['🥇', '🥈', '🥉']

onMounted(async () => {
  // 전역(서버) 데이터랑 내 기록(sql.js)을 같이 불러옴
  const [wk, st, mine] = await Promise.all([
    boardApi.fetchWeeklyBoard(myPilot),
    boardApi.fetchStats(),
    flightDb.getRecentFlights(20),
  ])
  weekly.value = wk
  stats.value = st
  myFlights.value = mine
  loading.value = false
})

const goGlider = () => router.push('/glider')

// 내 순위 아랫단 표시 규칙:
// 5등 안이면 위 목록에서 하이라이트만, 6등이면 바로 이어서 한 줄,
// 7등 밖이면 ... 밑에 내 위아래 한 칸까지 3줄
const meSection = computed(() => {
  const wk = weekly.value
  if (!wk?.me) return null
  const topLen = wk.top?.length ?? 0
  if (wk.me.rank <= topLen) return null
  if (wk.me.rank === topLen + 1) return { ellipsis: false, rows: [wk.me] }
  return { ellipsis: true, rows: wk.around ?? [wk.me] }
})
</script>

<template>
  <div class="records-view">
    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else>
      <!-- 주간 랭킹 (서버, 최근 7일 · 조종사별 최고 기록 기준) -->
      <el-card class="record-card wide">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">🏆 주간 리더보드 Rank</h2>
            <span v-if="weekly" class="card-sub">
              최근 7일 · 조종사 {{ weekly.totalPilots }}명 · 최고 기록 기준
            </span>
          </div>
        </template>

        <template v-if="weekly?.top?.length">
          <div class="rank-grid rank-header">
            <span>순위</span><span>조종사</span><span>점수</span><span>도시</span>
            <span>날씨</span><span>풍속</span><span>시간</span><span>거리</span><span>일시</span>
          </div>

          <div
            v-for="row in weekly.top"
            :key="row.pilot"
            class="rank-grid rank-row"
            :class="{ 'me-row': row.pilot === myPilot }"
          >
            <span class="rank-cell" :class="{ medal: row.rank <= 3 }">
              {{ MEDALS[row.rank - 1] ?? `${row.rank}위` }}
            </span>
            <span class="pilot-cell">{{ row.pilot }}</span>
            <span class="score-cell">💎 {{ row.score }}</span>
            <span>{{ row.city_name }}</span>
            <span>{{ conditionLabel(row.condition) }}</span>
            <span>{{ formatWind(row.wind_speed) }}</span>
            <span>{{ formatDuration(row.duration) }}</span>
            <span>{{ row.distance.toLocaleString() }}m</span>
            <span class="date-cell">{{ formatDate(row.flown_at) }}</span>
          </div>

          <!-- 상위권 밖이면 ... 밑에 내 위아래 순위까지 같이 붙여줌 -->
          <template v-if="meSection">
            <div v-if="meSection.ellipsis" class="rank-ellipsis">⋯</div>
            <div
              v-for="row in meSection.rows"
              :key="`me-${row.pilot}`"
              class="rank-grid rank-row"
              :class="{ 'me-row': row.pilot === myPilot }"
            >
              <span class="rank-cell">{{ row.rank }}위</span>
              <span class="pilot-cell">
                {{ row.pilot }}<template v-if="row.pilot === myPilot"> (나)</template>
              </span>
              <span class="score-cell">💎 {{ row.score }}</span>
              <span>{{ row.city_name }}</span>
              <span>{{ conditionLabel(row.condition) }}</span>
              <span>{{ formatWind(row.wind_speed) }}</span>
              <span>{{ formatDuration(row.duration) }}</span>
              <span>{{ row.distance.toLocaleString() }}m</span>
              <span class="date-cell">{{ formatDate(row.flown_at) }}</span>
            </div>
          </template>
          <p v-else-if="myPilot && !weekly.me" class="rank-note">
            {{ myPilot }}님의 이번 주 기록이 아직 없어요 — 비행하고 랭킹에 올라보세요!
          </p>
        </template>

        <el-empty
          v-else
          :description="
            weekly === null
              ? '전역 랭킹 서버에 연결하지 못했어요'
              : '이번 주 기록이 아직 없어요 — 1등 찬스!'
          "
          :image-size="70"
        >
          <el-button v-if="weekly !== null" type="primary" plain @click="goGlider">
            비행하러 가기
          </el-button>
        </el-empty>
      </el-card>

      <!-- 도시별 최고 기록 -->
      <el-card class="record-card">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">🏙️ 도시별 최고 기록</h2>
            <span v-if="stats?.total" class="card-sub">
              전 세계 {{ stats.total.pilots }}명이 {{ stats.total.flights }}회 비행
            </span>
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
          <el-table-column label="거리" width="90" align="right">
            <template #default="{ row }">{{ row.distance.toLocaleString() }}m</template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="도시별 기록이 아직 없어요" :image-size="60" />
      </el-card>

      <!-- 내 기록 (이 브라우저의 sql.js) -->
      <el-card class="record-card">
        <template #header>
          <div class="card-head">
            <h2 class="card-title">💾 나의 비행 이력</h2>
            <span class="card-sub">이 브라우저에 저장된 기록 (SQLite)</span>
          </div>
        </template>
        <el-table v-if="myFlights.length" :data="myFlights" size="small">
          <el-table-column prop="city_name" label="도시" min-width="86" />
          <el-table-column label="점수" width="76" align="right">
            <template #default="{ row }">💎 {{ row.score }}</template>
          </el-table-column>
          <el-table-column label="날씨" width="86">
            <template #default="{ row }">{{ conditionLabel(row.condition) }}</template>
          </el-table-column>
          <el-table-column label="거리" width="80" align="right">
            <template #default="{ row }">{{ row.distance.toLocaleString() }}m</template>
          </el-table-column>
          <el-table-column label="일시" width="94">
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
  width: 440px;
  max-width: 100%;
}

.record-card.wide {
  width: 100%;
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

.score {
  color: #f5a623;
}

/* 주간 랭킹 표. 9칸 그리드 */
.rank-grid {
  display: grid;
  grid-template-columns: 64px 1.4fr 86px 1fr 100px 76px 66px 80px 92px;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
}

.rank-header {
  font-size: 0.76rem;
  color: #909399;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 7px;
}

.rank-row {
  font-size: 0.86rem;
  color: #303133;
  border-bottom: 1px solid #f5f7fa;
}

.rank-row:last-child {
  border-bottom: none;
}

.rank-cell {
  font-weight: 600;
  color: #606266;
}

/* 1~3등 메달은 조금 크게 */
.rank-cell.medal {
  font-size: 1.35rem;
  line-height: 1;
}

.pilot-cell {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-cell {
  font-weight: 700;
  color: #f5a623;
}

.date-cell {
  font-size: 0.76rem;
  color: #909399;
}

.me-row {
  background: rgba(64, 158, 255, 0.08);
  border-radius: 8px;
}

.rank-ellipsis {
  text-align: center;
  color: #c0c4cc;
  font-size: 1.1rem;
  letter-spacing: 4px;
  padding: 2px 0;
}

.rank-note {
  margin: 12px 4px 2px;
  font-size: 0.8rem;
  color: #909399;
}
</style>
