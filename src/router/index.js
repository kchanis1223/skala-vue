import { createRouter, createWebHistory } from 'vue-router'

// 라우트는 전부 lazy loading (glider 쪽은 three.js가 무거워서 특히 필요함)
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
      // 없는 경로는 전부 404로
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

export default router
