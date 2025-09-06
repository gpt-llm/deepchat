import { ref, computed, reactive } from 'vue'
import { useAccessibilityStore } from '@/stores/accessibility'
import type { AccessibilitySettings } from '@shared/accessibility'

export interface ColorContrastResult {
  ratio: number
  level: 'Fail' | 'AA' | 'AAA'
  normalText: boolean
  largeText: boolean
  nonTextUI: boolean
}

export interface ColorInfo {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  luminance: number
}

export interface ContrastCheck {
  foreground: ColorInfo
  background: ColorInfo
  result: ColorContrastResult
  recommendation?: string
}

// WCAG contrast ratio thresholds
const CONTRAST_THRESHOLDS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
  NON_TEXT: 3
} as const

export function useColorContrast() {
  const accessibilityStore = useAccessibilityStore()
  
  // Current contrast check result
  const currentCheck = ref<ContrastCheck | null>(null)
  
  // History of contrast checks
  const checkHistory = reactive<ContrastCheck[]>([])
  
  // Current contrast level from accessibility settings
  const requiredLevel = computed(() => 
    accessibilityStore.settings.visual.contrastLevel
  )
  
  // Convert hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255
    g /= 255
    b /= 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    
    if (max === min) {
      h = s = 0 // achromatic
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
        default: h = 0
      }
      h /= 6
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }
  
  // Calculate relative luminance according to WCAG 2.1
  const getRelativeLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }
  
  // Calculate contrast ratio between two colors
  const calculateContrastRatio = (color1: ColorInfo, color2: ColorInfo): number => {
    const l1 = Math.max(color1.luminance, color2.luminance)
    const l2 = Math.min(color1.luminance, color2.luminance)
    return (l1 + 0.05) / (l2 + 0.05)
  }
  
  // Create ColorInfo object from hex color
  const createColorInfo = (hex: string): ColorInfo | null => {
    const rgb = hexToRgb(hex)
    if (!rgb) return null
    
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b)
    
    return {
      hex: hex.toUpperCase(),
      rgb,
      hsl,
      luminance
    }
  }
  
  // Determine contrast level based on ratio and requirements
  const determineContrastLevel = (ratio: number): ColorContrastResult => {
    const normalTextAA = ratio >= CONTRAST_THRESHOLDS.AA_NORMAL
    const largeTextAA = ratio >= CONTRAST_THRESHOLDS.AA_LARGE
    const normalTextAAA = ratio >= CONTRAST_THRESHOLDS.AAA_NORMAL
    const largeTextAAA = ratio >= CONTRAST_THRESHOLDS.AAA_LARGE
    const nonTextUI = ratio >= CONTRAST_THRESHOLDS.NON_TEXT
    
    let level: 'Fail' | 'AA' | 'AAA' = 'Fail'
    
    if (normalTextAAA && largeTextAAA) {
      level = 'AAA'
    } else if (normalTextAA && largeTextAA) {
      level = 'AA'
    }
    
    return {
      ratio,
      level,
      normalText: level === 'AAA' ? normalTextAAA : normalTextAA,
      largeText: level === 'AAA' ? largeTextAAA : largeTextAA,
      nonTextUI
    }
  }
  
  // Check contrast between two colors
  const checkContrast = (foregroundHex: string, backgroundHex: string): ContrastCheck | null => {
    const foreground = createColorInfo(foregroundHex)
    const background = createColorInfo(backgroundHex)
    
    if (!foreground || !background) {
      return null
    }
    
    const ratio = calculateContrastRatio(foreground, background)
    const result = determineContrastLevel(ratio)
    
    const check: ContrastCheck = {
      foreground,
      background,
      result,
      recommendation: generateRecommendation(result, requiredLevel.value)
    }
    
    currentCheck.value = check
    
    // Add to history (keep last 10 checks)
    checkHistory.unshift(check)
    if (checkHistory.length > 10) {
      checkHistory.pop()
    }
    
    return check
  }
  
  // Generate recommendation based on contrast result
  const generateRecommendation = (result: ColorContrastResult, requiredLevel: AccessibilitySettings['visual']['contrastLevel']): string => {
    const required = requiredLevel === 'AAA' ? CONTRAST_THRESHOLDS.AAA_NORMAL : CONTRAST_THRESHOLDS.AA_NORMAL
    
    if (result.ratio >= required) {
      return `Excellent contrast ratio of ${result.ratio.toFixed(2)}:1 meets ${result.level} standards.`
    }
    
    if (result.level === 'AA' && requiredLevel === 'AAA') {
      return `Good contrast ratio of ${result.ratio.toFixed(2)}:1 meets AA standards but falls short of AAA (${CONTRAST_THRESHOLDS.AAA_NORMAL}:1 required).`
    }
    
    if (result.level === 'Fail') {
      return `Poor contrast ratio of ${result.ratio.toFixed(2)}:1. Minimum ${required}:1 required for ${requiredLevel} compliance.`
    }
    
    return `Contrast ratio of ${result.ratio.toFixed(2)}:1 meets ${result.level} standards.`
  }
  
  // Get contrast ratio for CSS color values
  const checkCSSColors = (foreground: string, background: string): ContrastCheck | null => {
    // Convert CSS color formats to hex if needed
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return null
    
    // Helper to convert any CSS color to hex
    const cssToHex = (color: string): string => {
      ctx.fillStyle = color
      return ctx.fillStyle
    }
    
    try {
      const fgHex = cssToHex(foreground)
      const bgHex = cssToHex(background)
      
      return checkContrast(fgHex, bgHex)
    } catch (error) {
      console.error('Failed to parse CSS colors:', error)
      return null
    }
  }
  
  // Check contrast of current DOM element
  const checkElementContrast = (element: HTMLElement): ContrastCheck | null => {
    const styles = window.getComputedStyle(element)
    const color = styles.color
    const backgroundColor = styles.backgroundColor
    
    // Handle transparent backgrounds by finding the first non-transparent parent
    let bgColor = backgroundColor
    if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
      let parent = element.parentElement
      while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
        const parentStyles = window.getComputedStyle(parent)
        bgColor = parentStyles.backgroundColor
        parent = parent.parentElement
      }
      
      // Default to white if no background found
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        bgColor = '#ffffff'
      }
    }
    
    return checkCSSColors(color, bgColor)
  }
  
  // Scan page for contrast issues
  const scanPageContrast = (): ContrastCheck[] => {
    const issues: ContrastCheck[] = []
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label, input, textarea')
    
    textElements.forEach(element => {
      const check = checkElementContrast(element as HTMLElement)
      if (check && check.result.level === 'Fail') {
        issues.push(check)
      }
    })
    
    return issues
  }
  
  // Generate accessible color suggestions
  const suggestAccessibleColors = (baseColor: string, targetRatio: number = CONTRAST_THRESHOLDS.AA_NORMAL): string[] => {
    const suggestions: string[] = []
    const base = createColorInfo(baseColor)
    
    if (!base) return suggestions
    
    // Generate darker and lighter variations
    const { h, s } = base.hsl
    
    for (let l = 0; l <= 100; l += 5) {
      const testHex = hslToHex(h, s, l)
      const testColor = createColorInfo(testHex)
      
      if (testColor) {
        const ratio = calculateContrastRatio(base, testColor)
        if (ratio >= targetRatio) {
          suggestions.push(testHex)
        }
      }
    }
    
    return suggestions.slice(0, 5) // Return top 5 suggestions
  }
  
  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }
  
  // Format contrast ratio for display
  const formatRatio = (ratio: number): string => {
    return `${ratio.toFixed(2)}:1`
  }
  
  // Get WCAG level text
  const getWCAGLevelText = (level: 'Fail' | 'AA' | 'AAA'): string => {
    switch (level) {
      case 'Fail': return 'Does not meet WCAG standards'
      case 'AA': return 'Meets WCAG AA standards'
      case 'AAA': return 'Meets WCAG AAA standards (Enhanced)'
    }
  }
  
  // Export check results to JSON
  const exportCheckResults = (): string => {
    return JSON.stringify({
      currentCheck: currentCheck.value,
      history: checkHistory,
      requiredLevel: requiredLevel.value,
      timestamp: new Date().toISOString()
    }, null, 2)
  }
  
  // Clear check history
  const clearHistory = () => {
    checkHistory.splice(0, checkHistory.length)
    currentCheck.value = null
  }
  
  return {
    // State
    currentCheck,
    checkHistory,
    requiredLevel,
    
    // Core functions
    checkContrast,
    checkCSSColors,
    checkElementContrast,
    scanPageContrast,
    
    // Utilities
    calculateContrastRatio,
    determineContrastLevel,
    suggestAccessibleColors,
    formatRatio,
    getWCAGLevelText,
    
    // Data management
    exportCheckResults,
    clearHistory,
    
    // Constants
    CONTRAST_THRESHOLDS
  }
}