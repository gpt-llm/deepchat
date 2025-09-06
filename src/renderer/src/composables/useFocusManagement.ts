import { ref, nextTick, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 可聚焦元素的CSS选择器
 */
const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  'object:not([tabindex="-1"])',
  'embed:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([tabindex="-1"])',
  'audio[controls]:not([tabindex="-1"])',
  'video[controls]:not([tabindex="-1"])',
  'details > summary:first-of-type:not([tabindex="-1"])'
].join(', ')

/**
 * 获取容器内所有可聚焦的元素
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]
  return elements.filter((element) => {
    // 检查元素是否实际可见和可交互
    const style = window.getComputedStyle(element)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    )
  })
}

/**
 * 焦点陷阱选项
 */
interface FocusTrapOptions {
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
 * 焦点陷阱功能
 */
export function useFocusTrap() {
  const isActive = ref(false)
  let container: HTMLElement | null = null
  let previouslyFocusedElement: HTMLElement | null = null
  let focusableElements: HTMLElement[] = []

  /**
   * 处理键盘事件，实现Tab键循环
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive.value || !container || event.key !== 'Tab') {
      return
    }

    // 更新可聚焦元素列表（处理动态内容）
    focusableElements = getFocusableElements(container)

    if (focusableElements.length === 0) {
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement as HTMLElement

    if (event.shiftKey) {
      // Shift + Tab: 向后循环
      if (activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab: 向前循环
      if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  /**
   * 处理点击事件，防止焦点逃逸
   */
  const handleClick = (event: MouseEvent) => {
    if (!isActive.value || !container) {
      return
    }

    const target = event.target as HTMLElement
    if (!container.contains(target)) {
      event.preventDefault()
      // 将焦点返回到容器内的第一个可聚焦元素
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }
  }

  /**
   * 激活焦点陷阱
   */
  const activate = (containerElement: HTMLElement, options: FocusTrapOptions = {}) => {
    if (isActive.value) {
      deactivate()
    }

    container = containerElement
    previouslyFocusedElement = document.activeElement as HTMLElement
    focusableElements = getFocusableElements(container)

    isActive.value = true

    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown, true)
    if (!options.allowOutsideClick) {
      document.addEventListener('click', handleClick, true)
    }

    // 设置初始焦点
    nextTick(() => {
      let initialFocusElement: HTMLElement | null = null

      if (options.initialFocusSelector) {
        initialFocusElement = container!.querySelector(options.initialFocusSelector)
      }

      if (!initialFocusElement && focusableElements.length > 0) {
        initialFocusElement = focusableElements[0]
      }

      if (initialFocusElement && options.autoFocus !== false) {
        initialFocusElement.focus()
      }
    })
  }

  /**
   * 停用焦点陷阱
   */
  const deactivate = (options: { returnFocus?: boolean } = {}) => {
    if (!isActive.value) {
      return
    }

    isActive.value = false

    // 移除事件监听器
    document.removeEventListener('keydown', handleKeyDown, true)
    document.removeEventListener('click', handleClick, true)

    // 恢复焦点
    if (options.returnFocus !== false && previouslyFocusedElement) {
      nextTick(() => {
        previouslyFocusedElement?.focus()
      })
    }

    // 清理状态
    container = null
    previouslyFocusedElement = null
    focusableElements = []
  }

  return {
    isActive: readonly(isActive),
    activate,
    deactivate
  }
}

/**
 * 焦点恢复功能
 */
export function useFocusRestore() {
  let savedFocusElement: HTMLElement | null = null

  /**
   * 保存当前焦点
   */
  const saveFocus = () => {
    savedFocusElement = document.activeElement as HTMLElement
  }

  /**
   * 恢复焦点
   */
  const restoreFocus = () => {
    if (savedFocusElement && typeof savedFocusElement.focus === 'function') {
      nextTick(() => {
        savedFocusElement?.focus()
      })
    }
  }

  /**
   * 清除保存的焦点
   */
  const clearFocus = () => {
    savedFocusElement = null
  }

  return {
    saveFocus,
    restoreFocus,
    clearFocus
  }
}

/**
 * 焦点指示器增强
 */
export function useFocusIndicator() {
  const isKeyboardUser = ref(false)
  const lastInteractionWasKeyboard = ref(false)

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
      isKeyboardUser.value = true
      lastInteractionWasKeyboard.value = true
      updateBodyClass()
    }
  }

  /**
   * 处理鼠标事件
   */
  const handleMouseDown = () => {
    lastInteractionWasKeyboard.value = false
    updateBodyClass()
  }

  /**
   * 更新body类名
   */
  const updateBodyClass = () => {
    if (lastInteractionWasKeyboard.value) {
      document.body.classList.add('keyboard-focus')
      document.body.classList.remove('mouse-focus')
    } else {
      document.body.classList.add('mouse-focus')
      document.body.classList.remove('keyboard-focus')
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('mousedown', handleMouseDown, true)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, true)
    document.removeEventListener('mousedown', handleMouseDown, true)
  })

  return {
    isKeyboardUser: readonly(isKeyboardUser),
    lastInteractionWasKeyboard: readonly(lastInteractionWasKeyboard)
  }
}

/**
 * 综合焦点管理组合式函数
 */
export function useFocusManagement() {
  const focusTrap = useFocusTrap()
  const focusRestore = useFocusRestore()
  const focusIndicator = useFocusIndicator()

  /**
   * 为模态框设置焦点管理
   */
  const setupModalFocus = (
    container: Ref<HTMLElement | undefined>,
    isOpen: Ref<boolean>,
    options: FocusTrapOptions = {}
  ) => {
    watch([container, isOpen], ([containerEl, open]) => {
      if (open && containerEl) {
        focusRestore.saveFocus()
        nextTick(() => {
          focusTrap.activate(containerEl, {
            autoFocus: true,
            allowOutsideClick: false,
            ...options
          })
        })
      } else if (!open) {
        focusTrap.deactivate({ returnFocus: true })
        focusRestore.clearFocus()
      }
    })

    // 清理
    onUnmounted(() => {
      if (focusTrap.isActive.value) {
        focusTrap.deactivate({ returnFocus: true })
      }
    })
  }

  return {
    focusTrap,
    focusRestore,
    focusIndicator,
    setupModalFocus
  }
}

// 导入required函数
import { readonly, watch } from 'vue'
