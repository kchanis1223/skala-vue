// 강의에서 준 mock 데이터에 api 호출용 좌표만 추가함
// api 연동 실패하거나 키 없을 때도 이걸로 폴백
export const mockWeatherList = [
  { id: 'city_01', name: '서울', lat: 37.5665, lon: 126.978, temp: 28, status: '맑음' },
  { id: 'city_02', name: '수원', lat: 37.2636, lon: 127.0286, temp: 24, status: '비' },
  { id: 'city_03', name: '부산', lat: 35.1796, lon: 129.0756, temp: 26, status: '구름' },
]
