<script setup>
// 마일스톤 6에서 sql.js 기반 비행 기록·리더보드·날씨별 통계가 들어갈 자리
</script>

<template>
  <div class="records-view">
    <el-alert
      type="warning"
      :closable="false"
      title="🚧 비행 기록실은 마일스톤 6에서 구현됩니다"
      description="sql.js(SQLite WASM) 기반으로 도시별 리더보드, 날씨 조건별 평균 비행거리 통계를 제공할 예정입니다."
    />
  </div>
</template>
