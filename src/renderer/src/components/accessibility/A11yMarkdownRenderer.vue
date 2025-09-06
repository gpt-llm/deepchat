<template>
  <div 
    class="prose prose-sm dark:prose-invert w-full max-w-none break-all a11y-markdown-wrapper"
    :aria-label="markdownContentLabel"
    role="document"
    tabindex="0"
  >
    <!-- 屏幕阅读器专用的内容摘要 -->
    <div 
      class="sr-only"
      aria-live="polite"
    >
      {{ contentSummary }}
    </div>

    <!-- 增强的 NodeRenderer -->
    <NodeRenderer
      :custom-components="enhancedNodeComponents"
      :content="content"
      @copy="$emit('copy', $event)"
      :typewriterEffect="typewriterEffect"
      :aria-hidden="false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import NodeRenderer, { CodeBlockNode, type NodeRendererProps } from 'vue-renderer-markdown'
import ReferenceNode from '../markdown/ReferenceNode.vue'
import { useArtifactStore } from '@/stores/artifact'
import { useScreenReaderContent } from '@/composables/useScreenReaderContent'
import { useA11yAnnouncement } from '@/composables/useA11yAnnouncement'
import { useI18n } from 'vue-i18n'
import { nanoid } from 'nanoid'

interface Props {
  content: string
  debug?: boolean
  typewriterEffect?: boolean
  announceChanges?: boolean
  provideSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  debug: false,
  typewriterEffect: true,
  announceChanges: true,
  provideSummary: true
})

const emit = defineEmits<{
  copy: [content: string]
}>()

const { t } = useI18n()
const artifactStore = useArtifactStore()
const { formatMixedContentForScreenReader, formatCodeBlockForScreenReader } = useScreenReaderContent()
const { announcePolite } = useA11yAnnouncement()

// 生成唯一的 message ID 和 thread ID
const messageId = `a11y-md-msg-${nanoid()}`
const threadId = `a11y-md-thread-${nanoid()}`

/**
 * 内容摘要，为屏幕阅读器提供上下文
 */
const contentSummary = computed(() => {
  if (!props.provideSummary || !props.content) return ''
  
  try {
    return formatMixedContentForScreenReader(props.content)
  } catch (error) {
    console.warn('[A11yMarkdownRenderer] Failed to generate content summary:', error)
    return t('accessibility.content.markdownContent')
  }
})

/**
 * 内容标签，用于屏幕阅读器
 */
const markdownContentLabel = computed(() => {
  return contentSummary.value || t('accessibility.content.markdownContent')
})

/**
 * 增强的代码块组件，包含无障碍支持
 */
const A11yCodeBlock = (props: any) => {
  return h('div', {
    role: 'region',
    'aria-label': t('accessibility.content.codeBlockStart'),
    class: 'a11y-code-block-wrapper'
  }, [
    // 屏幕阅读器专用的代码描述
    h('div', {
      class: 'sr-only',
      'aria-live': 'polite'
    }, formatCodeBlockForScreenReader(
      props.node?.code || '', 
      props.language,
      true
    )),
    
    // 原始代码块组件
    h(CodeBlockNode, {
      ...props,
      // 添加无障碍属性
      'aria-label': props.language 
        ? t('accessibility.content.codeLanguage', { language: props.language })
        : t('accessibility.content.codeBlockStart'),
      role: 'code',
      tabindex: 0,
      onPreviewCode(v) {
        // 通知屏幕阅读器代码块被预览
        if (props.announceChanges) {
          announcePolite(`Code preview opened for ${v.language || 'code'} block`)
        }
        
        artifactStore.showArtifact(
          {
            id: v.id,
            type: v.artifactType,
            title: v.artifactTitle,
            language: v.language,
            content: v.node.code,
            status: 'loaded'
          },
          messageId,
          threadId
        )
      }
    })
  ])
}

/**
 * 增强的链接组件，包含无障碍支持
 */
const A11yLink = (props: any) => {
  const href = props.href || ''
  const text = props.children?.[0] || href
  
  return h('a', {
    ...props,
    'aria-label': `Link: ${text}${href.startsWith('http') ? ' (external)' : ''}`,
    role: 'link',
    // 为外部链接添加警告
    ...(href.startsWith('http') && {
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-describedby': 'external-link-warning'
    })
  }, props.children)
}

/**
 * 增强的图片组件，包含无障碍支持
 */
const A11yImage = (props: any) => {
  return h('img', {
    ...props,
    alt: props.alt || 'Image',
    role: 'img',
    // 确保装饰性图片不被屏幕阅读器读取
    ...((!props.alt || props.alt.trim() === '') && {
      'aria-hidden': 'true',
      alt: ''
    }),
    // 为有意义的图片提供更详细的描述
    ...(props.alt && props.alt.trim() && {
      'aria-describedby': `img-desc-${nanoid()}`
    })
  })
}

/**
 * 增强的表格组件，包含无障碍支持
 */
const A11yTable = (props: any) => {
  return h('div', {
    role: 'region',
    'aria-label': 'Table',
    class: 'a11y-table-wrapper',
    tabindex: 0
  }, [
    h('table', {
      ...props,
      role: 'table',
      'aria-label': 'Data table',
      class: `${props.class || ''} a11y-table`
    }, props.children)
  ])
}

/**
 * 增强的列表组件，包含无障碍支持
 */
const A11yList = (props: any, listType: 'ul' | 'ol') => {
  const itemCount = props.children?.length || 0
  
  return h(listType, {
    ...props,
    role: 'list',
    'aria-label': `${listType === 'ol' ? 'Ordered' : 'Unordered'} list with ${itemCount} items`,
    class: `${props.class || ''} a11y-list`
  }, props.children?.map((child: any, index: number) => 
    h('li', {
      ...child.props,
      role: 'listitem',
      'aria-setsize': itemCount,
      'aria-posinset': index + 1,
      class: `${child.props?.class || ''} a11y-list-item`
    }, child.children)
  ))
}

/**
 * 增强的标题组件，包含无障碍支持
 */
const A11yHeading = (props: any, level: number) => {
  const headingTag = `h${level}` as keyof HTMLElementTagNameMap
  
  return h(headingTag, {
    ...props,
    role: 'heading',
    'aria-level': level,
    'aria-label': `Heading level ${level}: ${props.children?.[0] || ''}`,
    class: `${props.class || ''} a11y-heading`,
    // 添加跳转锚点
    id: props.id || `heading-${nanoid()}`,
    tabindex: 0
  }, props.children)
}

/**
 * 增强的引用块组件，包含无障碍支持
 */
const A11yBlockquote = (props: any) => {
  return h('blockquote', {
    ...props,
    role: 'blockquote',
    'aria-label': 'Quote',
    class: `${props.class || ''} a11y-blockquote`,
    tabindex: 0
  }, [
    h('div', {
      class: 'sr-only'
    }, t('accessibility.content.blockquoteStart')),
    ...props.children,
    h('div', {
      class: 'sr-only'
    }, t('accessibility.content.blockquoteEnd'))
  ])
}

/**
 * 增强的节点组件映射
 */
const enhancedNodeComponents = computed(() => ({
  reference: ReferenceNode,
  
  // 代码块增强
  code_block: A11yCodeBlock,
  pre: A11yCodeBlock,
  
  // 链接增强
  a: A11yLink,
  
  // 图片增强
  img: A11yImage,
  
  // 表格增强
  table: A11yTable,
  
  // 列表增强
  ul: (props: any) => A11yList(props, 'ul'),
  ol: (props: any) => A11yList(props, 'ol'),
  
  // 标题增强
  h1: (props: any) => A11yHeading(props, 1),
  h2: (props: any) => A11yHeading(props, 2),
  h3: (props: any) => A11yHeading(props, 3),
  h4: (props: any) => A11yHeading(props, 4),
  h5: (props: any) => A11yHeading(props, 5),
  h6: (props: any) => A11yHeading(props, 6),
  
  // 引用块增强
  blockquote: A11yBlockquote
}))

// 监听内容变化，通知屏幕阅读器
watch(() => props.content, (newContent, oldContent) => {
  if (props.announceChanges && newContent !== oldContent) {
    if (newContent.length > oldContent.length) {
      // 内容增加
      announcePolite(t('accessibility.messages.messageComplete'))
    }
  }
}, { immediate: false })
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
 * A11y Markdown 包装器
 */
.a11y-markdown-wrapper {
  outline: none;
}

.a11y-markdown-wrapper:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/**
 * 增强的代码块样式
 */
.a11y-code-block-wrapper {
  position: relative;
}

.a11y-code-block-wrapper:focus-within {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/**
 * 增强的表格样式
 */
.a11y-table-wrapper {
  outline: none;
  border-radius: 4px;
  overflow: auto;
}

.a11y-table-wrapper:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.a11y-table {
  width: 100%;
  border-collapse: collapse;
}

.a11y-table th,
.a11y-table td {
  border: 1px solid var(--color-border);
  padding: 0.5rem;
  text-align: left;
}

.a11y-table th {
  background-color: var(--color-muted);
  font-weight: 600;
}

/**
 * 增强的列表样式
 */
.a11y-list {
  list-style: none;
  padding-left: 0;
}

.a11y-list-item {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.25rem;
}

.a11y-list-item:before {
  content: counter(list-counter);
  position: absolute;
  left: 0;
  top: 0;
  font-weight: 600;
  color: var(--color-muted-foreground);
}

/**
 * 增强的标题样式
 */
.a11y-heading {
  outline: none;
  scroll-margin-top: 2rem;
}

.a11y-heading:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/**
 * 增强的引用块样式
 */
.a11y-blockquote {
  outline: none;
  border-left: 4px solid var(--color-primary);
  padding-left: 1rem;
  margin-left: 0;
  font-style: italic;
}

.a11y-blockquote:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/**
 * 通用的焦点指示器增强
 */
.prose a:focus-visible,
.prose button:focus-visible,
.prose [tabindex]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 2px;
}

/**
 * 高对比度支持
 */
@media (prefers-contrast: high) {
  .a11y-markdown-wrapper {
    --color-border: #000;
    --color-text: #000;
    --color-background: #fff;
  }
  
  .dark .a11y-markdown-wrapper {
    --color-border: #fff;
    --color-text: #fff;
    --color-background: #000;
  }
}

/**
 * 减少动画支持
 */
@media (prefers-reduced-motion: reduce) {
  .a11y-markdown-wrapper *,
  .a11y-markdown-wrapper *::before,
  .a11y-markdown-wrapper *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/**
 * 修复原有 prose 样式中的问题
 */
.prose {
  li p {
    @apply py-0 my-0;
  }

  hr {
    margin-block-start: 0.5em;
    margin-block-end: 0.5em;
    margin-inline-start: auto;
    margin-inline-end: auto;
  }

  a .markdown-renderer {
    @apply inline;
  }
}
</style>