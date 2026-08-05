<script setup>
// 검색박스랑 리스트박스 공통 틀. 내용은 slot으로 받음
defineProps({
  title: { type: String, default: '' },
})
</script>

<template>
  <section class="dashboard-card">
    <h2 v-if="title" class="card-title">{{ title }}</h2>
    <!-- slot 안의 내용은 부모 스코프에서 컴파일돼서 부모 데이터 바로 쓸 수 있음 -->
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
