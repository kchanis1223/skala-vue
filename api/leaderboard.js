import { getPool } from './_db.js'
import { applyCors, numIn } from './_utils.js'

// city 파라미터 있으면 그 도시 TOP, 없으면 전역 TOP
export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET만 받아요' })
  }

  const city = typeof req.query.city === 'string' ? req.query.city.slice(0, 40) : null
  const limit = numIn(req.query.limit, 1, 50) ?? 10

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
