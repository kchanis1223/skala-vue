import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { conditionToTheme } from '@/utils/weatherTheme'

// 선택한 도시를 앱 전체(배경 테마, 우상단 칩)에서 써야 해서 스토어로 뺌
export const useThemeStore = defineStore('theme', () => {
  const selectedCity = ref(null)
  const previewTheme = ref(null)

  // 미리보기가 켜져있으면 그게 우선, 아니면 선택 도시의 날씨
  const themeKey = computed(
    () => previewTheme.value ?? conditionToTheme(selectedCity.value?.condition),
  )

  const selectCity = (city) => {
    selectedCity.value = city
    previewTheme.value = null
  }

  // 같은 버튼 또 누르면 미리보기 해제
  const togglePreview = (key) => {
    previewTheme.value = previewTheme.value === key ? null : key
  }

  return { selectedCity, previewTheme, themeKey, selectCity, togglePreview }
})
