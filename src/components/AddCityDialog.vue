<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useWeatherApi } from '@/composables/useWeatherApi'
import { useCityStore } from '@/stores/cityStore'

const visible = defineModel({ type: Boolean })

const { searchCities } = useWeatherApi()
const cityStore = useCityStore()

const query = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)

const onSearch = async () => {
  if (!query.value.trim()) return
  searching.value = true
  searched.value = false
  try {
    results.value = await searchCities(query.value.trim())
    searched.value = true
  } catch (e) {
    console.error('도시 검색 실패:', e)
    ElMessage.error('도시 검색에 실패했습니다')
  } finally {
    searching.value = false
  }
}

const onPick = (place) => {
  const added = cityStore.addCity(place)
  if (!added) {
    ElMessage.warning(`${place.name}은(는) 이미 목록에 있어요`)
    return
  }
  ElMessage.success(`${place.name} 추가 완료!`)
  visible.value = false
  query.value = ''
  results.value = []
  searched.value = false
}
</script>

<template>
  <el-dialog v-model="visible" title="🌍 도시 추가" width="440px">
    <div class="search-row">
      <el-input
        v-model="query"
        placeholder="도시 이름 (한글/영문 예: 오사카, Madrid)"
        clearable
        @keyup.enter="onSearch"
      />
      <el-button type="primary" :loading="searching" @click="onSearch">검색</el-button>
    </div>

    <ul v-if="results.length" class="result-list">
      <li v-for="(place, i) in results" :key="i">
        <button class="result-item" @click="onPick(place)">
          <span class="result-name">{{ place.name }}</span>
          <span class="result-meta">
            {{ place.enName }} · {{ place.country }}{{ place.state ? ` (${place.state})` : '' }}
          </span>
        </button>
      </li>
    </ul>
    <el-empty v-else-if="searched" description="검색 결과가 없습니다" :image-size="60" />
  </el-dialog>
</template>

<style scoped>
.search-row {
  display: flex;
  gap: 8px;
}

.result-list {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafcff;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.result-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.result-name {
  font-weight: 600;
  color: #303133;
}

.result-meta {
  font-size: 0.78rem;
  color: #909399;
}
</style>
