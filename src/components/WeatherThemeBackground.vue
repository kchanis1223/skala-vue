<script setup>
import { computed } from 'vue'

const props = defineProps({
  themeKey: { type: String, default: 'default' },
})

const range = (n) => Array.from({ length: n }, (_, i) => i)

// 파티클 위치/속도는 테마 바뀔 때마다 랜덤으로 뿌림
const particles = computed(() => {
  if (props.themeKey === 'rain') {
    return range(30).map(() => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 1.2}s`,
      animationDuration: `${0.7 + Math.random() * 0.6}s`,
    }))
  }
  if (props.themeKey === 'snow') {
    return range(24).map(() => {
      const size = 5 + Math.random() * 7
      return {
        left: `${Math.random() * 100}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: 0.5 + Math.random() * 0.5,
        animationDelay: `${-Math.random() * 10}s`,
        animationDuration: `${6 + Math.random() * 6}s`,
      }
    })
  }
  if (props.themeKey === 'clouds' || props.themeKey === 'mist') {
    return range(5).map((i) => ({
      top: `${4 + i * 15 + Math.random() * 6}%`,
      width: `${240 + Math.random() * 280}px`,
      animationDelay: `${-Math.random() * 70}s`,
      animationDuration: `${45 + Math.random() * 35}s`,
    }))
  }
  return []
})

const particleClass = computed(
  () =>
    ({
      rain: 'drop',
      snow: 'flake',
      clouds: 'cloud',
      mist: 'fog',
    })[props.themeKey] ?? '',
)
</script>

<template>
  <Transition name="theme-fade">
    <div :key="themeKey" class="theme-bg" :class="`bg-${themeKey}`">
      <div v-if="themeKey === 'clear'" class="sun"></div>
      <span
        v-for="(style, i) in particles"
        :key="`${themeKey}-${i}`"
        class="particle"
        :class="particleClass"
        :style="style"
      ></span>
    </div>
  </Transition>
</template>

<style scoped>
.theme-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.theme-fade-enter-active,
.theme-fade-leave-active {
  transition: opacity 0.9s ease;
}

.theme-fade-enter-from,
.theme-fade-leave-to {
  opacity: 0;
}

.bg-default {
  background: #f5f7fa;
}

.bg-clear {
  background: linear-gradient(180deg, #8ecbf5 0%, #cde9ff 55%, #fdf0d5 100%);
}

.bg-clouds {
  background: linear-gradient(180deg, #9fb3bf 0%, #cfd8dc 60%, #eceff1 100%);
}

.bg-rain {
  background: linear-gradient(180deg, #6b8593 0%, #90a4ae 60%, #cfd8dc 100%);
}

.bg-snow {
  background: linear-gradient(180deg, #b8c9d4 0%, #dde7ee 60%, #ffffff 100%);
}

.bg-mist {
  background: linear-gradient(180deg, #b9c2c8 0%, #d5dade 60%, #e8eaed 100%);
}

.particle {
  position: absolute;
  display: block;
  pointer-events: none;
}

/* 맑음: 은은한 태양 */
.sun {
  position: absolute;
  top: -120px;
  right: -120px;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 236, 160, 0.95) 0%,
    rgba(255, 214, 90, 0.35) 45%,
    transparent 70%
  );
  animation: sun-pulse 5s ease-in-out infinite;
}

@keyframes sun-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.12);
    opacity: 1;
  }
}

/* 비: 위에서 아래로 떨어지는 빗줄기 */
.drop {
  top: -12vh;
  width: 2px;
  height: 60px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.55));
  animation-name: fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes fall {
  to {
    transform: translateY(125vh);
  }
}

/* 눈: 좌우로 흔들리며 내려오는 눈송이 */
.flake {
  top: -6vh;
  border-radius: 50%;
  background: #fff;
  animation-name: snowfall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes snowfall {
  25% {
    transform: translate(18px, 30vh);
  }
  50% {
    transform: translate(-12px, 60vh);
  }
  75% {
    transform: translate(14px, 90vh);
  }
  100% {
    transform: translate(0, 118vh);
  }
}

/* 흐림/안개: 옆으로 흘러가는 덩어리 */
.cloud,
.fog {
  left: -40%;
  width: 320px;
  height: 90px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.5);
  filter: blur(18px);
  animation-name: drift;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.fog {
  width: 480px;
  height: 60px;
  background: rgba(255, 255, 255, 0.65);
  filter: blur(26px);
}

@keyframes drift {
  to {
    transform: translateX(160vw);
  }
}
</style>
