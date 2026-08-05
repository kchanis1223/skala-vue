// 우리 페이지에서 오는 요청만 받도록 CORS 제한
const ALLOWED_ORIGINS = ['https://kchanis1223.github.io', 'http://localhost:5173']

// true를 돌려주면 OPTIONS 프리플라이트라서 본 처리를 건너뛰면 됨
export const applyCors = (req, res) => {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

// 숫자 범위 검사. 벗어나면 null
export const numIn = (v, min, max) => {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}
