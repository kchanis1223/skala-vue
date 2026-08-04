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

// 블록 타입: 건물 / 공원 / 공터 / 주차장
export const blockType = (bx, bz, seed = 0, parkProb = 0.15, plazaProb = 0.09) => {
  const r = hash(bx * 3 + 11 + seed, bz * 7 + 5 - seed)
  if (r < parkProb) return 'park'
  if (r < parkProb + plazaProb) return 'plaza'
  if (r < parkProb + plazaProb + 0.05) return 'parking'
  return 'build'
}

// 도로 위계: 몇 줄에 하나씩 넓은 대로, 나머지는 골목
// 골목은 구간(블록 경계)마다 없기도 해서 블록들이 합쳐진 것처럼 보임
export const MAJOR_W = 11
export const MINOR_W = 6

export const isMajorX = (k, seed = 0) => hash(k * 13 + 7 + seed, 91 - seed) < 0.22
export const isMajorZ = (k, seed = 0) => hash(97 + seed, k * 17 + 3 - seed) < 0.22

const segExistsX = (k, bz, seed) => hash(k * 5 + 1 + seed, bz * 11 + 3 - seed) < 0.6
const segExistsZ = (bx, k, seed) => hash(bx * 7 + 5 + seed, k * 19 - 2 - seed) < 0.6

// 이 논리 좌표가 도로 위인지
export const roadAt = (lx, lz, seed = 0) => {
  const kx = blockIndex(lx)
  const kz = blockIndex(lz)
  const llx = lx - kx * BLOCK
  const llz = lz - kz * BLOCK
  const majX = isMajorX(kx, seed)
  const majZ = isMajorZ(kz, seed)
  if (llx < (majX ? MAJOR_W : MINOR_W) && (majX || segExistsX(kx, kz, seed))) return true
  if (llz < (majZ ? MAJOR_W : MINOR_W) && (majZ || segExistsZ(kx, kz, seed))) return true
  return false
}

// 부지 바닥 명암: 블록마다 톤이 다르고 건물 발밑엔 어두운 기초 패드
export const lotShade = (lx, lz, seed = 0) => {
  const bx = blockIndex(lx)
  const bz = blockIndex(lz)
  const jitter = 0.9 + blockSeed(bx, bz, seed, 31) * 0.18
  const cx = bx * BLOCK + ROAD_W + (BLOCK - ROAD_W) / 2
  const cz = bz * BLOCK + ROAD_W + (BLOCK - ROAD_W) / 2
  const padHalf = (BLOCK - ROAD_W) * 0.33
  const inPad = Math.abs(lx - cx) < padHalf && Math.abs(lz - cz) < padHalf
  return inPad ? jitter * 0.8 : jitter
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

// 이 좌표 바닥이 뭔지: 물 / 모래사장 / 도로 / 공원 / 주차장 / 부지
export const groundKind = (x, z, seed = 0, style = null) => {
  const { lx, lz } = toLogical(x, z, seed)
  if (style?.coast) {
    const s = seaStartX(lz, seed)
    if (lx > s) return 'water'
    if (lx > s - 14) return 'sand'
  }
  const onRoad = roadAt(lx, lz, seed)
  // 도로선은 강 위에서도 이어져서 다리가 됨
  if (style?.river && inRiver(lx, lz, seed)) return onRoad ? 'road' : 'water'
  if (onRoad) return 'road'
  const type = blockType(blockIndex(lx), blockIndex(lz), seed, style?.parkProb, style?.plazaProb)
  if (type === 'park') return 'park'
  if (type === 'parking') return 'parking'
  return 'lot'
}
