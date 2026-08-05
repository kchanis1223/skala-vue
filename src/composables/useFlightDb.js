import initSqlJs from 'sql.js/dist/sql-wasm.js'

// 비행 기록을 sql.js(브라우저에서 도는 진짜 SQLite)에 저장함
// DB 스냅샷을 localStorage에 넣어둬서 새로고침해도 기록이 남음
const STORAGE_KEY = 'weather-glider:flight-db'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pilot TEXT,
    city_id TEXT NOT NULL,
    city_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    distance INTEGER NOT NULL,
    duration REAL NOT NULL,
    crashed INTEGER NOT NULL,
    condition TEXT,
    wind_speed REAL,
    temp REAL,
    flown_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_flights_city ON flights (city_id, score DESC);
`

const bytesToBase64 = (bytes) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(bin)
}

const base64ToBytes = (b64) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

let dbPromise = null

const openDb = async () => {
  const SQL = await initSqlJs({
    locateFile: (file) => `${import.meta.env.BASE_URL}${file}`,
  })
  let db
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    db = saved ? new SQL.Database(base64ToBytes(saved)) : new SQL.Database()
  } catch (e) {
    console.error('저장된 DB 불러오기 실패, 새로 만듦:', e)
    db = new SQL.Database()
  }
  db.run(SCHEMA)
  // 닉네임 기능 전에 만들어진 DB에는 pilot 컬럼이 없어서 여기서 추가해줌
  const cols = db.exec(`PRAGMA table_info(flights)`)
  const hasPilot = cols[0]?.values.some((row) => row[1] === 'pilot')
  if (!hasPilot) db.run(`ALTER TABLE flights ADD COLUMN pilot TEXT`)
  return db
}

const getDb = () => {
  dbPromise ??= openDb()
  return dbPromise
}

const persist = (db) => {
  localStorage.setItem(STORAGE_KEY, bytesToBase64(db.export()))
}

const rows = (db, sql, params = []) => {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const out = []
  while (stmt.step()) out.push(stmt.getAsObject())
  stmt.free()
  return out
}

export const useFlightDb = () => {
  // 비행 끝나면 한 줄 저장
  const addFlight = async (flight) => {
    const db = await getDb()
    db.run(
      `INSERT INTO flights (pilot, city_id, city_name, score, distance, duration, crashed, condition, wind_speed, temp, flown_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flight.pilot ?? null,
        flight.cityId,
        flight.cityName,
        flight.score,
        flight.distance,
        flight.duration,
        flight.crashed ? 1 : 0,
        flight.condition ?? null,
        flight.windSpeed ?? null,
        flight.temp ?? null,
        flight.flownAt,
      ],
    )
    persist(db)
  }

  // 도시별 리더보드: 점수 높은 순, 동점이면 오래 비행한 순
  const getLeaderboard = async (cityId, limit = 5) => {
    const db = await getDb()
    return rows(
      db,
      `SELECT pilot, score, distance, duration, crashed, condition, flown_at
       FROM flights WHERE city_id = ?
       ORDER BY score DESC, duration DESC LIMIT ?`,
      [cityId, limit],
    )
  }

  // 기록실 "나의 비행 이력"용 최근 기록
  const getRecentFlights = async (limit = 20) => {
    const db = await getDb()
    return rows(
      db,
      `SELECT pilot, city_id, city_name, score, distance, duration, condition, wind_speed, flown_at
       FROM flights ORDER BY flown_at DESC LIMIT ?`,
      [limit],
    )
  }

  // 도시별 요약 통계
  const getCityStats = async (cityId) => {
    const db = await getDb()
    const [stats] = rows(
      db,
      `SELECT COUNT(*) AS plays, MAX(score) AS best, ROUND(AVG(score), 1) AS avg
       FROM flights WHERE city_id = ?`,
      [cityId],
    )
    return stats
  }

  return { addFlight, getLeaderboard, getCityStats, getRecentFlights }
}
