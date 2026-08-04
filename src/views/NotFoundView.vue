<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found-view">
    <el-empty description="404 — 페이지를 찾을 수 없습니다">
      <el-button type="primary" @click="router.push('/')">메인으로 돌아가기</el-button>
    </el-empty>
  </div>
</template>
