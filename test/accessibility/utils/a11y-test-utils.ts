/**
 * Accessibility Testing Utilities
 * Core utilities for testing WCAG 2.1 AA compliance in Vue components
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { axe, toHaveNoViolations } from 'vitest-axe'
import { expect } from 'vitest'
import type { Component } from 'vue'

// Extend Vitest's expect with axe matchers
expect.extend(toHaveNoViolations)

/**
 * Configuration for axe-core accessibility testing
 */
export const axeConfig = {
  // WCAG 2.1 AA compliance rules
  rules: {
    // Ensure sufficient color contrast
    'color-contrast': { enabled: true },
    // Require proper heading structure
    'heading-order': { enabled: true },
    // Ensure keyboard navigation is possible
    keyboard: { enabled: true },
    // Require ARIA labels where needed
    label: { enabled: true },
    // Ensure landmarks are used properly
    'landmark-unique': { enabled: true },
    'landmark-one-main': { enabled: true },
    // Focus management
    'focus-order-semantics': { enabled: true },
    'focusable-content': { enabled: true },
    // Semantic structure
    list: { enabled: true },
    listitem: { enabled: true },
    'definition-list': { enabled: true },
    // Form controls
    'label-title-only': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    // Interactive elements
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'role-img-alt': { enabled: true },
    'image-alt': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
}

/**
 * Test a Vue component for accessibility violations
 */
export async function testComponentAccessibility(
  component: Component,
  props: Record<string, any> = {},
  options: Record<string, any> = {}
): Promise<VueWrapper> {
  const wrapper = mount(component, {
    props,
    ...options,
    attachTo: document.body
  })

  // Wait for component to be fully rendered
  await wrapper.vm.$nextTick()

  // Run axe accessibility checks
  const results = await axe(wrapper.element as HTMLElement, axeConfig)
  expect(results).toHaveNoViolations()

  return wrapper
}

/**
 * Test keyboard navigation for a component
 */
export async function testKeyboardNavigation(
  wrapper: VueWrapper,
  navigationTests: Array<{
    key: string
    expectedFocus?: string
    expectedBehavior?: () => void
  }>
): Promise<void> {
  const element = wrapper.element as HTMLElement

  for (const test of navigationTests) {
    // Simulate key press
    await wrapper.trigger('keydown', { key: test.key })
    await wrapper.vm.$nextTick()

    // Check expected focus if specified
    if (test.expectedFocus) {
      const focusedElement = element.querySelector(':focus')
      expect(focusedElement).toBeTruthy()
      expect(focusedElement?.matches(test.expectedFocus)).toBe(true)
    }

    // Execute expected behavior if specified
    if (test.expectedBehavior) {
      test.expectedBehavior()
    }
  }
}

/**
 * Test ARIA attributes for a component
 */
export function testAriaAttributes(
  wrapper: VueWrapper,
  expectedAttributes: Record<string, any>
): void {
  const element = wrapper.element as HTMLElement

  for (const [attribute, expectedValue] of Object.entries(expectedAttributes)) {
    const actualValue = element.getAttribute(attribute)

    if (expectedValue === null) {
      expect(actualValue).toBeNull()
    } else if (typeof expectedValue === 'boolean') {
      expect(actualValue).toBe(expectedValue.toString())
    } else {
      expect(actualValue).toBe(expectedValue)
    }
  }
}

/**
 * Test focus management within a component
 */
export async function testFocusManagement(
  wrapper: VueWrapper,
  tests: Array<{
    action: () => void | Promise<void>
    expectedFocusSelector: string
    description: string
  }>
): Promise<void> {
  for (const test of tests) {
    // Execute the action
    await test.action()
    await wrapper.vm.$nextTick()

    // Check if focus moved to expected element
    const focusedElement = document.activeElement
    const expectedElement = wrapper.element.querySelector(test.expectedFocusSelector)

    expect(focusedElement).toBe(
      expectedElement,
      `Focus should move to ${test.expectedFocusSelector} when ${test.description}`
    )
  }
}

/**
 * Test screen reader announcements
 */
export function testScreenReaderAnnouncements(
  wrapper: VueWrapper,
  expectedAnnouncements: Array<{
    trigger: () => void | Promise<void>
    expectedText: string
    ariaLive?: 'polite' | 'assertive'
  }>
): void {
  for (const announcement of expectedAnnouncements) {
    const liveRegion = wrapper.find(`[aria-live="${announcement.ariaLive || 'polite'}"]`)

    expect(liveRegion.exists()).toBe(
      true,
      'Component should have an ARIA live region for announcements'
    )

    announcement.trigger()

    expect(liveRegion.text()).toContain(announcement.expectedText)
  }
}

/**
 * Test semantic HTML structure
 */
export function testSemanticStructure(
  wrapper: VueWrapper,
  expectedStructure: Array<{
    selector: string
    role?: string
    tagName?: string
    attributes?: Record<string, any>
  }>
): void {
  for (const structure of expectedStructure) {
    const element = wrapper.find(structure.selector)

    expect(element.exists()).toBe(true, `Element with selector ${structure.selector} should exist`)

    if (structure.role) {
      expect(element.attributes('role')).toBe(structure.role)
    }

    if (structure.tagName) {
      expect(element.element.tagName.toLowerCase()).toBe(structure.tagName.toLowerCase())
    }

    if (structure.attributes) {
      for (const [attr, value] of Object.entries(structure.attributes)) {
        expect(element.attributes(attr)).toBe(value)
      }
    }
  }
}

/**
 * Test color contrast compliance
 */
export async function testColorContrast(element: HTMLElement): Promise<void> {
  // Use axe-core's color-contrast rule specifically
  const results = await axe(element, {
    rules: {
      'color-contrast': { enabled: true }
    },
    tags: ['wcag2aa']
  })

  expect(results).toHaveNoViolations()
}

/**
 * Mock user preferences for testing
 */
export function mockUserPreferences(preferences: {
  reducedMotion?: boolean
  highContrast?: boolean
  fontSize?: number
}): void {
  const mediaQueries: Record<string, boolean> = {}

  if (preferences.reducedMotion !== undefined) {
    mediaQueries['(prefers-reduced-motion: reduce)'] = preferences.reducedMotion
  }

  if (preferences.highContrast !== undefined) {
    mediaQueries['(prefers-contrast: high)'] = preferences.highContrast
  }

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mediaQueries[query] || false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  // Mock font size changes
  if (preferences.fontSize) {
    document.documentElement.style.fontSize = `${preferences.fontSize}px`
  }
}

/**
 * Generate accessibility test report
 */
export interface A11yTestResult {
  component: string
  violations: number
  passes: number
  incomplete: number
  timestamp: string
  wcagLevel: 'AA' | 'AAA'
}

export function generateA11yReport(results: A11yTestResult[]): string {
  const totalTests = results.length
  const totalViolations = results.reduce((sum, r) => sum + r.violations, 0)
  const totalPasses = results.reduce((sum, r) => sum + r.passes, 0)

  const report = `
# Accessibility Test Report

Generated: ${new Date().toISOString()}

## Summary
- Total Components Tested: ${totalTests}
- Total Violations: ${totalViolations}
- Total Passes: ${totalPasses}
- Success Rate: ${((totalPasses / (totalPasses + totalViolations)) * 100).toFixed(2)}%

## Component Results
${results
  .map(
    (result) => `
### ${result.component}
- Violations: ${result.violations}
- Passes: ${result.passes}
- Incomplete: ${result.incomplete}
- WCAG Level: ${result.wcagLevel}
- Tested: ${result.timestamp}
`
  )
  .join('')}

## Recommendations
${totalViolations > 0 ? '⚠️  Please review and fix accessibility violations before production deployment.' : '✅ All accessibility tests passed!'}
`

  return report
}

/**
 * Create a custom matcher for accessibility testing
 */
export function toBeAccessible() {
  return {
    async assertMessage() {
      return 'Expected element to be accessible'
    },

    async pass(element: HTMLElement) {
      try {
        const results = await axe(element, axeConfig)
        return {
          pass: results.violations.length === 0,
          message: () =>
            `Expected no accessibility violations, but found ${results.violations.length}`
        }
      } catch (error) {
        return {
          pass: false,
          message: () => `Accessibility test failed: ${error}`
        }
      }
    }
  }
}

declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeAccessible(): T
    }
  }
}
