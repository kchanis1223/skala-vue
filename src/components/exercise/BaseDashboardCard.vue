<script setup>
// 단계 3 필수 — 검색박스/리스트박스의 공통 디자인을 담당, 콘텐츠는 slot으로 주입받음
defineProps({
  title: { type: String, default: '' },
})
</script>

<template>
  <section class="dashboard-card">
    <h2 v-if="title" class="card-title">{{ title }}</h2>
    <!-- Slot 콘텐츠는 부모(WeatherParent) 스코프에서 컴파일되므로 부모 상태와 직접 바인딩된다 -->
    <slot></slot>
  </section>
</template>

<style scoped>
.dashboard-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-title {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #303133;
}
</style>
