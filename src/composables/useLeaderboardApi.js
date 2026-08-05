import axios from 'axios'

// 전역 리더보드 서버 (vercel 함수 + postgresql)
// VITE_API_BASE가 없으면 전역 기능은 꺼진 걸로 치고 전부 null을 돌려줌
// 실패해도 null만 주고 끝 — 호출하는 쪽에서 로컬 sql.js로 폴백함
const base = import.meta.env.VITE_API_BASE

const api = base
  ? axios.create({ baseURL: base, timeout: 6000 })
  : null

export const useLeaderboardApi = () => {
  const enabled = Boolean(api)

  const postFlight = async (flight) => {
    if (!api) return null
    try {
      const { data } = await api.post('/api/flights', flight)
      return data
    } catch (e) {
      console.warn('전역 기록 등록 실패:', e.message)
      return null
    }
  }

  const fetchLeaderboard = async (cityId, limit = 5) => {
    if (!api) return null
    try {
      const { data } = await api.get('/api/leaderboard', {
        params: cityId ? { city: cityId, limit } : { limit },
      })
      return data
    } catch (e) {
      console.warn('전역 리더보드 조회 실패:', e.message)
      return null
    }
  }

  const fetchStats = async () => {
    if (!api) return null
    try {
      const { data } = await api.get('/api/stats')
      return data
    } catch (e) {
      console.warn('전역 통계 조회 실패:', e.message)
      return null
    }
  }

  return { enabled, postFlight, fetchLeaderboard, fetchStats }
}
