<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="about-view">
    <el-card>
      <template #header>
        <h2 class="about-title">🌦️ 웨더보드 소개</h2>
      </template>

      <p>
        <strong>웨더보드</strong>는 세계 주요 도시의 실시간 날씨를 모아 보는 대시보드입니다. 도시
        카드를 선택하면 배경 테마가 그 도시의 날씨(맑음/흐림/비/눈/안개)로 바뀌어서, 수치가 아니라
        분위기로 날씨를 체감할 수 있게 만들었습니다.
      </p>

      <ul class="about-list">
        <li>Vue 3 Composition API + Vue Router + Pinia + Element Plus</li>
        <li>OpenWeatherMap API — 현재 날씨 / 대기질(PM2.5) / Geocoding 도시 검색</li>
        <li>도시 추가·삭제 (localStorage로 새로고침해도 유지)</li>
        <li>날씨 필터와 이름/기온/체감온도 정렬</li>
        <li>날씨 연동 배경 테마 + 왼쪽 독에서 테마 미리보기</li>
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
