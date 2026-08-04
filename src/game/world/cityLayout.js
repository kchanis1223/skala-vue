// 도시 배치 규칙 모음. 지형(바닥색)이랑 건물 생성이 같이 참조함
// 격자를 노이즈로 비틀어서(도메인 워핑) 도로가 자연스럽게 굽이치게 함
// "논리 좌표" = 반듯한 격자 세계, "월드 좌표" = 비틀린 실제 세계

const hash = (ix, iz) => {
  let h = ix * 374761393 + iz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967295
}

const smooth = (t) => t * t * (3 - 2 * t)

const noise2d = (x, z, scale, off = 0) => {
  const fx = x / scale + off
  const fz = z / scale - off
  const ix = Math.floor(fx)
  const iz = Math.floor(fz)
  const tx = smooth(fx - ix)
  const tz = smooth(fz - iz)
  const a = hash(ix, iz)
  const b = hash(ix + 1, iz)
  const c = hash(ix, iz + 1)
  const d = hash(ix + 1, iz + 1)
  return a + (b - a) * tx + (c - a + (a - b + d - c) * tx) * tz
}

export const BLOCK = 42 // 블록 한 변 (도로 포함)
export const ROAD_W = 7 // 도로 폭

export const blockIndex = (v) => Math.floor(v / BLOCK)

// 격자 비틀기. 월드 → 논리로 갈 때 더하는 오프셋
export const warpOffset = (x, z, seed = 0) => ({
  wx: (noise2d(x, z, 230, seed + 501) - 0.5) * 20,
  wz: (noise2d(x, z, 230, seed + 777) - 0.5) * 20,
})

export const toLogical = (x, z, seed = 0) => {
  const { wx, wz } = warpOffset(x, z, seed)
  return { lx: x + wx, lz: z + wz }
}

// 논리 좌표의 물건을 월드 어디에 놓을지 (역변환 근사)
export const worldFromLogical = (lx, lz, seed = 0) => {
  const { wx, wz } = warpOffset(lx, lz, seed)
  return { x: lx - wx, z: lz - wz }
}

// 블록 타입: 건물 / 공원 / 공터
export const blockType = (bx, bz, seed = 0, parkProb = 0.15, plazaProb = 0.09) => {
  const r = hash(bx * 3 + 11 + seed, bz * 7 + 5 - seed)
  if (r < parkProb) return 'park'
  if (r < parkProb + plazaProb) return 'plaza'
  return 'build'
}

export const blockSeed = (bx, bz, seed = 0, salt = 0) =>
  hash(bx * 31 + salt * 101 + seed, bz * 17 - salt * 57 - seed * 3)

// 저주파 노이즈로 고층지구(다운타운) 정도를 0~1로
export const districtLevel = (x, z, seed = 0) => noise2d(x, z, 640, seed + 77)

// 강 중심선 (논리 좌표 기준)
export const riverCenterX = (lz, seed = 0) =>
  Math.sin(lz * 0.002 + seed) * 220 + Math.sin(lz * 0.0007 - seed) * 120

export const RIVER_HALF = 17

export const inRiver = (lx, lz, seed = 0) => Math.abs(lx - riverCenterX(lz, seed)) < RIVER_HALF

// 해안선. 이보다 +x쪽은 바다 (해안 도시만)
export const seaStartX = (lz, seed = 0) =>
  300 + Math.sin(lz * 0.0011 + seed) * 70 + Math.sin(lz * 0.0035 - seed * 2) * 25

export const inSea = (lx, lz, seed, style) => !!style?.coast && lx > seaStartX(lz, seed)

// 이 좌표 바닥이 뭔지: 물 / 모래사장 / 도로 / 공원 / 부지
export const groundKind = (x, z, seed = 0, style = null) => {
  const { lx, lz } = toLogical(x, z, seed)
  if (style?.coast) {
    const s = seaStartX(lz, seed)
    if (lx > s) return 'water'
    if (lx > s - 14) return 'sand'
  }
  const llx = ((lx % BLOCK) + BLOCK) % BLOCK
  const llz = ((lz % BLOCK) + BLOCK) % BLOCK
  const onRoad = llx < ROAD_W || llz < ROAD_W
  // 도로선은 강 위에서도 이어져서 다리가 됨
  if (style?.river && inRiver(lx, lz, seed)) return onRoad ? 'road' : 'water'
  if (onRoad) return 'road'
  const type = blockType(blockIndex(lx), blockIndex(lz), seed, style?.parkProb, style?.plazaProb)
  return type === 'park' ? 'park' : 'lot'
}
