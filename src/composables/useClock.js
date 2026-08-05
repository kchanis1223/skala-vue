import { ref } from 'vue'

// 카드마다 setInterval 돌리면 낭비라 앱 전체가 시계 하나를 같이 씀
const now = ref(Date.now())
setInterval(() => {
  now.value = Date.now()
}, 30000)

export const useClock = () => now
