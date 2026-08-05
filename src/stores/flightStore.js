import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { conditionToTheme } from '@/utils/weatherTheme'

// 선택한 도시를 앱 전체(배경 테마, 나중엔 글라이더 게임)에서 써야 해서 스토어로 뺌
export const useFlightStore = defineStore('flight', () => {
  const selectedCity = ref(null)
  const previewTheme = ref(null)

  // 미리보기가 켜져있으면 그게 우선, 아니면 선택 도시의 날씨
  const themeKey = computed(
    () => previewTheme.value ?? conditionToTheme(selectedCity.value?.condition),
  )

  // 선택 도시가 지금 밤이면 배경도 밤 버전으로. 미리보기 중엔 낮 버전 고정
  const isNight = computed(() => {
    if (previewTheme.value) return false
    const city = selectedCity.value
    if (!city?.sunrise || !city?.sunset) return false
    const t = Date.now() / 1000
    return t < city.sunrise || t > city.sunset
  })

  const selectCity = (city) => {
    selectedCity.value = city
    previewTheme.value = null
  }

  // 같은 버튼 또 누르면 미리보기 해제
  const togglePreview = (key) => {
    previewTheme.value = previewTheme.value === key ? null : key
  }

  // 직전 비행 결과 (기록실에서 쓸 예정)
  const lastFlight = ref(null)
  const setFlightResult = (result) => {
    lastFlight.value = result
  }

  return {
    selectedCity,
    previewTheme,
    themeKey,
    isNight,
    selectCity,
    togglePreview,
    lastFlight,
    setFlightResult,
  }
})
