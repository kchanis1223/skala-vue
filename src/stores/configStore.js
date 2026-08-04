import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'weather-glider:unit'

// 단계 5 필수 과제 — Setup Store 방식 (state=ref, getters=computed, actions=function)
export const useConfigStore = defineStore('config', () => {
  const unit = ref(localStorage.getItem(STORAGE_KEY) ?? 'celsius')

  const unitSymbol = computed(() => (unit.value === 'celsius' ? '℃' : '℉'))

  const toggleUnit = () => {
    unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
  }

  // 새로고침 후에도 단위 설정 유지 (추가 실습: localStorage 영속화)
  watch(unit, (newUnit) => localStorage.setItem(STORAGE_KEY, newUnit))

  return { unit, unitSymbol, toggleUnit }
})
