<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import UnitToggler from '@/components/dashboard/UnitToggler.vue'
import WeatherThemeBackground from '@/components/WeatherThemeBackground.vue'
import ThemePreviewDock from '@/components/ThemePreviewDock.vue'
import { useFlightStore } from '@/stores/flightStore'
import { THEMES } from '@/utils/weatherTheme'

const flightStore = useFlightStore()
// 스토어 구조분해는 storeToRefs로 해야 반응성이 안 깨짐
const { selectedCity, previewTheme, themeKey, isNight } = storeToRefs(flightStore)

// 도쿄"이" 처럼 어색해져서 받침 보고 이/가 붙임
const nameParticle = computed(() => {
  const name = selectedCity.value?.name ?? ''
  const lastCode = name.charCodeAt(name.length - 1)
  if (lastCode < 0xac00 || lastCode > 0xd7a3) return '이(가)'
  return (lastCode - 0xac00) % 28 > 0 ? '이' : '가'
})

// "맑음으로" / "비로" 같은 (으)로 받침 처리
const themeParticle = computed(() => {
  const label = THEMES[previewTheme.value]?.label ?? ''
  const lastCode = label.charCodeAt(label.length - 1)
  if (lastCode < 0xac00 || lastCode > 0xd7a3) return '(으)로'
  const jong = (lastCode - 0xac00) % 28
  return jong === 0 || jong === 8 ? '로' : '으로' // 받침 없거나 ㄹ이면 '로'
})

// 밤엔 맑음 이모지를 달로
const chipEmoji = computed(() => {
  if (isNight.value && themeKey.value === 'clear') return '🌙'
  return THEMES[themeKey.value].emoji
})
</script>

<template>
  <WeatherThemeBackground :theme-key="themeKey" :night="isNight" />
  <ThemePreviewDock />

  <header class="app-header">
    <RouterLink to="/" class="brand">🪁 웨더글라이더</RouterLink>

    <!-- a 태그로 하면 새로고침돼서 RouterLink로 -->
    <nav class="app-nav">
      <RouterLink to="/">홈</RouterLink>
      <RouterLink to="/glider">글라이더</RouterLink>
      <RouterLink to="/records">기록실</RouterLink>
      <RouterLink to="/about">소개</RouterLink>
    </nav>

    <UnitToggler class="unit-toggler" />
  </header>

  <!-- 도시를 선택하면 우상단에 뜨고 배경 테마도 같이 바뀜.
       테마 미리보기를 직접 누른 경우엔 도시 문구랑 헷갈려서 따로 안내 -->
  <Transition name="chip-pop">
    <div
      v-if="previewTheme"
      :key="`preview-${previewTheme}`"
      class="theme-chip"
      :class="`chip-${themeKey}`"
    >
      <span class="chip-emoji">{{ chipEmoji }}</span>
      <span>
        배경 테마가 <strong>{{ THEMES[previewTheme].label }}</strong
        >{{ themeParticle }} 변경되었습니다
      </span>
    </div>
    <div
      v-else-if="selectedCity"
      :key="selectedCity.id"
      class="theme-chip"
      :class="`chip-${themeKey}`"
    >
      <span class="chip-emoji">{{ chipEmoji }}</span>
      <span>
        <strong>{{ selectedCity.name }}</strong
        >{{ nameParticle }} 선택되었습니다
        <template v-if="THEMES[themeKey].label"> · {{ THEMES[themeKey].label }}</template>
      </span>
    </div>
  </Transition>

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
  border-bottom: 1px solid rgba(228, 231, 237, 0.6);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 30;
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

.theme-chip {
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-left: 4px solid #909399;
  font-size: 0.92rem;
  color: #303133;
}

.chip-emoji {
  font-size: 1.15rem;
}

.chip-clear {
  border-left-color: #f9a825;
}

.chip-clouds {
  border-left-color: #78909c;
}

.chip-rain {
  border-left-color: #1e88e5;
}

.chip-snow {
  border-left-color: #90caf9;
}

.chip-mist {
  border-left-color: #9e9e9e;
}

.chip-pop-enter-active,
.chip-pop-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s ease;
}

.chip-pop-enter-from,
.chip-pop-leave-to {
  transform: translateY(-12px) scale(0.9);
  opacity: 0;
}

.app-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 24px;
}
</style>
