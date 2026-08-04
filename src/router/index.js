import { createRouter, createWebHistory } from 'vue-router'

// 전 라우트 지연 로딩(Lazy Loading) — 특히 /glider는 three.js 번들이 분리되어 효과가 큼
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/WeatherHomeView.vue'),
    },
    {
      path: '/weather/:cityId',
      name: 'weather-detail',
      component: () => import('@/views/WeatherDetailView.vue'),
    },
    {
      path: '/glider',
      name: 'glider',
      component: () => import('@/views/GliderView.vue'),
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('@/views/RecordsView.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/WeatherAboutView.vue'),
    },
    {
      // Catch-all Route — 정의되지 않은 모든 경로는 404 페이지로
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

export default router
