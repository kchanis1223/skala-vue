<script setup>
import { storeToRefs } from 'pinia'
import { useFlightStore } from '@/stores/flightStore'
import { THEMES } from '@/utils/weatherTheme'

const flightStore = useFlightStore()
const { previewTheme } = storeToRefs(flightStore)

const previewKeys = ['clear', 'clouds', 'rain', 'snow', 'mist']
</script>

<template>
  <aside class="theme-dock">
    <p class="dock-title">테마</p>
    <button
      v-for="key in previewKeys"
      :key="key"
      class="dock-btn"
      :class="{ active: previewTheme === key }"
      :title="`${THEMES[key].label} 테마 미리보기`"
      @click="flightStore.togglePreview(key)"
    >
      {{ THEMES[key].emoji }}
    </button>
  </aside>
</template>

<style scoped>
.theme-dock {
  position: fixed;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}

.dock-title {
  margin: 0 0 2px;
  font-size: 0.62rem;
  color: #909399;
  letter-spacing: 0.05em;
}

.dock-btn {
  width: 34px;
  height: 34px;
  border: 2px solid transparent;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  cursor: pointer;
  transition:
    transform 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
}

.dock-btn:hover {
  transform: scale(1.15);
}

.dock-btn.active {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}
</style>
