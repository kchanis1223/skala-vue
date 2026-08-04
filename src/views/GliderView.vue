<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { mockWeatherList } from '@/data/mockWeather'

const route = useRoute()

// /glider?city=city_01 형태로 출발 도시를 전달받는다
const departureCity = computed(
  () => mockWeatherList.find((city) => city.id === route.query.city) ?? null,
)
</script>

<template>
  <div class="glider-view">
    <el-alert
      type="warning"
      :closable="false"
      title="🚧 글라이더 게임은 마일스톤 4~5에서 구현됩니다"
      description="이 페이지에 three.js 비행 씬이 들어갑니다. 선택한 도시의 실제 날씨(바람·강수·밤낮)가 비행 물리에 반영될 예정입니다."
    />

    <el-card v-if="departureCity" class="departure-card">
      <p class="departure-text">
        출발 도시: <strong>{{ departureCity.name }}</strong> ({{ departureCity.status }},
        {{ departureCity.temp }}℃)
      </p>
    </el-card>
  </div>
</template>

<style scoped>
.departure-card {
  margin-top: 16px;
  max-width: 480px;
}

.departure-text {
  margin: 0;
}
</style>
