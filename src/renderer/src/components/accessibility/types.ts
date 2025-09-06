/**
 * 焦点陷阱选项
 */
export interface FocusTrapOptions {
  /** 是否在激活时自动聚焦第一个元素 */
  autoFocus?: boolean
  /** 是否允许点击外部区域退出陷阱 */
  allowOutsideClick?: boolean
  /** 初始聚焦元素的选择器 */
  initialFocusSelector?: string
  /** 返回聚焦元素的选择器 */
  returnFocusSelector?: string
}

/**
 * 焦点指示器选项
 */
export interface FocusIndicatorOptions {
  /** 是否启用键盘焦点指示器 */
  enableKeyboardIndicator?: boolean
  /** 是否启用鼠标焦点指示器 */
  enableMouseIndicator?: boolean
  /** 自定义焦点指示器类名 */
  customFocusClass?: string
}

/**
 * 跳过链接目标
 */
export interface SkipLinkTarget {
  /** 目标元素ID */
  id: string
  /** 显示文本的i18n键 */
  labelKey: string
  /** 是否条件性显示 */
  conditional?: boolean
}

/**
 * 无障碍通知类型
 */
export type A11yAnnouncementType = 'polite' | 'assertive' | 'off'

/**
 * 无障碍通知选项
 */
export interface A11yAnnouncementOptions {
  /** 通知类型 */
  type?: A11yAnnouncementType
  /** 延迟时间（毫秒） */
  delay?: number
  /** 是否清除之前的通知 */
  clearPrevious?: boolean
}

/**
 * 键盘导航方向
 */
export type KeyboardNavigationDirection = 'next' | 'previous' | 'first' | 'last'

/**
 * 键盘导航选项
 */
export interface KeyboardNavigationOptions {
  /** 是否启用循环导航 */
  wrap?: boolean
  /** 是否跳过隐藏元素 */
  skipHidden?: boolean
  /** 自定义可聚焦元素选择器 */
  customSelector?: string
  /** 导航边界选择器 */
  boundarySelector?: string
}

/**
 * 模态框焦点管理选项
 */
export interface ModalFocusOptions extends FocusTrapOptions {
  /** 是否在关闭时恢复焦点 */
  restoreFocus?: boolean
  /** 是否阻止背景滚动 */
  preventBackgroundScroll?: boolean
  /** 模态框关闭时的回调 */
  onClose?: () => void
}

/**
 * 无障碍测试结果
 */
export interface A11yTestResult {
  /** 测试项目名称 */
  test: string
  /** 是否通过测试 */
  passed: boolean
  /** 错误消息（如果有） */
  message?: string
  /** 受影响的元素 */
  elements?: HTMLElement[]
}

/**
 * 无障碍审计选项
 */
export interface A11yAuditOptions {
  /** 要测试的规则列表 */
  rules?: string[]
  /** 要排除的元素选择器 */
  exclude?: string[]
  /** 测试级别 */
  level?: 'AA' | 'AAA'
  /** 是否包含警告 */
  includeWarnings?: boolean
}
