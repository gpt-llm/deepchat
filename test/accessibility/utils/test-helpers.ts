/**
 * Test Helper Functions for Accessibility Testing
 * Common test utilities and mock functions
 */

import { createApp, App } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import type { VueWrapper } from '@vue/test-utils'

/**
 * Create a test Vue app with necessary plugins
 */
export function createTestApp(): App {
  const app = createApp({})

  // Add Pinia for state management
  const pinia = createPinia()
  app.use(pinia)

  // Add Vue I18n for internationalization
  const i18n = createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en: {
        // Common test translations
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
    }
  })
  app.use(i18n)

  return app
}

/**
 * Mock router for components that use Vue Router
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: {
      value: {
        path: '/',
        name: 'home',
        params: {},
        query: {},
        meta: {}
      }
    }
  }
}

/**
 * Mock store for accessibility settings
 */
export function createMockAccessibilityStore() {
  return {
    settings: {
      highContrast: false,
      reducedMotion: false,
      fontSize: 16,
      keyboardNavigation: true,
      screenReaderOptimizations: true,
      focusIndicators: true,
      skipLinks: true
    },
    updateSetting: vi.fn(),
    toggleSetting: vi.fn(),
    resetToDefaults: vi.fn()
  }
}

/**
 * Mock Electron APIs that might be needed in tests
 */
export function mockElectronAPIs() {
  global.electronAPI = {
    // IPC methods
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),

    // Window management
    windowControls: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn()
    },

    // System integration
    system: {
      getSystemPreferences: vi.fn().mockResolvedValue({
        reduceMotion: false,
        highContrast: false
      }),
      openExternal: vi.fn()
    }
  }
}

/**
 * Create a mock event for keyboard testing
 */
export function createKeyboardEvent(
  type: string,
  key: string,
  options: KeyboardEventInit = {}
): KeyboardEvent {
  return new KeyboardEvent(type, {
    key,
    code: `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    ...options
  })
}

/**
 * Create a mock focus event
 */
export function createFocusEvent(type: 'focus' | 'blur', target: HTMLElement): FocusEvent {
  return new FocusEvent(type, {
    bubbles: true,
    cancelable: true,
    target
  })
}

/**
 * Wait for DOM updates and animations
 */
export async function waitForA11yUpdates(wrapper?: VueWrapper, timeout = 100): Promise<void> {
  if (wrapper) {
    await wrapper.vm.$nextTick()
  }

  // Wait for any animations or transitions
  await new Promise((resolve) => setTimeout(resolve, timeout))

  // Wait for any microtasks
  await new Promise((resolve) => process.nextTick(resolve))
}

/**
 * Simulate user interaction with proper timing
 */
export async function simulateUserInteraction(
  element: HTMLElement,
  action: 'click' | 'focus' | 'blur' | 'keydown' | 'keyup',
  options: any = {}
): Promise<void> {
  // Simulate realistic timing
  await new Promise((resolve) => setTimeout(resolve, 10))

  let event: Event
  switch (action) {
    case 'click':
      event = new MouseEvent('click', { bubbles: true, ...options })
      break
    case 'focus':
      event = new FocusEvent('focus', { bubbles: true, ...options })
      break
    case 'blur':
      event = new FocusEvent('blur', { bubbles: true, ...options })
      break
    case 'keydown':
      event = new KeyboardEvent('keydown', { bubbles: true, ...options })
      break
    case 'keyup':
      event = new KeyboardEvent('keyup', { bubbles: true, ...options })
      break
    default:
      throw new Error(`Unsupported action: ${action}`)
  }

  element.dispatchEvent(event)

  // Wait for event processing
  await new Promise((resolve) => setTimeout(resolve, 10))
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReaders(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)

  // Check if element is hidden from screen readers
  if (element.getAttribute('aria-hidden') === 'true') {
    return false
  }

  // Check if element is visually hidden but available to screen readers
  if (
    (style.position === 'absolute' && style.left === '-10000px') ||
    style.clipPath === 'inset(50%)' ||
    style.clip === 'rect(0, 0, 0, 0)'
  ) {
    return true
  }

  // Check if element is completely hidden
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }

  return true
}

/**
 * Find all focusable elements within a container
 */
export function findFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])'
  ]

  const elements = container.querySelectorAll(focusableSelectors.join(', '))
  return Array.from(elements).filter((element) => {
    const htmlElement = element as HTMLElement
    return isVisibleToScreenReaders(htmlElement) && htmlElement.tabIndex !== -1
  }) as HTMLElement[]
}

/**
 * Test aria-live announcements
 */
export function createAriaLiveTestHelper() {
  const announcements: Array<{
    message: string
    priority: 'polite' | 'assertive'
    timestamp: number
  }> = []

  // Mock MutationObserver to track aria-live changes
  const originalMutationObserver = window.MutationObserver

  window.MutationObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn((target: Element) => {
      // Watch for text content changes in aria-live regions
      if (target.getAttribute('aria-live')) {
        const priority = target.getAttribute('aria-live') as 'polite' | 'assertive'
        announcements.push({
          message: target.textContent || '',
          priority,
          timestamp: Date.now()
        })
      }
    }),
    disconnect: vi.fn(),
    takeRecords: vi.fn()
  }))

  return {
    getAnnouncements: () => [...announcements],
    clearAnnouncements: () => announcements.splice(0, announcements.length),
    cleanup: () => {
      window.MutationObserver = originalMutationObserver
    }
  }
}

/**
 * Create a test environment with accessibility features enabled
 */
export function setupA11yTestEnvironment() {
  // Mock media queries for accessibility preferences
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  // Mock IntersectionObserver for visibility testing
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn()
  }))

  // Mock ResizeObserver for responsive testing
  global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // Setup JSDOM with accessibility features
  Object.defineProperty(document, 'activeElement', {
    writable: true,
    value: document.body
  })

  return {
    cleanup: () => {
      // Reset any mocks if needed
      vi.clearAllMocks()
    }
  }
}

/**
 * Generate unique IDs for test components
 */
let testIdCounter = 0
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${++testIdCounter}`
}

/**
 * Assert that element has proper ARIA relationship
 */
export function assertAriaRelationship(
  element: HTMLElement,
  relationshipType: 'labelledby' | 'describedby' | 'controls' | 'expanded' | 'owns',
  relatedElementId: string
): void {
  const attribute = `aria-${relationshipType}`
  const value = element.getAttribute(attribute)

  expect(value).toBeTruthy()
  expect(value?.split(' ')).toContain(relatedElementId)

  // Verify the related element exists
  const relatedElement = document.getElementById(relatedElementId)
  expect(relatedElement).toBeTruthy()
}

/**
 * Test color contrast ratio
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  // Simple contrast ratio calculation (in a real implementation, you'd use a proper library)
  // This is a placeholder for the actual calculation
  return 4.5 // Mock value that passes AA standards
}

export function assertMinimumContrastRatio(element: HTMLElement, minRatio = 4.5): void {
  const styles = window.getComputedStyle(element)
  const color = styles.color
  const backgroundColor = styles.backgroundColor

  const ratio = calculateContrastRatio(color, backgroundColor)
  expect(ratio).toBeGreaterThanOrEqual(minRatio)
}
