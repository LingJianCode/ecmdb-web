import { ref } from "vue"
import { worker } from "@/api/worker/types/worker"
import { listWorkerApi } from "@/api/worker/worker"

/**
 * 获取工作节点列表
 * @returns workers 列表及加载函数
 */
export function useWorkers() {
  const workers = ref<worker[]>([])
  const loading = ref(false)

  const fetchWorkers = () => {
    loading.value = true
    listWorkerApi({ offset: 0, limit: 100 })
      .then(({ data }) => {
        workers.value = data.workers || []
      })
      .catch(() => {
        workers.value = []
      })
      .finally(() => {
        loading.value = false
      })
  }

  /**
   * 获取工作节点 label 展示文本
   * @param item 工作节点
   */
  const getWorkerLabel = (item: worker) => {
    return `${item.name} -【 topic: ${item.topic} 】`
  }

  return {
    workers,
    loading,
    fetchWorkers,
    getWorkerLabel
  }
}
