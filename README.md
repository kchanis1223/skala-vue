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

여기에 수업 범위 밖으로 **Composable 분리, 날씨 연동 배경 테마(도시 시간대별 밤낮 반영), 도시 추가(localStorage 유지),
three.js 활공 물리와 절차 생성 도시**까지 직접 만들어 봤습니다.
9개 도시는 각각 지형과 랜드마크가 다른 전용 맵입니다 — 서울은 한강과 남산타워,
부산은 산복도로 언덕과 광안대교, 뉴욕은 마천루 협곡과 센트럴파크, 파리는 에펠탑,
케이프타운은 꼭대기가 판판한 테이블마운틴 위에 착지할 수도 있습니다.

## 전역 리더보드 (직접 만든 백엔드)

정적 페이지(GitHub Pages)는 데이터를 받아줄 서버가 없어서, 리더보드용 백엔드를 따로 구축했습니다.

- 비행 기록은 **브라우저 안 SQLite(sql.js)** 에 저장되고, 동시에 **Vercel 서버리스 함수(`api/`) → Neon PostgreSQL**로 전송됩니다
- 기록실의 주간 랭킹은 PostgreSQL의 `DISTINCT ON` + `RANK()` 윈도우 함수로 조종사별 최고 기록을 뽑아 순위를 매깁니다
- 서버가 응답하지 않아도 앱은 브라우저 기록만으로 정상 동작합니다 (폴백)

## 프로젝트 구조

```
src/
├── views/               # 라우터가 보여주는 페이지 6개 (전부 지연 로딩)
│   ├── WeatherHomeView      # 대시보드 (검색·필터·정렬·도시 추가)
│   ├── WeatherDetailView    # 도시 상세 + 도시별 리더보드
│   ├── GliderView           # 게임 (도시선택→브리핑→비행→결과 4단계)
│   ├── RecordsView          # 주간 랭킹·도시별 최고·내 기록
│   └── WeatherAboutView / NotFoundView
├── components/
│   ├── exercise/            # 대시보드 부품 — WeatherParent(상태 소유)·WeatherCard·SearchBar·BaseDashboardCard(slot)·UnitToggler
│   ├── glider/              # 게임 UI — GliderCanvas(three.js 어댑터)·FlightBriefing·FlightHud·CompassBar·FlightResultDialog
│   ├── AddCityDialog        # Geocoding 검색으로 도시 추가
│   └── WeatherThemeBackground / ThemePreviewDock   # 날씨·밤낮 연동 배경
├── stores/              # Pinia — configStore(단위)·cityStore(도시 목록+localStorage)·flightStore(선택 도시·테마)
├── composables/         # useWeatherApi(OWM 3종+폴백)·useFlightDb(sql.js)·useLeaderboardApi(서버)·useDisplayTemp·useClock
├── game/                # three.js 엔진 (Vue 비의존 순수 JS)
│   ├── GliderEngine.js      # 씬 생명주기·게임 루프·워밍업 로딩
│   ├── physics.js / input.js / weatherMapping.js
│   └── world/               # cityLayout(배치 규칙)·terrain·city·landmarks·crystals·cars·obstacles·이펙트들
├── data/cities.js       # 기본 도시 9개
└── api/ (레포 루트)      # Vercel 서버리스 함수 — flights/leaderboard/stats (PostgreSQL)
```

## 실행

```bash
npm install
npm run dev
```

실제 날씨는 `.env`에 OpenWeatherMap 키가 필요합니다 (`.env.example` 참고). 없어도 mock으로 동작합니다.
