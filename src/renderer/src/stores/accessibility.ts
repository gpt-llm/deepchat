import { defineStore } from 'pinia'
import { ref, computed, watch, readonly } from 'vue'
import type { AccessibilitySettings } from '@shared/accessibility'
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '@shared/accessibility'
import { usePresenter } from '@/composables/usePresenter'

// Function to apply accessibility settings to the DOM
const applyA11ySettings = (settings: AccessibilitySettings) => {
  const root = document.documentElement

  // Apply visual settings
  if (settings.visual.highContrast) {
    root.classList.add('a11y-high-contrast')
  } else {
    root.classList.remove('a11y-high-contrast')
  }

  if (settings.visual.reducedMotion) {
    root.classList.add('a11y-reduced-motion')
  } else {
    root.classList.remove('a11y-reduced-motion')
  }

  // Apply font size
  root.classList.remove(
    'a11y-font-small',
    'a11y-font-normal',
    'a11y-font-large',
    'a11y-font-extra-large'
  )
  root.classList.add(`a11y-font-${settings.visual.fontSize}`)

  // Apply focus indicator style
  root.classList.remove('a11y-focus-default', 'a11y-focus-thick', 'a11y-focus-high-contrast')
  root.classList.add(`a11y-focus-${settings.visual.focusIndicatorStyle}`)

  // Apply contrast level
  root.classList.remove('a11y-contrast-aa', 'a11y-contrast-aaa')
  root.classList.add(`a11y-contrast-${settings.visual.contrastLevel.toLowerCase()}`)

  // Apply keyboard navigation settings
  if (settings.keyboard.showFocusIndicators) {
    root.classList.add('a11y-show-focus')
  } else {
    root.classList.remove('a11y-show-focus')
  }

  if (settings.keyboard.enhancedNavigation) {
    root.classList.add('a11y-enhanced-nav')
  } else {
    root.classList.remove('a11y-enhanced-nav')
  }

  // Apply cognitive assistance settings
  if (settings.cognitive.simplifiedMode) {
    root.classList.add('a11y-simplified')
  } else {
    root.classList.remove('a11y-simplified')
  }

  // Apply screen reader optimizations
  if (settings.screenReader.enabled) {
    root.classList.add('a11y-screen-reader')
  } else {
    root.classList.remove('a11y-screen-reader')
  }

  // Set ARIA attributes for screen readers
  root.setAttribute('data-a11y-screen-reader', settings.screenReader.enabled.toString())
  root.setAttribute('data-a11y-reduced-motion', settings.visual.reducedMotion.toString())
  root.setAttribute('data-a11y-high-contrast', settings.visual.highContrast.toString())
}

export const useAccessibilityStore = defineStore('accessibility', () => {
  const configP = usePresenter('configPresenter')

  // Settings state
  const settings = ref<AccessibilitySettings>({ ...DEFAULT_ACCESSIBILITY_SETTINGS })

  // Computed properties for easy access to common settings
  const isScreenReaderOptimized = computed(() => settings.value.screenReader.enabled)

  const isKeyboardNavigationEnabled = computed(() => settings.value.keyboard.enhancedNavigation)

  const isHighContrastEnabled = computed(() => settings.value.visual.highContrast)

  const isReducedMotionEnabled = computed(() => settings.value.visual.reducedMotion)

  const isSimplifiedModeEnabled = computed(() => settings.value.cognitive.simplifiedMode)

  const currentFontSize = computed(() => settings.value.visual.fontSize)

  const currentVoiceSpeed = computed(() => settings.value.audio.voiceSpeed)

  // Methods
  const updateSettings = async (newSettings: Partial<AccessibilitySettings>) => {
    // Deep merge the settings
    if (newSettings.screenReader) {
      settings.value.screenReader = { ...settings.value.screenReader, ...newSettings.screenReader }
    }
    if (newSettings.keyboard) {
      settings.value.keyboard = { ...settings.value.keyboard, ...newSettings.keyboard }
      if (newSettings.keyboard.shortcuts) {
        settings.value.keyboard.shortcuts = {
          ...settings.value.keyboard.shortcuts,
          ...newSettings.keyboard.shortcuts
        }
      }
    }
    if (newSettings.visual) {
      settings.value.visual = { ...settings.value.visual, ...newSettings.visual }
    }
    if (newSettings.cognitive) {
      settings.value.cognitive = { ...settings.value.cognitive, ...newSettings.cognitive }
    }
    if (newSettings.audio) {
      settings.value.audio = { ...settings.value.audio, ...newSettings.audio }
    }

    // Apply settings immediately
    applyA11ySettings(settings.value)

    // Save to configuration
    await configP.setSetting('accessibilitySettings', settings.value)
  }

  const updateScreenReaderSettings = async (
    updates: Partial<AccessibilitySettings['screenReader']>
  ) => {
    await updateSettings({ screenReader: updates })
  }

  const updateKeyboardSettings = async (updates: Partial<AccessibilitySettings['keyboard']>) => {
    await updateSettings({ keyboard: updates })
  }

  const updateVisualSettings = async (updates: Partial<AccessibilitySettings['visual']>) => {
    await updateSettings({ visual: updates })
  }

  const updateCognitiveSettings = async (updates: Partial<AccessibilitySettings['cognitive']>) => {
    await updateSettings({ cognitive: updates })
  }

  const updateAudioSettings = async (updates: Partial<AccessibilitySettings['audio']>) => {
    await updateSettings({ audio: updates })
  }

  const resetToDefaults = async () => {
    settings.value = { ...DEFAULT_ACCESSIBILITY_SETTINGS }
    applyA11ySettings(settings.value)
    await configP.setSetting('accessibilitySettings', settings.value)
  }

  const loadSettings = async () => {
    try {
      const savedSettings = await configP.getSetting<AccessibilitySettings>('accessibilitySettings')
      if (savedSettings) {
        // Deep merge with defaults to ensure all properties exist
        settings.value = {
          screenReader: {
            ...DEFAULT_ACCESSIBILITY_SETTINGS.screenReader,
            ...savedSettings.screenReader
          },
          keyboard: {
            ...DEFAULT_ACCESSIBILITY_SETTINGS.keyboard,
            ...savedSettings.keyboard,
            shortcuts: {
              ...DEFAULT_ACCESSIBILITY_SETTINGS.keyboard.shortcuts,
              ...savedSettings.keyboard?.shortcuts
            }
          },
          visual: { ...DEFAULT_ACCESSIBILITY_SETTINGS.visual, ...savedSettings.visual },
          cognitive: { ...DEFAULT_ACCESSIBILITY_SETTINGS.cognitive, ...savedSettings.cognitive },
          audio: { ...DEFAULT_ACCESSIBILITY_SETTINGS.audio, ...savedSettings.audio }
        }
      }
      applyA11ySettings(settings.value)
    } catch (error) {
      console.error('Failed to load accessibility settings:', error)
      // Fallback to defaults
      settings.value = { ...DEFAULT_ACCESSIBILITY_SETTINGS }
      applyA11ySettings(settings.value)
    }
  }

  const saveSettings = async () => {
    try {
      await configP.setSetting('accessibilitySettings', settings.value)
    } catch (error) {
      console.error('Failed to save accessibility settings:', error)
      throw error
    }
  }

  // Function to announce messages for screen readers
  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.value.screenReader.enabled || !settings.value.screenReader.announceNewMessages) {
      return
    }

    // Create or get existing announcement region
    let announcer = document.getElementById('a11y-announcer')
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'a11y-announcer'
      announcer.setAttribute('aria-live', priority)
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.style.cssText =
        'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
      document.body.appendChild(announcer)
    }

    // Update aria-live if priority changed
    if (announcer.getAttribute('aria-live') !== priority) {
      announcer.setAttribute('aria-live', priority)
    }

    // Clear and set new message
    announcer.textContent = ''
    setTimeout(() => {
      if (announcer) {
        announcer.textContent = message
      }
    }, 100)
  }

  // Play sound feedback if enabled
  const playSoundFeedback = (soundType: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    if (!settings.value.audio.soundFeedback) {
      return
    }

    // Create audio context for sound feedback
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Set frequency based on sound type
      const frequencies = {
        success: 800,
        error: 300,
        info: 600,
        warning: 500
      }
      oscillator.frequency.setValueAtTime(frequencies[soundType], audioContext.currentTime)

      // Set volume based on settings
      const volumes = {
        low: 0.1,
        medium: 0.2,
        high: 0.3
      }
      gainNode.gain.setValueAtTime(
        volumes[settings.value.audio.announcementVolume],
        audioContext.currentTime
      )

      // Play short beep
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.warn('Could not play sound feedback:', error)
    }
  }

  // Watch for settings changes and apply them
  watch(
    settings,
    (newSettings) => {
      applyA11ySettings(newSettings)
    },
    { deep: true }
  )

  return {
    settings: readonly(settings),
    isScreenReaderOptimized,
    isKeyboardNavigationEnabled,
    isHighContrastEnabled,
    isReducedMotionEnabled,
    isSimplifiedModeEnabled,
    currentFontSize,
    currentVoiceSpeed,
    updateSettings,
    updateScreenReaderSettings,
    updateKeyboardSettings,
    updateVisualSettings,
    updateCognitiveSettings,
    updateAudioSettings,
    resetToDefaults,
    loadSettings,
    saveSettings,
    announceMessage,
    playSoundFeedback
  }
})
