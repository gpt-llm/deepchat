<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogContent
      ref="dialogRef"
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          'sm:rounded-lg',
          // 无障碍焦点增强
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          props.class
        )
      "
      @open-auto-focus="handleOpenAutoFocus"
      @close-auto-focus="handleCloseAutoFocus"
    >
      <!-- 对话框标题区域 -->
      <div v-if="hasTitle || hasDescription" class="dialog-header">
        <DialogTitle
          v-if="hasTitle"
          :id="titleId"
          class="text-lg font-semibold leading-none tracking-tight"
        >
          <slot name="title">{{ title }}</slot>
        </DialogTitle>
        <DialogDescription
          v-if="hasDescription"
          :id="descriptionId"
          class="text-sm text-muted-foreground"
        >
          <slot name="description">{{ description }}</slot>
        </DialogDescription>
      </div>

      <!-- 对话框内容 -->
      <div class="dialog-body" :class="bodyClass">
        <slot />
      </div>

      <!-- 对话框操作区域 -->
      <div v-if="hasActions" class="dialog-footer flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
        <slot name="actions" />
      </div>

      <!-- 关闭按钮 -->
      <DialogClose
        v-if="showCloseButton"
        ref="closeButtonRef"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        :aria-label="closeButtonLabel"
      >
        <Cross2Icon class="w-4 h-4" />
        <span class="sr-only">{{ closeButtonLabel }}</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Cross2Icon } from '@radix-icons/vue'
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  useForwardPropsEmits
} from 'radix-vue'
import { computed, ref, useSlots, type HTMLAttributes } from 'vue'
import { useFocusManagement } from '@/composables/useFocusManagement'

interface Props extends DialogContentProps {
  class?: HTMLAttributes['class']
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

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: true,
  closeButtonLabel: '关闭对话框',
  autoFocus: true
})

const emits = defineEmits<DialogContentEmits>()

const slots = useSlots()

// 组件引用
const dialogRef = ref<HTMLElement>()
const closeButtonRef = ref<HTMLElement>()

// 焦点管理
const { focusRestore } = useFocusManagement()

// 生成唯一ID
const titleId = computed(() => `dialog-title-${Math.random().toString(36).substr(2, 9)}`)
const descriptionId = computed(() => `dialog-description-${Math.random().toString(36).substr(2, 9)}`)

// 计算属性
const hasTitle = computed(() => props.title || slots.title)
const hasDescription = computed(() => props.description || slots.description)
const hasActions = computed(() => slots.actions)

const delegatedProps = computed(() => {
  const { 
    class: _, 
    title: __, 
    description: ___, 
    showCloseButton: ____, 
    closeButtonLabel: _____, 
    bodyClass: ______,
    initialFocusSelector: _______,
    autoFocus: ________,
    ...delegated 
  } = props
  
  // 设置ARIA属性
  return {
    ...delegated,
    'aria-labelledby': hasTitle.value ? titleId.value : undefined,
    'aria-describedby': hasDescription.value ? descriptionId.value : undefined,
    role: 'dialog',
    'aria-modal': 'true'
  }
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)

/**
 * 处理对话框打开时的自动聚焦
 */
const handleOpenAutoFocus = (event: Event) => {
  if (!props.autoFocus) {
    event.preventDefault()
    return
  }

  // 保存当前焦点以便后续恢复
  focusRestore.saveFocus()

  // 如果指定了初始聚焦选择器，尝试聚焦指定元素
  if (props.initialFocusSelector && dialogRef.value) {
    const initialFocusElement = dialogRef.value.querySelector(props.initialFocusSelector) as HTMLElement
    if (initialFocusElement) {
      event.preventDefault()
      initialFocusElement.focus()
      return
    }
  }

  // 默认行为：让 Radix 处理自动聚焦
}

/**
 * 处理对话框关闭时的焦点恢复
 */
const handleCloseAutoFocus = (event: Event) => {
  // 恢复到之前保存的焦点元素
  focusRestore.restoreFocus()
  focusRestore.clearFocus()
  
  // 阻止默认行为，使用我们的焦点恢复逻辑
  event.preventDefault()
}

/**
 * 手动聚焦到对话框内的第一个可交互元素
 */
const focusFirstInteractiveElement = () => {
  if (!dialogRef.value) return

  const focusableElements = dialogRef.value.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  )

  if (focusableElements.length > 0) {
    (focusableElements[0] as HTMLElement).focus()
  }
}

/**
 * 手动聚焦关闭按钮
 */
const focusCloseButton = () => {
  closeButtonRef.value?.focus()
}

// 暴露给父组件的方法
defineExpose({
  focusFirstInteractiveElement,
  focusCloseButton,
  dialogElement: dialogRef
})
</script>

<style scoped>
/* 高对比度模式增强 */
@media (prefers-contrast: high) {
  .dialog-header {
    border-bottom: 1px solid;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }
  
  .dialog-footer {
    border-top: 1px solid;
    padding-top: 1rem;
    margin-top: 1rem;
  }
}

/* 键盘焦点增强 */
:global(.keyboard-focus) .dialog-body:focus-within {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 4px;
}

/* 减少动画设置支持 */
@media (prefers-reduced-motion: reduce) {
  :deep([data-state="open"]),
  :deep([data-state="closed"]) {
    animation: none !important;
    transition: none !important;
  }
}
</style>