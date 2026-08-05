import { getPool } from './_db.js'
import { applyCors, numIn } from './_utils.js'

// city 파라미터 있으면 그 도시 TOP, scope=weekly면 주간 랭킹, 없으면 전역 TOP
export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET만 받아요' })
  }

  const city = typeof req.query.city === 'string' ? req.query.city.slice(0, 40) : null
  const limit = numIn(req.query.limit, 1, 50) ?? 10

  // 주간 리더보드: 최근 7일, 조종사별 최고 기록 기준으로 랭킹.
  // pilot 파라미터를 주면 그 사람 순위도 같이 내려줌 (상위권 밖이어도 확인 가능)
  if (req.query.scope === 'weekly') {
    const pilot = typeof req.query.pilot === 'string' ? req.query.pilot.trim().slice(0, 12) : ''
    try {
      const { rows } = await getPool().query(
        `WITH best AS (
           SELECT DISTINCT ON (pilot)
                  pilot, city_name, score, distance, duration, condition, wind_speed, flown_at
           FROM flights
           WHERE flown_at >= now() - interval '7 days'
           ORDER BY pilot, score DESC, distance DESC
         )
         SELECT *, RANK() OVER (ORDER BY score DESC, distance DESC)::int AS rank
         FROM best
         ORDER BY rank`,
      )
      const idx = pilot ? rows.findIndex((r) => r.pilot === pilot) : -1
      const me = idx >= 0 ? rows[idx] : null
      // 내 순위 바로 위아래 한 칸씩도 같이 줌 (리더보드에서 주변 순위 보여주기용)
      const around = idx >= 0 ? rows.slice(Math.max(0, idx - 1), idx + 2) : []
      res.status(200).json({ top: rows.slice(0, limit), me, around, totalPilots: rows.length })
    } catch (e) {
      console.error('주간 랭킹 조회 실패:', e)
      res.status(500).json({ error: 'DB 조회 실패' })
    }
    return
  }

  try {
    const { rows } = city
      ? await getPool().query(
          `SELECT pilot, city_id, city_name, score, distance, duration, crashed, condition, flown_at
           FROM flights WHERE city_id = $1
           ORDER BY score DESC, distance DESC LIMIT $2`,
          [city, limit],
        )
      : await getPool().query(
          `SELECT pilot, city_id, city_name, score, distance, duration, crashed, condition, flown_at
           FROM flights ORDER BY score DESC, distance DESC LIMIT $1`,
          [limit],
        )
    res.status(200).json(rows)
  } catch (e) {
    console.error('리더보드 조회 실패:', e)
    res.status(500).json({ error: 'DB 조회 실패' })
  }
}
