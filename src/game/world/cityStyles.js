// 도시마다 다른 생김새 정의. 시드가 달라서 블록 배치 자체도 도시별로 전부 다름
// heightScale: 전체 높이 배율 / glassRatio: 유리 타워 비율 / lowriseRatio: 저층 상가 비율
// parkProb: 공원 블록 확률 / river: 강 유무 / tints: 건물 색조

const DEFAULT_TINTS = ['#ffffff', '#dfe7ee', '#cdd8e3', '#e8e2d5', '#f2f5f8']
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
  city_01: { river: true, glassRatio: 0.35 }, // 서울
  city_02: { coast: true, heightScale: 0.95, lowriseRatio: 0.35 }, // 부산
  city_03: { heightScale: 1.3, glassRatio: 0.55, lowriseRatio: 0.12, parkProb: 0.1, river: true }, // 뉴욕
  city_04: { heightScale: 0.75, lowriseRatio: 0.5, parkProb: 0.12 }, // LA
  city_05: { heightScale: 0.9, glassRatio: 0.18, tints: COLD_TINTS }, // 모스크바
  city_06: { heightScale: 0.7, lowriseRatio: 0.5, parkProb: 0.22, coast: true }, // 리우
  city_07: { glassRatio: 0.45, parkProb: 0.18, coast: true }, // 시드니
  city_08: {
    heightScale: 1.55,
    glassRatio: 0.6,
    lowriseRatio: 0.15,
    parkProb: 0.05,
    plazaProb: 0.2,
    lotColor: '#cbb37f', // 두바이는 모래빛 바닥
  },
  city_09: { heightScale: 0.85, lowriseRatio: 0.45, parkProb: 0.1, coast: true }, // 마닐라
  city_10: {
    heightScale: 0.6,
    lowriseRatio: 0.55,
    parkProb: 0.22,
    tints: WARM_TINTS,
    coast: true,
  }, // 스톡홀름
  city_11: { heightScale: 0.55, lowriseRatio: 0.45, tints: CREAM_TINTS, river: true }, // 파리
  city_12: { heightScale: 0.85, river: true }, // 런던
  city_13: { heightScale: 0.8, parkProb: 0.24, river: true }, // 베를린
  city_14: { heightScale: 0.7, lowriseRatio: 0.4, coast: true }, // 케이프타운
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
