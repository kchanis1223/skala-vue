<script setup>
// 단계 3 필수 — props로 검색어를 받고, 입력 시 update-query 이벤트를 emit
defineProps({
  searchQuery: { type: String, required: true },
})

const emit = defineEmits(['update-query'])

const onInput = (event) => {
  emit('update-query', event.target.value)
}
</script>

<template>
  <div class="search-bar">
    <!-- 한글 IME 조합 중에도 즉시 반영되도록 v-model 대신 :value + @input 사용 (강의 지침) -->
    <input
      class="search-input"
      type="text"
      :value="searchQuery"
      placeholder="도시 이름을 입력하세요 (예: 서울)"
      @input="onInput"
    />
    <p v-if="searchQuery" class="search-hint">입력한 도시명: {{ searchQuery }}</p>
  </div>
</template>

<style scoped>
.search-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.95rem;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #409eff;
}

.search-hint {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #909399;
}
</style>
