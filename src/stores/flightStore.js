import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { conditionToTheme } from '@/utils/weatherTheme'

// 선택한 도시를 앱 전체(배경 테마, 나중엔 글라이더 게임)에서 써야 해서 스토어로 뺌
export const useFlightStore = defineStore('flight', () => {
  const selectedCity = ref(null)

  const themeKey = computed(() => conditionToTheme(selectedCity.value?.condition))

  const selectCity = (city) => {
    selectedCity.value = city
  }

  return { selectedCity, themeKey, selectCity }
})
