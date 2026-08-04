// openweathermap의 weather.main 값을 우리 배경 테마로 매핑
export const THEMES = {
  clear: { label: '맑음', emoji: '☀️' },
  clouds: { label: '흐림', emoji: '☁️' },
  rain: { label: '비', emoji: '🌧️' },
  snow: { label: '눈', emoji: '❄️' },
  mist: { label: '안개', emoji: '🌫️' },
  default: { label: '', emoji: '📍' },
}

const CONDITION_TO_THEME = {
  Clear: 'clear',
  Clouds: 'clouds',
  Rain: 'rain',
  Drizzle: 'rain',
  Thunderstorm: 'rain',
  Squall: 'rain',
  Snow: 'snow',
  Mist: 'mist',
  Fog: 'mist',
  Haze: 'mist',
  Smoke: 'mist',
  Dust: 'mist',
  Sand: 'mist',
  Ash: 'mist',
}

export const conditionToTheme = (condition) => CONDITION_TO_THEME[condition] ?? 'default'
