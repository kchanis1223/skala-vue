import { ref } from 'vue'
import axios from 'axios'

const API_KEY = import.meta.env.VITE_OWM_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

// openweathermap 응답에서 우리가 쓸 것만 추림
// 바람/구름/일출일몰은 나중에 글라이더 게임에서 쓸 예정이라 미리 담아둠
const toCityWeather = (city, data) => ({
  ...city,
  temp: Math.round(data.main.temp),
  status: data.weather[0]?.description ?? city.status,
  condition: data.weather[0]?.main ?? city.condition,
  humidity: data.main.humidity,
  windSpeed: data.wind?.speed ?? 0,
  windDeg: data.wind?.deg ?? 0,
  clouds: data.clouds?.all ?? 0,
  rain1h: data.rain?.['1h'] ?? 0,
  snow1h: data.snow?.['1h'] ?? 0,
  sunrise: data.sys?.sunrise,
  sunset: data.sys?.sunset,
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

  return { isLoading, error, usingMock, fetchAllCities, fetchCityDetail }
}
