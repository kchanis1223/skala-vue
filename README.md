# 🪁 웨더글라이더

**"날씨를 보는 앱에서, 날씨를 체험하는 앱으로."**

세계 도시의 실시간 날씨 대시보드에, 선택한 도시의 **지금 날씨 속에서 종이비행기를 날리는 3D 게임**을 얹었습니다.
도시를 고르면 배경이 그 도시 날씨로 물들고, 글라이더를 날리면 실제 바람에 밀리고, 비에 젖어 가라앉고,
밤이면 빌딩에 불이 켜진 도심을 활강하며 크리스탈을 모읍니다.

👉 **배포 주소: https://kchanis1223.github.io/skala-vue/**
(날씨 앱만 있는 중간 제출본은 [`submit-207p` 브랜치](https://github.com/kchanis1223/skala-vue/tree/submit-207p))

## 수업에서 배운 걸로 만든 것들

- **Vue 문법 · Composition API** — 날씨 카드를 `v-for`로 뿌리고, 검색 필터는 `computed`,
  선택 변화 추적은 `watch`/`watchEffect`로. 한글 검색창은 조합 문제 때문에 `v-model` 대신 `:value`+`@input`을 썼습니다
- **컴포넌트** — 대시보드를 slot·props·emit으로 4개 컴포넌트로 분리했고,
  three.js 정리는 `onUnmounted`에서 하도록 라이프사이클을 활용했습니다
- **Router** — 동적 경로(`/weather/:cityId`)와 404 Catch-all, 전 라우트 지연 로딩
  (three.js 든 게임 번들이 실제로 분리되는 걸 확인했습니다)
- **Pinia** — 단위 전환·도시 관리·테마 상태를 Setup Store 3개로 나누고 `storeToRefs`로 구조분해
- **Axios** — OpenWeatherMap의 현재날씨·대기질·Geocoding 3개 API를 `async/await`로 연동,
  키가 없거나 실패하면 mock 데이터로 폴백합니다
- **Element Plus** — 카드, 다이얼로그(도시 추가), 필터 버튼, 정렬 셀렉트, 스켈레톤 로딩 등에 적용
- **빌드/배포** — API 키는 `.env`로 분리해 git에서 제외했고, lint 에러 0으로 GitHub Pages에 배포

여기에 수업 범위 밖으로 **Composable 분리, 날씨 연동 배경 테마, 도시 추가(localStorage 유지),
three.js 활공 물리와 절차 생성 도시**까지 직접 만들어 봤습니다.

## 실행

```bash
npm install
npm run dev
```

실제 날씨는 `.env`에 OpenWeatherMap 키가 필요합니다 (`.env.example` 참고). 없어도 mock으로 동작합니다.
