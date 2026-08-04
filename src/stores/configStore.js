import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'weather-glider:unit'

// setup store 방식 (state는 ref, getters는 computed로)
export const useConfigStore = defineStore('config', () => {
  const unit = ref(localStorage.getItem(STORAGE_KEY) ?? 'celsius')

  const unitSymbol = computed(() => (unit.value === 'celsius' ? '℃' : '℉'))

  const toggleUnit = () => {
    unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
  }

  // 새로고침해도 단위 유지되게 저장
  watch(unit, (newUnit) => localStorage.setItem(STORAGE_KEY, newUnit))

  return { unit, unitSymbol, toggleUnit }
})
