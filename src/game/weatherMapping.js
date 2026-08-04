import { conditionToTheme } from '@/utils/weatherTheme'

// 도시의 실제 날씨를 게임 파라미터로 바꿔주는 핵심 파일
// windDeg는 "바람이 불어오는 방향"이라서 +180 해서 부는 방향 벡터로 만듦
export const toFlightParams = (city) => {
  const windSpeed = city?.windSpeed ?? 0
  const windDeg = city?.windDeg ?? 0
  const blowRad = (((windDeg + 180) % 360) * Math.PI) / 180
  // 북(0도)에서 남으로 부는 바람이면 +z 방향. 플레이어 시작 방향은 -z(북쪽)
  const wind = {
    x: Math.sin(blowRad) * windSpeed,
    z: -Math.cos(blowRad) * windSpeed,
    speed: windSpeed,
    deg: windDeg,
  }

  const theme = conditionToTheme(city?.condition)
  const rainAmount = city?.rain1h ?? 0
  const snowAmount = city?.snow1h ?? 0
  // 강수량 정보가 없어도 날씨가 비/눈이면 기본치는 줌
  let precip = Math.min((rainAmount + snowAmount) / 4, 1)
  if (precip === 0 && (theme === 'rain' || theme === 'snow')) precip = 0.45

  const nowSec = Date.now() / 1000
  const isNight = city?.sunrise ? nowSec < city.sunrise || nowSec > city.sunset : false

  return {
    cityName: city?.name ?? '연습 비행장',
    theme,
    wind,
    precip,
    precipType: theme === 'snow' ? 'snow' : 'rain',
    isNight,
  }
}

// 브리핑 화면용 난이도 별점 (바람 + 강수 + 밤)
export const flightDifficulty = (params) => {
  let level = 1
  if (params.wind.speed >= 4) level++
  if (params.wind.speed >= 8) level++
  if (params.precip > 0) level++
  if (params.isNight) level++
  return Math.min(level, 5)
}
