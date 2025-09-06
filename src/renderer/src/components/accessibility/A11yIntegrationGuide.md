# 无障碍功能集成指南

## Workflow C: 通知和状态系统 - 集成说明

本指南说明如何将新创建的无障碍通知和状态系统集成到 DeepChat 应用中。

## 已实现的功能

### 1. 实时通知系统 (useA11yAnnouncement.ts)
- ✅ 支持 polite 和 assertive 两种通知优先级
- ✅ 通知历史记录管理
- ✅ 屏幕阅读器友好的 API
- ✅ 延迟通知支持

### 2. A11yAnnouncer 组件
- ✅ 双模式通知区域（礼貌模式和强制模式）
- ✅ 开发环境调试面板
- ✅ 快捷键支持（Ctrl/Cmd + Shift + A 切换调试）
- ✅ 自动消息清理

### 3. 屏幕阅读器内容优化 (useScreenReaderContent.ts)
- ✅ 代码块格式化和语言描述
- ✅ 链接类型检测和描述
- ✅ 图片替代文本优化
- ✅ 表格结构化描述
- ✅ 列表和标题格式化

### 4. 增强的 Markdown 渲染器 (A11yMarkdownRenderer.vue)
- ✅ 完整的 ARIA 标签支持
- ✅ 键盘导航优化
- ✅ 自定义组件映射
- ✅ 高对比度和减少动画支持

### 5. 状态更新语音反馈 (useA11yStatusFeedback.ts)
- ✅ 消息生成状态通知
- ✅ 连接状态变化通知
- ✅ 工具调用状态反馈
- ✅ 操作完成通知

### 6. 综合无障碍提供者 (A11yProvider.vue)
- ✅ 跳过链接导航
- ✅ 键盘快捷键支持
- ✅ 实时状态指示器
- ✅ 全局焦点管理

## 集成步骤

### 1. 更新主应用 (App.vue)

```vue
<template>
  <div class="flex flex-col h-screen bg-container">
    <!-- 添加无障碍提供者 -->
    <A11yProvider 
      :debug-mode="isDev"
      :announcement-duration="3000"
      :show-navigation-hints="true"
    />
    
    <div
      class="flex flex-row h-0 flex-grow relative overflow-hidden px-[1px] py-[1px]"
      :dir="langStore.dir"
      id="main-content"
      role="main"
      aria-label="主要内容区域"
    >
      <!-- 现有的 RouterView -->
      <RouterView />
    </div>
    
    <!-- 其他现有组件 -->
  </div>
</template>

<script setup lang="ts">
// 添加导入
import A11yProvider from '@/components/accessibility/A11yProvider.vue'
import { useAccessibilityStore } from '@/stores/accessibility'

// 现有的导入和设置
// ...

const accessibilityStore = useAccessibilityStore()
const isDev = import.meta.env.DEV

onMounted(() => {
  // 现有的 onMounted 逻辑
  // ...
  
  // 初始化无障碍设置
  accessibilityStore.loadSettings()
})
</script>
```

### 2. 更新消息组件 (MessageBlockContent.vue)

```vue
<template>
  <div ref="messageBlock" class="markdown-content-wrapper relative w-full">
    <template v-for="(part, index) in processedContent" :key="index">
      <!-- 使用增强的 A11y Markdown 渲染器 -->
      <A11yMarkdownRenderer
        v-if="part.type === 'text'"
        :content="part.content"
        :typewriter-effect="part.loading"
        :announce-changes="true"
        :provide-summary="true"
        @copy="handleCopyClick"
      />
      
      <!-- 其他现有组件 -->
    </template>
  </div>
</template>

<script setup lang="ts">
// 添加导入
import A11yMarkdownRenderer from '@/components/accessibility/A11yMarkdownRenderer.vue'

// 现有的脚本逻辑保持不变
</script>
```

### 3. 集成状态反馈到聊天存储

在 `src/renderer/src/stores/chat.ts` 中添加无障碍反馈：

```typescript
import { useA11yStatusFeedback } from '@/composables/useA11yStatusFeedback'

export const useChatStore = defineStore('chat', () => {
  // 现有的状态和方法
  // ...
  
  // 添加无障碍反馈
  const statusFeedback = useA11yStatusFeedback()
  
  // 在消息发送成功后添加通知
  const sendMessage = async (message: string) => {
    try {
      // 现有的发送逻辑
      await threadP.sendMessage(message)
      
      // 添加无障碍反馈
      statusFeedback.announceMessageSent()
    } catch (error) {
      statusFeedback.announceGenerationError(threadId, error.message)
      throw error
    }
  }
  
  // 在开始生成时添加通知
  watch(generatingThreadIds, (newIds, oldIds) => {
    const startedThreads = [...newIds].filter(id => !oldIds?.has(id))
    startedThreads.forEach(threadId => {
      statusFeedback.announceGenerationStart(threadId)
    })
    
    const completedThreads = [...(oldIds || [])].filter(id => !newIds.has(id))
    completedThreads.forEach(threadId => {
      statusFeedback.announceGenerationComplete(threadId)
    })
  }, { deep: true })
})
```

### 4. 更新国际化文件

确保 `src/renderer/src/i18n/en-US/index.ts` 包含 accessibility 模块：

```typescript
import accessibility from './accessibility.json'

export default {
  // 现有的模块
  accessibility
}
```

### 5. 为关键 UI 组件添加 ID 和 ARIA 标签

#### SideBar.vue
```vue
<div 
  id="sidebar"
  role="navigation"
  aria-label="侧边栏导航"
  class="..."
>
  <!-- 现有内容 -->
</div>
```

#### ChatInput.vue
```vue
<textarea
  id="chat-input"
  role="textbox"
  aria-label="消息输入框"
  aria-multiline="true"
  class="..."
  v-model="message"
/>
```

#### MessageList.vue
```vue
<div
  role="log"
  aria-label="消息列表"
  aria-live="polite"
  class="..."
>
  <!-- 现有消息内容 -->
</div>
```

## 使用示例

### 基本通知
```typescript
import { useA11yAnnouncement } from '@/composables/useA11yAnnouncement'

const { announcePolite, announceAssertive } = useA11yAnnouncement()

// 礼貌通知（不打断用户）
announcePolite('消息已保存')

// 紧急通知（立即播报）
announceAssertive('连接失败，请检查网络')
```

### 状态反馈
```typescript
import { useA11yStatusFeedback } from '@/composables/useA11yStatusFeedback'

const statusFeedback = useA11yStatusFeedback()

// 操作反馈
statusFeedback.announceMessageSent()
statusFeedback.announceConnectionStatus('disconnected')
statusFeedback.announceToolCallStatus('completed', 'Web搜索')
```

### 屏幕阅读器内容优化
```typescript
import { useScreenReaderContent } from '@/composables/useScreenReaderContent'

const { formatCodeBlockForScreenReader, formatLinkForScreenReader } = useScreenReaderContent()

// 代码块描述
const codeDescription = formatCodeBlockForScreenReader(code, 'javascript', true)

// 链接描述
const linkDescription = formatLinkForScreenReader('https://example.com', '示例网站')
```

## 测试验证

### 1. 屏幕阅读器测试
- 使用 NVDA (Windows) 或 VoiceOver (macOS) 测试通知播报
- 验证消息生成状态的语音反馈
- 检查代码块和链接的描述是否清晰

### 2. 键盘导航测试
- 测试跳过链接功能 (Tab 键)
- 验证快捷键 (Ctrl+Alt+M, Ctrl+Alt+N 等)
- 检查焦点指示器是否清晰可见

### 3. 调试工具
- 在开发环境中使用 Ctrl+Shift+A 打开调试面板
- 监控通知历史和状态变化
- 验证通知优先级和时机

## 配置选项

用户可以通过无障碍设置页面控制以下功能：

- 启用/禁用屏幕阅读器优化
- 调整语音播报速度和音量
- 开启/关闭消息通知
- 自定义键盘快捷键
- 选择焦点指示器样式

## 性能考虑

- 通知系统使用事件驱动架构，性能开销最小
- 历史记录限制在 100 条，自动清理
- 屏幕阅读器检测基于用户设置，而非浏览器嗅探
- 音频反馈使用 Web Audio API，资源占用极少

## 后续优化

1. **多语言支持**: 为其他语言添加相应的无障碍翻译文本
2. **个性化设置**: 允许用户自定义通知类型和频率
3. **语音合成**: 集成 Web Speech API 提供更丰富的语音反馈
4. **手势支持**: 为触摸设备添加无障碍手势导航

通过以上集成，DeepChat 将具备完整的无障碍通知和状态反馈系统，为视障用户提供流畅的使用体验。