/**
 * 模型选择对话框使用示例
 * 
 * 这个文件展示了如何在DeepChat中使用新设计的模型选择对话框事件系统
 * 
 * @example
 * // 基本用法
 * const selectedModel = await modelSelectorPresenter.showModelSelector({
 *   title: 'Choose AI Model',
 *   currentModelId: 'gpt-4o',
 *   tabId: 123
 * })
 */

import { MODEL_SELECTOR_EVENTS } from '@/events'
import { eventBus, SendTarget } from '@/eventbus'
import { 
  ModelInfo, 
  ModelSelectorShowRequest, 
  IModelSelectorPresenter 
} from '@shared/presenter'

// ===== 主进程实现示例 =====

/**
 * 模型选择器Presenter实现示例
 */
export class ModelSelectorPresenter implements IModelSelectorPresenter {
  private pendingRequests = new Map<string, {
    resolve: (model: ModelInfo | null) => void
    reject: (error: Error) => void
    tabId?: number
  }>()

  /**
   * 显示模型选择器 - 核心方法
   */
  async showModelSelector(request: Omit<ModelSelectorShowRequest, 'id'>): Promise<ModelInfo | null> {
    return new Promise((resolve, reject) => {
      const finalRequest: ModelSelectorShowRequest = {
        ...request,
        id: `model-selector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      
      // 存储Promise处理器
      this.pendingRequests.set(finalRequest.id, { 
        resolve, 
        reject, 
        tabId: request.tabId 
      })
      
      try {
        // 根据上下文选择合适的路由方式
        if (request.tabId) {
          // ✅ 推荐：精确Tab路由
          eventBus.sendToTab(request.tabId, MODEL_SELECTOR_EVENTS.SHOW_REQUEST, finalRequest)
        } else if (request.windowId) {
          // ✅ 当前活跃Tab路由
          eventBus.sendToActiveTab(request.windowId, MODEL_SELECTOR_EVENTS.SHOW_REQUEST, finalRequest)
        } else {
          // ✅ 默认Tab路由
          eventBus.sendToRenderer(MODEL_SELECTOR_EVENTS.SHOW_REQUEST, SendTarget.DEFAULT_TAB, finalRequest)
        }
      } catch (error) {
        // 清理状态
        this.pendingRequests.delete(finalRequest.id)
        reject(error)
      }
    })
  }

  /**
   * 处理确认选择事件
   */
  async handleConfirmed(event: ModelSelectorConfirmed): Promise<void> {
    const pending = this.pendingRequests.get(event.id)
    if (pending) {
      this.pendingRequests.delete(event.id)
      pending.resolve(event.modelInfo)
    }
  }

  /**
   * 处理取消选择事件
   */
  async handleCancelled(event: ModelSelectorCancelled): Promise<void> {
    const pending = this.pendingRequests.get(event.id)
    if (pending) {
      this.pendingRequests.delete(event.id)
      pending.resolve(null)
    }
  }

  // ... 其他方法实现
}

// ===== 渲染进程实现示例 =====

/**
 * 模型选择器Store实现示例
 */
export const useModelSelectorStore = defineStore('modelSelector', () => {
  const modelSelectorP = usePresenter('modelSelectorPresenter')
  const showRequest = ref<ModelSelectorShowRequest | null>(null)
  const isVisible = ref(false)
  const selectedModel = ref<ModelInfo | null>(null)
  const availableModels = ref<ModelInfo[]>([])
  const filteredModels = ref<ModelInfo[]>([])
  
  // 搜索和筛选状态
  const searchQuery = ref('')
  const selectedProviders = ref<string[]>([])
  const showFavoritesOnly = ref(false)
  
  /**
   * 设置事件监听器
   */
  const setupEventListeners = () => {
    // 监听显示请求
    window.electron.ipcRenderer.on(
      MODEL_SELECTOR_EVENTS.SHOW_REQUEST, 
      async (_, request: ModelSelectorShowRequest) => {
        console.log('[ModelSelector] Received show request:', request)
        showRequest.value = request
        
        // 加载可用模型
        await loadAvailableModels()
        
        // 设置当前选中的模型
        if (request.currentModelId) {
          selectedModel.value = availableModels.value.find(m => m.id === request.currentModelId) || null
        }
        
        isVisible.value = true
      }
    )
    
    // 监听隐藏请求
    window.electron.ipcRenderer.on(
      MODEL_SELECTOR_EVENTS.HIDE_REQUEST, 
      () => {
        console.log('[ModelSelector] Received hide request')
        hideSelector()
      }
    )
  }
  
  /**
   * 加载可用模型
   */
  const loadAvailableModels = async () => {
    try {
      availableModels.value = await modelSelectorP.getAvailableModels()
      applyFilters()
    } catch (error) {
      console.error('[ModelSelector] Failed to load models:', error)
    }
  }
  
  /**
   * 应用筛选条件
   */
  const applyFilters = () => {
    let filtered = availableModels.value
    
    // 搜索筛选
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(model => 
        model.name.toLowerCase().includes(query) ||
        model.providerName.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query)
      )
    }
    
    // 提供者筛选
    if (selectedProviders.value.length > 0) {
      filtered = filtered.filter(model => 
        selectedProviders.value.includes(model.providerId)
      )
    }
    
    // 收藏筛选
    if (showFavoritesOnly.value) {
      filtered = filtered.filter(model => model.isFavorite)
    }
    
    filteredModels.value = filtered
  }
  
  /**
   * 处理模型选择变更
   */
  const handleSelectionChanged = async (model: ModelInfo) => {
    if (!showRequest.value) return
    
    selectedModel.value = model
    
    // 通知主进程选择变更
    await modelSelectorP.handleSelectionChanged({
      id: showRequest.value.id,
      selectedModelId: model.id,
      modelInfo: model,
      tabId: showRequest.value.tabId
    })
  }
  
  /**
   * 确认选择
   */
  const confirmSelection = async () => {
    if (!showRequest.value || !selectedModel.value) return
    
    try {
      await modelSelectorP.handleConfirmed({
        id: showRequest.value.id,
        selectedModelId: selectedModel.value.id,
        modelInfo: selectedModel.value,
        tabId: showRequest.value.tabId
      })
    } finally {
      hideSelector()
    }
  }
  
  /**
   * 取消选择
   */
  const cancelSelection = async () => {
    if (!showRequest.value) return
    
    try {
      await modelSelectorP.handleCancelled({
        id: showRequest.value.id,
        tabId: showRequest.value.tabId
      })
    } finally {
      hideSelector()
    }
  }
  
  /**
   * 隐藏选择器
   */
  const hideSelector = () => {
    isVisible.value = false
    showRequest.value = null
    selectedModel.value = null
    searchQuery.value = ''
    selectedProviders.value = []
    showFavoritesOnly.value = false
  }
  
  /**
   * 切换收藏状态
   */
  const toggleFavorite = async (model: ModelInfo) => {
    if (!showRequest.value) return
    
    const newFavoriteStatus = !model.isFavorite
    
    // 更新本地状态
    model.isFavorite = newFavoriteStatus
    
    // 通知主进程
    await modelSelectorP.handleFavoriteToggled({
      id: showRequest.value.id,
      modelId: model.id,
      isFavorite: newFavoriteStatus,
      tabId: showRequest.value.tabId
    })
  }
  
  // 监听搜索查询变更
  watch(searchQuery, debounce(async (newQuery) => {
    applyFilters()
    
    if (showRequest.value) {
      await modelSelectorP.handleSearchQueryChanged({
        id: showRequest.value.id,
        searchQuery: newQuery,
        tabId: showRequest.value.tabId
      })
    }
  }, 300))
  
  // 监听提供者筛选变更
  watch(selectedProviders, async (newProviders) => {
    applyFilters()
    
    if (showRequest.value) {
      await modelSelectorP.handleProviderFilterChanged({
        id: showRequest.value.id,
        selectedProviderIds: newProviders,
        tabId: showRequest.value.tabId
      })
    }
  })
  
  // 监听收藏筛选变更
  watch(showFavoritesOnly, () => {
    applyFilters()
  })
  
  onMounted(setupEventListeners)
  onUnmounted(() => {
    window.electron.ipcRenderer.removeAllListeners(MODEL_SELECTOR_EVENTS.SHOW_REQUEST)
    window.electron.ipcRenderer.removeAllListeners(MODEL_SELECTOR_EVENTS.HIDE_REQUEST)
  })
  
  return {
    // 状态
    showRequest,
    isVisible,
    selectedModel,
    availableModels,
    filteredModels,
    searchQuery,
    selectedProviders,
    showFavoritesOnly,
    
    // 方法
    handleSelectionChanged,
    confirmSelection,
    cancelSelection,
    toggleFavorite,
    loadAvailableModels
  }
})

// ===== 使用示例 =====

/**
 * 示例1: 从设置页面调用模型选择器
 */
export async function showModelSelectorFromSettings(tabId: number, currentModelId?: string) {
  const modelSelectorPresenter = new ModelSelectorPresenter()
  
  try {
    const selectedModel = await modelSelectorPresenter.showModelSelector({
      title: 'Select AI Model',
      description: 'Choose an AI model for your conversations',
      currentModelId,
      showFavoriteFilter: true,
      showProviderFilter: true,
      showSearch: true,
      tabId
    })
    
    if (selectedModel) {
      console.log('User selected model:', selectedModel.name)
      
      // 更新配置
      await configPresenter.updateSetting('defaultModel', selectedModel.id)
      
      // 通知其他Tab模型已变更
      eventBus.send('config:model-changed', SendTarget.ALL_WINDOWS, {
        modelId: selectedModel.id,
        modelInfo: selectedModel
      })
      
      return selectedModel
    } else {
      console.log('User cancelled model selection')
      return null
    }
  } catch (error) {
    console.error('Error showing model selector:', error)
    throw error
  }
}

/**
 * 示例2: 从快捷键调用模型选择器
 */
export async function handleQuickModelSwitch(windowId: number) {
  const modelSelectorPresenter = new ModelSelectorPresenter()
  
  // 获取当前模型
  const currentModelId = await configPresenter.getSetting('defaultModel')
  
  const selectedModel = await modelSelectorPresenter.showModelSelector({
    title: 'Quick Model Switch',
    description: 'Switch to a different AI model',
    currentModelId,
    showFavoriteFilter: true, // 只显示收藏的模型，便于快速切换
    showProviderFilter: false,
    showSearch: true,
    windowId // 使用windowId，自动发送到当前活跃Tab
  })
  
  if (selectedModel && selectedModel.id !== currentModelId) {
    // 更新全局模型设置
    await configPresenter.updateSetting('defaultModel', selectedModel.id)
    
    // 通知当前活跃Tab模型已变更
    eventBus.sendToActiveTab(windowId, 'config:model-changed', {
      modelId: selectedModel.id,
      modelInfo: selectedModel
    })
    
    // 显示切换成功的通知
    eventBus.sendToActiveTab(windowId, 'notification:show-success', {
      title: 'Model Switched',
      message: `Switched to ${selectedModel.name}`,
      duration: 3000
    })
  }
}

/**
 * 示例3: 从对话界面调用模型选择器
 */
export const ChatModelSelectorComponent = defineComponent({
  name: 'ChatModelSelector',
  setup() {
    const modelSelectorStore = useModelSelectorStore()
    const currentConversation = useCurrentConversation()
    const currentModel = ref<ModelInfo | null>(null)
    
    // 显示模型选择器
    const showModelSelector = async () => {
      // 获取当前Tab的ID
      const webContentsId = window.electron.getWebContentsId()
      const tabId = await getTabIdFromWebContents(webContentsId)
      
      // 调用主进程显示模型选择器
      const selectedModel = await window.electron.invoke(
        'presenter:call',
        'modelSelectorPresenter',
        'showModelSelector',
        {
          title: 'Choose Model for This Conversation',
          description: 'Select the AI model to use in this conversation',
          currentModelId: currentModel.value?.id,
          showFavoriteFilter: true,
          showProviderFilter: true,
          showSearch: true,
          tabId
        }
      )
      
      if (selectedModel && selectedModel.id !== currentModel.value?.id) {
        // 更新当前会话的模型
        await updateConversationModel(currentConversation.value.id, selectedModel.id)
        
        currentModel.value = selectedModel
        
        // 在聊天界面显示模型切换消息
        addSystemMessage(`Switched to ${selectedModel.name}`)
      }
    }
    
    // 加载当前模型信息
    const loadCurrentModel = async () => {
      if (currentConversation.value?.modelId) {
        // 从配置中获取模型信息
        currentModel.value = await getModelInfo(currentConversation.value.modelId)
      }
    }
    
    onMounted(loadCurrentModel)
    
    return {
      currentModel,
      showModelSelector,
      isModelSelectorVisible: modelSelectorStore.isVisible
    }
  },
  
  template: `
    <div class="model-selector-trigger">
      <button 
        @click="showModelSelector"
        class="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
        :disabled="isModelSelectorVisible"
      >
        <Icon name="lucide:brain-circuit" class="w-4 h-4" />
        <span>{{ currentModel?.name || 'Select Model' }}</span>
        <Icon name="lucide:chevron-down" class="w-4 h-4" />
      </button>
    </div>
  `
})

/**
 * 示例4: 批量操作 - 为多个会话设置相同模型
 */
export async function setModelForMultipleConversations(
  conversationIds: string[], 
  tabId: number
) {
  const modelSelectorPresenter = new ModelSelectorPresenter()
  
  const selectedModel = await modelSelectorPresenter.showModelSelector({
    title: 'Select Model for Conversations',
    description: `Choose a model for ${conversationIds.length} selected conversations`,
    showFavoriteFilter: true,
    showProviderFilter: true,
    showSearch: true,
    tabId
  })
  
  if (selectedModel) {
    // 批量更新会话模型
    const updatePromises = conversationIds.map(id => 
      updateConversationModel(id, selectedModel.id)
    )
    
    await Promise.all(updatePromises)
    
    // 通知Tab刷新会话列表
    eventBus.sendToTab(tabId, 'conversation:list-updated', {
      updatedConversations: conversationIds,
      modelId: selectedModel.id
    })
    
    console.log(`Updated ${conversationIds.length} conversations to use ${selectedModel.name}`)
  }
}

/**
 * 工具函数：从WebContents ID获取Tab ID
 */
async function getTabIdFromWebContents(webContentsId: number): Promise<number> {
  return await window.electron.invoke('presenter:call', 'tabPresenter', 'getTabIdByWebContentsId', webContentsId)
}

/**
 * 工具函数：获取模型信息
 */
async function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  return await window.electron.invoke('presenter:call', 'configPresenter', 'getModelInfo', modelId)
}

/**
 * 工具函数：更新会话模型
 */
async function updateConversationModel(conversationId: string, modelId: string): Promise<void> {
  return await window.electron.invoke('presenter:call', 'conversationPresenter', 'updateConversationModel', conversationId, modelId)
}

/**
 * 工具函数：添加系统消息
 */
function addSystemMessage(content: string): void {
  // 实现添加系统消息的逻辑
  console.log(`[System] ${content}`)
}

/**
 * 工具函数：防抖处理
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}