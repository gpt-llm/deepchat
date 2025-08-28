# 模型检测系统使用指南

## 概述

模型检测系统用于智能判断用户是否有启用的AI模型，并在适当的时机提供引导建议。系统能够区分不同的场景，避免在自动刷新等临时状态时错误触发对话框。

## 主要组件

### 1. 后端组件

#### ModelDetectionService (`/src/main/presenter/configPresenter/modelDetectionService.ts`)
核心检测逻辑，提供静态方法进行模型状态检测。

#### ConfigPresenter 扩展
在 `ConfigPresenter` 中集成了模型检测方法，提供了统一的API接口。

### 2. 前端组件

#### SettingsStore 扩展
在 `useSettingsStore` 中添加了模型检测相关的状态管理和方法。

#### 类型定义
`/src/shared/modelDetection.d.ts` 定义了完整的类型接口。

## 使用方法

### 1. 在组件中使用

```typescript
<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { computed, onMounted } from 'vue'

const settingsStore = useSettingsStore()

// 获取模型检测状态
const hasModels = computed(() => settingsStore.hasEnabledModels)
const detectionResult = computed(() => settingsStore.modelDetectionResult)
const isDialogVisible = computed(() => settingsStore.isModelDetectionDialogVisible)

// 在组件挂载时触发检测
onMounted(async () => {
  await settingsStore.triggerModelDetection()
})

// 手动检测某个provider的模型状态
const checkProviderModels = async (providerId: string) => {
  const result = await settingsStore.detectProviderEnabledModels(providerId)
  console.log(`Provider ${providerId}:`, result)
}

// 获取整体模型状态
const checkOverallState = async () => {
  const result = await settingsStore.detectOverallModelState()
  if (result) {
    console.log('整体状态:', result.state)
    console.log('建议操作:', result.suggestedActions)
  }
}

// 显示/隐藏检测对话框
const showDialog = () => settingsStore.showModelDetectionDialog()
const hideDialog = () => settingsStore.hideModelDetectionDialog()
</script>

<template>
  <div>
    <!-- 模型状态指示器 -->
    <div v-if="!hasModels" class="warning">
      ⚠️ 没有启用的模型
    </div>
    
    <!-- 检测对话框 -->
    <div v-if="isDialogVisible && detectionResult" class="modal">
      <h3>{{ settingsStore.formatModelDetectionMessage(detectionResult).title }}</h3>
      <p>{{ settingsStore.formatModelDetectionMessage(detectionResult).message }}</p>
      <div class="actions">
        <button 
          v-for="action in settingsStore.formatModelDetectionMessage(detectionResult).actions"
          :key="action"
          @click="handleAction(action)"
        >
          {{ action }}
        </button>
      </div>
      <button @click="hideDialog">关闭</button>
    </div>
  </div>
</template>
```

### 2. 在Provider配置页面中使用

```typescript
// 在provider启用/禁用时触发检测
const toggleProvider = async (providerId: string, enabled: boolean) => {
  await settingsStore.updateProviderStatus(providerId, enabled)
  
  // 触发模型检测
  await settingsStore.triggerModelDetection()
}

// 在模型列表刷新后检测
const refreshModels = async (providerId: string) => {
  await settingsStore.refreshProviderModels(providerId)
  
  // 检测该provider的模型状态
  const result = await settingsStore.detectProviderEnabledModels(providerId)
  if (!result.hasEnabledModels) {
    console.log(`警告: Provider ${providerId} 没有启用的模型`)
  }
}
```

### 3. 在模型管理页面中使用

```typescript
// 批量启用/禁用模型后触发检测
const toggleAllModels = async (providerId: string, enabled: boolean) => {
  if (enabled) {
    await settingsStore.enableAllModels(providerId)
  } else {
    await settingsStore.disableAllModels(providerId)
  }
  
  // 检测整体状态
  await settingsStore.triggerModelDetection()
}

// 单个模型状态变更后检测
const toggleModel = async (providerId: string, modelId: string, enabled: boolean) => {
  await settingsStore.updateModelStatus(providerId, modelId, enabled)
  
  // 如果是最后一个模型被禁用，立即检测
  if (!enabled) {
    const result = await settingsStore.detectProviderEnabledModels(providerId)
    if (!result.hasEnabledModels) {
      await settingsStore.triggerModelDetection()
    }
  }
}
```

## 检测状态说明

### 1. NO_ENABLED_MODELS (没有启用的模型)
- **情况**: 用户没有启用任何AI提供商
- **触发**: 应该显示引导对话框
- **建议操作**: 启用至少一个AI提供商

### 2. EMPTY_MODEL_LIST (模型列表为空)
- **情况**: 有启用的提供商但没有加载到模型
- **触发**: 避免在自动刷新时显示，但持续空状态时提示
- **建议操作**: 检查API配置，等待模型加载

### 3. ALL_MODELS_DISABLED (所有模型被禁用)
- **情况**: 有可用模型但都被用户禁用了
- **触发**: 应该显示引导对话框
- **建议操作**: 启用至少一个模型

### 4. HAS_ENABLED_MODELS (有启用的模型)
- **情况**: 正常状态，有可用的模型
- **触发**: 不显示对话框
- **建议操作**: 无

## 集成建议

### 1. 应用启动时检测

```typescript
// 在主应用初始化时
const initApp = async () => {
  const settingsStore = useSettingsStore()
  await settingsStore.initSettings()
  
  // 延迟检测，等待所有初始化完成
  setTimeout(async () => {
    await settingsStore.showModelDetectionDialog()
  }, 3000)
}
```

### 2. 关键操作后检测

```typescript
// 在以下操作后触发检测：
// - 添加新的provider
// - 刷新模型列表
// - 批量禁用模型
// - 删除provider

const addProvider = async (provider: LLM_PROVIDER) => {
  await settingsStore.addCustomProvider(provider)
  await settingsStore.triggerModelDetection()
}
```

### 3. 定期检测（可选）

```typescript
// 可以设置定期检测，但要控制频率
const setupPeriodicDetection = () => {
  setInterval(async () => {
    const shouldShow = await settingsStore.shouldShowModelDetectionDialog()
    if (shouldShow) {
      await settingsStore.showModelDetectionDialog()
    }
  }, 5 * 60 * 1000) // 5分钟检测一次
}
```

### 4. 与路由集成

```typescript
// 在设置页面路由守卫中检测
router.beforeEach(async (to, from, next) => {
  if (to.name === 'settings') {
    const settingsStore = useSettingsStore()
    const result = await settingsStore.detectOverallModelState()
    
    // 如果没有模型，可以引导用户到provider设置
    if (result?.state === 'no_enabled_models') {
      console.log('建议用户先配置AI提供商')
    }
  }
  next()
})
```

## 自定义配置

### 调整检测敏感度

```typescript
// 在ConfigPresenter中调整参数
class ConfigPresenter {
  // 调整对话框显示间隔
  async shouldShowModelDetectionDialog(): Promise<boolean> {
    const detectionResult = await this.detectOverallModelState()
    
    return !ModelDetectionService.shouldSkipDialog(
      detectionResult,
      this.lastModelDetectionDialogTime,
      60000 // 调整为60秒间隔
    )
  }
}
```

### 禁用自动检测

```typescript
// 在特定页面禁用自动检测
const settingsStore = useSettingsStore()

// 临时禁用检测
settingsStore.hideModelDetectionDialog()

// 或者在检测前判断当前页面
const triggerModelDetection = async () => {
  if (route.name === 'chat') {
    // 在聊天页面不显示对话框
    return
  }
  await settingsStore.showModelDetectionDialog()
}
```

## 调试和监控

### 1. 日志记录

```typescript
// 启用详细日志
const debugModelDetection = async () => {
  const result = await settingsStore.detectOverallModelState()
  
  console.group('模型检测结果')
  console.log('状态:', result?.state)
  console.log('启用的providers:', result?.enabledProvidersCount)
  console.log('启用的models:', result?.enabledModelsCount)
  console.log('详细信息:', result?.providerDetails)
  console.log('建议操作:', result?.suggestedActions)
  console.groupEnd()
}
```

### 2. 性能监控

```typescript
// 监控检测性能
const performanceTest = async () => {
  const start = performance.now()
  await settingsStore.detectOverallModelState()
  const end = performance.now()
  
  console.log(`模型检测耗时: ${end - start}ms`)
}
```

## 注意事项

1. **避免频繁调用**: 检测方法包含异步操作，避免在短时间内重复调用
2. **错误处理**: 所有检测方法都包含错误处理，但使用时仍应添加try-catch
3. **内存管理**: 定期检测可能会增加内存占用，建议合理设置检测间隔
4. **用户体验**: 避免在用户操作过程中突然弹出对话框，选择合适的时机
5. **国际化**: 消息文本需要支持国际化，可以在formatMessage中处理

## 扩展功能建议

1. **用户偏好记录**: 记录用户选择，避免重复提示相同问题
2. **智能建议**: 根据用户使用模式，推荐适合的模型配置
3. **批量配置**: 提供一键配置功能，快速启用推荐的模型组合
4. **状态持久化**: 保存检测状态，减少重复检测
5. **与通知系统集成**: 通过系统通知提醒用户模型配置问题