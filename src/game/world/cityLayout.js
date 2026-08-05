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

// 도시 스타일을 여기서도 알아야 함 (강폭, 산, 구역 규칙이 도시마다 달라서)
// 비행 시작할 때 terrain의 setTerrainStyle이 같이 세팅해줌
let layoutStyle = null
export const setLayoutStyle = (style) => {
  layoutStyle = style
}

// 산: 스타일에 봉우리 목록이 있으면 그 주변이 산이 됨 (0~1)
const peakFactor = (x, z, m) => {
  const d = Math.hypot(x - m.x, z - m.z)
  return smooth(Math.max(1 - d / m.r, 0))
}

// 숲 산 (건물/도로 금지). homes 언덕은 여기서 제외됨
export const mountainLevel = (x, z) => {
  const peaks = layoutStyle?.mountains
  if (!peaks) return 0
  let lv = 0
  for (const m of peaks) {
    if (m.homes) continue
    lv = Math.max(lv, peakFactor(x, z, m))
  }
  return lv
}

// 주거 언덕 (부산 산복도로처럼 경사면에 집이 붙는 곳). 건물/도로 유지됨
export const hillLevel = (x, z) => {
  const peaks = layoutStyle?.mountains
  if (!peaks) return 0
  let lv = 0
  for (const m of peaks) {
    if (!m.homes) continue
    lv = Math.max(lv, peakFactor(x, z, m))
  }
  return lv
}

// 산 높이 기여분. 지형이랑 색칠 둘 다 이걸 씀
export const mountainHeight = (x, z) => {
  const peaks = layoutStyle?.mountains
  if (!peaks) return 0
  let h = 0
  for (const m of peaks) {
    const t = peakFactor(x, z, m)
    if (t > 0) h += Math.pow(t, 1.35) * m.h * (0.82 + noise2d(x, z, 55, 913) * 0.36)
  }
  return h
}

export const blockIndex = (v) => Math.floor(v / BLOCK)

// 격자 비틀기. 월드 → 논리로 갈 때 더하는 오프셋
// 맨해튼처럼 자로 잰 격자가 어울리는 도시는 스타일에서 끔
export const warpOffset = (x, z, seed = 0) => {
  if (layoutStyle?.gridStraight) return { wx: 0, wz: 0 }
  return {
    wx: (noise2d(x, z, 230, seed + 501) - 0.5) * 20,
    wz: (noise2d(x, z, 230, seed + 777) - 0.5) * 20,
  }
}

export const toLogical = (x, z, seed = 0) => {
  const { wx, wz } = warpOffset(x, z, seed)
  return { lx: x + wx, lz: z + wz }
}

// 논리 좌표의 물건을 월드 어디에 놓을지 (역변환 근사)
export const worldFromLogical = (lx, lz, seed = 0) => {
  const { wx, wz } = warpOffset(lx, lz, seed)
  return { x: lx - wx, z: lz - wz }
}

// 블록 타입: 건물 / 공터 / 주차장 (공원은 블록이 아니라 노이즈 필드로 따로 정함)
export const blockType = (bx, bz, seed = 0, plazaProb = 0.09) => {
  const r = hash(bx * 3 + 11 + seed, bz * 7 + 5 - seed)
  if (r < plazaProb) return 'plaza'
  if (r < plazaProb + 0.05) return 'parking'
  return 'build'
}

// 지정된 직사각형 대공원 (센트럴파크 같은 것)
export const inParkRect = (lx, lz) => {
  const r = layoutStyle?.parkRect
  return !!r && lx >= r.x0 && lx <= r.x1 && lz >= r.z0 && lz <= r.z1
}

// 공원은 격자랑 무관한 연속 노이즈 얼룩. 도시의 parkProb가 높을수록 넓어짐
export const parkAt = (lx, lz, seed = 0, style = null) =>
  inParkRect(lx, lz) || noise2d(lx, lz, 260, seed + 321) > 0.8 - (style?.parkProb ?? 0.15) * 0.8

// 도로 위계: 몇 줄에 하나씩 넓은 대로, 나머지는 좁은 골목
// 골목은 구간마다 없는 경우가 더 많아서(35%만 생존) 블록들이 크게 합쳐짐
export const MAJOR_W = 12
export const MINOR_W = 5

// 격자선 위치 자체를 선마다 ±8m 밀어서 블록 크기가 제각각이 되게 함
const lineJitter = (k, seed, salt) =>
  layoutStyle?.gridStraight ? 0 : (hash(k * 11 + salt + seed, k * 3 - salt - seed) - 0.5) * 16
export const linePosX = (k, seed = 0) => k * BLOCK + lineJitter(k, seed, 5)
export const linePosZ = (k, seed = 0) => k * BLOCK + lineJitter(k, seed, 77)

export const lineIndexX = (v, seed = 0) => {
  let k = Math.floor(v / BLOCK)
  if (v < linePosX(k, seed)) k -= 1
  else if (v >= linePosX(k + 1, seed)) k += 1
  return k
}
export const lineIndexZ = (v, seed = 0) => {
  let k = Math.floor(v / BLOCK)
  if (v < linePosZ(k, seed)) k -= 1
  else if (v >= linePosZ(k + 1, seed)) k += 1
  return k
}

// 블록(k, k+1 선 사이) 내부의 중심
export const blockCenterX = (k, seed = 0) =>
  (linePosX(k, seed) + MAJOR_W + linePosX(k + 1, seed)) / 2
export const blockCenterZ = (k, seed = 0) =>
  (linePosZ(k, seed) + MAJOR_W + linePosZ(k + 1, seed)) / 2

export const isMajorX = (k, seed = 0) => hash(k * 13 + 7 + seed, 91 - seed) < 0.22
export const isMajorZ = (k, seed = 0) => hash(97 + seed, k * 17 + 3 - seed) < 0.22

// 반듯한 격자 도시는 골목도 촘촘하게 살림
const alleyKeep = () => (layoutStyle?.gridStraight ? 0.62 : 0.35)
const segExistsX = (k, bz, seed) => hash(k * 5 + 1 + seed, bz * 11 + 3 - seed) < alleyKeep()
const segExistsZ = (bx, k, seed) => hash(bx * 7 + 5 + seed, k * 19 - 2 - seed) < alleyKeep()

// 이 논리 좌표가 도로면 'major'/'minor', 아니면 null
export const roadAt = (lx, lz, seed = 0) => {
  const kx = lineIndexX(lx, seed)
  const kz = lineIndexZ(lz, seed)
  const dx = lx - linePosX(kx, seed)
  const dz = lz - linePosZ(kz, seed)
  const majX = isMajorX(kx, seed)
  const majZ = isMajorZ(kz, seed)
  if (dx < (majX ? MAJOR_W : MINOR_W) && (majX || segExistsX(kx, kz, seed)))
    return majX ? 'major' : 'minor'
  if (dz < (majZ ? MAJOR_W : MINOR_W) && (majZ || segExistsZ(kx, kz, seed)))
    return majZ ? 'major' : 'minor'
  return null
}

// 부지 바닥 명암: 블록 경계 없이 연속 노이즈로 얼룩덜룩하게
export const lotShade = (x, z, seed = 0) => {
  const broad = noise2d(x, z, 70, seed + 41)
  const fine = noise2d(x, z, 11, seed + 87)
  return 0.86 + broad * 0.2 + fine * 0.08
}

// 이 블록에 설 건물의 계획(위치/크기)
export const buildingPlan = (bx, bz, seed = 0, style = null) => {
  if (blockType(bx, bz, seed, style?.plazaProb) !== 'build') return null
  const cx = blockCenterX(bx, seed)
  const cz = blockCenterZ(bz, seed)
  if (Math.hypot(cx, cz) < 55) return null // 발사 타워 자리
  if (inSea(cx, cz, seed, style)) return null
  if (style?.coast && cx > seaStartX(cz, seed) - 30) return null
  // 항만 지구엔 건물 대신 컨테이너/크레인이 놓임
  if (style?.harbor && cz > 80 && cx > seaStartX(cz, seed) - 75) return null
  if (style?.river && Math.abs(cx - riverCenterX(cz, seed)) < riverHalf() + RIVER_PARK + 6)
    return null
  if (parkAt(cx, cz, seed, style)) return null
  // 산비탈엔 건물 안 지음
  const wPos = worldFromLogical(cx, cz, seed)
  if (mountainLevel(wPos.x, wPos.z) > 0.22) return null

  const district = districtLevel(cx, cz, seed)
  const r1 = blockSeed(bx, bz, seed)
  const r2 = blockSeed(bx, bz, seed, 1)
  const r3 = blockSeed(bx, bz, seed, 2)
  // 구역 규칙이 있으면 저층 비율도 위치 따라 달라짐 (구시가지 같은 것)
  const lowRatio = style?.lowriseFn?.(cx, cz, seed) ?? style?.lowriseRatio ?? 0.3
  const isLow = r3 < (district > 0.6 ? lowRatio * 0.3 : lowRatio)

  let h
  let w
  let d
  if (isLow) {
    h = 8 + r1 * 8
    w = 17 + r2 * 13
    d = 17 + r1 * 13
  } else {
    h =
      (18 + Math.pow(district, style?.downtownPow ?? 1.6) * 140 * (0.45 + r1 * 0.55)) *
      (style?.heightScale ?? 1)
    w = 13 + r1 * 16
    d = 13 + r2 * 16
  }

  // 블록 크기가 제각각이라 그 안에 들어가게 자름
  const gapX = linePosX(bx + 1, seed) - linePosX(bx, seed) - MAJOR_W - 2
  const gapZ = linePosZ(bz + 1, seed) - linePosZ(bz, seed) - MAJOR_W - 2
  w = Math.min(w, gapX - 3)
  d = Math.min(d, gapZ - 3)

  // 블록 정중앙 반복이 타일처럼 보여서 자리를 지터로 흩뜨림 (도로는 안 침범하게)
  const jitter = Math.max(Math.min(gapX - w, gapZ - d) / 2 - 1, 0)
  const jx = (blockSeed(bx, bz, seed, 6) * 2 - 1) * jitter
  const jz = (blockSeed(bx, bz, seed, 7) * 2 - 1) * jitter

  return { cx: cx + jx, cz: cz + jz, w, d, h, isLow, district, r1, r2 }
}

export const blockSeed = (bx, bz, seed = 0, salt = 0) =>
  hash(bx * 31 + salt * 101 + seed, bz * 17 - salt * 57 - seed * 3)

// 저주파 노이즈로 고층지구(다운타운) 정도를 0~1로
// 도시 스타일에 구역 규칙(districtFn)이 있으면 그게 우선 (강남/강북 대비 같은 것)
export const districtLevel = (x, z, seed = 0) => {
  const base = noise2d(x, z, 640, seed + 77)
  return layoutStyle?.districtFn ? layoutStyle.districtFn(x, z, seed, base) : base
}

// 강 중심선 (논리 좌표 기준)
export const riverCenterX = (lz, seed = 0) =>
  Math.sin(lz * 0.002 + seed) * 220 + Math.sin(lz * 0.0007 - seed) * 120

// 강 반폭. 한강처럼 넓은 강은 스타일에서 키움
export const riverHalf = () => layoutStyle?.riverHalf ?? 17

// 강변 공원 띠 폭. 이 안에는 도로가 안 생김 (다리로 건너는 대로만 예외)
export const RIVER_PARK = 26

export const inRiver = (lx, lz, seed = 0) => Math.abs(lx - riverCenterX(lz, seed)) < riverHalf()

// 해안선. 이보다 +x쪽은 바다 (해안 도시만)
export const seaStartX = (lz, seed = 0) =>
  300 + Math.sin(lz * 0.0011 + seed) * 70 + Math.sin(lz * 0.0035 - seed * 2) * 25

export const inSea = (lx, lz, seed, style) => !!style?.coast && lx > seaStartX(lz, seed)

// 이 좌표 바닥이 뭔지: 물 / 모래사장 / 대로 / 골목 / 공원 / 주차장 / 부지
export const groundKind = (x, z, seed = 0, style = null) => {
  const { lx, lz } = toLogical(x, z, seed)
  if (style?.coast) {
    const s = seaStartX(lz, seed)
    if (lx > s) return 'water'
    // 항만 구역은 모래사장 대신 콘크리트 부두
    if (lx > s - 14) return style?.harbor && lz > 80 ? 'lot' : 'sand'
  }
  // 강 위엔 도로색을 안 칠함 (다리는 3D 모델로 따로 놓임)
  if (style?.river && inRiver(lx, lz, seed)) return 'water'
  // 산은 도로/블록 무시하고 숲 바닥
  if (mountainLevel(x, z) > 0.24) return 'mountain'
  // 강변 띠는 도로 대신 공원. 강을 건너는 가로 대로(다리 진입로)만 남김
  if (style?.river && Math.abs(lx - riverCenterX(lz, seed)) < riverHalf() + RIVER_PARK) {
    const kz = lineIndexZ(lz, seed)
    if (isMajorZ(kz, seed) && lz - linePosZ(kz, seed) < MAJOR_W) return 'road'
    return 'park'
  }
  // 직사각 대공원 안엔 도로가 안 지나감
  if (inParkRect(lx, lz)) return 'park'
  const road = roadAt(lx, lz, seed)
  if (road === 'major') return 'road'
  // 골목은 주변 부지색에 섞이는 은은한 길 (경계선처럼 안 보이게)
  if (road === 'minor') return 'alley'
  if (parkAt(lx, lz, seed, style)) return 'park'
  const type = blockType(lineIndexX(lx, seed), lineIndexZ(lz, seed), seed, style?.plazaProb)
  if (type === 'parking') return 'parking'
  return 'lot'
}
