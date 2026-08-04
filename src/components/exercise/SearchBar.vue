<script setup>
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
    <!-- v-model 쓰면 한글 조합 중에 반영이 안돼서 :value + @input으로 처리 -->
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
