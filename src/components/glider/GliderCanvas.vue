<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GliderEngine } from '@/game/GliderEngine'

// three.js 엔진은 Vue 반응성이랑 섞이면 느려져서 순수 js로 두고
// 이 컴포넌트는 마운트/정리만 담당함 (4장 라이프사이클 훅 활용)
const props = defineProps({
  flightParams: { type: Object, required: true },
})

const emit = defineEmits(['tick', 'end', 'hit'])

const canvasRef = ref(null)
let engine = null

onMounted(() => {
  engine = new GliderEngine(canvasRef.value, props.flightParams, {
    onTick: (data) => emit('tick', data),
    onEnd: (result) => emit('end', result),
    onHit: () => emit('hit'),
  })
  engine.start()
})

onUnmounted(() => {
  engine?.dispose()
  engine = null
})
</script>

<template>
  <canvas ref="canvasRef" class="glider-canvas"></canvas>
</template>

<style scoped>
.glider-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12px;
}
</style>
