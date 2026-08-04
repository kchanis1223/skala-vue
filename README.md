# 🪁 웨더글라이더 (skala-vue)

SKALA Vue.js 수업 최종과제로 만든 앱입니다.
과제로 주어진 **날씨 대시보드**를 그대로 구현하고, 그 위에 제가 해보고 싶었던
**"그 도시의 실제 날씨 속에서 종이비행기를 날리는 게임"**을 얹었습니다.

- 배포 주소: https://kchanis1223.github.io/skala-vue/
- 날씨 앱만 있는 중간 제출본: [`submit-207p` 브랜치](https://github.com/kchanis1223/skala-vue/tree/submit-207p)

## 뭘 만들었나

**홈(대시보드)** 에서 세계 15개 도시의 실시간 날씨를 카드로 보여줍니다.
카드를 선택하면 배경 테마가 그 도시 날씨(맑음/흐림/비/눈/안개)로 바뀌고,
**글라이더 메뉴**로 가면 그 도시의 지금 바람·강수·밤낮이 그대로 반영된
3D 도시에서 종이비행기를 날려 크리스탈을 모으는 게임을 할 수 있습니다.
역풍이면 기체가 아래로 눌리고, 비가 오면 기체가 젖어 빨리 가라앉고, 밤이면 도시에 불이 켜집니다.

## 수업 내용이 어디에 들어있나

| 수업 | 배운 것 | 이 프로젝트에서 쓴 곳 |
|---|---|---|
| 2장 Vue 문법 | v-for/:key, v-if, v-model 대안, 이벤트 수식어 | 날씨 카드 반복 출력, 25도 기준 더움/선선함 라벨, 한글 조합 문제 때문에 검색창은 `:value`+`@input`, 상세보기 버튼의 `.stop` |
| 3장 Composition API | ref, computed, watch, watchEffect | 검색어 필터링 computed, 선택 도시 watch 로그, 검색어 watchEffect 추적 (`WeatherParent.vue`) |
| 4장 컴포넌트 | props/emit, slot, 라이프사이클 | `BaseDashboardCard`(slot), `SearchBar`(update-query), `WeatherCard`(select-card/click-detail), three.js 정리를 `onUnmounted`에서 하는 `GliderCanvas` |
| 5장 Router | 지연 로딩, 동적 경로, Catch-all | 전 라우트 lazy loading(글라이더의 three.js 번들이 분리되는 걸 직접 확인함), `/weather/:cityId`, 404 페이지 |
| 6장 Pinia | Setup Store, storeToRefs | `configStore`(단위 전환)·`cityStore`(도시 관리)·`flightStore`(테마/게임 연결), App.vue에서 storeToRefs로 구조분해 |
| 7장 Axios | async/await, try/catch/finally, isLoading | `useWeatherApi` — 현재날씨·대기질·Geocoding 3개 API, 키 없거나 실패하면 mock으로 폴백 |
| 8장 Element Plus | 컴포넌트 라이브러리 | el-card, el-tag, el-switch, el-dialog(도시 추가), el-radio-button(필터), el-select(정렬), el-skeleton, ElMessage 등 |
| 9장 Modern JS | 불변 배열 메서드, 구조분해, ?? | 정렬에 `toSorted`, 옵셔널 체이닝/널 병합은 전반적으로 |
| 10장 빌드/배포 | env 분리, GitHub Pages | API 키는 `.env`(VITE_ 접두사)로 분리하고 gitignore, `npm run lint` 에러 0, gh-pages 배포 |

## 수업 범위 밖에서 추가로 해본 것

- **Composable 분리**: 온도 단위 변환이 메인/상세에 중복돼서 `useDisplayTemp`로 뺐고, API 호출도 `useWeatherApi`로 모음 (수업에서 "과제 범위 제외"라고 언급된 부분)
- **날씨 배경 테마**: 도시 선택 시 배경이 크로스페이드로 바뀌고 비/눈 파티클 애니메이션. 왼쪽 독에서 테마 미리보기 가능
- **도시 추가/삭제**: Geocoding API로 검색해서 추가, localStorage 저장이라 새로고침해도 유지
- **three.js 게임**: 활공 물리(기수-속도 교환, 실속), 실제 바람 벡터가 물리에 가산, 절차 생성 도시(도로 위계·강·다리·바다·크레인·달리는 차), 크리스탈 수집(활공 궤적 모양 체인, 파랑1/보라3/금색5점), 건물 충돌 판정, 나침반/HUD
- **디테일**: 도시명 받침 보고 이/가 조사 자동 선택, 카드 체감온도·습도·바람 표시, PM2.5 등급 배지

## 실행 방법

```bash
npm install
npm run dev
```

실제 날씨를 보려면 `.env` 파일에 OpenWeatherMap 키가 필요합니다 (`.env.example` 참고).
키가 없어도 mock 데이터로 동작합니다.

```
VITE_OWM_API_KEY=발급받은키
```

## 폴더 구조

```
src/
├── components/exercise/   # 과제 필수 컴포넌트 (WeatherParent, SearchBar, WeatherCard...)
├── components/glider/     # 게임 UI (브리핑, HUD, 나침반, 결과창)
├── composables/           # useWeatherApi, useDisplayTemp
├── game/                  # three.js 엔진 (Vue랑 분리된 순수 JS)
│   └── world/             # 지형, 도시 생성, 크리스탈, 이펙트
├── stores/                # configStore, cityStore, flightStore
├── data/cities.js         # 기본 도시 목록 (여기서 도시 추가/수정)
└── views/                 # 홈, 상세, 글라이더, 기록실, 소개, 404
```
