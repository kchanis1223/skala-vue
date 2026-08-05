<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="about-view">
    <el-card>
      <template #header>
        <h2 class="about-title">🪁 웨더글라이더 소개</h2>
      </template>

      <p>
        <strong>웨더글라이더</strong>는 날씨를 확인하고, 날씨를 <em>체험하는</em> 앱입니다.
        대시보드에서 도시를 고르면 그 도시의 실제 환경(바람·강수·밤낮) 속에서 종이비행기를 날리는
        활공 게임이 펼쳐집니다.
      </p>

      <ul class="about-list">
        <li>Vue 3 Composition API + Vue Router + Pinia + Element Plus</li>
        <li>OpenWeatherMap API — 현재 날씨 / 예보 / 대기질 (연동 예정)</li>
        <li>three.js 비행 씬 — 실제 풍속·풍향이 비행 물리에 반영 (구현 예정)</li>
        <li>sql.js(SQLite WASM) — 도시별 비행 기록 리더보드 (구현 예정)</li>
      </ul>

      <el-button type="primary" @click="router.push('/')">메인으로 돌아가기</el-button>
    </el-card>
  </div>
</template>

<style scoped>
.about-view {
  max-width: 560px;
}

.about-title {
  margin: 0;
  font-size: 1.2rem;
}

.about-list {
  margin: 16px 0 20px;
  padding-left: 20px;
  line-height: 1.9;
}
</style>
