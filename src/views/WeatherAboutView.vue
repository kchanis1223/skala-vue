<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    emoji: '🌍',
    title: '세계 날씨 대시보드',
    desc: '15개 도시의 실시간 날씨와 미세먼지를 한눈에. 도시를 고르면 배경이 그 도시의 날씨와 밤낮으로 물듭니다. 원하는 도시를 검색해 추가할 수도 있어요.',
  },
  {
    emoji: '✈️',
    title: '날씨 활공 게임',
    desc: '고른 도시의 지금 날씨가 그대로 비행 조건이 됩니다. 순풍을 타면 기록이 늘고, 비가 오면 기체가 무거워져요. 빌딩숲 사이 크리스탈을 모아 점수를 올려보세요.',
  },
  {
    emoji: '🏆',
    title: '주간 리더보드',
    desc: '비행 기록은 브라우저 안 SQLite와 PostgreSQL 서버에 함께 저장됩니다. 전 세계 플레이어와 주간 랭킹을 겨루고 도시별 최고 기록에 도전하세요.',
  },
]

const controls = [
  { key: '↑ / W', desc: '기수 내리기 — 속도를 얻는 대신 고도를 잃음' },
  { key: '↓ / S', desc: '기수 올리기 — 고도를 지키지만 실속 주의' },
  { key: '← → / A D', desc: '좌우 선회' },
]
</script>

<template>
  <div class="about-view">
    <section class="about-hero">
      <h2 class="hero-title">🪁 웨더글라이더</h2>
      <p class="hero-sub">세계 각 도시의 날씨를 직접 느껴보세요!</p>
      <p class="hero-desc">
        대시보드에서 도시를 고르면 그 도시의 실제 바람과 비, 밤낮 속에서 종이비행기를 날리는 활공
        게임이 시작됩니다. 오늘 서울에 부는 바람이 곧 여러분의 순풍이 됩니다.
      </p>
    </section>

    <div class="feature-grid">
      <el-card v-for="f in features" :key="f.title" class="feature-card" shadow="hover">
        <p class="feature-emoji">{{ f.emoji }}</p>
        <h3 class="feature-title">{{ f.title }}</h3>
        <p class="feature-desc">{{ f.desc }}</p>
      </el-card>
    </div>

    <el-card class="control-card">
      <template #header>
        <h3 class="section-title">🎮 조작법</h3>
      </template>
      <ul class="control-list">
        <li v-for="c in controls" :key="c.key">
          <el-tag effect="plain" class="key-tag">{{ c.key }}</el-tag>
          <span>{{ c.desc }}</span>
        </li>
      </ul>
      <p class="control-tip">
        💡 발사 타워보다 높은 건물이 많아요. 부딪히면 그대로 추락하니 크리스탈 궤적을 따라 완만하게
        내려가는 게 요령입니다.
      </p>
    </el-card>

    <el-card class="stack-card">
      <template #header>
        <h3 class="section-title">🔧 만든 재료</h3>
      </template>
      <div class="stack-tags">
        <el-tag>Vue 3</el-tag>
        <el-tag>Vue Router</el-tag>
        <el-tag>Pinia</el-tag>
        <el-tag>Element Plus</el-tag>
        <el-tag>Axios</el-tag>
        <el-tag type="success">OpenWeatherMap API</el-tag>
        <el-tag type="warning">three.js</el-tag>
        <el-tag type="danger">sql.js (SQLite)</el-tag>
        <el-tag type="info">PostgreSQL + Vercel</el-tag>
      </div>
    </el-card>

    <el-button type="primary" size="large" class="home-btn" @click="router.push('/')">
      메인으로 돌아가기
    </el-button>
  </div>
</template>

<style scoped>
.about-view {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.about-hero {
  text-align: center;
  padding: 12px 0 4px;
}

.hero-title {
  margin: 0;
  font-size: 2rem;
}

.hero-sub {
  margin: 8px 0 0;
  font-size: 1.05rem;
  color: #409eff;
  font-weight: 600;
}

.hero-desc {
  max-width: 560px;
  margin: 14px auto 0;
  color: #606266;
  line-height: 1.8;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.feature-card {
  text-align: center;
}

.feature-emoji {
  margin: 4px 0 0;
  font-size: 2rem;
}

.feature-title {
  margin: 10px 0 8px;
  font-size: 1.02rem;
}

.feature-desc {
  margin: 0;
  font-size: 0.85rem;
  color: #606266;
  line-height: 1.7;
  text-align: left;
}

.section-title {
  margin: 0;
  font-size: 1.02rem;
}

.control-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #606266;
  font-size: 0.9rem;
}

.key-tag {
  min-width: 96px;
  justify-content: center;
  font-weight: 700;
}

.control-tip {
  margin: 14px 0 0;
  font-size: 0.82rem;
  color: #909399;
}

.stack-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-btn {
  align-self: center;
  min-width: 220px;
}
</style>
