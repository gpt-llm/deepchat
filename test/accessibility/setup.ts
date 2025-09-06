/**
 * Accessibility Test Setup
 * Global setup and configuration for accessibility testing
 */

import { beforeEach, afterEach, vi } from 'vitest'
import { config } from '@vue/test-utils'
import '@testing-library/jest-dom'
import { toHaveNoViolations, configureAxe } from 'vitest-axe'
import { expect } from 'vitest'
import { createTestApp, mockElectronAPIs, setupA11yTestEnvironment, toBeAccessible } from './utils/test-helpers'

// Extend Vitest expect with axe and custom matchers
expect.extend(toHaveNoViolations)
expect.extend({ toBeAccessible: toBeAccessible() })

// Configure axe-core for consistent testing
configureAxe({
  rules: {
    // Core WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'keyboard': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'label': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-unique': { enabled: true },
    'landmark-one-main': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'image-alt': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'definition-list': { enabled: true },
    
    // Disable some rules that may be too strict for testing
    'page-has-heading-one': { enabled: false },
    'region': { enabled: false }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
})

// Global Vue Test Utils configuration
config.global.plugins = []

let testApp: ReturnType<typeof createTestApp>
let testEnvironment: ReturnType<typeof setupA11yTestEnvironment>

beforeEach(() => {
  // Create fresh test app for each test
  testApp = createTestApp()
  
  // Setup accessibility test environment
  testEnvironment = setupA11yTestEnvironment()
  
  // Mock Electron APIs
  mockElectronAPIs()
  
  // Configure Vue Test Utils to use our test app
  config.global.plugins = [
    testApp._context.config.globalProperties.$pinia,
    testApp._context.config.globalProperties.$i18n
  ]
  
  // Mock common global properties
  config.global.mocks = {
    $t: (key: string, params?: Record<string, any>) => {
      // Simple mock translation function
      const translations: Record<string, string> = {
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.open': 'Open',
        'common.loading': 'Loading',
        'common.error': 'Error',
        'common.success': 'Success',
        'accessibility.skipToContent': 'Skip to main content',
        'accessibility.skipToNavigation': 'Skip to navigation',
        'chat.sendMessage': 'Send message',
        'chat.newMessage': 'New message received',
        'settings.accessibility': 'Accessibility Settings'
      }
      
      let translation = translations[key] || key
      
      // Simple parameter replacement
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          translation = translation.replace(new RegExp(`{${param}}`, 'g'), String(value))
        })
      }
      
      return translation
    },
    
    $route: {
      path: '/',
      name: 'home',
      params: {},
      query: {},
      meta: {}
    },
    
    $router: {
      push: vi.fn(),
      replace: vi.fn(),
      go: vi.fn(),
      back: vi.fn(),
      forward: vi.fn()
    }
  }
  
  // Mock global CSS custom properties for theme testing
  document.documentElement.style.setProperty('--font-size-base', '16px')
  document.documentElement.style.setProperty('--color-contrast-ratio', '4.5')
  
  // Mock window properties
  Object.defineProperty(window, 'getComputedStyle', {
    writable: true,
    value: vi.fn().mockImplementation((element: HTMLElement) => ({
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)',
      fontSize: '16px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      position: 'static',
      left: 'auto',
      clipPath: 'none',
      clip: 'auto'
    }))
  })
  
  // Mock focus management
  let activeElement = document.body
  Object.defineProperty(document, 'activeElement', {
    get: () => activeElement,
    set: (element) => {
      activeElement = element
    }
  })
  
  // Mock element.focus() and blur()
  HTMLElement.prototype.focus = vi.fn().mockImplementation(function(this: HTMLElement) {
    activeElement = this
    this.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
  })
  
  HTMLElement.prototype.blur = vi.fn().mockImplementation(function(this: HTMLElement) {
    if (activeElement === this) {
      activeElement = document.body
    }
    this.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
  })
})

afterEach(() => {
  // Cleanup test environment
  testEnvironment.cleanup()
  
  // Reset global mocks
  vi.clearAllMocks()
  
  // Clear DOM
  document.body.innerHTML = ''
  
  // Reset CSS custom properties
  document.documentElement.removeAttribute('style')
  
  // Reset Vue Test Utils config
  config.global.plugins = []
  config.global.mocks = {}
})

/**
 * Custom test utilities available globally
 */
declare global {
  interface Window {
    electronAPI: {
      invoke: ReturnType<typeof vi.fn>
      on: ReturnType<typeof vi.fn>
      removeAllListeners: ReturnType<typeof vi.fn>
      windowControls: {
        minimize: ReturnType<typeof vi.fn>
        maximize: ReturnType<typeof vi.fn>
        close: ReturnType<typeof vi.fn>
      }
      system: {
        getSystemPreferences: ReturnType<typeof vi.fn>
        openExternal: ReturnType<typeof vi.fn>
      }
    }
  }
  
  namespace Vi {
    interface JestAssertion<T = any> {
      toHaveNoViolations(): T
      toBeAccessible(): T
    }
  }
}

// Export common test constants
export const TEST_CONSTANTS = {
  WCAG_AA_CONTRAST_RATIO: 4.5,
  WCAG_AAA_CONTRAST_RATIO: 7.0,
  FOCUS_VISIBLE_DELAY: 100,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300
}

// Common test data
export const TEST_DATA = {
  sampleMessages: [
    {
      id: '1',
      content: 'Hello, how can I help you?',
      role: 'assistant',
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      content: 'I need help with accessibility features',
      role: 'user',
      timestamp: new Date().toISOString()
    }
  ],
  
  sampleUser: {
    id: 'user1',
    name: 'Test User',
    preferences: {
      highContrast: false,
      reducedMotion: false,
      fontSize: 16,
      keyboardNavigation: true
    }
  }
}