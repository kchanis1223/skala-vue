<script setup>
import { storeToRefs } from 'pinia'
import WeatherParent from '@/components/exercise/WeatherParent.vue'
import { useFlightStore } from '@/stores/flightStore'

// 밤 테마 배경에선 검은 글씨가 안 보여서 제목 색을 같이 바꿔줌
const { isNight } = storeToRefs(useFlightStore())
</script>

<template>
  <div class="home-view">
    <header class="hero" :class="{ 'hero-dark': isNight }">
      <h1 class="hero-title">🪁 웨더글라이더</h1>
      <p class="hero-sub">도시를 선택하고 날씨를 느껴보세요!</p>
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
  color: #1e2023;
  transition: color 0.9s ease, text-shadow 0.9s ease;
}

.hero-sub {
  margin: 6px 0 0;
  color: #1e2023;
  transition: color 0.9s ease, text-shadow 0.9s ease;
}

/* 밤 배경일 땐 밝은 글씨 + 은은한 그림자로 띄움 */
.hero-dark .hero-title,
.hero-dark .hero-sub {
  color: #f4f7fa;
  text-shadow: 0 1px 10px rgba(10, 18, 32, 0.55);
}
</style>
