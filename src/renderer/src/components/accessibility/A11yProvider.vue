<template>
  <div class="a11y-provider">
    <!-- 主要的无障碍通知器 -->
    <A11yAnnouncer 
      :show-debug-info="debugMode"
      :message-duration="announcementDuration"
      :max-history-display="maxHistoryDisplay"
    />

    <!-- 跳过链接 (如果启用) -->
    <div 
      v-if="accessibilityStore.settings.keyboard.enableSkipLinks"
      class="skip-links"
    >
      <a 
        href="#main-content"
        class="skip-link"
        @click="handleSkipToMain"
      >
        {{ t('accessibility.navigation.skipToMain') }}
      </a>
      <a 
        href="#sidebar"
        class="skip-link"
        @click="handleSkipToSidebar"
      >
        {{ t('accessibility.navigation.skipToSidebar') }}
      </a>
      <a 
        href="#chat-input"
        class="skip-link"
        @click="handleSkipToInput"
      >
        {{ t('accessibility.navigation.skipToInput') }}
      </a>
    </div>

    <!-- 键盘快捷键帮助 (隐藏但可被屏幕阅读器访问) -->
    <div 
      v-if="accessibilityStore.isKeyboardNavigationEnabled"
      class="sr-only"
      id="keyboard-shortcuts-help"
      role="region"
      :aria-label="t('accessibility.shortcuts.shortcutsAvailable')"
    >
      <h2>{{ t('accessibility.shortcuts.shortcutsHelp') }}</h2>
      <ul>
        <li v-for="(shortcut, key) in keyboardShortcuts" :key="key">
          {{ t('accessibility.shortcuts.shortcutDescription', {
            keys: shortcut.keys,
            action: shortcut.description
          }) }}
        </li>
      </ul>
    </div>

    <!-- 实时状态通知 -->
    <div
      class="sr-only"
      aria-live="polite"
      aria-atomic="false"
      role="status"
    >
      {{ currentStatusMessage }}
    </div>

    <!-- 连接状态指示器 -->
    <div
      v-if="accessibilityStore.isScreenReaderOptimized"
      class="sr-only"
      aria-live="assertive"
      role="alert"
    >
      {{ connectionStatusMessage }}
    </div>

    <!-- 外部链接警告 (供 aria-describedby 引用) -->
    <div id="external-link-warning" class="sr-only">
      This link opens in a new window
    </div>

    <!-- 表单验证消息容器 -->
    <div 
      id="form-validation-messages"
      class="sr-only"
      aria-live="assertive"
      role="alert"
    >
      {{ currentValidationMessage }}
    </div>

    <!-- 键盘导航指示器 -->
    <div
      v-if="showNavigationHints && accessibilityStore.isKeyboardNavigationEnabled"
      class="navigation-hints sr-only"
      aria-live="polite"
    >
      {{ currentNavigationHint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import A11yAnnouncer from './A11yAnnouncer.vue'
import { useAccessibilityStore } from '@/stores/accessibility'
import { useA11yStatusFeedback } from '@/composables/useA11yStatusFeedback'
import { useA11yAnnouncement } from '@/composables/useA11yAnnouncement'

interface Props {
  /** 调试模式 */
  debugMode?: boolean
  /** 通知显示时长 */
  announcementDuration?: number
  /** 最大历史记录数量 */
  maxHistoryDisplay?: number
  /** 是否显示导航提示 */
  showNavigationHints?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  debugMode: false,
  announcementDuration: 3000,
  maxHistoryDisplay: 10,
  showNavigationHints: true
})

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const accessibilityStore = useAccessibilityStore()
const statusFeedback = useA11yStatusFeedback()
const { announcePolite } = useA11yAnnouncement()

// 状态
const currentStatusMessage = ref('')
const connectionStatusMessage = ref('')
const currentValidationMessage = ref('')
const currentNavigationHint = ref('')

/**
 * 键盘快捷键配置
 */
const keyboardShortcuts = computed(() => ({
  skipToMain: {
    keys: accessibilityStore.settings.keyboard.shortcuts.skipToMain,
    description: t('accessibility.navigation.focusMessageList')
  },
  newConversation: {
    keys: accessibilityStore.settings.keyboard.shortcuts.newConversation,
    description: t('common.newChat')
  },
  settings: {
    keys: accessibilityStore.settings.keyboard.shortcuts.settings,
    description: t('accessibility.navigation.focusSettings')
  },
  help: {
    keys: accessibilityStore.settings.keyboard.shortcuts.help,
    description: t('accessibility.shortcuts.shortcutsHelp')
  }
}))

/**
 * 跳转到主内容区域
 */
function handleSkipToMain(event: Event): void {
  event.preventDefault()
  const mainContent = document.getElementById('main-content')
  if (mainContent) {
    mainContent.focus()
    statusFeedback.announceFocusChange(t('accessibility.navigation.focusMessageList'))
  }
}

/**
 * 跳转到侧边栏
 */
function handleSkipToSidebar(event: Event): void {
  event.preventDefault()
  const sidebar = document.getElementById('sidebar') || document.querySelector('[data-testid="sidebar"]')
  if (sidebar) {
    (sidebar as HTMLElement).focus()
    statusFeedback.announceFocusChange(t('accessibility.navigation.focusSidebar'))
  }
}

/**
 * 跳转到聊天输入框
 */
function handleSkipToInput(event: Event): void {
  event.preventDefault()
  const chatInput = document.getElementById('chat-input') || 
                   document.querySelector('[data-testid="chat-input"]') ||
                   document.querySelector('textarea, input[type="text"]')
  if (chatInput) {
    (chatInput as HTMLElement).focus()
    statusFeedback.announceFocusChange(t('accessibility.navigation.focusInputField'))
  }
}

/**
 * 处理键盘快捷键
 */
function handleKeyboardShortcuts(event: KeyboardEvent): void {
  if (!accessibilityStore.isKeyboardNavigationEnabled) return

  const { ctrlKey, altKey, metaKey, key } = event
  const modifierPressed = ctrlKey || altKey || metaKey

  if (!modifierPressed) return

  const shortcuts = accessibilityStore.settings.keyboard.shortcuts

  // 检查各种快捷键组合
  const keyCombo = `${ctrlKey ? 'Ctrl+' : ''}${altKey ? 'Alt+' : ''}${metaKey ? 'Cmd+' : ''}${key.toUpperCase()}`

  if (keyCombo === shortcuts.skipToMain.replace('Ctrl', 'Ctrl').replace('Alt', 'Alt').replace('Meta', 'Cmd')) {
    event.preventDefault()
    handleSkipToMain(event)
  } else if (keyCombo === shortcuts.newConversation.replace('Ctrl', 'Ctrl').replace('Alt', 'Alt').replace('Meta', 'Cmd')) {
    event.preventDefault()
    // 触发新对话
    router.push('/')
    announcePolite(t('common.newChat'))
  } else if (keyCombo === shortcuts.settings.replace('Ctrl', 'Ctrl').replace('Alt', 'Alt').replace('Meta', 'Cmd')) {
    event.preventDefault()
    router.push('/settings')
    announcePolite(t('accessibility.navigation.focusSettings'))
  } else if (keyCombo === shortcuts.help.replace('Ctrl', 'Ctrl').replace('Alt', 'Alt').replace('Meta', 'Cmd')) {
    event.preventDefault()
    showKeyboardShortcutsHelp()
  }
}

/**
 * 显示键盘快捷键帮助
 */
function showKeyboardShortcutsHelp(): void {
  const helpElement = document.getElementById('keyboard-shortcuts-help')
  if (helpElement) {
    // 临时使helpElement可见并聚焦
    helpElement.classList.remove('sr-only')
    helpElement.setAttribute('tabindex', '0')
    helpElement.focus()
    
    announcePolite(t('accessibility.shortcuts.shortcutsHelp'))
    
    // 3秒后隐藏
    setTimeout(() => {
      helpElement.classList.add('sr-only')
      helpElement.removeAttribute('tabindex')
    }, 3000)
  }
}

/**
 * 设置导航提示
 */
function setNavigationHint(hint: string): void {
  if (props.showNavigationHints && accessibilityStore.isKeyboardNavigationEnabled) {
    currentNavigationHint.value = hint
    
    // 自动清除提示
    setTimeout(() => {
      currentNavigationHint.value = ''
    }, 5000)
  }
}

/**
 * 处理表单验证消息
 */
function setValidationMessage(message: string): void {
  currentValidationMessage.value = message
  
  // 自动清除消息
  setTimeout(() => {
    currentValidationMessage.value = ''
  }, 5000)
}

/**
 * 初始化无障碍环境
 */
function initializeA11yEnvironment(): void {
  // 加载保存的无障碍设置
  accessibilityStore.loadSettings()

  // 设置全局 ARIA 标签
  document.documentElement.setAttribute('lang', 'en') // 可以根据当前语言设置
  
  // 添加屏幕阅读器检测
  if (accessibilityStore.isScreenReaderOptimized) {
    document.body.classList.add('screen-reader-optimized')
  }
  
  // 设置初始导航提示
  if (props.showNavigationHints) {
    setNavigationHint(t('accessibility.shortcuts.shortcutsAvailable'))
  }
}

// 监听路由变化，播报页面切换
watch(() => route.path, (newPath, oldPath) => {
  if (newPath !== oldPath && accessibilityStore.isScreenReaderOptimized) {
    const pageName = route.name?.toString() || newPath
    statusFeedback.announceNavigationChange(pageName)
  }
})

// 监听连接状态变化
watch(() => statusFeedback.connectionStatus, (newStatus) => {
  switch (newStatus) {
    case 'connected':
      connectionStatusMessage.value = t('accessibility.status.connected')
      break
    case 'disconnected':
      connectionStatusMessage.value = t('accessibility.status.disconnected')
      break
    case 'connecting':
      connectionStatusMessage.value = t('accessibility.status.connecting')
      break
    case 'error':
      connectionStatusMessage.value = t('accessibility.status.error')
      break
  }
}, { immediate: true })

onMounted(() => {
  // 初始化无障碍环境
  initializeA11yEnvironment()
  
  // 添加全局键盘监听器
  document.addEventListener('keydown', handleKeyboardShortcuts)
  
  // 添加全局焦点管理
  if (accessibilityStore.isKeyboardNavigationEnabled) {
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      if (target && target.tagName) {
        const elementType = target.tagName.toLowerCase()
        const elementLabel = target.getAttribute('aria-label') || 
                           target.getAttribute('title') || 
                           target.textContent?.slice(0, 50) || 
                           elementType
        
        statusFeedback.announceFocusChange(elementType, elementLabel)
      }
    })
  }
})

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})

// 暴露方法供外部使用
defineExpose({
  setNavigationHint,
  setValidationMessage,
  showKeyboardShortcutsHelp,
  announceMessage: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announcePolite(message)
  }
})
</script>

<style scoped>
/**
 * 屏幕阅读器专用样式
 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/**
 * A11y Provider 容器
 */
.a11y-provider {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 9999;
}

/**
 * 跳过链接样式
 */
.skip-links {
  position: fixed;
  top: -100px;
  left: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  pointer-events: auto;
}

.skip-link {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #000;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  border: 2px solid #fff;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.skip-link:focus {
  top: 0.5rem;
  transform: translateY(100px);
  outline: 3px solid #007acc;
  outline-offset: 2px;
}

.skip-link:hover {
  background: #333;
  text-decoration: underline;
}

/**
 * 导航提示样式
 */
.navigation-hints {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  max-width: 90vw;
  pointer-events: none;
  z-index: 9999;
}

/**
 * 高对比度支持
 */
@media (prefers-contrast: high) {
  .skip-link {
    background: #000;
    color: #fff;
    border-color: #fff;
  }
  
  .skip-link:focus {
    outline: 3px solid #ff0;
    background: #000;
    color: #fff;
  }
}

/**
 * 减少动画支持
 */
@media (prefers-reduced-motion: reduce) {
  .skip-link,
  .navigation-hints {
    transition: none;
  }
}

/**
 * 深色主题支持
 */
:global(.dark) .skip-link {
  background: #fff;
  color: #000;
  border-color: #000;
}

:global(.dark) .skip-link:focus {
  background: #fff;
  color: #000;
  outline-color: #007acc;
}

:global(.dark) .navigation-hints {
  background: rgba(255, 255, 255, 0.9);
  color: #000;
}
</style>