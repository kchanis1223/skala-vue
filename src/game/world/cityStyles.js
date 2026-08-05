// 도시마다 다른 생김새 정의. 시드가 달라서 블록 배치 자체도 도시별로 전부 다름
// heightScale: 전체 높이 배율 / glassRatio: 유리 타워 비율 / lowriseRatio: 저층 상가 비율
// parkProb: 공원 블록 확률 / river: 강 유무 / tints: 건물 색조
// 전용 맵 도시는 여기에 산(mountains)/구역 규칙(districtFn 등)/랜드마크까지 얹음
import { riverCenterX, worldFromLogical, hillLevel, seaStartX } from './cityLayout'

const DEFAULT_TINTS = ['#ffffff', '#dfe7ee', '#cdd8e3', '#e8e2d5', '#f2f5f8']
const PASTEL_TINTS = ['#f2e2d2', '#e6d3e0', '#d3e2ec', '#f5eeda', '#dcebd8', '#f0dcd3']
const COLD_TINTS = ['#e8ecf0', '#c9d2da', '#aab6c0', '#d5dde4', '#bfc9d2']
const WARM_TINTS = ['#e8cbb0', '#d9a683', '#e3d3c2', '#c98a6b', '#e8e0d4']
const CREAM_TINTS = ['#efe6d4', '#e8dcc4', '#f2ead9', '#ded2b8', '#e6e0d0']

const BASE = {
  heightScale: 1,
  downtownPow: 1.6,
  glassRatio: 0.3,
  lowriseRatio: 0.3,
  parkProb: 0.15,
  plazaProb: 0.09,
  river: false,
  coast: false, // 해안 도시면 한쪽이 바다
  tints: DEFAULT_TINTS,
  lotColor: null, // null이면 기본 콘크리트색
}

// 도시별 개성. 없는 도시(직접 추가한 도시)는 이름 해시로 적당히 만들어줌
const STYLES = {
  // 서울: 한강(넓은 강)이 남서→북동으로 흐르고,
  // 강 동쪽(발사 타워 쪽)은 유리 고층 강남, 서쪽은 저층 구시가지 + 산(N타워)
  city_01: {
    river: true,
    riverHalf: 30,
    heightScale: 1.05,
    mountains: [
      { x: -480, z: -260, r: 300, h: 58 },
      { x: -560, z: 80, r: 260, h: 44 },
      { x: -360, z: -540, r: 240, h: 38 },
    ],
    landmark: { type: 'ntower', x: -480, z: -260 },
    districtFn: (lx, lz, seed, base) =>
      lx > riverCenterX(lz, seed) ? 0.55 + base * 0.45 : base * 0.32,
    lowriseFn: (lx, lz, seed) => (lx > riverCenterX(lz, seed) ? 0.1 : 0.62),
    glassFn: (lx, lz, seed) => (lx > riverCenterX(lz, seed) ? 0.55 : 0.1),
  },
  // 부산: 바다로 흘러내리는 주거 언덕(산복도로) + 해안 평지 중층 + 북쪽 항만 + 광안대교
  // 언덕(homes)은 도로/집이 유지되고 파스텔 저층이 층층이 붙음
  city_02: {
    coast: true,
    harbor: true,
    heightScale: 0.9,
    tints: PASTEL_TINTS,
    mountains: [
      { x: -420, z: -160, r: 360, h: 44, homes: true },
      { x: -280, z: 300, r: 300, h: 36, homes: true },
      { x: -640, z: -430, r: 320, h: 72 }, // 뒤 병풍 숲 산
    ],
    landmark: { type: 'gwangan', x: 430, z: -120, len: 520, deckY: 17 },
    districtFn: (lx, lz, seed, base) => {
      const w = worldFromLogical(lx, lz, seed)
      const hill = hillLevel(w.x, w.z)
      // 언덕 위는 낮게, 해안 평지는 중층
      if (hill > 0.15) return base * 0.12
      return 0.3 + base * 0.35
    },
    lowriseFn: (lx, lz, seed) => {
      const w = worldFromLogical(lx, lz, seed)
      return hillLevel(w.x, w.z) > 0.15 ? 0.96 : 0.3
    },
    glassFn: (lx, lz, seed) => {
      const w = worldFromLogical(lx, lz, seed)
      return hillLevel(w.x, w.z) > 0.15 ? 0 : 0.3
    },
  },
  // 뉴욕: 자로 잰 격자 + 마천루 협곡 + 서쪽에 직사각 대공원(센트럴파크) + 엠파이어풍 첨탑
  city_03: {
    river: true,
    heightScale: 1.35,
    glassRatio: 0.6,
    lowriseRatio: 0.06,
    parkProb: 0.05,
    plazaProb: 0.05,
    gridStraight: true,
    parkRect: { x0: -300, x1: -140, z0: -260, z1: 80 },
    landmark: { type: 'empire', x: -100, z: -80 },
    // 전역이 다운타운. 노이즈는 높이 변주만 줌
    districtFn: (lx, lz, seed, base) => 0.5 + base * 0.5,
  },
  city_04: { heightScale: 0.75, lowriseRatio: 0.5, parkProb: 0.12 }, // LA
  // 모스크바: 날씨와 무관하게 늘 설원, 넓은 대로, 스탈린 양식 첨탑 3채가 삼각 배치
  city_05: {
    heightScale: 0.85,
    glassRatio: 0.15,
    lowriseRatio: 0.25,
    tints: COLD_TINTS,
    alwaysSnowy: true,
    majorProb: 0.32,
    landmark: {
      type: 'stalin',
      towers: [
        { x: -220, z: -260 },
        { x: 260, z: -60 },
        { x: -60, z: 300 },
      ],
    },
    districtFn: (lx, lz, seed, base) => 0.25 + base * 0.35,
  },
  // 리우: 동쪽 해변 + 가파른 바위산 2개(정상에 조형물) + 파벨라 언덕
  // 해변가엔 호텔 라인(중층), 내륙은 알록달록 저층
  city_06: {
    coast: true,
    heightScale: 0.75,
    parkProb: 0.2,
    tints: PASTEL_TINTS,
    mountains: [
      { x: -360, z: 200, r: 190, h: 95 },
      { x: -150, z: -430, r: 170, h: 78 },
      { x: -340, z: -140, r: 250, h: 30, homes: true }, // 파벨라 언덕
    ],
    landmark: { type: 'cristo', x: -360, z: 200 },
    districtFn: (lx, lz, seed, base) => {
      // 해변에서 150m 안쪽은 호텔 라인
      if (lx > seaStartX(lz, seed) - 160) return 0.42 + base * 0.3
      return base * 0.22
    },
    lowriseFn: (lx, lz, seed) => (lx > seaStartX(lz, seed) - 160 ? 0.2 : 0.72),
    glassFn: (lx, lz, seed) => (lx > seaStartX(lz, seed) - 160 ? 0.35 : 0.05),
  },
  // 시드니: 바다가 도심 안쪽으로 파고드는 만(灣) + 물가 오페라하우스 + 하버브리지
  // 만 남쪽은 유리 CBD, 북쪽은 저층 주택가
  city_07: {
    coast: true,
    glassRatio: 0.5,
    parkProb: 0.18,
    seaFn: (lz) => 300 - 185 * Math.exp(-(((lz + 30) / 150) ** 2)),
    landmark: { type: 'sydney', operaX: 160, operaZ: 60, bridgeX: 210, bridgeZ: -60, bridgeLen: 200 },
    districtFn: (lx, lz, seed, base) => (lz > 40 ? 0.5 + base * 0.4 : base * 0.3),
    lowriseFn: (lx, lz) => (lz > 40 ? 0.15 : 0.55),
  },
  // 두바이: 페르시아만 해안 + 모래 바닥, 중심부에만 초고층이 몰리고
  // 외곽으로 갈수록 건물이 사막에 잠기듯 드문드문. 정중앙엔 독보적인 부르즈 타워
  city_08: {
    coast: true,
    heightScale: 1.5,
    glassRatio: 0.62,
    lowriseRatio: 0.18,
    parkProb: 0.04,
    plazaProb: 0.12,
    lotColor: '#cbb37f',
    landmark: { type: 'burj', x: 150, z: -170 },
    districtFn: (lx, lz, seed, base) => {
      const d = Math.hypot(lx - 150, lz + 170)
      if (d < 160) return 0.7 + base * 0.3
      if (d > 480) return base * 0.15
      const t = (d - 160) / 320
      return (0.7 + base * 0.3) * (1 - t) + base * 0.15 * t
    },
    buildProbFn: (lx, lz) => {
      const d = Math.hypot(lx - 150, lz + 170)
      if (d < 220) return 1
      return Math.max(1 - (d - 220) / 420, 0.18)
    },
  },
  city_09: { heightScale: 0.85, lowriseRatio: 0.45, parkProb: 0.1, coast: true }, // 마닐라
  city_10: {
    heightScale: 0.6,
    lowriseRatio: 0.55,
    parkProb: 0.22,
    tints: WARM_TINTS,
    coast: true,
  }, // 스톡홀름
  // 파리: 크림색 6~7층이 융단처럼 균일하게 깔리고 세느강 동안에 에펠탑 하나만 솟음
  city_11: {
    river: true,
    riverHalf: 22,
    heightScale: 0.55,
    glassRatio: 0,
    lowriseRatio: 0.12,
    parkProb: 0.14,
    tints: CREAM_TINTS,
    landmark: { type: 'eiffel', x: -40, z: -100 },
    // 높이 변주를 좁혀서 지붕선이 고르게
    districtFn: (lx, lz, seed, base) => 0.3 + base * 0.15,
  },
  city_12: { heightScale: 0.85, river: true }, // 런던
  city_13: { heightScale: 0.8, parkProb: 0.24, river: true }, // 베를린
  // 케이프타운: 서쪽에 꼭대기가 판판한 테이블마운틴(발사 타워보다 살짝 높음 — 정상 착지 가능)
  // 산기슭과 동쪽 바다 사이 좁은 띠에 중저층 도시
  city_14: {
    coast: true,
    heightScale: 0.7,
    lowriseRatio: 0.42,
    mountains: [{ x: -430, z: -60, r: 330, h: 108, mesa: true }],
    landmark: { type: 'cable', x: -360, z: -40 },
    districtFn: (lx, lz, seed, base) => 0.2 + base * 0.35,
  },
  city_15: { heightScale: 1.15, glassRatio: 0.4, parkProb: 0.12 }, // 베이징
}

const nameToSeed = (str = '') => {
  let h = 7
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h) % 100000
}

export const getCityStyle = (city) => {
  const custom = STYLES[city?.id] ?? {}
  return {
    ...BASE,
    ...custom,
    seed: nameToSeed(city?.id ?? city?.name ?? 'default'),
  }
}
