<template>
  <el-select v-model="workerName" placeholder="请选择工作节点" size="large" clearable filterable>
    <el-option v-for="item in workers" :key="item.id" :label="getWorkerLabel(item)" :value="item.name" />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import { useWorkers } from "../composables/useWorkers"

// NOTE: 该组件为工作节点选择器，状态需由父组件统一管理
const workerName = defineModel<string>()

const { workers, fetchWorkers, getWorkerLabel } = useWorkers()

onMounted(() => {
  fetchWorkers()
})
</script>
