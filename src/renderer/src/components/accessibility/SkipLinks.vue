<template>
  <div class="skip-links" aria-label="跳转链接">
    <a
      href="#main-content"
      class="skip-link"
      @click.prevent="skipToElement('main-content')"
    >
      {{ $t('accessibility.skipToMainContent') }}
    </a>
    <a
      href="#navigation"
      class="skip-link"
      @click.prevent="skipToElement('navigation')"
    >
      {{ $t('accessibility.skipToNavigation') }}
    </a>
    <a
      href="#sidebar"
      class="skip-link"
      @click.prevent="skipToElement('sidebar')"
    >
      {{ $t('accessibility.skipToSidebar') }}
    </a>
    <a
      v-if="showChatInput"
      href="#chat-input"
      class="skip-link"
      @click.prevent="skipToElement('chat-input')"
    >
      {{ $t('accessibility.skipToChatInput') }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'

interface Props {
  /** 是否显示跳转到聊天输入框的链接 */
  showChatInput?: boolean
}

withDefaults(defineProps<Props>(), {
  showChatInput: true
})

/**
 * 跳转到指定元素并设置焦点
 */
const skipToElement = async (elementId: string) => {
  const targetElement = document.getElementById(elementId)
  
  if (!targetElement) {
    console.warn(`Skip link target not found: ${elementId}`)
    return
  }

  // 滚动到元素位置
  targetElement.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  })

  await nextTick()

  // 设置焦点
  // 如果元素不是自然可聚焦的，临时设置tabindex
  const originalTabIndex = targetElement.getAttribute('tabindex')
  const needsTabIndex = !targetElement.matches(
    'button, input, select, textarea, a[href], area[href], iframe, [tabindex]:not([tabindex="-1"])'
  )

  if (needsTabIndex) {
    targetElement.setAttribute('tabindex', '-1')
  }

  // 聚焦元素
  targetElement.focus()

  // 如果是临时设置的tabindex，在失去焦点后移除
  if (needsTabIndex) {
    const handleBlur = () => {
      if (originalTabIndex !== null) {
        targetElement.setAttribute('tabindex', originalTabIndex)
      } else {
        targetElement.removeAttribute('tabindex')
      }
      targetElement.removeEventListener('blur', handleBlur)
    }
    targetElement.addEventListener('blur', handleBlur, { once: true })
  }

  // 添加视觉指示器
  targetElement.classList.add('skip-target-focused')
  setTimeout(() => {
    targetElement.classList.remove('skip-target-focused')
  }, 2000)
}
</script>

<style scoped>
.skip-links {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
}

.skip-link {
  position: absolute;
  left: -10000px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  
  /* 样式设置 */
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 8px 12px;
  border-radius: 4px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  
  /* 过渡效果 */
  transition: all 0.2s ease-in-out;
  
  /* 高对比度边框 */
  border: 2px solid transparent;
}

.skip-link:focus {
  position: static;
  left: auto;
  top: auto;
  width: auto;
  height: auto;
  overflow: visible;
  
  /* 焦点状态样式 */
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-color: hsl(var(--ring));
  
  /* 阴影效果 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.skip-link:hover:focus {
  background: hsl(var(--primary) / 0.9);
  transform: translateY(-1px);
}

.skip-link:active {
  transform: translateY(0);
}

/* 键盘用户专用样式增强 */
:global(.keyboard-focus) .skip-link:focus {
  outline: 3px solid hsl(var(--ring));
  outline-offset: 3px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .skip-link {
    border: 2px solid currentColor;
  }
  
  .skip-link:focus {
    outline: 3px solid;
    background: CanvasText;
    color: Canvas;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .skip-link {
    transition: none;
  }
}

/* 跳转目标聚焦指示器 */
:global(.skip-target-focused) {
  outline: 3px solid hsl(var(--ring)) !important;
  outline-offset: 2px !important;
  position: relative;
}

:global(.skip-target-focused::before) {
  content: '';
  position: absolute;
  inset: -6px;
  border: 2px dashed hsl(var(--ring));
  border-radius: 4px;
  pointer-events: none;
  animation: skip-target-pulse 2s ease-in-out;
}

@keyframes skip-target-pulse {
  0%, 100% { 
    opacity: 0; 
    transform: scale(1);
  }
  50% { 
    opacity: 1; 
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(.skip-target-focused::before) {
    animation: none;
    opacity: 1;
  }
}
</style>