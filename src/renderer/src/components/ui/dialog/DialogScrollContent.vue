<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Cross2Icon } from '@radix-icons/vue'
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'radix-vue'
import { computed, ref, type HTMLAttributes } from 'vue'
import { useFocusRestore } from '@/composables/useFocusManagement'

interface Props extends DialogContentProps {
  class?: HTMLAttributes['class']
  /** 是否启用无障碍增强 */
  enableA11yEnhancements?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enableA11yEnhancements: true
})

const emits = defineEmits<DialogContentEmits>()

// 组件引用
const dialogContentRef = ref<HTMLElement>()

// 焦点管理（仅在启用无障碍增强时使用）
const focusRestore = props.enableA11yEnhancements ? useFocusRestore() : null

const delegatedProps = computed(() => {
  const { class: _, enableA11yEnhancements: __, ...delegated } = props
  return delegated
})

const forwarded = useForwardPropsEmits(delegatedProps, emits)

// 处理焦点管理
const handleOpenAutoFocus = (event: Event) => {
  if (props.enableA11yEnhancements && focusRestore) {
    focusRestore.saveFocus()
  }
}

const handleCloseAutoFocus = (event: Event) => {
  if (props.enableA11yEnhancements && focusRestore) {
    focusRestore.restoreFocus()
    focusRestore.clearFocus()
  }
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogContent
      ref="dialogContentRef"
      v-bind="forwarded"
      :class="cn(
        'fixed right-0 top-0 z-50 h-full w-1/2 border-l bg-background shadow-lg duration-200',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        // 无障碍焦点增强
        props.enableA11yEnhancements && 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        props.class
      )"
      @open-auto-focus="handleOpenAutoFocus"
      @close-auto-focus="handleCloseAutoFocus"
    >
      <slot />
      <DialogClose
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
      >
        <Cross2Icon class="h-4 w-4" />
        <span class="sr-only">关闭</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
