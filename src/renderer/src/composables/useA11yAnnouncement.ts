import { ref, nextTick } from 'vue'

/**
 * 无障碍通知公告类型
 */
export interface A11yAnnouncement {
  /** 通知内容 */
  message: string
  /** 通知优先级 - polite: 礼貌模式（等待用户空闲）, assertive: 强制模式（立即打断） */
  priority: 'polite' | 'assertive'
  /** 唯一标识符 */
  id: string
  /** 创建时间戳 */
  timestamp: number
  /** 是否已被屏幕阅读器读取 */
  announced?: boolean
}

/**
 * 通知历史记录存储
 */
const announcementHistory = ref<A11yAnnouncement[]>([])

/**
 * 当前活动的通知队列
 */
const activeAnnouncements = ref<Map<string, A11yAnnouncement>>(new Map())

/**
 * 通知事件监听器
 */
const announcementListeners = new Set<(announcement: A11yAnnouncement) => void>()

/**
 * 生成唯一ID
 */
function generateAnnouncementId(): string {
  return `a11y-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 无障碍通知系统组合式函数
 *
 * 提供屏幕阅读器友好的通知API，支持不同优先级的通知模式
 *
 * @example
 * ```typescript
 * const { announce, announcePolite, announceAssertive } = useA11yAnnouncement()
 *
 * // 礼貌模式通知（等待用户空闲时读取）
 * announcePolite('消息已发送')
 *
 * // 强制模式通知（立即打断并读取）
 * announceAssertive('连接失败，请检查网络')
 *
 * // 自定义优先级
 * announce('正在生成回复...', 'polite')
 * ```
 */
export function useA11yAnnouncement() {
  /**
   * 发送无障碍通知
   * @param message 通知内容
   * @param priority 通知优先级
   * @returns 通知对象
   */
  function announce(
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): A11yAnnouncement {
    if (!message.trim()) {
      console.warn('[A11y] Cannot announce empty message')
      return {
        message: '',
        priority,
        id: '',
        timestamp: Date.now(),
        announced: false
      }
    }

    const announcement: A11yAnnouncement = {
      message: message.trim(),
      priority,
      id: generateAnnouncementId(),
      timestamp: Date.now(),
      announced: false
    }

    // 添加到历史记录
    announcementHistory.value.push(announcement)

    // 限制历史记录长度，保持最近100条
    if (announcementHistory.value.length > 100) {
      announcementHistory.value = announcementHistory.value.slice(-100)
    }

    // 添加到活动通知队列
    activeAnnouncements.value.set(announcement.id, announcement)

    // 通知所有监听器
    announcementListeners.forEach((listener) => {
      try {
        listener(announcement)
      } catch (error) {
        console.error('[A11y] Error in announcement listener:', error)
      }
    })

    // 自动清理活动通知（10秒后）
    setTimeout(() => {
      activeAnnouncements.value.delete(announcement.id)
    }, 10000)

    console.debug(`[A11y] Announced (${priority}): ${message}`)
    return announcement
  }

  /**
   * 发送礼貌模式通知
   * 等待用户空闲时播报，不打断当前操作
   * @param message 通知内容
   */
  function announcePolite(message: string): A11yAnnouncement {
    return announce(message, 'polite')
  }

  /**
   * 发送强制模式通知
   * 立即打断当前操作并播报，用于重要信息
   * @param message 通知内容
   */
  function announceAssertive(message: string): A11yAnnouncement {
    return announce(message, 'assertive')
  }

  /**
   * 添加通知监听器
   * @param listener 监听器函数
   * @returns 取消监听的函数
   */
  function addAnnouncementListener(listener: (announcement: A11yAnnouncement) => void): () => void {
    announcementListeners.add(listener)
    return () => {
      announcementListeners.delete(listener)
    }
  }

  /**
   * 清空当前活动的通知
   */
  function clearActiveAnnouncements(): void {
    activeAnnouncements.value.clear()
  }

  /**
   * 获取通知历史记录
   * @param limit 限制条数，默认返回所有
   */
  function getAnnouncementHistory(limit?: number): A11yAnnouncement[] {
    const history = [...announcementHistory.value].reverse() // 最新的在前
    return limit ? history.slice(0, limit) : history
  }

  /**
   * 标记通知为已播报
   * @param announcementId 通知ID
   */
  function markAnnounced(announcementId: string): void {
    const announcement = activeAnnouncements.value.get(announcementId)
    if (announcement) {
      announcement.announced = true
    }

    // 同时更新历史记录中的状态
    const historyItem = announcementHistory.value.find((item) => item.id === announcementId)
    if (historyItem) {
      historyItem.announced = true
    }
  }

  /**
   * 检查是否有未播报的通知
   */
  function hasUnnouncedMessages(): boolean {
    return Array.from(activeAnnouncements.value.values()).some((a) => !a.announced)
  }

  /**
   * 延迟通知（用于等待DOM更新）
   * @param message 通知内容
   * @param priority 通知优先级
   * @param delay 延迟时间（毫秒），默认使用nextTick
   */
  async function announceDelayed(
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
    delay?: number
  ): Promise<A11yAnnouncement> {
    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    } else {
      await nextTick()
    }
    return announce(message, priority)
  }

  return {
    // 核心通知方法
    announce,
    announcePolite,
    announceAssertive,
    announceDelayed,

    // 监听器管理
    addAnnouncementListener,

    // 状态管理
    clearActiveAnnouncements,
    markAnnounced,
    hasUnnouncedMessages,

    // 历史记录
    getAnnouncementHistory,

    // 响应式数据（只读）
    activeAnnouncements: readonly(activeAnnouncements),
    announcementHistory: readonly(announcementHistory)
  }
}

/**
 * 全局单例实例，确保整个应用使用同一个通知系统
 */
export const globalA11yAnnouncement = useA11yAnnouncement()
