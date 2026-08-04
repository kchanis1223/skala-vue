<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { cityList } from '@/data/cities'

const route = useRoute()

// /glider?city=city_01 이런 식으로 출발 도시 받음
const departureCity = computed(() => cityList.find((city) => city.id === route.query.city) ?? null)
</script>

<template>
  <div class="glider-view">
    <el-alert
      type="warning"
      :closable="false"
      title="🚧 글라이더 게임 준비중"
      description="선택한 도시의 실제 날씨(바람, 비, 밤낮)에 따라 비행이 달라지는 게임을 만들 예정입니다."
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
