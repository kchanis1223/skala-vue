<script setup>
defineProps({
  result: { type: Object, required: true },
  city: { type: Object, required: true },
})

const visible = defineModel({ type: Boolean })
const emit = defineEmits(['retry', 'exit'])
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
      <p class="result-note">기록 저장과 랭킹은 기록실에서 곧 만나요</p>
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

.result-note {
  margin: 14px 0 0;
  font-size: 0.78rem;
  color: #c0c4cc;
}
</style>
