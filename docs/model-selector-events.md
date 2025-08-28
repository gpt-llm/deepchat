# 模型选择对话框事件系统设计

## 概述

基于DeepChat现有的事件架构，设计了完整的模型选择对话框事件系统。该系统遵循现有的事件命名规范（`领域:动作`），支持Tab级别的精确路由，并与现有的Dialog系统保持一致的设计模式。

## 事件常量定义

### 主进程事件 (`src/main/events.ts`)

```typescript
export const MODEL_SELECTOR_EVENTS = {
  SHOW_REQUEST: 'model-selector:show-request', // Main -> Renderer: Request to show model selector
  HIDE_REQUEST: 'model-selector:hide-request', // Main -> Renderer: Request to hide model selector
  SELECTION_CHANGED: 'model-selector:selection-changed', // Renderer -> Main: Model selection changed
  CONFIRMED: 'model-selector:confirmed', // Renderer -> Main: Selection confirmed
  CANCELLED: 'model-selector:cancelled', // Renderer -> Main: Selection cancelled
  PROVIDER_FILTER_CHANGED: 'model-selector:provider-filter-changed', // Renderer -> Main: Provider filter changed
  SEARCH_QUERY_CHANGED: 'model-selector:search-query-changed', // Renderer -> Main: Search query changed
  FAVORITE_TOGGLED: 'model-selector:favorite-toggled' // Renderer -> Main: Model favorite status toggled
}
```

### 渲染进程事件 (`src/renderer/src/events.ts`)

```typescript
export const MODEL_SELECTOR_EVENTS = {
  SHOW_REQUEST: 'model-selector:show-request', // 主进程 -> 渲染进程，请求显示模型选择器
  HIDE_REQUEST: 'model-selector:hide-request', // 主进程 -> 渲染进程，请求隐藏模型选择器
  SELECTION_CHANGED: 'model-selector:selection-changed', // 渲染进程 -> 主进程，模型选择变更
  CONFIRMED: 'model-selector:confirmed', // 渲染进程 -> 主进程，确认选择
  CANCELLED: 'model-selector:cancelled', // 渲染进程 -> 主进程，取消选择
  PROVIDER_FILTER_CHANGED: 'model-selector:provider-filter-changed', // 渲染进程 -> 主进程，提供者筛选变更
  SEARCH_QUERY_CHANGED: 'model-selector:search-query-changed', // 渲染进程 -> 主进程，搜索查询变更
  FAVORITE_TOGGLED: 'model-selector:favorite-toggled' // 渲染进程 -> 主进程，收藏状态切换
}
```

## 类型定义

### 核心类型

```typescript
export interface ModelInfo {
  id: string
  name: string
  providerId: string
  providerName: string
  modelType: ModelType
  description?: string
  contextWindow?: number
  pricing?: {
    input?: number
    output?: number
    currency?: string
  }
  capabilities?: {
    vision?: boolean
    functionCalling?: boolean
    streaming?: boolean
  }
  isFavorite?: boolean
  isOnline?: boolean
  tags?: string[]
}

export interface ProviderInfo {
  id: string
  name: string
  icon?: string
  isEnabled: boolean
  modelCount: number
  type: 'cloud' | 'local' | 'custom'
}
```

### 事件参数类型

```typescript
export interface ModelSelectorShowRequest {
  id: string
  title?: string
  description?: string
  currentModelId?: string
  enabledProviders?: string[]
  showFavoriteFilter?: boolean
  showProviderFilter?: boolean
  showSearch?: boolean
  maxSelections?: number // For future multi-select support
  tabId?: number // Optional tab context
  windowId?: number // Optional window context
}

export interface ModelSelectorSelectionChanged {
  id: string
  selectedModelId: string
  modelInfo: ModelInfo
  tabId?: number
}

export interface ModelSelectorConfirmed {
  id: string
  selectedModelId: string
  modelInfo: ModelInfo
  tabId?: number
}

// ... 其他事件参数类型
```

## 事件流程图

```
┌─────────────────┐    SHOW_REQUEST     ┌─────────────────┐
│   Main Process  │ ──────────────────► │ Renderer Process│
│                 │                     │                 │
│ ModelSelector   │                     │ ModelSelector   │
│ Presenter       │                     │ Store/Component │
│                 │                     │                 │
│                 │ ◄─────────────────  │                 │
│                 │   SELECTION_CHANGED │                 │
│                 │                     │                 │
│                 │ ◄─────────────────  │                 │
│                 │   CONFIRMED         │                 │
│                 │                     │                 │
│                 │ ◄─────────────────  │                 │
│                 │   CANCELLED         │                 │
└─────────────────┘                     └─────────────────┘

详细事件流程：

1. 显示模型选择器
   Main Process: showModelSelector() 
   ├── 生成唯一ID
   ├── 构建 ModelSelectorShowRequest
   └── eventBus.sendToTab(tabId, 'model-selector:show-request', request)

2. 用户交互
   Renderer Process: 用户操作
   ├── 选择变更: emit('model-selector:selection-changed')
   ├── 搜索筛选: emit('model-selector:search-query-changed')
   ├── 提供者筛选: emit('model-selector:provider-filter-changed')
   ├── 收藏切换: emit('model-selector:favorite-toggled')
   ├── 确认选择: emit('model-selector:confirmed')
   └── 取消选择: emit('model-selector:cancelled')

3. 响应处理
   Main Process: 监听响应事件
   ├── 解析事件参数
   ├── 调用相应的 handler 方法
   ├── 执行业务逻辑
   └── 返回 Promise 结果
```

## IPC通信实现

### 1. EventBus 路由策略

根据现有的EventBus架构，采用精确路由策略：

```typescript
// ✅ 推荐：精确Tab路由
eventBus.sendToTab(tabId, 'model-selector:show-request', request)

// ✅ 适用场景：当前活跃Tab
eventBus.sendToActiveTab(windowId, 'model-selector:show-request', request)

// ❌ 避免：不必要的广播
// eventBus.sendToRenderer('model-selector:show-request', SendTarget.ALL_WINDOWS, request)
```

### 2. 主进程 Presenter 实现

```typescript
export class ModelSelectorPresenter implements IModelSelectorPresenter {
  private pendingRequests = new Map<string, {
    resolve: (model: ModelInfo | null) => void
    reject: (error: Error) => void
    tabId?: number
  }>()

  async showModelSelector(request: Omit<ModelSelectorShowRequest, 'id'>): Promise<ModelInfo | null> {
    return new Promise((resolve, reject) => {
      const finalRequest: ModelSelectorShowRequest = {
        ...request,
        id: nanoid(8)
      }
      
      this.pendingRequests.set(finalRequest.id, { resolve, reject, tabId: request.tabId })
      
      try {
        if (request.tabId) {
          // 精确Tab路由
          eventBus.sendToTab(request.tabId, MODEL_SELECTOR_EVENTS.SHOW_REQUEST, finalRequest)
        } else if (request.windowId) {
          // 当前活跃Tab
          eventBus.sendToActiveTab(request.windowId, MODEL_SELECTOR_EVENTS.SHOW_REQUEST, finalRequest)
        } else {
          // 默认Tab
          eventBus.sendToRenderer(MODEL_SELECTOR_EVENTS.SHOW_REQUEST, SendTarget.DEFAULT_TAB, finalRequest)
        }
      } catch (error) {
        this.pendingRequests.delete(finalRequest.id)
        reject(error)
      }
    })
  }

  async handleConfirmed(event: ModelSelectorConfirmed): Promise<void> {
    const pending = this.pendingRequests.get(event.id)
    if (pending) {
      this.pendingRequests.delete(event.id)
      pending.resolve(event.modelInfo)
    }
  }

  async handleCancelled(event: ModelSelectorCancelled): Promise<void> {
    const pending = this.pendingRequests.get(event.id)
    if (pending) {
      this.pendingRequests.delete(event.id)
      pending.resolve(null)
    }
  }
}
```

### 3. 渲染进程 Store 实现

```typescript
export const useModelSelectorStore = defineStore('modelSelector', () => {
  const modelSelectorP = usePresenter('modelSelectorPresenter')
  const showRequest = ref<ModelSelectorShowRequest | null>(null)
  const isVisible = ref(false)
  
  // 监听显示请求
  const setupEventListeners = () => {
    window.electron.ipcRenderer.on(MODEL_SELECTOR_EVENTS.SHOW_REQUEST, (_, request: ModelSelectorShowRequest) => {
      showRequest.value = request
      isVisible.value = true
    })
    
    window.electron.ipcRenderer.on(MODEL_SELECTOR_EVENTS.HIDE_REQUEST, () => {
      isVisible.value = false
      showRequest.value = null
    })
  }
  
  // 处理选择变更
  const handleSelectionChanged = async (modelInfo: ModelInfo) => {
    if (!showRequest.value) return
    
    await modelSelectorP.handleSelectionChanged({
      id: showRequest.value.id,
      selectedModelId: modelInfo.id,
      modelInfo,
      tabId: showRequest.value.tabId
    })
  }
  
  // 处理确认选择
  const handleConfirm = async (modelInfo: ModelInfo) => {
    if (!showRequest.value) return
    
    try {
      await modelSelectorP.handleConfirmed({
        id: showRequest.value.id,
        selectedModelId: modelInfo.id,
        modelInfo,
        tabId: showRequest.value.tabId
      })
    } finally {
      isVisible.value = false
      showRequest.value = null
    }
  }
  
  // 处理取消选择
  const handleCancel = async () => {
    if (!showRequest.value) return
    
    try {
      await modelSelectorP.handleCancelled({
        id: showRequest.value.id,
        tabId: showRequest.value.tabId
      })
    } finally {
      isVisible.value = false
      showRequest.value = null
    }
  }
  
  onMounted(setupEventListeners)
  onUnmounted(() => {
    window.electron.ipcRenderer.removeAllListeners(MODEL_SELECTOR_EVENTS.SHOW_REQUEST)
    window.electron.ipcRenderer.removeAllListeners(MODEL_SELECTOR_EVENTS.HIDE_REQUEST)
  })
  
  return {
    showRequest,
    isVisible,
    handleSelectionChanged,
    handleConfirm,
    handleCancel
  }
})
```

## 使用示例

### 1. 从设置页面调用

```typescript
// 主进程
const modelSelectorPresenter = new ModelSelectorPresenter()

// 从设置页面Tab调用
async function showModelSelectorFromSettings(tabId: number, currentModelId?: string) {
  try {
    const selectedModel = await modelSelectorPresenter.showModelSelector({
      title: 'Select AI Model',
      description: 'Choose an AI model for your conversation',
      currentModelId,
      showFavoriteFilter: true,
      showProviderFilter: true,
      showSearch: true,
      tabId
    })
    
    if (selectedModel) {
      console.log('User selected model:', selectedModel)
      // 更新配置
      await configPresenter.setModel(selectedModel.id)
    } else {
      console.log('User cancelled model selection')
    }
  } catch (error) {
    console.error('Error showing model selector:', error)
  }
}
```

### 2. 从快捷键调用

```typescript
// 快捷键处理 - 影响当前活跃Tab
async function handleModelSelectorShortcut(windowId: number) {
  const selectedModel = await modelSelectorPresenter.showModelSelector({
    title: 'Quick Model Switch',
    currentModelId: getCurrentModelId(),
    showFavoriteFilter: true,
    windowId // 使用windowId，会发送到当前活跃的Tab
  })
  
  if (selectedModel) {
    // 通知活跃Tab更新模型
    eventBus.sendToActiveTab(windowId, 'config:model-changed', selectedModel)
  }
}
```

### 3. 从对话界面调用

```typescript
// 对话界面组件
export default defineComponent({
  setup() {
    const modelSelectorStore = useModelSelectorStore()
    const currentModel = ref<ModelInfo | null>(null)
    
    const showModelSelector = async () => {
      const webContentsId = window.electron.getWebContentsId()
      const tabId = await getTabIdFromWebContents(webContentsId)
      
      // 通过IPC调用主进程
      const selectedModel = await window.electron.invoke('presenter:call', 
        'modelSelectorPresenter', 
        'showModelSelector', 
        {
          title: 'Choose Model',
          currentModelId: currentModel.value?.id,
          showFavoriteFilter: true,
          showProviderFilter: true,
          showSearch: true,
          tabId
        }
      )
      
      if (selectedModel) {
        currentModel.value = selectedModel
        // 更新当前会话的模型
        await updateConversationModel(selectedModel.id)
      }
    }
    
    return {
      showModelSelector,
      currentModel,
      isModelSelectorVisible: modelSelectorStore.isVisible
    }
  }
})
```

## 与现有Dialog系统的集成

### 1. 共享组件基础

```typescript
// 扩展现有的Dialog基础组件
interface BaseDialogProps {
  id: string
  title?: string
  description?: string
  isVisible: boolean
}

// ModelSelector继承Dialog基础样式和行为
interface ModelSelectorProps extends BaseDialogProps {
  currentModelId?: string
  enabledProviders?: string[]
  showFavoriteFilter?: boolean
  showProviderFilter?: boolean
  showSearch?: boolean
}
```

### 2. 统一的Dialog管理器

```typescript
export const useDialogManager = defineStore('dialogManager', () => {
  const activeDialogs = ref<Set<string>>(new Set())
  
  const registerDialog = (id: string, type: 'message' | 'modelSelector') => {
    activeDialogs.value.add(id)
  }
  
  const unregisterDialog = (id: string) => {
    activeDialogs.value.delete(id)
  }
  
  const hasActiveDialog = computed(() => activeDialogs.value.size > 0)
  
  return {
    registerDialog,
    unregisterDialog,
    hasActiveDialog
  }
})
```

### 3. 键盘事件处理统一

```typescript
// 统一的ESC键处理
const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    // 优先关闭模型选择器
    if (modelSelectorStore.isVisible) {
      modelSelectorStore.handleCancel()
      return
    }
    
    // 其次关闭消息对话框
    if (dialogStore.showDialog) {
      dialogStore.handleResponse({ id: dialogStore.dialogRequest?.id || '', button: 'cancel' })
      return
    }
  }
}
```

## 性能优化考虑

### 1. 事件去抖和节流

```typescript
// 搜索查询变更的去抖处理
const debouncedSearchQuery = debounce(async (query: string) => {
  if (!showRequest.value) return
  
  await modelSelectorP.handleSearchQueryChanged({
    id: showRequest.value.id,
    searchQuery: query,
    tabId: showRequest.value.tabId
  })
}, 300)
```

### 2. 模型数据缓存

```typescript
// 缓存模型列表，避免重复获取
const modelCache = new Map<string, ModelInfo[]>()

const getCachedModels = async (providerId?: string): Promise<ModelInfo[]> => {
  const cacheKey = providerId || 'all'
  
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!
  }
  
  const models = await fetchModelsFromProvider(providerId)
  modelCache.set(cacheKey, models)
  
  // 5分钟后清除缓存
  setTimeout(() => modelCache.delete(cacheKey), 5 * 60 * 1000)
  
  return models
}
```

### 3. 虚拟滚动支持

```typescript
// 对于大量模型的情况，使用虚拟滚动
interface VirtualScrollConfig {
  itemHeight: number
  visibleCount: number
  bufferCount: number
}

const useVirtualScroll = (items: ModelInfo[], config: VirtualScrollConfig) => {
  const scrollTop = ref(0)
  const containerHeight = config.itemHeight * config.visibleCount
  
  const visibleItems = computed(() => {
    const start = Math.floor(scrollTop.value / config.itemHeight)
    const end = Math.min(start + config.visibleCount + config.bufferCount, items.length)
    
    return items.slice(Math.max(0, start - config.bufferCount), end)
  })
  
  return {
    visibleItems,
    containerHeight,
    scrollTop
  }
}
```

## 错误处理和调试

### 1. 错误处理策略

```typescript
// 统一的错误处理
const handleModelSelectorError = (error: Error, context: string) => {
  console.error(`[ModelSelector] ${context}:`, error)
  
  // 向主进程报告错误
  eventBus.sendToMain('model-selector:error', {
    error: error.message,
    context,
    timestamp: Date.now()
  })
  
  // 显示用户友好的错误信息
  if (error.message.includes('network')) {
    // 网络错误
    showErrorNotification('Network error while loading models. Please check your connection.')
  } else {
    // 通用错误
    showErrorNotification('An error occurred while loading models. Please try again.')
  }
}
```

### 2. 调试支持

```typescript
// 开发环境下的调试日志
if (import.meta.env.DEV) {
  const originalSendToTab = eventBus.sendToTab
  eventBus.sendToTab = (tabId: number, eventName: string, ...args: unknown[]) => {
    if (eventName.startsWith('model-selector:')) {
      console.log(`[ModelSelector Debug] Sending ${eventName} to Tab:${tabId}`, args)
    }
    return originalSendToTab.call(eventBus, tabId, eventName, ...args)
  }
}
```

## 总结

这个模型选择对话框事件系统设计：

1. **完全符合现有架构**：遵循`领域:动作`的事件命名规范
2. **支持精确路由**：充分利用EventBus的Tab级精确路由能力
3. **类型安全**：完整的TypeScript类型定义
4. **可扩展性**：预留了多选、自定义筛选等扩展能力
5. **性能优化**：包含缓存、去抖、虚拟滚动等优化策略
6. **错误处理**：完善的错误处理和调试支持
7. **与现有系统集成**：与Dialog系统共享基础设施

该设计可以直接在现有的DeepChat架构上实施，无需大规模重构。