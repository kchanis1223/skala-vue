<script setup>
import { computed } from 'vue'
import { useConfigStore } from '@/stores/configStore'

// 단계 5 필수 — 온도 단위 전환 UI, Navigation Bar 옆에 배치
const configStore = useConfigStore()

const isFahrenheit = computed({
  get: () => configStore.unit === 'fahrenheit',
  set: () => configStore.toggleUnit(),
})
</script>

<template>
  <el-switch v-model="isFahrenheit" inactive-text="℃" active-text="℉" />
</template>
