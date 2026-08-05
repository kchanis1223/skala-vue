import { ref } from 'vue'
import axios from 'axios'

const API_KEY = import.meta.env.VITE_OWM_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

// api가 주는 description은 "약간의 구름이 낀 하늘", "튼구름" 같이 제각각이라 우리 식으로 통일
const toStatusLabel = (main, cloudsPct) => {
  switch (main) {
    case 'Clear':
      return '맑음'
    case 'Clouds':
      return cloudsPct >= 75 ? '흐림' : '구름조금'
    case 'Rain':
      return '비'
    case 'Drizzle':
      return '이슬비'
    case 'Thunderstorm':
      return '뇌우'
    case 'Snow':
      return '눈'
    default:
      return '안개' // Mist/Fog/Haze 등 나머지는 전부 안개 취급
  }
}

// openweathermap 응답에서 우리가 쓸 것만 추림
// 바람/구름/일출일몰은 나중에 글라이더 게임에서 쓸 예정이라 미리 담아둠
const toCityWeather = (city, data) => ({
  ...city,
  temp: Math.round(data.main.temp),
  feelsLike: Math.round(data.main.feels_like),
  status: toStatusLabel(data.weather[0]?.main, data.clouds?.all ?? 0),
  condition: data.weather[0]?.main ?? city.condition,
  humidity: data.main.humidity,
  windSpeed: data.wind?.speed ?? 0,
  windDeg: data.wind?.deg ?? 0,
  clouds: data.clouds?.all ?? 0,
  rain1h: data.rain?.['1h'] ?? 0,
  snow1h: data.snow?.['1h'] ?? 0,
  sunrise: data.sys?.sunrise,
  sunset: data.sys?.sunset,
  // UTC 기준 초 단위 오프셋. 도시 현지 시각 계산용
  timezone: data.timezone,
})

export const useWeatherApi = () => {
  const isLoading = ref(false)
  const error = ref(null)
  const usingMock = ref(false)

  const fetchCityWeather = async (city) => {
    const { data } = await axios.get(`${BASE_URL}/weather`, {
      params: { lat: city.lat, lon: city.lon, appid: API_KEY, units: 'metric', lang: 'kr' },
    })
    return toCityWeather(city, data)
  }

  // 도시 추가용 geocoding 검색. 한글 이름 있으면 그걸로
  const searchCities = async (query) => {
    if (!API_KEY) return []
    const { data } = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
      params: { q: query, limit: 5, appid: API_KEY },
    })
    return data.map((place) => ({
      name: place.local_names?.ko ?? place.name,
      enName: place.name,
      country: place.country,
      state: place.state,
      lat: place.lat,
      lon: place.lon,
    }))
  }

  const fetchPm25 = async (city) => {
    const { data } = await axios.get(`${BASE_URL}/air_pollution`, {
      params: { lat: city.lat, lon: city.lon, appid: API_KEY },
    })
    return data.list[0]?.components?.pm2_5 ?? null
  }

  // 대시보드용. 실패하면 받은 목록 그대로(mock) 돌려줌
  const fetchAllCities = async (cities) => {
    if (!API_KEY) {
      usingMock.value = true
      return [...cities]
    }
    isLoading.value = true
    error.value = null
    try {
      const list = await Promise.all(cities.map(fetchCityWeather))
      usingMock.value = false
      return list
    } catch (e) {
      console.error('날씨 불러오기 실패:', e)
      error.value = e
      usingMock.value = true
      return [...cities]
    } finally {
      isLoading.value = false
    }
  }

  // 상세용. 날씨 + 미세먼지 같이 가져옴
  const fetchCityDetail = async (city) => {
    if (!API_KEY) {
      usingMock.value = true
      return { ...city, pm25: null }
    }
    isLoading.value = true
    error.value = null
    try {
      const [weather, pm25] = await Promise.all([fetchCityWeather(city), fetchPm25(city)])
      usingMock.value = false
      return { ...weather, pm25 }
    } catch (e) {
      console.error('상세 날씨 불러오기 실패:', e)
      error.value = e
      usingMock.value = true
      return { ...city, pm25: null }
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, usingMock, fetchAllCities, fetchCityDetail, searchCities }
}
