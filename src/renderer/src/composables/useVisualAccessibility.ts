import { computed, onMounted } from 'vue'
import { useAccessibilityStore } from '@/stores/accessibility'
import { useFontScaling } from './useFontScaling'
import { useColorContrast } from './useColorContrast'
import { useReducedMotion } from './useReducedMotion'

/**
 * Unified visual accessibility composable
 * Combines font scaling, color contrast, and reduced motion features
 */
export function useVisualAccessibility() {
  const accessibilityStore = useAccessibilityStore()
  const fontScaling = useFontScaling()
  const colorContrast = useColorContrast()
  const reducedMotion = useReducedMotion()
  
  // Combined visual accessibility state
  const visualState = computed(() => ({
    highContrast: accessibilityStore.isHighContrastEnabled,
    reducedMotion: accessibilityStore.isReducedMotionEnabled,
    fontSize: accessibilityStore.currentFontSize,
    focusStyle: accessibilityStore.settings.visual.focusIndicatorStyle,
    contrastLevel: accessibilityStore.settings.visual.contrastLevel
  }))
  
  // Check if visual enhancements are active
  const hasVisualEnhancements = computed(() => 
    visualState.value.highContrast ||
    visualState.value.reducedMotion ||
    visualState.value.fontSize !== 'normal' ||
    visualState.value.focusStyle !== 'default'
  )
  
  // Get accessibility summary for display
  const getAccessibilitySummary = () => ({
    visual: visualState.value,
    font: fontScaling.getFontSizeInfo(),
    motion: reducedMotion.getMotionPreferenceInfo(),
    enhancements: hasVisualEnhancements.value
  })
  
  // Quick accessibility improvements
  const applyQuickImprovements = async () => {
    const improvements = []
    
    // Enable high contrast if system prefers it or if contrast issues detected
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      await accessibilityStore.updateVisualSettings({ highContrast: true })
      improvements.push('High contrast enabled')
    }
    
    // Enable reduced motion if system prefers it
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await accessibilityStore.updateVisualSettings({ reducedMotion: true })
      improvements.push('Reduced motion enabled')
    }
    
    // Suggest larger font size on smaller screens
    if (window.innerWidth < 768 && visualState.value.fontSize === 'small') {
      await fontScaling.setFontSize('normal')
      improvements.push('Font size adjusted for mobile')
    }
    
    // Enable enhanced focus for keyboard users
    const hasKeyboard = await detectKeyboardUsage()
    if (hasKeyboard && visualState.value.focusStyle === 'default') {
      await accessibilityStore.updateVisualSettings({ focusIndicatorStyle: 'thick' })
      improvements.push('Enhanced focus indicators enabled')
    }
    
    return improvements
  }
  
  // Detect keyboard usage patterns
  const detectKeyboardUsage = (): Promise<boolean> => {
    return new Promise((resolve) => {
      let keyboardDetected = false
      
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Tab' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          keyboardDetected = true
          document.removeEventListener('keydown', handleKeydown)
          resolve(true)
        }
      }
      
      const handleMousedown = () => {
        document.removeEventListener('mousedown', handleMousedown)
        document.removeEventListener('keydown', handleKeydown)
        if (!keyboardDetected) {
          resolve(false)
        }
      }
      
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('mousedown', handleMousedown)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        document.removeEventListener('keydown', handleKeydown)
        document.removeEventListener('mousedown', handleMousedown)
        resolve(keyboardDetected)
      }, 5000)
    })
  }
  
  // Run accessibility audit on current page
  const auditPageAccessibility = () => {
    const issues = []
    
    // Check color contrast issues
    const contrastIssues = colorContrast.scanPageContrast()
    if (contrastIssues.length > 0) {
      issues.push({
        type: 'contrast',
        severity: 'high',
        count: contrastIssues.length,
        message: `${contrastIssues.length} elements have insufficient color contrast`
      })
    }
    
    // Check for missing focus indicators
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, select, [tabindex]')
    let focusIssues = 0
    
    interactiveElements.forEach(element => {
      const styles = window.getComputedStyle(element as HTMLElement)
      if (!styles.outlineStyle || styles.outlineStyle === 'none') {
        focusIssues++
      }
    })
    
    if (focusIssues > 0) {
      issues.push({
        type: 'focus',
        severity: 'medium',
        count: focusIssues,
        message: `${focusIssues} interactive elements may lack proper focus indicators`
      })
    }
    
    // Check for motion sensitivity
    const animatedElements = document.querySelectorAll('[style*="animation"], [style*="transition"], .animate')
    if (animatedElements.length > 0 && !reducedMotion.shouldReduceMotion) {
      issues.push({
        type: 'motion',
        severity: 'low',
        count: animatedElements.length,
        message: `${animatedElements.length} animated elements found. Consider enabling reduced motion.`
      })
    }
    
    return issues
  }
  
  // Generate accessibility report
  const generateAccessibilityReport = () => {
    const audit = auditPageAccessibility()
    const summary = getAccessibilitySummary()
    
    return {
      timestamp: new Date().toISOString(),
      summary,
      audit,
      recommendations: generateRecommendations(audit),
      score: calculateAccessibilityScore(audit)
    }
  }
  
  // Generate recommendations based on audit
  const generateRecommendations = (issues: any[]) => {
    const recommendations = []
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'contrast':
          recommendations.push({
            action: 'Enable high contrast mode',
            description: 'Improves text readability for users with visual impairments',
            priority: 'high'
          })
          break
        case 'focus':
          recommendations.push({
            action: 'Use enhanced focus indicators',
            description: 'Makes keyboard navigation clearer and more accessible',
            priority: 'medium'
          })
          break
        case 'motion':
          recommendations.push({
            action: 'Consider enabling reduced motion',
            description: 'Prevents motion sickness and distraction for sensitive users',
            priority: 'low'
          })
          break
      }
    })
    
    return recommendations
  }
  
  // Calculate accessibility score (0-100)
  const calculateAccessibilityScore = (issues: any[]) => {
    let score = 100
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= Math.min(30, issue.count * 5)
          break
        case 'medium':
          score -= Math.min(20, issue.count * 2)
          break
        case 'low':
          score -= Math.min(10, issue.count * 1)
          break
      }
    })
    
    return Math.max(0, score)
  }
  
  // Initialize visual accessibility features
  const initializeVisualAccessibility = async () => {
    // Apply quick improvements on first load
    const improvements = await applyQuickImprovements()
    
    if (improvements.length > 0) {
      accessibilityStore.announceMessage(
        `Applied ${improvements.length} accessibility improvements: ${improvements.join(', ')}`,
        'polite'
      )
    }
    
    // Run initial audit
    const report = generateAccessibilityReport()
    
    // Log results for debugging
    console.log('Visual Accessibility Report:', report)
    
    return report
  }
  
  // Setup
  onMounted(() => {
    // Initialize with a slight delay to allow DOM to settle
    setTimeout(() => {
      initializeVisualAccessibility()
    }, 1000)
  })
  
  return {
    // State
    visualState,
    hasVisualEnhancements,
    
    // Composable integration
    fontScaling,
    colorContrast,
    reducedMotion,
    
    // Utility functions
    getAccessibilitySummary,
    applyQuickImprovements,
    auditPageAccessibility,
    generateAccessibilityReport,
    
    // Initialization
    initializeVisualAccessibility
  }
}