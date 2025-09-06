import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAccessibilityStore } from '@/stores/accessibility'

export interface MotionPreference {
  reducedMotion: boolean
  systemPreference: boolean
  userOverride: boolean
}

export interface AnimationConfig {
  duration: number
  easing: string
  enabled: boolean
}

// Default animation configurations
const DEFAULT_ANIMATIONS: Record<string, AnimationConfig> = {
  fast: { duration: 150, easing: 'ease-out', enabled: true },
  normal: { duration: 300, easing: 'ease-in-out', enabled: true },
  slow: { duration: 500, easing: 'ease-in', enabled: true },
  fade: { duration: 200, easing: 'ease-in-out', enabled: true },
  slide: { duration: 350, easing: 'ease-out', enabled: true },
  scale: { duration: 200, easing: 'ease-out', enabled: true },
  bounce: { duration: 600, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', enabled: true },
  spring: { duration: 400, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)', enabled: true }
}

// Reduced motion equivalents (much shorter durations, linear easing)
const REDUCED_ANIMATIONS: Record<string, AnimationConfig> = {
  fast: { duration: 0, easing: 'linear', enabled: false },
  normal: { duration: 0, easing: 'linear', enabled: false },
  slow: { duration: 0, easing: 'linear', enabled: false },
  fade: { duration: 50, easing: 'linear', enabled: true },
  slide: { duration: 0, easing: 'linear', enabled: false },
  scale: { duration: 0, easing: 'linear', enabled: false },
  bounce: { duration: 0, easing: 'linear', enabled: false },
  spring: { duration: 0, easing: 'linear', enabled: false }
}

export function useReducedMotion() {
  const accessibilityStore = useAccessibilityStore()

  // System preference for reduced motion
  const systemPrefersReducedMotion = ref(false)

  // Media query for reduced motion
  let mediaQuery: MediaQueryList | null = null

  // Current motion preference
  const motionPreference = computed<MotionPreference>(() => ({
    reducedMotion: accessibilityStore.isReducedMotionEnabled,
    systemPreference: systemPrefersReducedMotion.value,
    userOverride: accessibilityStore.isReducedMotionEnabled && !systemPrefersReducedMotion.value
  }))

  // Whether animations should be reduced
  const shouldReduceMotion = computed(
    () => accessibilityStore.isReducedMotionEnabled || systemPrefersReducedMotion.value
  )

  // Current animation configuration
  const animationConfig = computed(() =>
    shouldReduceMotion.value ? REDUCED_ANIMATIONS : DEFAULT_ANIMATIONS
  )

  // Get animation settings for a specific type
  const getAnimation = (type: keyof typeof DEFAULT_ANIMATIONS): AnimationConfig => {
    return animationConfig.value[type] || DEFAULT_ANIMATIONS.normal
  }

  // Create transition string for CSS
  const createTransition = (
    property: string = 'all',
    type: keyof typeof DEFAULT_ANIMATIONS = 'normal'
  ): string => {
    const config = getAnimation(type)
    if (!config.enabled) return 'none'

    return `${property} ${config.duration}ms ${config.easing}`
  }

  // Apply reduced motion settings to DOM
  const applyReducedMotionSettings = (enabled: boolean) => {
    const root = document.documentElement

    if (enabled) {
      root.classList.add('a11y-reduced-motion')
      root.style.setProperty('--motion-duration-fast', '0ms')
      root.style.setProperty('--motion-duration-normal', '0ms')
      root.style.setProperty('--motion-duration-slow', '0ms')
      root.style.setProperty('--motion-easing', 'linear')
    } else {
      root.classList.remove('a11y-reduced-motion')
      root.style.setProperty('--motion-duration-fast', '150ms')
      root.style.setProperty('--motion-duration-normal', '300ms')
      root.style.setProperty('--motion-duration-slow', '500ms')
      root.style.setProperty('--motion-easing', 'ease-in-out')
    }

    // Dispatch custom event for components to listen to
    const event = new CustomEvent('motion-preference-changed', {
      detail: { reducedMotion: enabled }
    })
    document.dispatchEvent(event)
  }

  // Toggle reduced motion setting
  const toggleReducedMotion = async () => {
    const newValue = !accessibilityStore.isReducedMotionEnabled
    await accessibilityStore.updateVisualSettings({ reducedMotion: newValue })

    // Announce change to screen readers
    accessibilityStore.announceMessage(
      newValue ? 'Reduced motion enabled' : 'Reduced motion disabled',
      'polite'
    )
  }

  // Enable reduced motion
  const enableReducedMotion = async () => {
    if (!accessibilityStore.isReducedMotionEnabled) {
      await accessibilityStore.updateVisualSettings({ reducedMotion: true })
      accessibilityStore.announceMessage('Reduced motion enabled', 'polite')
    }
  }

  // Disable reduced motion
  const disableReducedMotion = async () => {
    if (accessibilityStore.isReducedMotionEnabled) {
      await accessibilityStore.updateVisualSettings({ reducedMotion: false })
      accessibilityStore.announceMessage('Reduced motion disabled', 'polite')
    }
  }

  // Check if a specific animation should be played
  const shouldAnimate = (type?: keyof typeof DEFAULT_ANIMATIONS): boolean => {
    if (shouldReduceMotion.value) return false
    if (!type) return true

    const config = getAnimation(type)
    return config.enabled && config.duration > 0
  }

  // Get safe animation duration (respects reduced motion)
  const getSafeDuration = (
    normalDuration: number,
    type?: keyof typeof DEFAULT_ANIMATIONS
  ): number => {
    if (shouldReduceMotion.value) {
      // Allow very short fades for essential feedback
      if (type === 'fade') return Math.min(normalDuration, 50)
      return 0
    }

    return normalDuration
  }

  // Create a CSS animation object that respects motion preferences
  const createSafeAnimation = (
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions & { type?: keyof typeof DEFAULT_ANIMATIONS } = {}
  ): KeyframeAnimationOptions => {
    const { type = 'normal', ...animationOptions } = options
    const config = getAnimation(type)

    return {
      ...animationOptions,
      duration: config.duration,
      easing: config.easing,
      fill: animationOptions.fill || 'both'
    }
  }

  // Wrap Web Animations API with motion preference awareness
  const safeAnimate = (
    element: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions & { type?: keyof typeof DEFAULT_ANIMATIONS } = {}
  ): Animation | null => {
    if (!shouldAnimate(options.type)) {
      // Apply final state immediately
      if (keyframes.length > 0) {
        const finalFrame = keyframes[keyframes.length - 1]
        Object.assign(element as HTMLElement, finalFrame)
      }
      return null
    }

    const safeOptions = createSafeAnimation(keyframes, options)
    return element.animate(keyframes, safeOptions)
  }

  // Create CSS transition with motion preference awareness
  const safeTransition = (
    element: HTMLElement,
    property: string = 'all',
    type: keyof typeof DEFAULT_ANIMATIONS = 'normal'
  ) => {
    const transition = createTransition(property, type)
    element.style.transition = transition
  }

  // Handle system preference changes
  const handleSystemPreferenceChange = (event: MediaQueryListEvent) => {
    systemPrefersReducedMotion.value = event.matches

    // Apply system preference if user hasn't overridden
    if (!accessibilityStore.settings.visual.reducedMotion) {
      applyReducedMotionSettings(event.matches)
    }
  }

  // Get motion preference info for display
  const getMotionPreferenceInfo = () => ({
    current: motionPreference.value,
    shouldReduce: shouldReduceMotion.value,
    animations: animationConfig.value,
    system: systemPrefersReducedMotion.value
  })

  // Preload critical CSS for reduced motion
  const _preloadReducedMotionCSS = () => {
    const style = document.createElement('style')
    style.textContent = `
      .prefers-reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `
    document.head.appendChild(style)
  }

  // Initialize media query listener
  const initializeMediaQuery = () => {
    try {
      mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      systemPrefersReducedMotion.value = mediaQuery.matches

      // Listen for changes
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemPreferenceChange)
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleSystemPreferenceChange)
      }
    } catch (error) {
      console.warn('Could not initialize reduced motion media query:', error)
    }
  }

  // Cleanup media query listener
  const cleanupMediaQuery = () => {
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemPreferenceChange)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleSystemPreferenceChange)
      }
    }
  }

  // Watch for changes in accessibility store settings
  watch(
    () => accessibilityStore.isReducedMotionEnabled,
    (newValue) => {
      applyReducedMotionSettings(newValue)
    },
    { immediate: true }
  )

  // Setup and cleanup
  onMounted(() => {
    initializeMediaQuery()
    applyReducedMotionSettings(shouldReduceMotion.value)
  })

  onUnmounted(() => {
    cleanupMediaQuery()
  })

  return {
    // State
    motionPreference,
    shouldReduceMotion,
    systemPrefersReducedMotion,
    animationConfig,

    // Actions
    toggleReducedMotion,
    enableReducedMotion,
    disableReducedMotion,

    // Animation utilities
    getAnimation,
    createTransition,
    shouldAnimate,
    getSafeDuration,
    createSafeAnimation,
    safeAnimate,
    safeTransition,

    // Information
    getMotionPreferenceInfo,

    // Constants
    DEFAULT_ANIMATIONS,
    REDUCED_ANIMATIONS
  }
}
