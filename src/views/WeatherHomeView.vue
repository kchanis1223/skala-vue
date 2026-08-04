<script setup>
import WeatherParent from '@/components/exercise/WeatherParent.vue'
</script>

<template>
  <div class="home-view">
    <header class="hero">
      <h1 class="hero-title">🌦️ 웨더보드</h1>
      <p class="hero-sub">세계 도시의 지금 날씨를 한눈에, 테마로 체감하세요!</p>
    </header>

    <WeatherParent />
  </div>
</template>

<style scoped>
.hero {
  margin-bottom: 24px;
}

.hero-title {
  margin: 0;
  font-size: 1.6rem;
}

.hero-sub {
  margin: 6px 0 0;
  color: #1e2023;
}
</style>
