<template>
  <PageContainer>
    <!-- 头部区域，加入搜索功能 -->
    <ManagerHeader
      title="任务历史"
      subtitle="查看任务执行历史和状态"
      :show-add-button="false"
      v-model="searchQuery"
      show-search
      placeholder="搜索工单码或任务名称"
      @refresh="fetchTasksData"
    />

    <!-- 主内容区域 -->
    <DataTable
      v-loading="loading"
      :data="tasksData"
      :columns="tableColumns"
      :show-selection="true"
      :show-pagination="true"
      :total="paginationData.total"
      :page-size="paginationData.pageSize"
      :current-page="paginationData.currentPage"
      :page-sizes="paginationData.pageSizes"
      :pagination-layout="paginationData.layout"
      @selection-change="handleSelectionChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 执行目标插槽：区分 Worker 和 Execute 模式 -->
      <template #execute_target="{ row }">
        <div class="execute-target-cell">
          <template v-if="row.run_mode === RunMode.Worker && row.worker">
            <el-icon class="target-icon worker"><Cpu /></el-icon>
            <span class="target-text">
              {{ row.worker.worker_name }}
              <small class="target-meta">@{{ row.worker.topic }}</small>
            </span>
          </template>
          <template v-else-if="row.run_mode === RunMode.Execute && row.execute">
            <el-icon class="target-icon execute"><Memo /></el-icon>
            <span class="target-text">
              {{ row.execute.service_name }}
              <small class="target-meta">/{{ row.execute.handler }}</small>
            </span>
          </template>
          <span v-else class="target-empty">--</span>
        </div>
      </template>

      <!-- 状态列插槽：优化展示效果 -->
      <template #status="{ row }">
        <div class="status-cell">
          <EnumTag :value="row.status" :map="STATUS_MAP" effect="light" round />
        </div>
      </template>

      <!-- 定时任务列插槽 -->
      <template #is_timing="{ row }">
        <el-tag :type="row.is_timing ? 'primary' : 'info'" size="small" effect="plain" class="type-tag">
          {{ row.is_timing ? "定时任务" : "即时任务" }}
        </el-tag>
      </template>

      <!-- 执行时间列插槽 -->
      <template #run_time="{ row }">
        <div v-if="row.is_timing" class="time-info">
          <div v-if="row.scheduled_time" class="time-item plan">
            <span class="label">计:</span> {{ row.scheduled_time }}
          </div>
          <div v-if="row.start_time" class="time-item start"><span class="label">始:</span> {{ row.start_time }}</div>
        </div>
        <span v-else class="time-text">{{ row.start_time || "--" }}</span>
      </template>

      <!-- 操作列插槽 -->
      <template #actions="{ row }">
        <OperateBtn :items="OPERATE_BUTTONS" @routeEvent="handleOperateEvent" :operateItem="row" :maxLength="2" />
      </template>
    </DataTable>

    <!-- 抽取的任务结果查看对话框 -->
    <TaskResultDialog
      v-model="resultVisible"
      :result="result"
      :language="language"
      :type="currentDialogType"
      :task-id="taskId"
      @closed="onResultDialogClosed"
      @save="handleSaveResult"
    />

    <!-- 任务重试确认对话框 -->
    <TaskRetryDialog
      v-model="retryDialogVisible"
      :task-id="taskId"
      width="400px"
      :loading="retryLoading"
      @confirm="handleRetryConfirm"
    />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { Cpu, Memo } from "@element-plus/icons-vue"
import { task, RunMode } from "@/api/task/types/task"
import { retryTaskApi, updateTaskArgsApi, updateTaskVariablesApi, getTaskLogsApi } from "@/api/task"
import OperateBtn from "@@/components/OperateBtn/index.vue"
import { ElMessage } from "element-plus"
import EnumTag from "@/common/components/EnumTag/index.vue"
import ManagerHeader from "@/common/components/ManagerHeader/index.vue"
import DataTable from "@/common/components/DataTable/index.vue"
import PageContainer from "@/common/components/PageContainer/index.vue"
import TaskResultDialog from "./components/TaskResultDialog.vue"
import TaskRetryDialog from "./components/TaskRetryDialog.vue"
import { useTaskHistory } from "./composables/useTaskHistory"
import type { Column } from "@@/components/DataTable/types"
import type { TagInfo } from "@/common/components/EnumTag/index.vue"

// 定义映射信息 (与 task.vue 保持同步，优化色彩)
const STATUS_MAP: Record<number, TagInfo> = {
  0: { type: "info", text: "未知" },
  1: { type: "success", text: "成功", color: "#10b981" },
  2: { type: "danger", text: "失败", color: "#ef4444" },
  3: { type: "primary", text: "运行中", color: "#3b82f6" },
  4: { type: "info", text: "等待中", color: "#64748b" },
  5: { type: "warning", text: "已挂起", color: "#f59e0b" },
  6: { type: "primary", text: "就绪中", color: "#8b5cf6" },
  7: { type: "warning", text: "重试中", color: "#f97316" }
}

const OPERATE_BUTTONS = [
  { name: "输入", code: "input", icon: "Document", type: "info" },
  { name: "输出", code: "output", icon: "Monitor", type: "success" },
  { name: "参数", code: "args", icon: "Setting", type: "primary" },
  { name: "变量", code: "variables", icon: "CollectionTag", type: "warning" },
  { name: "重试", code: "retry", icon: "Refresh", type: "danger" }
]

const { tasksData, loading, searchQuery, paginationData, fetchTasksData, handleCurrentChange, handleSizeChange } =
  useTaskHistory()

// 表格配置
const tableColumns: Column[] = [
  { prop: "order_id", label: "工单号", width: 100, align: "center" },
  { prop: "codebook_name", label: "任务模板", minWidth: 100, align: "center" },
  { prop: "execute_target", label: "执行目标", slot: "execute_target", align: "center" },
  { prop: "status", label: "状态", slot: "status", align: "center" },
  { prop: "is_timing", label: "类型", slot: "is_timing", align: "center" },
  { prop: "run_time", label: "时间线", slot: "run_time", align: "center" }
]

// 交互逻辑
const selectedRows = ref<task[]>([])
const handleSelectionChange = (selection: task[]) => {
  selectedRows.value = selection
}

const taskId = ref<number>(0)
const result = ref<any>("")
const language = ref<string>("")
const resultVisible = ref<boolean>(false)
const currentDialogType = ref<"input" | "output" | "args" | "variables">("input")
const retryDialogVisible = ref<boolean>(false)
const retryLoading = ref<boolean>(false)

/**
 * 处理操作按钮事件
 */
const handleOperateEvent = async (data: task, code: string) => {
  taskId.value = data.id

  switch (code) {
    case "input":
      result.value = data.code
      language.value = data.language
      currentDialogType.value = "input"
      resultVisible.value = true
      break
    case "output":
      try {
        const { data: logs } = await getTaskLogsApi(data.id)
        result.value = logs
        language.value = "text"
        currentDialogType.value = "output"
        resultVisible.value = true
      } catch (e) {
        ElMessage.error("日志拉取失败")
      }
      break
    case "args":
      result.value = data.args ? JSON.parse(data.args) : {}
      currentDialogType.value = "args"
      language.value = "json"
      resultVisible.value = true
      break
    case "variables":
      result.value = data.variables ? JSON.parse(data.variables) : {}
      currentDialogType.value = "variables"
      language.value = "json"
      resultVisible.value = true
      break
    case "retry":
      retryDialogVisible.value = true
      break
  }
}

const onResultDialogClosed = () => {
  result.value = ""
  language.value = ""
  resultVisible.value = false
  taskId.value = 0
}

const handleSaveResult = async (payload: { taskId: number; result: any; type: string }) => {
  try {
    if (payload.type === "args") {
      await updateTaskArgsApi({ id: payload.taskId, args: payload.result })
    } else {
      await updateTaskVariablesApi({ id: payload.taskId, variables: JSON.stringify(payload.result) })
    }
    ElMessage.success("修改成功")
    fetchTasksData()
  } catch (error) {
    ElMessage.error("保存失败")
  }
}

const handleRetryConfirm = async () => {
  retryLoading.value = true
  try {
    await retryTaskApi(taskId.value)
    ElMessage.success("重试已提交，请稍后查看结果")
    retryDialogVisible.value = false
    fetchTasksData()
  } catch (error: any) {
    ElMessage.error(error.msg || "重试任务失败")
  } finally {
    retryLoading.value = false
  }
}
</script>

<style scoped lang="scss">
// 任务历史页面样式优化
.task-history-container {
  .el-table {
    .el-table__header {
      th {
        background: #f8fafc;
        color: #374151;
        font-weight: 600;
      }
    }

    .el-table__row {
      &:hover {
        background: #f8fafc;
      }
    }
  }
}

// 操作按钮样式优化
.operate-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  .el-button {
    font-size: 12px;
    padding: 4px 8px;
    height: auto;
    min-height: 28px;
  }
}

// 状态标签样式优化
.status-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

// 时间显示样式优化
.time-display {
  font-family: "Monaco", "Consolas", monospace;
  font-size: 12px;
  color: #6b7280;
}

.execute-target-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .target-icon {
    font-size: 16px;
    padding: 6px;
    border-radius: 6px;

    &.worker {
      background: #eff6ff;
      color: #3b82f6;
    }

    &.execute {
      background: #fdf2f8;
      color: #db2777;
    }
  }

  .target-text {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.2;

    .target-meta {
      font-weight: normal;
      color: #94a3b8;
      margin-top: 2px;
      font-family: "JetBrains Mono", monospace;
    }
  }

  .target-empty {
    color: #cbd5e1;
  }
}

.status-cell {
  display: flex;
  justify-content: center;
  width: 100%;
}

.type-tag {
  letter-spacing: 1px;
}

.time-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 11px;

  .time-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    border-radius: 4px;

    &.plan {
      background: #f0f9ff;
      color: #0369a1;
    }

    &.start {
      background: #fdf2f8;
      color: #be185d;
    }

    .label {
      opacity: 0.6;
      font-weight: bold;
    }
  }
}

.time-text {
  font-family: "JetBrains Mono", monospace;
  font-size: 13px;
  color: #4b5563;
}

:deep(.el-tag--light) {
  border-width: 0;
  font-weight: 600;
}
</style>
