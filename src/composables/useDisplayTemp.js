import { computed, toValue } from 'vue'
import { useConfigStore } from '@/stores/configStore'

// 메인이랑 상세 둘 다에서 온도 변환이 필요해서 composable로 뺐음
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
