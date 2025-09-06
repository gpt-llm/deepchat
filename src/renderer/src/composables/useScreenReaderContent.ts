// import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 屏幕阅读器内容优化组合式函数
 * 
 * 提供专门针对屏幕阅读器优化的内容格式化功能
 * 包括代码块描述、链接说明、表格描述等
 */
export function useScreenReaderContent() {
  const { t } = useI18n()

  /**
   * 格式化代码块内容，为屏幕阅读器提供更好的描述
   * @param code 代码内容
   * @param language 编程语言
   * @param lineNumbers 是否显示行号
   * @returns 格式化后的代码描述
   */
  function formatCodeBlockForScreenReader(
    code: string, 
    language?: string, 
    lineNumbers: boolean = false
  ): string {
    const lines = code.split('\n')
    const totalLines = lines.length
    
    let description = t('accessibility.content.codeBlockStart')
    
    if (language) {
      description += '. ' + t('accessibility.content.codeLanguage', { language })
    }
    
    description += `. ${totalLines} lines of code.`
    
    if (lineNumbers && totalLines <= 20) {
      // 对于较短的代码块，提供逐行描述
      const lineDescriptions = lines.map((line, index) => {
        if (line.trim() === '') return `${t('accessibility.content.codeLineNumber', { number: index + 1 })}: empty line`
        return `${t('accessibility.content.codeLineNumber', { number: index + 1 })}: ${line.trim()}`
      }).join('. ')
      
      description += '. ' + lineDescriptions
    } else {
      // 对于较长的代码块，只提供概要
      description += '. ' + code.replace(/\s+/g, ' ').trim()
    }
    
    description += '. ' + t('accessibility.content.codeBlockEnd')
    
    return description
  }

  /**
   * 格式化链接内容，提供更好的上下文信息
   * @param href 链接地址
   * @param text 链接文本
   * @returns 格式化后的链接描述
   */
  function formatLinkForScreenReader(href: string, text?: string): string {
    const linkText = text || href
    let description = t('accessibility.content.linkDescription', { text: linkText })
    
    // 检测链接类型并提供额外上下文
    if (href.startsWith('mailto:')) {
      description += '. Email link'
    } else if (href.startsWith('tel:')) {
      description += '. Phone number link'
    } else if (href.startsWith('http')) {
      // 提取域名信息
      try {
        const domain = new URL(href).hostname
        description += `. External link to ${domain}`
      } catch {
        description += '. External link'
      }
    } else if (href.startsWith('#')) {
      description += '. Internal page link'
    } else if (href.includes('.pdf')) {
      description += '. PDF document link'
    } else if (href.includes('.doc') || href.includes('.docx')) {
      description += '. Word document link'
    } else if (href.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
      description += '. Image link'
    }
    
    return description
  }

  /**
   * 格式化图片内容，提供替代文本和描述
   * @param src 图片地址
   * @param alt 替代文本
   * @param caption 图片说明
   * @returns 格式化后的图片描述
   */
  function formatImageForScreenReader(src: string, alt?: string, caption?: string): string {
    let description = ''
    
    if (alt && alt.trim()) {
      description = t('accessibility.content.imageDescription', { alt })
    } else {
      // 如果没有alt文本，尝试从文件名推断
      try {
        const filename = src.split('/').pop()?.split('.')[0] || ''
        if (filename) {
          description = t('accessibility.content.imageDescription', { alt: `Image: ${filename}` })
        } else {
          description = t('accessibility.content.imageDescription', { alt: 'Unlabeled image' })
        }
      } catch {
        description = t('accessibility.content.imageDescription', { alt: 'Unlabeled image' })
      }
    }
    
    if (caption) {
      description += `. Caption: ${caption}`
    }
    
    // 检测图片类型
    if (src.includes('.svg')) {
      description += '. Vector graphic'
    } else if (src.match(/\.(jpg|jpeg)$/i)) {
      description += '. JPEG image'
    } else if (src.includes('.png')) {
      description += '. PNG image'
    } else if (src.includes('.gif')) {
      description += '. Animated GIF'
    } else if (src.includes('.webp')) {
      description += '. WebP image'
    }
    
    return description
  }

  /**
   * 格式化表格内容，提供结构化描述
   * @param tableHtml 表格HTML内容
   * @returns 格式化后的表格描述
   */
  function formatTableForScreenReader(tableHtml: string): string {
    // 简单的HTML解析来提取表格信息
    const parser = new DOMParser()
    const doc = parser.parseFromString(tableHtml, 'text/html')
    const table = doc.querySelector('table')
    
    if (!table) return 'Table content'
    
    const rows = table.querySelectorAll('tr')
    const firstRow = rows[0]
    const columns = firstRow?.querySelectorAll('td, th').length || 0
    const rowCount = rows.length
    
    let description = t('accessibility.content.tableDescription', { 
      rows: rowCount, 
      columns 
    })
    
    // 检查是否有表头
    const headers = table.querySelectorAll('th')
    if (headers.length > 0) {
      const headerTexts = Array.from(headers).map(th => th.textContent?.trim()).filter(Boolean)
      if (headerTexts.length > 0) {
        description += `. Headers: ${headerTexts.join(', ')}`
      }
    }
    
    // 对于小表格，提供内容摘要
    if (rowCount <= 5 && columns <= 4) {
      const cellContents: string[] = []
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td, th')
        cells.forEach((cell, cellIndex) => {
          const content = cell.textContent?.trim()
          if (content) {
            cellContents.push(`Row ${rowIndex + 1}, Column ${cellIndex + 1}: ${content}`)
          }
        })
      })
      
      if (cellContents.length > 0) {
        description += '. Content: ' + cellContents.join('. ')
      }
    }
    
    return description
  }

  /**
   * 格式化列表内容，提供结构化描述
   * @param listHtml 列表HTML内容
   * @param listType 列表类型 ('ul' | 'ol')
   * @returns 格式化后的列表描述
   */
  function formatListForScreenReader(listHtml: string, listType: 'ul' | 'ol' = 'ul'): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(listHtml, 'text/html')
    const list = doc.querySelector(listType)
    
    if (!list) return 'List content'
    
    const items = list.querySelectorAll('li')
    const itemCount = items.length
    
    let description = t('accessibility.content.listStart')
    description += `. ${itemCount} items.`
    
    // 为每个列表项提供描述
    items.forEach((item, index) => {
      const content = item.textContent?.trim()
      if (content) {
        const itemDesc = t('accessibility.content.listItem', { number: index + 1 })
        description += ` ${itemDesc}: ${content}.`
      }
    })
    
    description += ' ' + t('accessibility.content.listEnd')
    
    return description
  }

  /**
   * 格式化引用块内容
   * @param content 引用内容
   * @param citation 引用来源
   * @returns 格式化后的引用描述
   */
  function formatBlockquoteForScreenReader(content: string, citation?: string): string {
    let description = t('accessibility.content.blockquoteStart')
    description += `. ${content.trim()}`
    
    if (citation) {
      description += `. Citation: ${citation}`
    }
    
    description += '. ' + t('accessibility.content.blockquoteEnd')
    
    return description
  }

  /**
   * 格式化标题内容，提供层级信息
   * @param content 标题内容
   * @param level 标题层级 (1-6)
   * @returns 格式化后的标题描述
   */
  function formatHeadingForScreenReader(content: string, level: number): string {
    const levelDesc = t('accessibility.content.headingLevel', { level })
    return `${levelDesc}: ${content.trim()}`
  }

  /**
   * 格式化数学表达式
   * @param mathContent MathML或LaTeX内容
   * @returns 格式化后的数学表达式描述
   */
  function formatMathForScreenReader(mathContent: string): string {
    let description = t('accessibility.content.mathExpression')
    
    // 简单的数学符号替换，提供更好的语义
    let readableContent = mathContent
      .replace(/\+/g, ' plus ')
      .replace(/-/g, ' minus ')
      .replace(/\*/g, ' times ')
      .replace(/\//g, ' divided by ')
      .replace(/=/g, ' equals ')
      .replace(/\^/g, ' to the power of ')
      .replace(/sqrt/g, ' square root of ')
      .replace(/sum/g, ' sum ')
      .replace(/integral/g, ' integral ')
    
    description += `: ${readableContent}`
    
    return description
  }

  /**
   * 检测并格式化混合内容类型
   * @param htmlContent HTML内容
   * @returns 格式化后的内容描述
   */
  function formatMixedContentForScreenReader(htmlContent: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromHTML(htmlContent, 'text/html')
    
    const descriptions: string[] = []
    
    // 检测各种内容类型
    const codeBlocks = doc.querySelectorAll('pre, code')
    const links = doc.querySelectorAll('a[href]')
    const images = doc.querySelectorAll('img')
    const tables = doc.querySelectorAll('table')
    const lists = doc.querySelectorAll('ul, ol')
    const blockquotes = doc.querySelectorAll('blockquote')
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
    
    if (codeBlocks.length > 0) {
      descriptions.push(`${codeBlocks.length} code blocks`)
    }
    
    if (links.length > 0) {
      descriptions.push(`${links.length} links`)
    }
    
    if (images.length > 0) {
      descriptions.push(`${images.length} images`)
    }
    
    if (tables.length > 0) {
      descriptions.push(`${tables.length} tables`)
    }
    
    if (lists.length > 0) {
      descriptions.push(`${lists.length} lists`)
    }
    
    if (blockquotes.length > 0) {
      descriptions.push(`${blockquotes.length} quotes`)
    }
    
    if (headings.length > 0) {
      descriptions.push(`${headings.length} headings`)
    }
    
    if (descriptions.length > 0) {
      return `Content contains: ${descriptions.join(', ')}`
    }
    
    return t('accessibility.content.plainText')
  }

  /**
   * 清理HTML标签，保留纯文本用于屏幕阅读器
   * @param htmlContent HTML内容
   * @returns 清理后的纯文本
   */
  function stripHtmlForScreenReader(htmlContent: string): string {
    // 创建临时DOM元素来提取文本
    const temp = document.createElement('div')
    temp.innerHTML = htmlContent
    
    // 移除脚本和样式标签
    const scripts = temp.querySelectorAll('script, style')
    scripts.forEach(element => element.remove())
    
    // 返回纯文本内容
    return temp.textContent || temp.innerText || ''
  }

  return {
    formatCodeBlockForScreenReader,
    formatLinkForScreenReader,
    formatImageForScreenReader,
    formatTableForScreenReader,
    formatListForScreenReader,
    formatBlockquoteForScreenReader,
    formatHeadingForScreenReader,
    formatMathForScreenReader,
    formatMixedContentForScreenReader,
    stripHtmlForScreenReader
  }
}

/**
 * 全局单例实例
 */
export const globalScreenReaderContent = useScreenReaderContent()