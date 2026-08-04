// 도시 배치 규칙 모음. 지형(바닥색)이랑 건물 생성이 같이 참조함
// 전부 해시 기반이라 어디를 가도 배치가 결정적으로 똑같음

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

const smooth = (t) => t * t * (3 - 2 * t)

export const BLOCK = 42 // 블록 한 변 (도로 포함)
export const ROAD_W = 7 // 도로 폭

export const blockIndex = (v) => Math.floor(v / BLOCK)

// 블록 타입: 건물 / 공원 / 공터
export const blockType = (bx, bz) => {
  const r = hash(bx * 3 + 11, bz * 7 + 5)
  if (r < 0.15) return 'park'
  if (r < 0.24) return 'plaza'
  return 'build'
}

export const blockSeed = (bx, bz, salt = 0) => hash(bx * 31 + salt * 101, bz * 17 - salt * 57)

// 저주파 노이즈로 고층지구(다운타운) 정도를 0~1로
export const districtLevel = (x, z) => {
  const scale = 640
  const fx = x / scale
  const fz = z / scale
  const ix = Math.floor(fx)
  const iz = Math.floor(fz)
  const tx = smooth(fx - ix)
  const tz = smooth(fz - iz)
  const a = hash(ix + 77, iz - 33)
  const b = hash(ix + 78, iz - 33)
  const c = hash(ix + 77, iz - 32)
  const d = hash(ix + 78, iz - 32)
  return a + (b - a) * tx + (c - a + (a - b + d - c) * tx) * tz
}

// 이 좌표 바닥이 도로인지 공원인지 부지인지
export const groundKind = (x, z) => {
  const lx = ((x % BLOCK) + BLOCK) % BLOCK
  const lz = ((z % BLOCK) + BLOCK) % BLOCK
  if (lx < ROAD_W || lz < ROAD_W) return 'road'
  return blockType(blockIndex(x), blockIndex(z)) === 'park' ? 'park' : 'lot'
}
