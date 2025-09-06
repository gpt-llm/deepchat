// Accessibility settings types
export interface AccessibilitySettings {
  // Screen reader support
  screenReader: {
    enabled: boolean
    announceNewMessages: boolean
    detailedDescriptions: boolean
    reduceVerbosity: boolean
  }

  // Keyboard navigation
  keyboard: {
    enhancedNavigation: boolean
    showFocusIndicators: boolean
    enableSkipLinks: boolean
    shortcuts: {
      skipToMain: string
      newConversation: string
      settings: string
      help: string
    }
  }

  // Visual assistance
  visual: {
    highContrast: boolean
    reducedMotion: boolean
    fontSize: 'small' | 'normal' | 'large' | 'extra-large'
    focusIndicatorStyle: 'default' | 'thick' | 'high-contrast'
    contrastLevel: 'AA' | 'AAA'
  }

  // Cognitive assistance
  cognitive: {
    simplifiedMode: boolean
    readingAssistance: boolean
    autoImageDescriptions: boolean
    stepByStepGuidance: boolean
  }

  // Audio and voice
  audio: {
    voiceAnnouncements: boolean
    soundFeedback: boolean
    voiceSpeed: 'slow' | 'normal' | 'fast'
    announcementVolume: 'low' | 'medium' | 'high'
  }
}

// Default accessibility settings
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  screenReader: {
    enabled: false,
    announceNewMessages: true,
    detailedDescriptions: true,
    reduceVerbosity: false
  },
  keyboard: {
    enhancedNavigation: false,
    showFocusIndicators: true,
    enableSkipLinks: true,
    shortcuts: {
      skipToMain: 'Ctrl+Alt+M',
      newConversation: 'Ctrl+Alt+N',
      settings: 'Ctrl+Alt+S',
      help: 'Ctrl+Alt+H'
    }
  },
  visual: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'normal',
    focusIndicatorStyle: 'default',
    contrastLevel: 'AA'
  },
  cognitive: {
    simplifiedMode: false,
    readingAssistance: false,
    autoImageDescriptions: false,
    stepByStepGuidance: false
  },
  audio: {
    voiceAnnouncements: false,
    soundFeedback: true,
    voiceSpeed: 'normal',
    announcementVolume: 'medium'
  }
}
