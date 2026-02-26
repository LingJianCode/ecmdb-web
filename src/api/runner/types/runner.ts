/** 执行单元的运行模式 */
export enum RunMode {
  /** 通过 Kafka 推送到工作节点执行 */
  Worker = "WORKER",
  /** 通过分布式任务平台执行节点分发 */
  Execute = "EXECUTE"
}

export interface workerConfig {
  worker_name: string
  topic: string
}

export interface executeConfig {
  service_name: string
  handler: string
}

export interface runner {
  id: number
  name: string
  codebook_uid: string
  codebook_secret: string
  run_mode: RunMode
  worker?: workerConfig
  execute?: executeConfig
  desc: string
  tags: string[]
  variables: variables[]
}

export interface registerOrUpdateReq {
  id?: number
  name: string
  codebook_uid: string
  codebook_secret: string
  run_mode: RunMode
  worker?: workerConfig
  execute?: executeConfig
  desc: string
  tags: string[]
  variables?: variables[]
}

export interface runners {
  runners: runner[]
  total: number
}

export interface variables {
  key: string
  value: any
  secret: boolean
}

export interface listRunnerReq {
  /** 跳过条数 */
  offset: number
  /** 查询条数 */
  limit: number
}

export interface listByCodebookIdReq extends listRunnerReq {
  codebook_uid: string
}

export interface runnerTags {
  codebook_name: string
  codebook_uid: string
  tags_topic: Map<string, string>
}

export interface runnerTagResp {
  runner_tags: runnerTags[]
}
