import { getPool } from './_db.js'
import { applyCors, numIn } from './_utils.js'

// 비행 기록 등록. 인증은 없지만 값 검증으로 이상한 데이터는 걸러냄
export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 받아요' })
  }

  const b = req.body ?? {}
  const pilot = typeof b.pilot === 'string' ? b.pilot.trim().slice(0, 12) : ''
  const cityId = typeof b.cityId === 'string' ? b.cityId.slice(0, 40) : ''
  const cityName = typeof b.cityName === 'string' ? b.cityName.slice(0, 40) : ''
  const score = numIn(b.score, 0, 999)
  const distance = numIn(b.distance, 0, 10000)
  const duration = numIn(b.duration, 0, 1200)

  if (!pilot || !cityId || !cityName || score === null || distance === null || duration === null) {
    return res.status(400).json({ error: '값이 빠졌거나 범위를 벗어남' })
  }

  try {
    const { rows } = await getPool().query(
      `INSERT INTO flights (pilot, city_id, city_name, score, distance, duration, crashed, condition, wind_speed, temp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, flown_at`,
      [
        pilot,
        cityId,
        cityName,
        score,
        distance,
        duration,
        Boolean(b.crashed),
        typeof b.condition === 'string' ? b.condition.slice(0, 30) : null,
        numIn(b.windSpeed, 0, 200),
        numIn(b.temp, -100, 100),
      ],
    )
    res.status(201).json(rows[0])
  } catch (e) {
    console.error('INSERT 실패:', e)
    res.status(500).json({ error: 'DB 저장 실패' })
  }
}
