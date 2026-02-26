<template>
  <Drawer
    v-model="visible"
    :title="drawerTitle"
    :subtitle="drawerSubtitle"
    :header-icon="Setting"
    size="45%"
    direction="rtl"
    :show-footer="isCreatingRunner"
    :close-on-cancel="false"
    cancel-button-text="返回列表"
    confirm-button-text="保存"
    @closed="onClosed"
    @cancel="handleCancel"
    @confirm="handleConfirm"
  >
    <div v-if="!isCreatingRunner" class="drawer-tabs-wrapper">
      <CustomTabs :tabs="tabList" :no-margin="true" @tab-change="handleTabChange">
        <template #default="{ activeTab }">
          <!-- Tab 1: 当前绑定 -->
          <div v-show="activeTab === 'bound'" class="tab-pane">
            <div class="action-bar header-actions">
              <el-button type="primary" :icon="Plus" class="add-btn" @click="handleToCreate">新增执行单元</el-button>
              <el-button @click="handleRefresh" :icon="Refresh" circle class="refresh-btn custom-circle" />
            </div>

            <div class="table-wrapper bound-table">
              <DataTable
                :data="codebookRunners"
                :columns="runnerColumns"
                :show-selection="false"
                :show-pagination="true"
                :total="codebookRunnersTotal"
                v-model:page="boundPageParams.page"
                v-model:limit="boundPageParams.limit"
                @pagination="handleRefresh"
                v-loading="loading"
                :table-props="tableProps"
              >
                <template #run_mode="{ row }">
                  <el-tag v-if="row.run_mode === RunMode.Worker" type="info" size="small" effect="light">
                    工作节点
                  </el-tag>
                  <el-tag v-else-if="row.run_mode === RunMode.Execute" type="success" size="small" effect="light">
                    分布式执行
                  </el-tag>
                </template>

                <template #target="{ row }">
                  <div v-if="row.run_mode === RunMode.Worker && row.worker" class="target-info">
                    <el-tooltip :content="`Topic: ${row.worker.topic}`" placement="top">
                      <span>{{ row.worker.worker_name }}</span>
                    </el-tooltip>
                  </div>
                  <div v-else-if="row.run_mode === RunMode.Execute && row.execute" class="target-info">
                    <el-tooltip :content="`Handler: ${row.execute.handler}`" placement="top">
                      <span class="execute-target">{{ row.execute.service_name }}</span>
                    </el-tooltip>
                  </div>
                  <span v-else>-</span>
                </template>

                <template #tags="{ row }">
                  <div class="tags-container">
                    <el-tag
                      v-for="tag in row.tags"
                      :key="tag"
                      effect="light"
                      type="primary"
                      size="small"
                      round
                      class="modern-tag"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </template>
                <template #actions="{ row }">
                  <el-tooltip content="编辑" placement="top">
                    <el-button link type="primary" :icon="Edit" @click="handleEdit(row)" />
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" />
                  </el-tooltip>
                </template>
              </DataTable>
            </div>
          </div>

          <!-- Tab 2: 可复用配置 -->
          <div v-show="activeTab === 'fork'" class="tab-pane">
            <div class="action-bar header-actions">
              <span class="fork-desc">
                <el-icon class="fork-icon"><DocumentCopy /></el-icon>
                从系统中选择已有的执行单元，快速复用到当前任务模版
              </span>
              <el-button @click="handleRefreshFork" :icon="Refresh" circle class="refresh-btn custom-circle" />
            </div>

            <div class="table-wrapper fork-table">
              <DataTable
                :data="forkableRunners"
                :columns="runnerColumns"
                :show-selection="false"
                :show-pagination="true"
                :total="forkableRunnersTotal"
                v-model:page="forkPageParams.page"
                v-model:limit="forkPageParams.limit"
                @pagination="handleRefreshFork"
                v-loading="loading"
                :table-props="tableProps"
              >
                <template #run_mode="{ row }">
                  <el-tag v-if="row.run_mode === RunMode.Worker" type="info" size="small" effect="light">
                    工作节点
                  </el-tag>
                  <el-tag v-else-if="row.run_mode === RunMode.Execute" type="success" size="small" effect="light">
                    分布式执行
                  </el-tag>
                </template>

                <template #target="{ row }">
                  <div v-if="row.run_mode === RunMode.Worker && row.worker" class="target-info">
                    <el-tooltip :content="`Topic: ${row.worker.topic}`" placement="top">
                      <span>{{ row.worker.worker_name }}</span>
                    </el-tooltip>
                  </div>
                  <div v-else-if="row.run_mode === RunMode.Execute && row.execute" class="target-info">
                    <el-tooltip :content="`Handler: ${row.execute.handler}`" placement="top">
                      <span class="execute-target">{{ row.execute.service_name }}</span>
                    </el-tooltip>
                  </div>
                  <span v-else>-</span>
                </template>

                <template #tags="{ row }">
                  <div class="tags-container">
                    <el-tag
                      v-for="tag in row.tags"
                      :key="tag"
                      effect="light"
                      type="info"
                      size="small"
                      round
                      class="modern-tag"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </template>
                <template #actions="{ row }">
                  <el-button link type="success" size="small" :icon="DocumentCopy" @click="handleFork(row)">
                    复用配置
                  </el-button>
                </template>
              </DataTable>
            </div>
          </div>
        </template>
      </CustomTabs>
    </div>

    <div v-else class="form-view">
      <div class="form-card">
        <RunnerForm ref="runnerFormRef" hide-codebook-config @callback="onFormSuccess" />
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue"
import { Setting, Plus, Refresh, Edit, Delete, DocumentCopy } from "@element-plus/icons-vue"
import { Drawer } from "@@/components/Dialogs"
import CustomTabs from "@/common/components/Tabs/CustomTabs.vue"
import DataTable from "@/common/components/DataTable/index.vue"
import type { Column } from "@@/components/DataTable/types"
import RunnerForm from "@/views/task/runner/form.vue"
import { useRunner } from "../composables/useRunner"
import { cloneDeep } from "lodash-es"
import { codebook } from "@/api/codebook/types/codebook"
import { runner, RunMode } from "@/api/runner/types/runner"

const visible = ref(false)
const isCreatingRunner = ref(false)
const isEditRunner = ref(false)
const currentCodebook = ref<codebook | null>(null)

const tabList = [
  { name: "bound", label: "当前绑定" },
  { name: "fork", label: "复用其他单元" }
]

/** 当前激活的 tab，用于按需加载数据 */
const activeTab = ref("bound")

const runnerFormRef = ref<InstanceType<typeof RunnerForm>>()

const {
  codebookRunners,
  codebookRunnersTotal,
  forkableRunners,
  forkableRunnersTotal,
  loading,
  fetchCodebookRunners,
  fetchExcludeCodebookRunners,
  deleteRunner
} = useRunner()

const runnerColumns: Column[] = [
  { prop: "run_mode", label: "运行模式", align: "center", slot: "run_mode", width: 120 },
  { prop: "target", label: "执行目标", align: "center", slot: "target", width: 180 },
  { prop: "tags", label: "运行标签", align: "center", slot: "tags" }
]

const boundPageParams = ref({
  page: 1,
  limit: 10
})

const forkPageParams = ref({
  page: 1,
  limit: 10
})

/** 表格公用样式：灰色表头 + border */
const tableProps = {
  stripe: false,
  border: true,
  "header-cell-style": { background: "#F6F6F6", height: "10px", "text-align": "center" }
}

const drawerTitle = computed(() => {
  if (isCreatingRunner.value) {
    return isEditRunner.value
      ? `修改执行单元 -【 ${currentCodebook.value?.name} 】`
      : `配置执行单元 -【 ${currentCodebook.value?.name} 】`
  }
  return "执行单元列表"
})

const drawerSubtitle = computed(() => {
  if (isCreatingRunner.value) {
    return "为任务模版快速配置工作节点与执行参数"
  }
  return `管理模版【${currentCodebook.value?.name || ""}】下的所有执行单元`
})

const open = (row: codebook) => {
  currentCodebook.value = row
  isCreatingRunner.value = false
  isEditRunner.value = false
  visible.value = true
  boundPageParams.value.page = 1
  forkPageParams.value.page = 1
  activeTab.value = "bound"
  // NOTE: 打开时只加载当前激活的 bound tab 数据，fork tab 按需加载
  _fetchBound(row.identifier)
}

const _fetchBound = (uid: string) => {
  const offset = (boundPageParams.value.page - 1) * boundPageParams.value.limit
  fetchCodebookRunners(uid, offset, boundPageParams.value.limit)
}

/** 切换 tab 时按需加载对应数据 */
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  if (tabName === "bound") {
    if (currentCodebook.value) _fetchBound(currentCodebook.value.identifier)
  } else if (tabName === "fork") {
    forkPageParams.value.page = 1
    handleRefreshFork()
  }
}

const handleRefresh = () => {
  // NOTE: 刷新时只刷新当前 tab 的数据
  if (activeTab.value === "bound" && currentCodebook.value) {
    _fetchBound(currentCodebook.value.identifier)
  } else if (activeTab.value === "fork") {
    handleRefreshFork()
  }
}

const handleRefreshFork = () => {
  if (currentCodebook.value) {
    const offset = (forkPageParams.value.page - 1) * forkPageParams.value.limit
    fetchExcludeCodebookRunners(currentCodebook.value.identifier, offset, forkPageParams.value.limit)
  }
}

const handleToCreate = () => {
  isCreatingRunner.value = true
  isEditRunner.value = false
  nextTick(() => {
    runnerFormRef.value?.resetForm()
    if (currentCodebook.value) {
      runnerFormRef.value?.setFrom({
        id: undefined,
        name: currentCodebook.value.name + "_执行单元",
        codebook_uid: currentCodebook.value.identifier,
        codebook_secret: currentCodebook.value.secret,
        run_mode: RunMode.Execute,
        desc: "",
        tags: [],
        variables: []
      } as any)
    }
  })
}

const handleEdit = (row: runner) => {
  isCreatingRunner.value = true
  isEditRunner.value = true
  nextTick(() => {
    runnerFormRef.value?.setFrom(cloneDeep(row))
  })
}

const handleFork = (row: runner) => {
  isCreatingRunner.value = true
  isEditRunner.value = false
  nextTick(() => {
    runnerFormRef.value?.resetForm()
    if (currentCodebook.value) {
      const cloned = cloneDeep(row)
      delete (cloned as any).id
      // Optional: don't copy name aggressively, let it auto-generate or use a blank state
      cloned.name = ""
      cloned.codebook_uid = currentCodebook.value.identifier
      cloned.codebook_secret = currentCodebook.value.secret
      runnerFormRef.value?.setFrom(cloned)
    }
  })
}

const handleDelete = (row: runner) => {
  deleteRunner(row, () => {
    handleRefresh()
  })
}

const handleConfirm = () => {
  runnerFormRef.value?.submitForm()
}

const onFormSuccess = () => {
  isCreatingRunner.value = false
  handleRefresh()
}

const handleCancel = () => {
  // NOTE: 无论在哪个视图，取消按鈕都只负责“返回列表”，不关闭整个 Drawer
  isCreatingRunner.value = false
  isEditRunner.value = false
}

const onClosed = () => {
  visible.value = false
  isCreatingRunner.value = false
  runnerFormRef.value?.resetForm()
  currentCodebook.value = null
}

defineExpose({
  open
})
</script>

<style lang="scss" scoped>
.drawer-tabs-wrapper {
  background: white;
  height: 100%;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding-top: 10px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .add-btn {
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 500;
  }

  .custom-circle {
    border: none;
    background: #f1f5f9;
    color: #475569;
    &:hover {
      background: #e2e8f0;
      color: #3b82f6;
    }
  }

  .fork-desc {
    font-size: 13px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f8fafc;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px dashed #cbd5e1;

    .fork-icon {
      color: #3b82f6;
      font-size: 15px;
    }
  }

  .refresh-btn {
    transition: transform 0.3s ease;
    &:active {
      transform: rotate(180deg);
    }
  }
}

.table-wrapper {
  flex: 1;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;

  // ensure there's a min height when no rows
  min-height: 200px;

  &.fork-table :deep(.el-table) {
    height: 100%;
    // hide empty block bottom border
    border-bottom: none;
  }
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;

  .modern-tag {
    border: none;
    font-weight: 500;
  }
}

.target-info {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;

  .execute-target {
    font-weight: 500;
    color: var(--el-color-success);
  }
}

.form-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 4px;
}
</style>
