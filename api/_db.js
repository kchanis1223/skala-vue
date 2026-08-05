import pg from 'pg'

// 서버리스 함수는 호출마다 새로 뜨는 것 같지만 모듈 스코프는 재사용돼서
// 풀을 여기 한 번만 만들어두면 커넥션을 아껴 쓸 수 있음 (Neon pooled 주소 사용)
let pool

export const getPool = () => {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  })
  return pool
}
