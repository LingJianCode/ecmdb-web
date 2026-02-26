<template>
  <div>
    <!-- 执行器服务选择 -->
    <div class="form-row">
      <el-form-item prop="execute.service_name" label="执行器服务 (Executor)" class="form-item">
        <el-select
          v-model="serviceName"
          placeholder="请选择执行器服务"
          size="large"
          clearable
          filterable
          @change="handleServiceChange"
        >
          <el-option
            v-for="item in executors"
            :key="item.name"
            :label="item.desc ? `${item.name} - ${item.desc}` : item.name"
            :value="item.name"
          />
        </el-select>
      </el-form-item>
    </div>

    <!-- Handler 选择，依赖执行器服务 -->
    <div class="form-row">
      <el-form-item prop="execute.handler" label="执行处理器 (Handler)" class="form-item">
        <el-select
          v-model="handler"
          placeholder="请先选择执行器服务"
          size="large"
          clearable
          filterable
          :disabled="!serviceName"
        >
          <el-option
            v-for="h in availableHandlers"
            :key="h.name"
            :label="h.desc ? `${h.name} - ${h.desc}` : h.name"
            :value="h.name"
          />
        </el-select>
      </el-form-item>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue"
import { useExecutors } from "../composables/useExecutors"

// NOTE: 该组件为执行器配置控制器，serviceName 和 handler 均需由父组件统一管理
const serviceName = defineModel<string>("serviceName")
const handler = defineModel<string>("handler")

const { executors, fetchExecutors, availableHandlers } = useExecutors(() => serviceName.value)

/**
 * 切换执行器时清空 handler，避免旧值残留
 */
const handleServiceChange = () => {
  handler.value = ""
}

onMounted(() => {
  fetchExecutors()
})
</script>
