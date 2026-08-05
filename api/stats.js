import { getPool } from './_db.js'
import { applyCors } from './_utils.js'

// 기록실 화면에 필요한 통계를 한 번에 내려줌 (요청 횟수 아끼려고)
export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET만 받아요' })
  }

  try {
    const pool = getPool()
    const [total, byCondition, cityBest] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS flights, COUNT(DISTINCT pilot)::int AS pilots FROM flights`,
      ),
      // 날씨 조건별로 평균 점수랑 추락률이 어떻게 다른지
      pool.query(
        `SELECT condition,
                COUNT(*)::int AS plays,
                ROUND(AVG(score), 1)::float AS avg_score,
                ROUND(AVG(CASE WHEN crashed THEN 1.0 ELSE 0 END) * 100) ::int AS crash_rate
         FROM flights WHERE condition IS NOT NULL
         GROUP BY condition ORDER BY plays DESC`,
      ),
      // 도시별 1등 한 줄씩
      pool.query(
        `SELECT DISTINCT ON (city_id)
                city_id, city_name, pilot, score, distance, crashed, flown_at
         FROM flights
         ORDER BY city_id, score DESC, distance DESC`,
      ),
    ])
    res.status(200).json({
      total: total.rows[0],
      byCondition: byCondition.rows,
      cityBest: cityBest.rows.sort((a, b) => b.score - a.score),
    })
  } catch (e) {
    console.error('통계 조회 실패:', e)
    res.status(500).json({ error: 'DB 조회 실패' })
  }
}
