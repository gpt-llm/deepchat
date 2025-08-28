import { computed, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useRouter, useRoute } from 'vue-router'

/**
 * 模型检测组合式函数
 * 提供便捷的模型检测功能和状态管理
 */
export function useModelDetection() {
  const settingsStore = useSettingsStore()
  const router = useRouter()
  const route = useRoute()

  // 状态计算属性
  const hasEnabledModels = computed(() => settingsStore.hasEnabledModels)
  const detectionResult = computed(() => settingsStore.modelDetectionResult)
  const isDialogVisible = computed(() => settingsStore.isModelDetectionDialogVisible)
  const lastDetectionTime = computed(() => settingsStore.lastModelDetectionTime)

  // 格式化检测结果
  const formattedMessage = computed(() => {
    if (!detectionResult.value) return null
    return settingsStore.formatModelDetectionMessage(detectionResult.value)
  })

  // 是否应该在当前页面显示检测对话框
  const shouldShowInCurrentPage = computed(() => {
    const currentRoute = route.name as string

    // 在聊天页面不显示对话框，避免打断用户
    const excludedRoutes = ['chat', 'conversation']
    if (excludedRoutes.includes(currentRoute)) {
      return false
    }

    return true
  })

  // 检测方法
  const detectOverallState = async () => {
    try {
      const result = await settingsStore.detectOverallModelState()
      return result
    } catch (error) {
      console.error('检测整体模型状态失败:', error)
      return null
    }
  }

  const detectProviderModels = async (providerId: string) => {
    try {
      const result = await settingsStore.detectProviderEnabledModels(providerId)
      return result
    } catch (error) {
      console.error(`检测provider ${providerId} 模型失败:`, error)
      return null
    }
  }

  // 显示/隐藏对话框
  const showDialog = async () => {
    if (!shouldShowInCurrentPage.value) {
      return false
    }

    try {
      await settingsStore.showModelDetectionDialog()
      return true
    } catch (error) {
      console.error('显示模型检测对话框失败:', error)
      return false
    }
  }

  const hideDialog = () => {
    settingsStore.hideModelDetectionDialog()
  }

  // 触发检测（智能延迟）
  const triggerDetection = async (delayMs = 1000) => {
    if (!shouldShowInCurrentPage.value) {
      return
    }

    setTimeout(async () => {
      await showDialog()
    }, delayMs)
  }

  // 监听关键事件并触发检测
  const setupDetectionListeners = () => {
    // 监听provider变更
    const handleProviderChange = () => {
      triggerDetection(2000) // 2秒延迟
    }

    // 监听模型状态变更
    const handleModelStatusChange = () => {
      triggerDetection(1000) // 1秒延迟
    }

    // 监听路由变更
    const handleRouteChange = (to: any) => {
      // 进入设置页面时检测
      if (to.name === 'settings' || to.name?.startsWith?.('settings-')) {
        triggerDetection(500) // 500ms延迟
      }
    }

    // 这里可以添加事件监听器
    // 注意：实际实现需要根据项目的事件系统来调整

    return {
      handleProviderChange,
      handleModelStatusChange,
      handleRouteChange
    }
  }

  // 智能检测逻辑
  const smartDetection = async () => {
    // 检查当前状态
    const result = await detectOverallState()
    if (!result) return

    // 根据不同状态采取不同策略
    switch (result.state) {
      case 'no_enabled_models':
        // 没有启用的provider，立即显示
        await showDialog()
        break

      case 'all_models_disabled':
        // 所有模型被禁用，立即显示
        await showDialog()
        break

      case 'empty_model_list':
        // 模型列表为空，延迟显示（可能正在加载）
        setTimeout(async () => {
          const recheck = await detectOverallState()
          if (recheck?.state === 'empty_model_list') {
            await showDialog()
          }
        }, 5000) // 5秒后再次检查
        break

      case 'has_enabled_models':
        // 正常状态，不显示对话框
        break
    }
  }

  // 处理用户操作
  const handleUserAction = async (action: string) => {
    switch (action) {
      case '前往设置页面':
      case '启用推荐提供商':
        await router.push('/settings/providers')
        break

      case '前往模型管理':
      case '启用推荐模型':
        await router.push('/settings/models')
        break

      case '检查网络连接':
      case '验证 API 配置':
        await router.push('/settings/providers')
        break

      case '重新刷新模型列表':
        try {
          await settingsStore.refreshAllModels()
          // 刷新后重新检测
          triggerDetection(2000)
        } catch (error) {
          console.error('刷新模型列表失败:', error)
        }
        break

      default:
        console.warn('未知的用户操作:', action)
    }
  }

  // 生命周期管理
  let detectionTimer: NodeJS.Timeout | null = null

  const startPeriodicDetection = (intervalMs = 5 * 60 * 1000) => {
    if (detectionTimer) {
      clearInterval(detectionTimer)
    }

    detectionTimer = setInterval(async () => {
      const shouldShow = await settingsStore.shouldShowModelDetectionDialog()
      if (shouldShow && shouldShowInCurrentPage.value) {
        await smartDetection()
      }
    }, intervalMs)
  }

  const stopPeriodicDetection = () => {
    if (detectionTimer) {
      clearInterval(detectionTimer)
      detectionTimer = null
    }
  }

  // 组件挂载时的初始化
  const initDetection = async (
    options: {
      autoDetect?: boolean
      periodicDetection?: boolean
      periodicIntervalMs?: number
    } = {}
  ) => {
    const {
      autoDetect = true,
      periodicDetection = false,
      periodicIntervalMs = 5 * 60 * 1000
    } = options

    if (autoDetect) {
      // 延迟初始检测，等待其他组件初始化
      setTimeout(() => {
        smartDetection()
      }, 3000)
    }

    if (periodicDetection) {
      startPeriodicDetection(periodicIntervalMs)
    }

    const listeners = setupDetectionListeners()
    return listeners
  }

  // 清理资源
  const cleanup = () => {
    stopPeriodicDetection()
    hideDialog()
  }

  // 在组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 状态
    hasEnabledModels,
    detectionResult,
    isDialogVisible,
    lastDetectionTime,
    formattedMessage,
    shouldShowInCurrentPage,

    // 方法
    detectOverallState,
    detectProviderModels,
    showDialog,
    hideDialog,
    triggerDetection,
    smartDetection,
    handleUserAction,

    // 生命周期管理
    initDetection,
    startPeriodicDetection,
    stopPeriodicDetection,
    cleanup
  }
}

// 全局模型检测管理器
export class ModelDetectionManager {
  private static instance: ModelDetectionManager
  private settingsStore: ReturnType<typeof useSettingsStore>
  private isInitialized = false

  constructor() {
    this.settingsStore = useSettingsStore()
  }

  static getInstance(): ModelDetectionManager {
    if (!this.instance) {
      this.instance = new ModelDetectionManager()
    }
    return this.instance
  }

  async init() {
    if (this.isInitialized) return

    // 延迟初始化，确保store已经加载
    setTimeout(async () => {
      await this.settingsStore.initSettings()
      await this.performInitialDetection()
      this.isInitialized = true
    }, 3000)
  }

  private async performInitialDetection() {
    try {
      const shouldShow = await this.settingsStore.shouldShowModelDetectionDialog()
      if (shouldShow) {
        await this.settingsStore.showModelDetectionDialog()
      }
    } catch (error) {
      console.error('初始模型检测失败:', error)
    }
  }

  // 在关键操作后触发检测
  async triggerAfterOperation(operationType: string, delayMs = 1000) {
    console.log(`操作 ${operationType} 完成，将在 ${delayMs}ms 后检测模型状态`)

    setTimeout(async () => {
      try {
        const shouldShow = await this.settingsStore.shouldShowModelDetectionDialog()
        if (shouldShow) {
          await this.settingsStore.showModelDetectionDialog()
        }
      } catch (error) {
        console.error(`操作 ${operationType} 后的模型检测失败:`, error)
      }
    }, delayMs)
  }
}

// 导出单例实例
export const modelDetectionManager = ModelDetectionManager.getInstance()
