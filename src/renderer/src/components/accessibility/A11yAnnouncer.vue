<template>
  <div class="a11y-announcer" aria-live="off">
    <!-- 礼貌模式通知区域 - 等待用户空闲时播报 -->
    <div
      ref="politeAnnouncerRef"
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
      :aria-label="$t('accessibility.announcer.polite')"
    >
      {{ currentPoliteMessage }}
    </div>

    <!-- 强制模式通知区域 - 立即打断并播报 -->
    <div
      ref="assertiveAnnouncerRef"
      class="sr-only"
      aria-live="assertive"
      aria-atomic="true"
      role="alert"
      :aria-label="$t('accessibility.announcer.assertive')"
    >
      {{ currentAssertiveMessage }}
    </div>

    <!-- 通知历史记录（仅供调试，生产环境隐藏） -->
    <div
      v-if="showDebugInfo && isDevelopment"
      class="a11y-debug-panel fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm z-50"
    >
      <h3 class="text-sm font-semibold mb-2">
        {{ $t('accessibility.announcer.debugTitle') }}
      </h3>
      <div class="text-xs space-y-1 max-h-32 overflow-y-auto">
        <div
          v-for="announcement in recentAnnouncements"
          :key="announcement.id"
          class="flex items-center gap-2"
          :class="announcement.announced ? 'opacity-50' : ''"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="announcement.priority === 'assertive' ? 'bg-red-400' : 'bg-blue-400'"
          />
          <span class="truncate">{{ announcement.message }}</span>
        </div>
      </div>
      <button
        type="button"
        class="text-xs text-gray-300 hover:text-white mt-2"
        @click="toggleDebugInfo"
      >
        {{ $t('accessibility.announcer.hideDebug') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useA11yAnnouncement, type A11yAnnouncement } from '@/composables/useA11yAnnouncement'
import { useI18n } from 'vue-i18n'

interface Props {
  /** 是否显示调试信息 */
  showDebugInfo?: boolean
  /** 消息显示持续时间（毫秒） */
  messageDuration?: number
  /** 最大历史记录显示数量 */
  maxHistoryDisplay?: number
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false,
  messageDuration: 3000,
  maxHistoryDisplay: 10
})

const { t } = useI18n()
const { addAnnouncementListener, getAnnouncementHistory, markAnnounced } = useA11yAnnouncement()

// 模板引用
const politeAnnouncerRef = ref<HTMLElement>()
const assertiveAnnouncerRef = ref<HTMLElement>()

// 当前显示的消息
const currentPoliteMessage = ref('')
const currentAssertiveMessage = ref('')

// 调试相关
const showDebugInfo = ref(props.showDebugInfo)
const isDevelopment = ref(import.meta.env.DEV)

// 计算属性
const recentAnnouncements = computed(() => getAnnouncementHistory(props.maxHistoryDisplay))

// 消息清理定时器
let politeTimer: NodeJS.Timeout | null = null
let assertiveTimer: NodeJS.Timeout | null = null

/**
 * 清理定时器
 */
function clearTimers() {
  if (politeTimer) {
    clearTimeout(politeTimer)
    politeTimer = null
  }
  if (assertiveTimer) {
    clearTimeout(assertiveTimer)
    assertiveTimer = null
  }
}

/**
 * 显示礼貌模式消息
 * @param announcement 通知对象
 */
async function displayPoliteMessage(announcement: A11yAnnouncement) {
  // 清除之前的定时器
  if (politeTimer) {
    clearTimeout(politeTimer)
  }

  // 设置消息内容
  currentPoliteMessage.value = announcement.message

  // 等待DOM更新后标记为已播报
  await nextTick()
  markAnnounced(announcement.id)

  // 设置清理定时器
  politeTimer = setTimeout(() => {
    currentPoliteMessage.value = ''
  }, props.messageDuration)
}

/**
 * 显示强制模式消息
 * @param announcement 通知对象
 */
async function displayAssertiveMessage(announcement: A11yAnnouncement) {
  // 清除之前的定时器
  if (assertiveTimer) {
    clearTimeout(assertiveTimer)
  }

  // 设置消息内容
  currentAssertiveMessage.value = announcement.message

  // 等待DOM更新后标记为已播报
  await nextTick()
  markAnnounced(announcement.id)

  // 设置清理定时器
  assertiveTimer = setTimeout(() => {
    currentAssertiveMessage.value = ''
  }, props.messageDuration)
}

/**
 * 处理新通知
 * @param announcement 通知对象
 */
function handleAnnouncement(announcement: A11yAnnouncement) {
  try {
    if (announcement.priority === 'polite') {
      displayPoliteMessage(announcement)
    } else if (announcement.priority === 'assertive') {
      displayAssertiveMessage(announcement)
    }
  } catch (error) {
    console.error('[A11yAnnouncer] Error handling announcement:', error)
  }
}

/**
 * 切换调试信息显示
 */
function toggleDebugInfo() {
  showDebugInfo.value = !showDebugInfo.value
}

// 监听器管理
let removeListener: (() => void) | null = null

onMounted(() => {
  // 添加通知监听器
  removeListener = addAnnouncementListener(handleAnnouncement)

  // 开发环境下的快捷键支持
  if (isDevelopment.value) {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + A 切换调试面板
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault()
        toggleDebugInfo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // 组件卸载时清理监听器
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown)
    })
  }
})

onUnmounted(() => {
  // 移除通知监听器
  if (removeListener) {
    removeListener()
  }

  // 清理定时器
  clearTimers()
})

// 监听 props 变化
watch(
  () => props.showDebugInfo,
  (newValue) => {
    showDebugInfo.value = newValue
  }
)

// 暴露给父组件的方法（如果需要）
defineExpose({
  /**
   * 手动触发屏幕阅读器重新读取
   */
  refreshAnnouncer() {
    // 暂时清空再恢复，强制屏幕阅读器重新读取
    const politeMsg = currentPoliteMessage.value
    const assertiveMsg = currentAssertiveMessage.value

    currentPoliteMessage.value = ''
    currentAssertiveMessage.value = ''

    nextTick(() => {
      currentPoliteMessage.value = politeMsg
      currentAssertiveMessage.value = assertiveMsg
    })
  },

  /**
   * 清空当前显示的消息
   */
  clearMessages() {
    clearTimers()
    currentPoliteMessage.value = ''
    currentAssertiveMessage.value = ''
  }
})
</script>

<style scoped>
/**
 * 屏幕阅读器专用样式类
 * 内容对屏幕阅读器可见，但在视觉上隐藏
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
 * 确保通知区域不影响页面布局
 */
.a11y-announcer {
  position: fixed;
  top: -9999px;
  left: -9999px;
  pointer-events: none;
}

/**
 * 调试面板样式
 */
.a11y-debug-panel {
  pointer-events: auto;
  user-select: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.a11y-debug-panel:hover {
  opacity: 0.9;
}

/**
 * 滚动条样式优化
 */
.a11y-debug-panel .overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.a11y-debug-panel .overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.a11y-debug-panel .overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.a11y-debug-panel .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
