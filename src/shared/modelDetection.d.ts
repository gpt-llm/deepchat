/**
 * 模型检测相关类型定义
 * 用于前后端通信的模型状态检测接口
 */

/**
 * 模型检测状态枚举
 */
export enum ModelDetectionState {
  /** 用户没有任何启用的模型（第一次添加 provider） */
  NO_ENABLED_MODELS = 'no_enabled_models',
  /** 模型列表为空（可能是刷新导致的临时状态） */
  EMPTY_MODEL_LIST = 'empty_model_list',
  /** 模型列表存在但都被禁用了 */
  ALL_MODELS_DISABLED = 'all_models_disabled',
  /** 正常情况（有启用的模型） */
  HAS_ENABLED_MODELS = 'has_enabled_models'
}

/**
 * Provider 详细信息接口
 */
export interface ProviderDetail {
  /** Provider ID */
  providerId: string
  /** Provider 显示名称 */
  providerName: string
  /** 是否启用 */
  isEnabled: boolean
  /** 总模型数量 */
  totalModelsCount: number
  /** 启用的模型数量 */
  enabledModelsCount: number
  /** 是否有模型 */
  hasModels: boolean
  /** 是否是首次设置 */
  isFirstTimeSetup: boolean
}

/**
 * 模型检测结果接口
 */
export interface ModelDetectionResult {
  /** 检测状态 */
  state: ModelDetectionState
  /** 启用的 provider 数量 */
  enabledProvidersCount: number
  /** 启用的模型总数量 */
  enabledModelsCount: number
  /** 每个 provider 的详细信息 */
  providerDetails: ProviderDetail[]
  /** 是否应该显示引导对话框 */
  shouldShowGuidance: boolean
  /** 建议的操作 */
  suggestedActions: string[]
}

/**
 * Provider 模型检测结果接口
 */
export interface ProviderModelDetectionResult {
  /** 是否有启用的模型 */
  hasEnabledModels: boolean
  /** 总模型数量 */
  totalModels: number
  /** 启用的模型数量 */
  enabledModels: number
  /** 是否是首次设置 */
  isFirstTimeSetup: boolean
}

/**
 * 格式化后的消息接口
 */
export interface FormattedDetectionMessage {
  /** 标题 */
  title: string
  /** 消息内容 */
  message: string
  /** 建议的操作 */
  actions: string[]
}

/**
 * 模型检测服务配置接口
 */
export interface ModelDetectionConfig {
  /** 最小弹窗间隔时间（毫秒） */
  minDialogIntervalMs?: number
  /** 自动刷新检测延迟时间（毫秒） */
  refreshDetectionDelayMs?: number
  /** 是否启用模型检测 */
  enableDetection?: boolean
  /** 是否在首次启动时检测 */
  detectOnFirstStart?: boolean
}

/**
 * 模型检测事件类型
 */
export interface ModelDetectionEvents {
  /** 检测开始事件 */
  onDetectionStart?: () => void
  /** 检测完成事件 */
  onDetectionComplete?: (result: ModelDetectionResult) => void
  /** 需要显示对话框事件 */
  onShouldShowDialog?: (result: ModelDetectionResult) => void
  /** 对话框隐藏事件 */
  onDialogHidden?: () => void
}

/**
 * 模型检测上下文接口（用于组件间传递）
 */
export interface ModelDetectionContext {
  /** 当前检测结果 */
  currentResult: ModelDetectionResult | null
  /** 是否正在检测 */
  isDetecting: boolean
  /** 对话框是否可见 */
  isDialogVisible: boolean
  /** 最后检测时间 */
  lastDetectionTime: number
  /** 格式化消息方法 */
  formatMessage: (result: ModelDetectionResult) => FormattedDetectionMessage
}
