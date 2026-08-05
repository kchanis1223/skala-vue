<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  result: { type: Object, required: true },
  city: { type: Object, required: true },
  registered: { type: Boolean, default: false },
  registering: { type: Boolean, default: false },
})

const visible = defineModel({ type: Boolean })
const emit = defineEmits(['retry', 'exit', 'register'])

// 지난번 쓴 닉네임을 기본값으로 채워줌 (같은 컴퓨터에서 딴 사람이 하면 지우고 쓰면 됨)
const PILOT_KEY = 'weather-glider:pilot-name'
const pilot = ref(localStorage.getItem(PILOT_KEY) ?? '')

// 결과창이 새로 열릴 때마다 최신 저장값으로 갱신
watch(visible, (open) => {
  if (open) pilot.value = localStorage.getItem(PILOT_KEY) ?? ''
})

const register = () => {
  const name = pilot.value.trim()
  if (!name || props.registered || props.registering) return
  localStorage.setItem(PILOT_KEY, name)
  emit('register', name)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="result.crashed ? '💥 건물에 충돌!' : '🛬 무사 착륙!'"
    width="380px"
    :close-on-click-modal="false"
  >
    <div class="result-body">
      <p class="result-distance">💎 {{ result.stars ?? 0 }}점</p>
      <p class="result-sub">
        {{ city.flag }} {{ city.name }}의 빌딩숲을 {{ result.duration }}초,
        {{ result.distance.toLocaleString() }}m 비행
      </p>
      <p v-if="result.hits > 0" class="result-hits">🎈 공중 충돌 {{ result.hits }}회</p>

      <!-- 닉네임 쓰고 등록해야 리더보드에 올라감. 안 하고 닫으면 기록 버려짐 -->
      <div v-if="!registered" class="register-row">
        <el-input
          v-model="pilot"
          maxlength="12"
          placeholder="닉네임"
          class="pilot-input"
          @keyup.enter="register"
        />
        <el-button
          type="warning"
          :disabled="!pilot.trim()"
          :loading="registering"
          @click="register"
        >
          🏆 기록 등록
        </el-button>
      </div>
      <p v-else class="register-done">✅ {{ pilot.trim() }} 이름으로 리더보드에 올라갔어요</p>
      <p v-if="!registered" class="result-note">등록하지 않으면 이번 기록은 사라져요</p>
    </div>
    <template #footer>
      <el-button @click="emit('exit')">도시 바꾸기</el-button>
      <el-button type="primary" @click="emit('retry')">🔁 다시 비행</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.result-body {
  text-align: center;
}

.result-distance {
  margin: 0;
  font-size: 2.6rem;
  font-weight: 800;
  color: #f5a623;
}

.result-sub {
  margin: 6px 0 0;
  color: #606266;
}

.result-hits {
  margin: 8px 0 0;
  color: #f56c6c;
}

.register-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.pilot-input {
  flex: 1;
}

.register-done {
  margin: 16px 0 0;
  color: #67c23a;
  font-weight: 600;
}

.result-note {
  margin: 10px 0 0;
  font-size: 0.78rem;
  color: #c0c4cc;
}
</style>
