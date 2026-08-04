import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { cityList } from '@/data/cities'

const STORAGE_KEY = 'weather-glider:custom-cities'

// 국가코드(KR, US...)를 국기 이모지로 바꿔줌
const countryFlag = (code = '') =>
  code.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))

// 기본 15개 도시 + 사용자가 추가한 도시 관리
export const useCityStore = defineStore('city', () => {
  const customCities = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))

  const allCities = computed(() => [...cityList, ...customCities.value])

  // 새로고침해도 추가한 도시 유지
  watch(customCities, (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list)), {
    deep: true,
  })

  // geocoding 검색 결과를 받아서 추가. 이미 있으면 false
  const addCity = (place) => {
    const exists = allCities.value.some(
      (city) =>
        city.name === place.name ||
        (Math.abs(city.lat - place.lat) < 0.05 && Math.abs(city.lon - place.lon) < 0.05),
    )
    if (exists) return false

    customCities.value.push({
      id: `custom_${Date.now()}`,
      name: place.name,
      flag: countryFlag(place.country),
      lat: place.lat,
      lon: place.lon,
      temp: 20,
      status: '맑음',
      condition: 'Clear',
      custom: true,
    })
    return true
  }

  const removeCity = (id) => {
    customCities.value = customCities.value.filter((city) => city.id !== id)
  }

  return { customCities, allCities, addCity, removeCity }
})
