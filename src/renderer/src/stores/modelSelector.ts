import { defineStore } from 'pinia'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { MODEL_SELECTOR_EVENTS } from '@/events'
import type { RENDERER_MODEL_META } from '@shared/presenter'

export interface ModelSelectionTriggerOptions {
  /** 触发原因 */
  reason: 'api_key_verified' | 'models_refreshed' | 'no_enabled_models'
  /** 相关的提供商ID */
  providerId: string
  /** 是否是自动触发（避免在自动刷新时弹出） */
  automatic?: boolean
  /** 建议选择的模型数量 */
  suggestedCount?: number
  /** 自定义对话框标题 */
  title?: string
  /** 自定义对话框描述 */
  description?: string
}

export const useModelSelectorStore = defineStore('modelSelector', () => {
  const settingsStore = useSettingsStore()

  // 状态
  const isDialogOpen = ref(false)
  const currentOptions = ref<ModelSelectionTriggerOptions | null>(null)
  const selectedModels = ref<RENDERER_MODEL_META[]>([])
  const isProcessing = ref(false)

  // 计算属性
  const availableModels = computed(() => {
    if (!currentOptions.value) return []

    // 获取指定提供商的所有模型
    const providerId = currentOptions.value.providerId
    const providerModels = settingsStore.allProviderModels.find((p) => p.providerId === providerId)
    const customModels = settingsStore.customModels.find((p) => p.providerId === providerId)

    const models: RENDERER_MODEL_META[] = []
    if (providerModels) models.push(...providerModels.models)
    if (customModels) models.push(...customModels.models)

    return models
  })

  const hasEnabledModels = computed(() => {
    if (!currentOptions.value) return true

    const providerId = currentOptions.value.providerId
    const enabledProvider = settingsStore.enabledModels.find((p) => p.providerId === providerId)
    return enabledProvider ? enabledProvider.models.length > 0 : false
  })

  const dialogTitle = computed(() => {
    if (currentOptions.value?.title) return currentOptions.value.title

    switch (currentOptions.value?.reason) {
      case 'api_key_verified':
        return 'API密钥验证成功，请选择要启用的模型'
      case 'models_refreshed':
        return '模型列表已更新，请选择要启用的模型'
      case 'no_enabled_models':
        return '当前没有启用的模型，请选择要启用的模型'
      default:
        return '选择模型'
    }
  })

  const dialogDescription = computed(() => {
    if (currentOptions.value?.description) return currentOptions.value.description

    const suggestedCount = currentOptions.value?.suggestedCount || 3
    return `建议选择 ${suggestedCount} 个或更多模型以获得更好的使用体验`
  })

  // 方法
  const openDialog = (options: ModelSelectionTriggerOptions) => {
    currentOptions.value = options
    selectedModels.value = []
    isDialogOpen.value = true

    // 发送事件到主进程
    window.electron.ipcRenderer.send(MODEL_SELECTOR_EVENTS.SHOW_REQUEST, {
      providerId: options.providerId,
      reason: options.reason,
      automatic: options.automatic,
      models: availableModels.value
    })
  }

  const closeDialog = () => {
    isDialogOpen.value = false
    currentOptions.value = null
    selectedModels.value = []

    // 发送取消事件到主进程
    window.electron.ipcRenderer.send(MODEL_SELECTOR_EVENTS.CANCELLED)
  }

  const confirmSelection = async (models: RENDERER_MODEL_META[]) => {
    if (!currentOptions.value || isProcessing.value) return

    isProcessing.value = true
    try {
      const providerId = currentOptions.value.providerId

      // 批量启用选中的模型
      for (const model of models) {
        await settingsStore.updateModelStatus(providerId, model.id, true)
      }

      // 发送确认事件到主进程
      window.electron.ipcRenderer.send(MODEL_SELECTOR_EVENTS.CONFIRMED, {
        providerId,
        modelIds: models.map((m) => m.id),
        reason: currentOptions.value.reason
      })

      closeDialog()
    } catch (error) {
      console.error('Failed to update model status:', error)
      // 可以在这里添加错误处理，比如显示toast通知
    } finally {
      isProcessing.value = false
    }
  }

  // 智能触发逻辑
  const shouldTriggerDialog = (options: ModelSelectionTriggerOptions): boolean => {
    // 避免在自动刷新时触发
    if (options.automatic) return false

    // 如果已经有启用的模型，根据原因决定是否触发
    if (hasEnabledModels.value) {
      return options.reason === 'api_key_verified'
    }

    // 没有启用模型时总是触发
    return true
  }

  const tryTriggerDialog = (options: ModelSelectionTriggerOptions) => {
    if (shouldTriggerDialog(options)) {
      openDialog(options)
      return true
    }
    return false
  }

  // 事件监听
  const setupEventListeners = () => {
    // 监听主进程的显示/隐藏请求
    window.electron.ipcRenderer.on(MODEL_SELECTOR_EVENTS.SHOW_REQUEST, (_event, data: any) => {
      if (data.providerId && data.reason) {
        openDialog(data as ModelSelectionTriggerOptions)
      }
    })

    window.electron.ipcRenderer.on(MODEL_SELECTOR_EVENTS.HIDE_REQUEST, () => {
      closeDialog()
    })
  }

  const teardownEventListeners = () => {
    window.electron.ipcRenderer.removeAllListeners(MODEL_SELECTOR_EVENTS.SHOW_REQUEST)
    window.electron.ipcRenderer.removeAllListeners(MODEL_SELECTOR_EVENTS.HIDE_REQUEST)
  }

  // 生命周期
  onMounted(() => {
    setupEventListeners()
  })

  onUnmounted(() => {
    teardownEventListeners()
  })

  return {
    // 状态
    isDialogOpen,
    currentOptions,
    selectedModels,
    isProcessing,

    // 计算属性
    availableModels,
    hasEnabledModels,
    dialogTitle,
    dialogDescription,

    // 方法
    openDialog,
    closeDialog,
    confirmSelection,
    shouldTriggerDialog,
    tryTriggerDialog
  }
})
