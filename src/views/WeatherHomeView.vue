<script setup>
import WeatherParent from '@/components/exercise/WeatherParent.vue'
</script>

<template>
  <div class="home-view">
    <header class="hero">
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
}

.hero-sub {
  margin: 6px 0 0;
  color: #1e2023;
}
</style>
