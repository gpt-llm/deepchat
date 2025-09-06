import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAccessibilityStore } from '@/stores/accessibility'
import type { AccessibilitySettings } from '@shared/accessibility'

export type FontSize = AccessibilitySettings['visual']['fontSize']
export type FontScale = {
  scale: number
  class: string
  label: string
}

// Font scaling configurations
const FONT_SCALES: Record<FontSize, FontScale> = {
  small: { scale: 0.875, class: 'a11y-font-small', label: 'Small (14px)' },
  normal: { scale: 1, class: 'a11y-font-normal', label: 'Normal (16px)' },
  large: { scale: 1.125, class: 'a11y-font-large', label: 'Large (18px)' },
  'extra-large': { scale: 1.25, class: 'a11y-font-extra-large', label: 'Extra Large (20px)' }
}

// Font size order for keyboard navigation
const FONT_SIZE_ORDER: FontSize[] = ['small', 'normal', 'large', 'extra-large']

// Minimum and maximum font sizes (in rem)
const MIN_FONT_SIZE = 0.75 // 12px
const MAX_FONT_SIZE = 1.5 // 24px

export function useFontScaling() {
  const accessibilityStore = useAccessibilityStore()

  // Current font size from accessibility store
  const currentFontSize = computed(() => accessibilityStore.currentFontSize)

  // Current font scale configuration
  const currentScale = computed(() => FONT_SCALES[currentFontSize.value])

  // Dynamic font size for responsive scaling (in rem)
  const dynamicFontSize = ref(1)

  // Available font size options
  const fontSizeOptions = computed(() =>
    Object.entries(FONT_SCALES).map(([size, config]) => ({
      value: size as FontSize,
      label: config.label,
      scale: config.scale
    }))
  )

  // Check if can increase/decrease font size
  const canIncrease = computed(() => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(currentFontSize.value)
    return currentIndex < FONT_SIZE_ORDER.length - 1 && dynamicFontSize.value < MAX_FONT_SIZE
  })

  const canDecrease = computed(() => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(currentFontSize.value)
    return currentIndex > 0 && dynamicFontSize.value > MIN_FONT_SIZE
  })

  // Set font size by name
  const setFontSize = async (fontSize: FontSize) => {
    try {
      await accessibilityStore.updateVisualSettings({ fontSize })
      dynamicFontSize.value = FONT_SCALES[fontSize].scale
      applyFontSize(fontSize)
    } catch (error) {
      console.error('Failed to set font size:', error)
    }
  }

  // Increase font size
  const increaseFontSize = async () => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(currentFontSize.value)
    if (canIncrease.value && currentIndex < FONT_SIZE_ORDER.length - 1) {
      const nextSize = FONT_SIZE_ORDER[currentIndex + 1]
      await setFontSize(nextSize)
    } else if (dynamicFontSize.value < MAX_FONT_SIZE) {
      // Fine-grained scaling
      const newSize = Math.min(dynamicFontSize.value + 0.125, MAX_FONT_SIZE)
      await scaleFontSize(newSize)
    }
  }

  // Decrease font size
  const decreaseFontSize = async () => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(currentFontSize.value)
    if (canDecrease.value && currentIndex > 0) {
      const prevSize = FONT_SIZE_ORDER[currentIndex - 1]
      await setFontSize(prevSize)
    } else if (dynamicFontSize.value > MIN_FONT_SIZE) {
      // Fine-grained scaling
      const newSize = Math.max(dynamicFontSize.value - 0.125, MIN_FONT_SIZE)
      await scaleFontSize(newSize)
    }
  }

  // Reset to normal font size
  const resetFontSize = async () => {
    await setFontSize('normal')
  }

  // Scale font size dynamically (for Ctrl +/- behavior)
  const scaleFontSize = async (scale: number) => {
    const clampedScale = Math.max(MIN_FONT_SIZE, Math.min(scale, MAX_FONT_SIZE))
    dynamicFontSize.value = clampedScale

    // Apply dynamic scaling to root element
    const root = document.documentElement
    root.style.fontSize = `${clampedScale}rem`

    // Update accessibility store with closest matching preset
    const closestSize = findClosestFontSize(clampedScale)
    if (closestSize !== currentFontSize.value) {
      await accessibilityStore.updateVisualSettings({ fontSize: closestSize })
    }
  }

  // Find closest preset font size for a given scale
  const findClosestFontSize = (scale: number): FontSize => {
    let closest = 'normal' as FontSize
    let minDiff = Math.abs(FONT_SCALES.normal.scale - scale)

    for (const [size, config] of Object.entries(FONT_SCALES)) {
      const diff = Math.abs(config.scale - scale)
      if (diff < minDiff) {
        minDiff = diff
        closest = size as FontSize
      }
    }

    return closest
  }

  // Apply font size classes to DOM
  const applyFontSize = (fontSize: FontSize) => {
    const root = document.documentElement

    // Remove existing font size classes
    Object.values(FONT_SCALES).forEach((config) => {
      root.classList.remove(config.class)
    })

    // Add current font size class
    root.classList.add(FONT_SCALES[fontSize].class)

    // Set CSS custom property for dynamic scaling
    root.style.setProperty('--font-scale', FONT_SCALES[fontSize].scale.toString())

    // Announce change to screen readers
    accessibilityStore.announceMessage(
      `Font size changed to ${FONT_SCALES[fontSize].label}`,
      'polite'
    )
  }

  // Handle keyboard shortcuts for font scaling
  const handleKeyboardShortcut = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault()
          increaseFontSize()
          break
        case '-':
          event.preventDefault()
          decreaseFontSize()
          break
        case '0':
          event.preventDefault()
          resetFontSize()
          break
      }
    }
  }

  // Get font size info for display
  const getFontSizeInfo = () => ({
    current: currentFontSize.value,
    scale: currentScale.value,
    dynamicSize: dynamicFontSize.value,
    canIncrease: canIncrease.value,
    canDecrease: canDecrease.value,
    options: fontSizeOptions.value
  })

  // Apply responsive font scaling based on viewport size
  const applyResponsiveFontScaling = () => {
    const viewport = window.innerWidth
    let responsiveScale = 1

    // Adjust base font size based on viewport
    if (viewport < 640) {
      // sm breakpoint
      responsiveScale = 0.9
    } else if (viewport < 768) {
      // md breakpoint
      responsiveScale = 0.95
    } else if (viewport > 1536) {
      // 2xl breakpoint
      responsiveScale = 1.05
    }

    const baseScale = FONT_SCALES[currentFontSize.value].scale
    const finalScale = baseScale * responsiveScale

    document.documentElement.style.setProperty('--font-scale-responsive', finalScale.toString())
  }

  // Handle window resize for responsive scaling
  const handleResize = () => {
    applyResponsiveFontScaling()
  }

  // Initialize font scaling
  const initializeFontScaling = () => {
    dynamicFontSize.value = FONT_SCALES[currentFontSize.value].scale
    applyFontSize(currentFontSize.value)
    applyResponsiveFontScaling()
  }

  // Setup event listeners
  onMounted(() => {
    document.addEventListener('keydown', handleKeyboardShortcut)
    window.addEventListener('resize', handleResize)
    initializeFontScaling()
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyboardShortcut)
    window.removeEventListener('resize', handleResize)
  })

  return {
    // State
    currentFontSize,
    currentScale,
    dynamicFontSize,
    fontSizeOptions,
    canIncrease,
    canDecrease,

    // Actions
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    scaleFontSize,

    // Utilities
    getFontSizeInfo,
    applyResponsiveFontScaling,

    // Constants
    FONT_SCALES,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE
  }
}
