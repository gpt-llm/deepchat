# 模型选择对话框事件系统 - 实现总结

## 概述

基于DeepChat现有的事件系统架构，为模型选择对话框设计了完整的事件通信系统。该设计完全遵循现有的架构模式，支持Tab级别的精确路由，并与现有Dialog系统保持一致性。

## 已完成的核心组件

### 1. 事件常量定义 ✅

**位置**: `/home/zerob13/workspace/deepchat/src/main/events.ts` 和 `/home/zerob13/workspace/deepchat/src/renderer/src/events.ts`

```typescript
export const MODEL_SELECTOR_EVENTS = {
  SHOW_REQUEST: 'model-selector:show-request',
  HIDE_REQUEST: 'model-selector:hide-request', 
  SELECTION_CHANGED: 'model-selector:selection-changed',
  CONFIRMED: 'model-selector:confirmed',
  CANCELLED: 'model-selector:cancelled',
  PROVIDER_FILTER_CHANGED: 'model-selector:provider-filter-changed',
  SEARCH_QUERY_CHANGED: 'model-selector:search-query-changed',
  FAVORITE_TOGGLED: 'model-selector:favorite-toggled'
}
```

**特点**:
- 遵循 `领域:动作` 命名规范
- 支持双向通信（Main ↔ Renderer）
- 涵盖完整的交互流程

### 2. 类型系统定义 ✅

**位置**: `/home/zerob13/workspace/deepchat/src/shared/presenter.d.ts`

```typescript
// 核心数据类型
export interface ModelInfo {
  id: string
  name: string
  providerId: string
  providerName: string
  modelType: ModelType
  description?: string
  contextWindow?: number
  pricing?: { input?: number; output?: number; currency?: string }
  capabilities?: { vision?: boolean; functionCalling?: boolean; streaming?: boolean }
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

// 事件参数类型
export interface ModelSelectorShowRequest {
  id: string
  title?: string
  description?: string
  currentModelId?: string
  enabledProviders?: string[]
  showFavoriteFilter?: boolean
  showProviderFilter?: boolean
  showSearch?: boolean
  maxSelections?: number
  tabId?: number
  windowId?: number
}

// Presenter接口
export interface IModelSelectorPresenter {
  showModelSelector(request: Omit<ModelSelectorShowRequest, 'id'>): Promise<ModelInfo | null>
  hideModelSelector(): Promise<void>
  // ... 其他方法
}
```

**特点**:
- 完整的TypeScript类型安全
- 支持Tab上下文传递
- 预留扩展字段

### 3. 完整文档和示例 ✅

**文档位置**:
- `/home/zerob13/workspace/deepchat/docs/model-selector-events.md` - 完整设计文档
- `/home/zerob13/workspace/deepchat/docs/model-selector-usage-examples.ts` - 使用示例代码

## 事件流程架构

```
┌─────────────────┐                     ┌─────────────────┐
│   Main Process  │                     │ Renderer Process│
│                 │  SHOW_REQUEST       │                 │
│ ModelSelector   │ ──────────────────► │ ModelSelector   │
│ Presenter       │                     │ Store/Component │
│                 │                     │                 │
│                 │ ◄──────────────────  │                 │
│                 │ SELECTION_CHANGED   │                 │
│                 │ CONFIRMED           │                 │
│                 │ CANCELLED           │                 │
│                 │ PROVIDER_FILTER_*   │                 │
│                 │ SEARCH_QUERY_*      │                 │
│                 │ FAVORITE_TOGGLED    │                 │
└─────────────────┘                     └─────────────────┘

详细事件流程：

1. 主进程调用 showModelSelector()
   ├── 生成唯一ID
   ├── 构建 ModelSelectorShowRequest
   └── eventBus.sendToTab(tabId, 'model-selector:show-request', request)

2. 渲染进程接收事件并显示UI
   ├── 监听 'model-selector:show-request'
   ├── 更新Store状态
   ├── 显示模型选择器界面
   └── 加载可用模型列表

3. 用户交互触发事件
   ├── 选择模型: emit('model-selector:selection-changed')
   ├── 搜索筛选: emit('model-selector:search-query-changed')
   ├── 提供者筛选: emit('model-selector:provider-filter-changed') 
   ├── 收藏切换: emit('model-selector:favorite-toggled')
   ├── 确认选择: emit('model-selector:confirmed')
   └── 取消选择: emit('model-selector:cancelled')

4. 主进程处理响应
   ├── 监听响应事件
   ├── 调用对应handler方法
   ├── 执行业务逻辑
   └── 解析Promise（resolve/reject）
```

## IPC 通信策略

### 精确路由优先

```typescript
// ✅ 推荐：精确Tab路由
eventBus.sendToTab(tabId, 'model-selector:show-request', request)

// ✅ 当前活跃Tab
eventBus.sendToActiveTab(windowId, 'model-selector:show-request', request)

// ✅ 默认Tab（兜底方案）
eventBus.sendToRenderer('model-selector:show-request', SendTarget.DEFAULT_TAB, request)

// ❌ 避免：不必要的广播
// eventBus.sendToRenderer('model-selector:show-request', SendTarget.ALL_WINDOWS, request)
```

### 路由决策流程

```
需要显示模型选择器时：
├── 有明确的tabId？ ────────────→ sendToTab(tabId, ...)
├── 有明确的windowId？ ───────→ sendToActiveTab(windowId, ...)
├── 从快捷键触发？ ──────────→ sendToActiveTab(currentWindowId, ...)
├── 从设置页面触发？ ────────→ sendToTab(settingsTabId, ...)  
└── 其他情况 ──────────────→ sendToRenderer(..., DEFAULT_TAB, ...)
```

## 与现有系统集成

### 1. Dialog系统集成

```typescript
// 共享Dialog基础设施
interface BaseDialogProps {
  id: string
  title?: string
  description?: string
  isVisible: boolean
}

// ModelSelector扩展Dialog基础
interface ModelSelectorProps extends BaseDialogProps {
  currentModelId?: string
  enabledProviders?: string[]
  showFavoriteFilter?: boolean
  showProviderFilter?: boolean
  showSearch?: boolean
}

// 统一的Dialog管理器
export const useDialogManager = defineStore('dialogManager', () => {
  const activeDialogs = ref<Set<string>>(new Set())
  
  const registerDialog = (id: string, type: 'message' | 'modelSelector') => {
    activeDialogs.value.add(id)
  }
  
  const hasActiveDialog = computed(() => activeDialogs.value.size > 0)
  
  return { registerDialog, unregisterDialog, hasActiveDialog }
})
```

### 2. 键盘事件处理

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
      dialogStore.handleResponse({ 
        id: dialogStore.dialogRequest?.id || '', 
        button: 'cancel' 
      })
    }
  }
}
```

## 核心使用场景

### 1. 从设置页面调用

```typescript
async function showModelSelectorFromSettings(tabId: number, currentModelId?: string) {
  const selectedModel = await modelSelectorPresenter.showModelSelector({
    title: 'Select AI Model',
    description: 'Choose an AI model for your conversations',
    currentModelId,
    showFavoriteFilter: true,
    showProviderFilter: true,
    showSearch: true,
    tabId // 精确Tab路由
  })
  
  if (selectedModel) {
    await configPresenter.updateSetting('defaultModel', selectedModel.id)
    // 通知所有Tab配置已变更
    eventBus.send('config:model-changed', SendTarget.ALL_WINDOWS, selectedModel)
  }
}
```

### 2. 从快捷键调用

```typescript
async function handleQuickModelSwitch(windowId: number) {
  const selectedModel = await modelSelectorPresenter.showModelSelector({
    title: 'Quick Model Switch',
    showFavoriteFilter: true, // 只显示收藏，便于快速切换
    windowId // 当前活跃Tab路由
  })
  
  if (selectedModel) {
    eventBus.sendToActiveTab(windowId, 'config:model-changed', selectedModel)
  }
}
```

### 3. 从对话界面调用

```typescript
const ChatModelSelectorComponent = defineComponent({
  setup() {
    const showModelSelector = async () => {
      const tabId = await getCurrentTabId()
      
      const selectedModel = await window.electron.invoke(
        'presenter:call',
        'modelSelectorPresenter', 
        'showModelSelector',
        {
          title: 'Choose Model for This Conversation',
          currentModelId: currentModel.value?.id,
          tabId
        }
      )
      
      if (selectedModel) {
        await updateConversationModel(conversationId, selectedModel.id)
        addSystemMessage(`Switched to ${selectedModel.name}`)
      }
    }
    
    return { showModelSelector }
  }
})
```

## 性能优化策略

### 1. 事件去抖

```typescript
// 搜索查询去抖处理
const debouncedSearchQuery = debounce(async (query: string) => {
  await modelSelectorP.handleSearchQueryChanged({
    id: showRequest.value.id,
    searchQuery: query,
    tabId: showRequest.value.tabId
  })
}, 300)
```

### 2. 数据缓存

```typescript
// 模型列表缓存
const modelCache = new Map<string, ModelInfo[]>()

const getCachedModels = async (providerId?: string): Promise<ModelInfo[]> => {
  const cacheKey = providerId || 'all'
  
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!
  }
  
  const models = await fetchModelsFromProvider(providerId)
  modelCache.set(cacheKey, models)
  
  // 5分钟缓存过期
  setTimeout(() => modelCache.delete(cacheKey), 5 * 60 * 1000)
  
  return models
}
```

### 3. 虚拟滚动支持

```typescript
// 大量模型时使用虚拟滚动
const useVirtualScroll = (items: ModelInfo[], config: VirtualScrollConfig) => {
  const scrollTop = ref(0)
  const containerHeight = config.itemHeight * config.visibleCount
  
  const visibleItems = computed(() => {
    const start = Math.floor(scrollTop.value / config.itemHeight)
    const end = Math.min(start + config.visibleCount + config.bufferCount, items.length)
    return items.slice(Math.max(0, start - config.bufferCount), end)
  })
  
  return { visibleItems, containerHeight, scrollTop }
}
```

## 错误处理和调试

### 1. 统一错误处理

```typescript
const handleModelSelectorError = (error: Error, context: string) => {
  console.error(`[ModelSelector] ${context}:`, error)
  
  // 向主进程报告错误
  eventBus.sendToMain('model-selector:error', {
    error: error.message,
    context,
    timestamp: Date.now()
  })
  
  // 显示用户友好错误信息
  if (error.message.includes('network')) {
    showErrorNotification('Network error while loading models. Please check your connection.')
  } else {
    showErrorNotification('An error occurred while loading models. Please try again.')
  }
}
```

### 2. 开发调试支持

```typescript
// 开发环境调试日志
if (import.meta.env.DEV) {
  const originalSendToTab = eventBus.sendToTab
  eventBus.sendToTab = (tabId: number, eventName: string, ...args: unknown[]) => {
    if (eventName.startsWith('model-selector:')) {
      console.log(`[ModelSelector Debug] Sending ${eventName} to Tab:${tabId}`, args)
    }
    return originalSendToTab.call(eventBus, tabId, eventName, ...args)
  }
}

// 启用IPC调试日志
// VITE_LOG_IPC_CALL=1 pnpm run dev
```

## 扩展能力

### 1. 多选支持（预留）

```typescript
interface ModelSelectorShowRequest {
  // ...现有字段
  maxSelections?: number // 支持多选
  minSelections?: number // 最小选择数量
}

interface ModelSelectorConfirmed {
  // ...现有字段
  selectedModelIds: string[] // 支持多个模型ID
  modelInfos: ModelInfo[] // 支持多个模型信息
}
```

### 2. 自定义筛选器

```typescript
interface CustomFilter {
  id: string
  label: string
  type: 'boolean' | 'select' | 'range'
  options?: { label: string; value: any }[]
  min?: number
  max?: number
}

interface ModelSelectorShowRequest {
  // ...现有字段  
  customFilters?: CustomFilter[]
}
```

### 3. 模型比较功能

```typescript
interface ModelComparison {
  models: ModelInfo[]
  compareFields: ('pricing' | 'contextWindow' | 'capabilities')[]
}

export const MODEL_SELECTOR_EVENTS = {
  // ...现有事件
  COMPARE_MODELS: 'model-selector:compare-models',
  COMPARISON_RESULT: 'model-selector:comparison-result'
}
```

## 实施建议

### Phase 1: 基础实现
1. ✅ 实现事件常量和类型定义
2. ⏳ 创建 ModelSelectorPresenter 基础类
3. ⏳ 实现渲染进程 Store 和基础UI
4. ⏳ 集成现有Dialog系统

### Phase 2: 高级功能
1. ⏳ 实现搜索和筛选功能
2. ⏳ 添加收藏模型功能
3. ⏳ 实现性能优化（缓存、虚拟滚动）
4. ⏳ 添加键盘快捷键支持

### Phase 3: 扩展功能
1. ⏳ 多选模型支持
2. ⏳ 模型比较功能
3. ⏳ 自定义筛选器
4. ⏳ 高级主题和样式定制

## 优势总结

1. **架构一致性**: 完全遵循DeepChat现有的事件系统架构
2. **类型安全**: 完整的TypeScript类型定义和检查
3. **精确路由**: 充分利用EventBus的Tab级精确路由能力
4. **可扩展性**: 预留了多选、自定义筛选等高级功能
5. **性能优化**: 内置缓存、去抖、虚拟滚动等优化策略
6. **错误处理**: 完善的错误处理和调试支持
7. **向后兼容**: 与现有Dialog系统完全兼容

## 结论

这个模型选择对话框事件系统设计为DeepChat提供了一个强大、灵活、可扩展的模型选择解决方案。它不仅满足了当前的需求，还为future的功能扩展预留了充分的空间。整个设计完全基于现有架构，可以无缝集成到当前系统中，无需大规模重构。