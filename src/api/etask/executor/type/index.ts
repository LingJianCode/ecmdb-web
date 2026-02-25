/**
 * 处理器详情
 */
export interface HandlerDetail {
  name: string
  desc: string
}

/**
 * 节点详情
 */
export interface NodeDetail {
  id: string
  address: string
}

/**
 * 执行器信息
 */
export interface Executor {
  name: string
  desc: string
  handlers: HandlerDetail[]
  nodes: NodeDetail[]
}
