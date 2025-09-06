// Accessibility Components Exports
export { default as SkipLinks } from './SkipLinks.vue'
export { default as AccessibleDialogContent } from './AccessibleDialogContent.vue'

// Re-export types if needed
export type { FocusTrapOptions, FocusIndicatorOptions } from './types'

// Accessibility component types
export interface SkipLinksProps {
  /** 是否显示跳转到聊天输入框的链接 */
  showChatInput?: boolean
}

export interface AccessibleDialogContentProps {
  /** 对话框标题 */
  title?: string
  /** 对话框描述 */
  description?: string
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean
  /** 关闭按钮的无障碍标签 */
  closeButtonLabel?: string
  /** 对话框体的额外类名 */
  bodyClass?: string
  /** 初始聚焦的元素选择器 */
  initialFocusSelector?: string
  /** 是否在打开时自动聚焦第一个可交互元素 */
  autoFocus?: boolean
}
