<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCityStore } from '@/stores/cityStore'
import { useFlightStore } from '@/stores/flightStore'
import { useWeatherApi } from '@/composables/useWeatherApi'
import { toFlightParams } from '@/game/weatherMapping'
import GliderCanvas from '@/components/glider/GliderCanvas.vue'
import CompassBar from '@/components/glider/CompassBar.vue'
import FlightHud from '@/components/glider/FlightHud.vue'
import FlightBriefing from '@/components/glider/FlightBriefing.vue'
import FlightResultDialog from '@/components/glider/FlightResultDialog.vue'

const route = useRoute()
const router = useRouter()
const cityStore = useCityStore()
const flightStore = useFlightStore()
const { isLoading, fetchCityDetail } = useWeatherApi()

// select(도시 고르기) → briefing(브리핑) → flying(비행) → ended(결과)
const phase = ref('select')
const pickedId = ref(route.query.city ?? null)
const city = ref(null)
const flightParams = ref(null)

const emptyTick = () => ({ altitude: 0, speed: 0, distance: 0, time: 0, hits: 0, heading: 0 })
const tick = ref(emptyTick())
const result = ref(null)
const resultVisible = ref(false)
const hitFlash = ref(false)
const flightKey = ref(0) // 바꾸면 캔버스가 새로 마운트돼서 재비행됨

// 도시의 지금 날씨를 새로 받아서 비행 파라미터로 변환
const prepare = async (id) => {
  const base = cityStore.allCities.find((c) => c.id === id)
  if (!base) {
    phase.value = 'select'
    return
  }
  city.value = await fetchCityDetail(base)
  flightStore.selectCity(city.value)
  flightParams.value = toFlightParams(city.value)
  phase.value = 'briefing'
}

onMounted(() => {
  if (pickedId.value) prepare(pickedId.value)
})

const pickCity = () => {
  if (!pickedId.value) return
  router.replace({ query: { city: pickedId.value } })
  prepare(pickedId.value)
}

const startFlight = () => {
  tick.value = emptyTick()
  phase.value = 'flying'
}

const onTick = (data) => {
  tick.value = data
}

let flashTimer = null
const onHit = () => {
  hitFlash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (hitFlash.value = false), 350)
}

const onEnd = (r) => {
  result.value = r
  resultVisible.value = true
  phase.value = 'ended'
  flightStore.setFlightResult({
    ...r,
    cityId: city.value.id,
    cityName: city.value.name,
    flownAt: Date.now(),
  })
}

const retry = () => {
  resultVisible.value = false
  tick.value = emptyTick()
  flightKey.value++
  phase.value = 'flying'
}

const exitToSelect = () => {
  resultVisible.value = false
  phase.value = 'select'
  city.value = null
  router.replace({ query: {} })
}
</script>

<template>
  <div class="glider-view">
    <!-- 도시 고르기 -->
    <el-card v-if="phase === 'select'" class="select-card">
      <h2 class="select-title">✈️ 어디 하늘을 날아볼까요?</h2>
      <p class="select-sub">도시의 지금 날씨가 비행 조건이 됩니다</p>
      <div class="select-row">
        <el-select v-model="pickedId" placeholder="도시 선택" filterable class="city-select">
          <el-option
            v-for="c in cityStore.allCities"
            :key="c.id"
            :value="c.id"
            :label="`${c.flag} ${c.name}`"
          />
        </el-select>
        <el-button type="primary" :disabled="!pickedId" @click="pickCity">브리핑 보기</el-button>
      </div>
    </el-card>

    <!-- 브리핑 -->
    <el-skeleton v-else-if="isLoading" :rows="6" animated />
    <FlightBriefing
      v-else-if="phase === 'briefing'"
      :city="city"
      :flight-params="flightParams"
      @start="startFlight"
    />

    <!-- 비행 (ended 상태에서도 착륙 장면 유지) -->
    <div v-if="phase === 'flying' || phase === 'ended'" class="flight-stage">
      <GliderCanvas
        :key="flightKey"
        :flight-params="flightParams"
        @tick="onTick"
        @end="onEnd"
        @hit="onHit"
      />
      <CompassBar :heading="tick.heading" />
      <FlightHud :tick="tick" :wind="flightParams.wind" :hit-flash="hitFlash" />
    </div>

    <FlightResultDialog
      v-if="result && city"
      v-model="resultVisible"
      :result="result"
      :city="city"
      @retry="retry"
      @exit="exitToSelect"
    />
  </div>
</template>

<style scoped>
.select-card {
  max-width: 440px;
  margin: 0 auto;
}

.select-title {
  margin: 0;
  font-size: 1.2rem;
}

.select-sub {
  margin: 6px 0 16px;
  color: #909399;
  font-size: 0.9rem;
}

.select-row {
  display: flex;
  gap: 8px;
}

.city-select {
  flex: 1;
}

.flight-stage {
  position: relative;
  height: calc(100vh - 190px);
  min-height: 460px;
}
</style>
