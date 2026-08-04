<script setup>
import { RouterLink, RouterView } from 'vue-router'
import UnitToggler from '@/components/exercise/UnitToggler.vue'
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="brand">🪁 웨더글라이더</RouterLink>

    <!-- 단계 4 필수 — Navigation Bar는 RouterLink 사용 (a 태그는 새로고침을 유발하므로 금지) -->
    <nav class="app-nav">
      <RouterLink to="/">홈</RouterLink>
      <RouterLink to="/glider">글라이더</RouterLink>
      <RouterLink to="/records">기록실</RouterLink>
      <RouterLink to="/about">소개</RouterLink>
    </nav>

    <UnitToggler class="unit-toggler" />
  </header>

  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: #303133;
  text-decoration: none;
}

.app-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.app-nav a {
  padding: 6px 12px;
  border-radius: 6px;
  color: #606266;
  text-decoration: none;
  font-size: 0.95rem;
  transition: background 0.15s;
}

.app-nav a:hover {
  background: #f2f6fc;
}

.app-nav a.router-link-exact-active {
  color: #409eff;
  background: #ecf5ff;
  font-weight: 600;
}

.app-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 24px;
}
</style>
