// 도시 배치 규칙 모음. 지형(바닥색)이랑 건물 생성이 같이 참조함
// 전부 해시 기반이라 같은 도시(시드)에선 어디를 가도 배치가 결정적으로 똑같음

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

const smooth = (t) => t * t * (3 - 2 * t)

export const BLOCK = 42 // 블록 한 변 (도로 포함)
export const ROAD_W = 7 // 도로 폭

export const blockIndex = (v) => Math.floor(v / BLOCK)

// 블록 타입: 건물 / 공원 / 공터. 확률은 도시 스타일이 정함
export const blockType = (bx, bz, seed = 0, parkProb = 0.15, plazaProb = 0.09) => {
  const r = hash(bx * 3 + 11 + seed, bz * 7 + 5 - seed)
  if (r < parkProb) return 'park'
  if (r < parkProb + plazaProb) return 'plaza'
  return 'build'
}

export const blockSeed = (bx, bz, seed = 0, salt = 0) =>
  hash(bx * 31 + salt * 101 + seed, bz * 17 - salt * 57 - seed * 3)

// 저주파 노이즈로 고층지구(다운타운) 정도를 0~1로
export const districtLevel = (x, z, seed = 0) => {
  const scale = 640
  const fx = x / scale
  const fz = z / scale
  const ix = Math.floor(fx)
  const iz = Math.floor(fz)
  const tx = smooth(fx - ix)
  const tz = smooth(fz - iz)
  const a = hash(ix + 77 + seed, iz - 33 - seed)
  const b = hash(ix + 78 + seed, iz - 33 - seed)
  const c = hash(ix + 77 + seed, iz - 32 - seed)
  const d = hash(ix + 78 + seed, iz - 32 - seed)
  return a + (b - a) * tx + (c - a + (a - b + d - c) * tx) * tz
}

// 강 중심선. 도시를 가로지르며 완만하게 굽이침
export const riverCenterX = (z, seed = 0) =>
  Math.sin(z * 0.002 + seed) * 220 + Math.sin(z * 0.0007 - seed) * 120

export const RIVER_HALF = 17

export const inRiver = (x, z, seed = 0) => Math.abs(x - riverCenterX(z, seed)) < RIVER_HALF

// 이 좌표 바닥이 뭔지: 도로 / 물 / 공원 / 부지
// 도로선은 강 위에서도 이어져서 자연스럽게 다리가 됨
export const groundKind = (x, z, seed = 0, style = null) => {
  const lx = ((x % BLOCK) + BLOCK) % BLOCK
  const lz = ((z % BLOCK) + BLOCK) % BLOCK
  const onRoad = lx < ROAD_W || lz < ROAD_W
  if (style?.river && inRiver(x, z, seed)) return onRoad ? 'road' : 'water'
  if (onRoad) return 'road'
  const type = blockType(blockIndex(x), blockIndex(z), seed, style?.parkProb, style?.plazaProb)
  return type === 'park' ? 'park' : 'lot'
}
