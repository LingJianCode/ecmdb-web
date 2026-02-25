<template>
  <PageContainer>
    <!-- 头部区域 -->
    <ManagerHeader
      title="工作节点管理"
      subtitle="管理工作节点状态和配置"
      :show-add-button="false"
      @refresh="handleRefresh"
    />

    <CustomTabs :tabs="tabs" :default-active="activeName" @tab-change="handleTabChange" class="worker-tabs">
      <template #default="{ activeTab }">
        <Worker v-if="activeTab === 'worker'" ref="workerRef" />
        <Executor v-if="activeTab === 'executor'" ref="executorRef" />
      </template>
    </CustomTabs>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref } from "vue"
import Worker from "./tabs/worker.vue"
import Executor from "./tabs/executor.vue"
import CustomTabs from "@@/components/Tabs/CustomTabs.vue"
import ManagerHeader from "@/common/components/ManagerHeader/index.vue"
import PageContainer from "@/common/components/PageContainer/index.vue"

const activeName = ref("worker")

// 标签页配置
const tabs = [
  { name: "worker", label: "工作节点" },
  { name: "executor", label: "任务执行器" }
]

const workerRef = ref<InstanceType<typeof Worker>>()
const executorRef = ref<InstanceType<typeof Executor>>()

// 处理标签页切换
const handleTabChange = (tabName: string) => {
  activeName.value = tabName
  if (tabName === "worker") {
    workerRef.value?.listWorkersData()
  } else if (tabName === "executor") {
    executorRef.value?.listExecutorsData()
  }
}

// 刷新数据
const handleRefresh = () => {
  if (activeName.value === "worker") {
    workerRef.value?.listWorkersData()
  } else if (activeName.value === "executor") {
    executorRef.value?.listExecutorsData()
  }
}
</script>

<style lang="scss">
.add-drawer {
  .el-drawer__header {
    margin: 0;
  }
}
</style>

<style lang="scss" scoped>
.worker-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
