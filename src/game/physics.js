// 종이비행기 활공 물리. 진짜 공력은 아니고 게임 느낌 나게 단순화한 모델
// 핵심 규칙: 기수 내리면 가속, 올리면 감속. 속도 없으면 실속으로 뚝 떨어짐
const GRAVITY = 9.8
const MIN_SPEED = 6
const MAX_SPEED = 55
const BASE_SINK = 1.7

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export const createFlightState = (altitude = 130) => ({
  pos: { x: 0, y: altitude, z: 0 },
  yaw: 0, // 0이면 -z 방향(북쪽)을 봄
  pitch: 0,
  roll: 0,
  speed: 20,
  vy: 0,
  distance: 0,
  time: 0,
  hits: 0,
})

// input: { turn: -1~1, pitch: -1~1 } / env: { wind: {x,z}, precip: 0~1 }
export const stepFlight = (state, input, env, dt) => {
  // 속도가 빠를수록 선회가 잘 먹힘
  const turnGrip = 0.55 + 0.45 * Math.min(state.speed / 30, 1)
  state.yaw += input.turn * 1.5 * turnGrip * dt

  // 측풍 성분(+면 오른쪽으로 밀림) → 밀리는 쪽으로 기울고, 기수도 서서히 그쪽으로 돌아감
  const fx0 = -Math.sin(state.yaw)
  const fz0 = -Math.cos(state.yaw)
  const crosswind = env.wind.x * -fz0 + env.wind.z * fx0
  state.yaw += -crosswind * 0.02 * dt
  // 바람이 미는 쪽 반대 날개가 들림 (바람이 날개 밑을 쳐서 얹혀가는 느낌)
  const leanTarget = -input.turn * 0.6 - clamp(crosswind * 0.04, -0.25, 0.25)
  state.roll += (leanTarget - state.roll) * Math.min(dt * 6, 1)
  state.crosswind = crosswind

  const targetPitch = input.pitch * 0.5
  state.pitch += (targetPitch - state.pitch) * Math.min(dt * 3.2, 1)

  // 비/눈 오면 공기저항 증가
  const dragK = 0.0011 * (1 + env.precip * 0.7)
  const accel = GRAVITY * Math.sin(-state.pitch) * 0.95 - dragK * state.speed * state.speed
  state.speed = clamp(state.speed + accel * dt, MIN_SPEED, MAX_SPEED)

  // 하강률: 기본 + 비젖음 + 실속(저속에서 기수 들면 확 가라앉음)
  const stall = state.speed < 12 && state.pitch > 0.05 ? 3.5 : 0
  const sink = BASE_SINK * (1 + env.precip * 1.1) + stall
  state.vy = state.speed * Math.sin(state.pitch) - sink

  // yaw 기준 전진 방향 (-z가 정면)
  const fx = -Math.sin(state.yaw)
  const fz = -Math.cos(state.yaw)
  const horiz = state.speed * Math.cos(state.pitch)

  // 바람은 지면 속도에 그대로 더해짐 → 순풍/역풍/측풍이 기록을 가름
  state.pos.x += (fx * horiz + env.wind.x) * dt
  state.pos.z += (fz * horiz + env.wind.z) * dt
  state.pos.y += state.vy * dt

  state.distance = Math.hypot(state.pos.x, state.pos.z)
  state.time += dt
}

// 장애물 부딪히면 속도랑 고도 깎임
export const applyHitPenalty = (state) => {
  state.speed = Math.max(state.speed * 0.55, MIN_SPEED)
  state.pos.y -= 4
  state.hits += 1
}
