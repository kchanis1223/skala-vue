import { computed, toValue } from 'vue'
import { useConfigStore } from '@/stores/configStore'

// 메인/상세 화면에 중복되는 단위 변환 로직을 추출한 Composable
// (강의에서 "과제 범위 제외"로 언급된 부분 — 추가 실습)
export const useDisplayTemp = (tempSource) => {
  const configStore = useConfigStore()

  const displayTemp = computed(() => {
    const rawTemp = toValue(tempSource)
    if (rawTemp == null) return null
    if (configStore.unit === 'fahrenheit') return Math.round((rawTemp * 9) / 5 + 32)
    return rawTemp
  })

  return { displayTemp }
}
