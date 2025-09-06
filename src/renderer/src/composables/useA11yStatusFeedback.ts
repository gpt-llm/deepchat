import { watch, computed, ref, onMounted, onUnmounted } from 'vue'
import { useA11yAnnouncement } from './useA11yAnnouncement'
import { useAccessibilityStore } from '@/stores/accessibility'
import { useChatStore } from '@/stores/chat'
import { useI18n } from 'vue-i18n'

/**
 * 状态更新语音反馈系统
 * 
 * 监听应用中的各种状态变化，为屏幕阅读器用户提供实时的语音反馈
 * 包括消息生成状态、连接状态、操作完成通知等
 */
export function useA11yStatusFeedback() {
  const { t } = useI18n()
  const { announce, announcePolite, announceAssertive } = useA11yAnnouncement()
  const accessibilityStore = useAccessibilityStore()
  const chatStore = useChatStore()

  // 连接状态
  const isOnline = ref(navigator.onLine)
  const connectionStatus = ref<'connected' | 'connecting' | 'disconnected' | 'error'>('connected')

  // 上一次的状态，用于检测变化
  const previousGeneratingThreadIds = ref(new Set<string>())
  const previousConnectionStatus = ref(connectionStatus.value)

  /**
   * 检查是否应该播报状态更新
   */
  const shouldAnnounceStatus = computed(() => 
    accessibilityStore.isScreenReaderOptimized && 
    accessibilityStore.settings.screenReader.announceNewMessages
  )

  /**
   * 检查是否应该播放音频反馈
   */
  const shouldPlaySoundFeedback = computed(() =>
    accessibilityStore.settings.audio.soundFeedback
  )

  /**
   * 播报消息生成开始
   */
  function announceGenerationStart(_threadId: string): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.messageLoading'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('info')
    }
  }

  /**
   * 播报消息生成完成
   */
  function announceGenerationComplete(_threadId: string): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.messageComplete'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('success')
    }
  }

  /**
   * 播报消息生成失败
   */
  function announceGenerationError(threadId: string, error?: string): void {
    if (!shouldAnnounceStatus.value) return

    const message = error 
      ? `${t('accessibility.messages.messageFailed')}: ${error}`
      : t('accessibility.messages.messageFailed')
    
    announceAssertive(message)
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('error')
    }
  }

  /**
   * 播报消息发送成功
   */
  function announceMessageSent(): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.messageSent'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('success')
    }
  }

  /**
   * 播报消息删除
   */
  function announceMessageDeleted(): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.messageDeleted'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('info')
    }
  }

  /**
   * 播报消息复制
   */
  function announceMessageCopied(): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.messageCopied'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('success')
    }
  }

  /**
   * 播报连接状态变化
   */
  function announceConnectionStatus(status: typeof connectionStatus.value): void {
    if (!shouldAnnounceStatus.value) return

    let message: string
    let priority: 'polite' | 'assertive' = 'polite'
    let soundType: 'success' | 'error' | 'info' | 'warning' = 'info'

    switch (status) {
      case 'connected':
        message = t('accessibility.status.connected')
        soundType = 'success'
        break
      case 'connecting':
        message = t('accessibility.status.connecting')
        break
      case 'disconnected':
        message = t('accessibility.status.disconnected')
        priority = 'assertive'
        soundType = 'warning'
        break
      case 'error':
        message = t('accessibility.messages.connectionError')
        priority = 'assertive'
        soundType = 'error'
        break
    }

    announce(message, priority)
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback(soundType)
    }
  }

  /**
   * 播报工具调用状态
   */
  function announceToolCallStatus(status: 'executing' | 'completed' | 'failed', toolName?: string): void {
    if (!shouldAnnounceStatus.value) return

    let message: string
    let soundType: 'success' | 'error' | 'info' = 'info'

    switch (status) {
      case 'executing':
        message = toolName 
          ? `${t('accessibility.messages.toolCallExecuting')}: ${toolName}`
          : t('accessibility.messages.toolCallExecuting')
        break
      case 'completed':
        message = toolName
          ? `${t('accessibility.messages.toolCallCompleted')}: ${toolName}`
          : t('accessibility.messages.toolCallCompleted')
        soundType = 'success'
        break
      case 'failed':
        message = toolName
          ? `${t('accessibility.messages.toolCallFailed')}: ${toolName}`
          : t('accessibility.messages.toolCallFailed')
        soundType = 'error'
        break
    }

    announcePolite(message)
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback(soundType)
    }
  }

  /**
   * 播报搜索结果状态
   */
  function announceSearchResults(hasResults: boolean, resultCount?: number): void {
    if (!shouldAnnounceStatus.value) return

    const message = hasResults
      ? (resultCount !== undefined 
          ? `${resultCount} ${t('accessibility.messages.searchResultsFound')}`
          : t('accessibility.messages.searchResultsFound'))
      : t('accessibility.messages.searchResultsEmpty')
    
    announcePolite(message)
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback(hasResults ? 'success' : 'info')
    }
  }

  /**
   * 播报生成取消
   */
  function announceGenerationCanceled(): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.generationCanceled'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('warning')
    }
  }

  /**
   * 播报重试操作
   */
  function announceRetry(): void {
    if (!shouldAnnounceStatus.value) return

    announcePolite(t('accessibility.messages.retryingMessage'))
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('info')
    }
  }

  /**
   * 播报导航状态变化
   */
  function announceNavigationChange(location: string): void {
    if (!shouldAnnounceStatus.value) return

    const message = t('accessibility.navigation.pageChanged') + `: ${location}`
    announcePolite(message)
  }

  /**
   * 播报模态框状态
   */
  function announceModalStatus(isOpen: boolean, modalTitle?: string): void {
    if (!shouldAnnounceStatus.value) return

    const message = isOpen
      ? (modalTitle 
          ? `${t('accessibility.navigation.modalOpened')}: ${modalTitle}`
          : t('accessibility.navigation.modalOpened'))
      : t('accessibility.navigation.modalClosed')
    
    announcePolite(message)
    
    if (shouldPlaySoundFeedback.value) {
      accessibilityStore.playSoundFeedback('info')
    }
  }

  /**
   * 播报焦点变化（如果启用了详细反馈）
   */
  function announceFocusChange(elementType: string, elementLabel?: string): void {
    if (!shouldAnnounceStatus.value || !accessibilityStore.settings.screenReader.detailedDescriptions) return

    const message = elementLabel
      ? `${elementType}: ${elementLabel}`
      : elementType
    
    // 使用较短的延迟，避免打断用户操作
    setTimeout(() => {
      announcePolite(message)
    }, 500)
  }

  /**
   * 监听在线/离线状态
   */
  function handleOnlineStatus(): void {
    const updateOnlineStatus = () => {
      isOnline.value = navigator.onLine
      connectionStatus.value = navigator.onLine ? 'connected' : 'disconnected'
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // 清理函数
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }

  // 监听器清理函数数组
  const cleanupFunctions: (() => void)[] = []

  onMounted(() => {
    // 监听生成状态变化
    const stopWatchingGeneration = watch(
      () => chatStore.generatingThreadIds,
      (newIds, oldIds) => {
        if (!newIds || !oldIds) return

        // 检测开始生成的线程
        const startedThreads = [...newIds].filter(id => !previousGeneratingThreadIds.value.has(id))
        startedThreads.forEach(threadId => {
          announceGenerationStart(threadId)
        })

        // 检测完成生成的线程
        const completedThreads = [...previousGeneratingThreadIds.value].filter(id => !newIds.has(id))
        completedThreads.forEach(threadId => {
          announceGenerationComplete(threadId)
        })

        previousGeneratingThreadIds.value = new Set(newIds)
      },
      { deep: true }
    )

    // 监听连接状态变化
    const stopWatchingConnection = watch(
      connectionStatus,
      (newStatus, oldStatus) => {
        if (newStatus !== oldStatus && oldStatus !== undefined) {
          announceConnectionStatus(newStatus)
          previousConnectionStatus.value = newStatus
        }
      }
    )

    // 设置在线/离线监听器
    const cleanupOnlineStatus = handleOnlineStatus()

    // 保存清理函数
    cleanupFunctions.push(
      stopWatchingGeneration,
      stopWatchingConnection,
      cleanupOnlineStatus
    )
  })

  onUnmounted(() => {
    // 清理所有监听器
    cleanupFunctions.forEach(cleanup => cleanup())
  })

  return {
    // 状态
    isOnline,
    connectionStatus,
    shouldAnnounceStatus,
    shouldPlaySoundFeedback,

    // 通知方法
    announceGenerationStart,
    announceGenerationComplete,
    announceGenerationError,
    announceMessageSent,
    announceMessageDeleted,
    announceMessageCopied,
    announceConnectionStatus,
    announceToolCallStatus,
    announceSearchResults,
    announceGenerationCanceled,
    announceRetry,
    announceNavigationChange,
    announceModalStatus,
    announceFocusChange,

    // 实用工具
    setConnectionStatus: (status: typeof connectionStatus.value) => {
      connectionStatus.value = status
    }
  }
}

/**
 * 全局单例实例
 */
export const globalA11yStatusFeedback = useA11yStatusFeedback()