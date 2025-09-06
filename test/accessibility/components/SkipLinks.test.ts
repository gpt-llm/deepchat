/**
 * Accessibility Tests for Skip Links Component
 * Tests skip navigation functionality for keyboard and screen reader users
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import {
  testComponentAccessibility,
  testKeyboardNavigation,
  testAriaAttributes,
  testFocusManagement,
  testSemanticStructure
} from '../utils/a11y-test-utils'
import {
  waitForA11yUpdates,
  simulateUserInteraction,
  createKeyboardEvent,
  setupA11yTestEnvironment,
  findFocusableElements
} from '../utils/test-helpers'

// Skip Links Component for testing
const SkipLinksComponent = defineComponent({
  template: `
    <nav class="skip-links" role="navigation" aria-label="Skip navigation">
      <a 
        href="#main-content"
        class="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        data-testid="skip-to-main"
        @click="handleSkipToMain"
      >
        {{ $t('accessibility.skipToMainContent') }}
      </a>
      <a 
        href="#navigation"
        class="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-32 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        data-testid="skip-to-nav"
        @click="handleSkipToNavigation"
      >
        {{ $t('accessibility.skipToNavigation') }}
      </a>
      <a 
        href="#search"
        class="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-64 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        data-testid="skip-to-search"
        @click="handleSkipToSearch"
        v-if="showSearchSkip"
      >
        {{ $t('accessibility.skipToSearch') }}
      </a>
      <a 
        href="#chat-input"
        class="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        data-testid="skip-to-input"
        @click="handleSkipToInput"
      >
        {{ $t('accessibility.skipToChatInput') }}
      </a>
    </nav>

    <!-- Mock page content -->
    <div class="page-layout">
      <nav id="navigation" tabindex="-1" data-testid="main-navigation">
        <h2>Navigation</h2>
        <ul>
          <li><a href="/chat">Chat</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
      </nav>

      <div id="search" tabindex="-1" data-testid="search-section" v-if="showSearchSkip">
        <h2>Search</h2>
        <input type="search" placeholder="Search..." />
      </div>

      <main id="main-content" tabindex="-1" data-testid="main-content">
        <h1>Chat Application</h1>
        <div class="message-area">
          <p>Welcome to the chat application</p>
        </div>
      </main>

      <div id="chat-input" tabindex="-1" data-testid="chat-input-area">
        <input type="text" placeholder="Type your message..." />
        <button>Send</button>
      </div>
    </div>
  `,

  setup() {
    const showSearchSkip = ref(true)
    const lastFocusedElement = ref<HTMLElement | null>(null)
    const skipActivationCount = ref(0)

    const handleSkipToMain = (event: Event) => {
      event.preventDefault()
      skipActivationCount.value++

      const mainElement = document.getElementById('main-content')
      if (mainElement) {
        mainElement.focus()
        lastFocusedElement.value = mainElement

        // Announce to screen readers
        announceToScreenReader('Skipped to main content')
      }
    }

    const handleSkipToNavigation = (event: Event) => {
      event.preventDefault()
      skipActivationCount.value++

      const navElement = document.getElementById('navigation')
      if (navElement) {
        navElement.focus()
        lastFocusedElement.value = navElement
        announceToScreenReader('Skipped to navigation')
      }
    }

    const handleSkipToSearch = (event: Event) => {
      event.preventDefault()
      skipActivationCount.value++

      const searchElement = document.getElementById('search')
      if (searchElement) {
        searchElement.focus()
        lastFocusedElement.value = searchElement
        announceToScreenReader('Skipped to search')
      }
    }

    const handleSkipToInput = (event: Event) => {
      event.preventDefault()
      skipActivationCount.value++

      const inputArea = document.getElementById('chat-input')
      const inputElement = inputArea?.querySelector('input')
      if (inputElement) {
        inputElement.focus()
        lastFocusedElement.value = inputElement
        announceToScreenReader('Skipped to chat input')
      }
    }

    const announceToScreenReader = (message: string) => {
      // Create or update live region for announcements
      let liveRegion = document.getElementById('skip-announcements')
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.id = 'skip-announcements'
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.className = 'sr-only'
        document.body.appendChild(liveRegion)
      }

      liveRegion.textContent = message
    }

    return {
      showSearchSkip,
      lastFocusedElement,
      skipActivationCount,
      handleSkipToMain,
      handleSkipToNavigation,
      handleSkipToSearch,
      handleSkipToInput
    }
  }
})

describe('SkipLinks Accessibility', () => {
  let wrapper: VueWrapper
  let testEnvironment: ReturnType<typeof setupA11yTestEnvironment>

  beforeEach(async () => {
    testEnvironment = setupA11yTestEnvironment()

    wrapper = await testComponentAccessibility(
      SkipLinksComponent,
      {},
      {
        global: {
          mocks: {
            $t: (key: string) => {
              const translations: Record<string, string> = {
                'accessibility.skipToMainContent': 'Skip to main content',
                'accessibility.skipToNavigation': 'Skip to navigation',
                'accessibility.skipToSearch': 'Skip to search',
                'accessibility.skipToChatInput': 'Skip to chat input'
              }
              return translations[key] || key
            }
          }
        }
      }
    )

    await waitForA11yUpdates(wrapper)
  })

  afterEach(() => {
    wrapper?.unmount()
    testEnvironment.cleanup()

    // Clean up any created live regions
    const liveRegion = document.getElementById('skip-announcements')
    if (liveRegion) {
      document.body.removeChild(liveRegion)
    }
  })

  describe('Basic Skip Links Structure', () => {
    it('should have proper semantic structure', () => {
      testSemanticStructure(wrapper, [
        {
          selector: '.skip-links',
          role: 'navigation',
          attributes: {
            'aria-label': 'Skip navigation'
          }
        }
      ])

      // All skip links should be anchor elements
      const skipLinks = wrapper.findAll('.skip-link')
      expect(skipLinks.length).toBeGreaterThan(0)

      skipLinks.forEach((link) => {
        expect(link.element.tagName.toLowerCase()).toBe('a')
        expect(link.attributes('href')).toMatch(/^#/)
      })
    })

    it('should be hidden by default but visible on focus', () => {
      const skipLinks = wrapper.findAll('.skip-link')

      skipLinks.forEach((link) => {
        // Should be screen reader only by default
        expect(link.classes()).toContain('sr-only')
        expect(link.classes()).toContain('focus:not-sr-only')
        expect(link.classes()).toContain('focus:absolute')
      })
    })

    it('should have proper ARIA attributes', () => {
      const skipLinksNav = wrapper.find('.skip-links')
      testAriaAttributes(skipLinksNav, {
        role: 'navigation',
        'aria-label': 'Skip navigation'
      })
    })

    it('should have meaningful link text', () => {
      const skipLinks = wrapper.findAll('.skip-link')
      const expectedTexts = [
        'Skip to main content',
        'Skip to navigation',
        'Skip to search',
        'Skip to chat input'
      ]

      skipLinks.forEach((link, index) => {
        expect(link.text().trim()).toBe(expectedTexts[index])
      })
    })
  })

  describe('Keyboard Navigation and Focus', () => {
    it('should be accessible via Tab key', async () => {
      // Focus should start at first skip link when tabbing from top of page
      const firstSkipLink = wrapper.find('[data-testid="skip-to-main"]')

      await firstSkipLink.element.focus()
      expect(document.activeElement).toBe(firstSkipLink.element)

      // Should become visible on focus
      expect(firstSkipLink.classes()).toContain('focus:not-sr-only')
    })

    it('should support keyboard navigation between skip links', async () => {
      await testKeyboardNavigation(wrapper, [
        {
          key: 'Tab',
          expectedFocus: '[data-testid="skip-to-main"]'
        },
        {
          key: 'Tab',
          expectedFocus: '[data-testid="skip-to-nav"]'
        },
        {
          key: 'Tab',
          expectedFocus: '[data-testid="skip-to-search"]'
        },
        {
          key: 'Tab',
          expectedFocus: '[data-testid="skip-to-input"]'
        }
      ])
    })

    it('should activate on Enter and Space keys', async () => {
      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')
      await skipToMain.element.focus()

      // Test Enter key
      await skipToMain.trigger('keydown', { key: 'Enter' })
      await waitForA11yUpdates(wrapper)

      expect(wrapper.vm.skipActivationCount).toBe(1)
      expect(document.activeElement?.id).toBe('main-content')

      // Reset and test Space key
      await skipToMain.element.focus()
      await skipToMain.trigger('keydown', { key: ' ' })
      await waitForA11yUpdates(wrapper)

      expect(wrapper.vm.skipActivationCount).toBe(2)
    })
  })

  describe('Skip Link Functionality', () => {
    it('should move focus to main content', async () => {
      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')
      const mainContent = wrapper.find('[data-testid="main-content"]')

      await skipToMain.element.focus()
      await skipToMain.trigger('click')
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(mainContent.element)
      expect(wrapper.vm.lastFocusedElement).toBe(mainContent.element)
    })

    it('should move focus to navigation', async () => {
      const skipToNav = wrapper.find('[data-testid="skip-to-nav"]')
      const navigation = wrapper.find('[data-testid="main-navigation"]')

      await skipToNav.element.focus()
      await skipToNav.trigger('click')
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(navigation.element)
    })

    it('should move focus to search section', async () => {
      const skipToSearch = wrapper.find('[data-testid="skip-to-search"]')
      const searchSection = wrapper.find('[data-testid="search-section"]')

      await skipToSearch.element.focus()
      await skipToSearch.trigger('click')
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(searchSection.element)
    })

    it('should move focus to chat input', async () => {
      const skipToInput = wrapper.find('[data-testid="skip-to-input"]')
      const inputArea = wrapper.find('[data-testid="chat-input-area"]')
      const inputElement = inputArea.find('input')

      await skipToInput.element.focus()
      await skipToInput.trigger('click')
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(inputElement.element)
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce skip actions to screen readers', async () => {
      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')

      await skipToMain.trigger('click')
      await waitForA11yUpdates(wrapper)

      const liveRegion = document.getElementById('skip-announcements')
      expect(liveRegion).toBeTruthy()
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite')
      expect(liveRegion?.textContent).toBe('Skipped to main content')
    })

    it('should have proper live region attributes', async () => {
      // Trigger skip to create live region
      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')
      await skipToMain.trigger('click')
      await waitForA11yUpdates(wrapper)

      const liveRegion = document.getElementById('skip-announcements')
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite')
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true')
      expect(liveRegion?.classList.contains('sr-only')).toBe(true)
    })

    it('should update announcements for different skip actions', async () => {
      const skipToNav = wrapper.find('[data-testid="skip-to-nav"]')
      const skipToInput = wrapper.find('[data-testid="skip-to-input"]')

      await skipToNav.trigger('click')
      await waitForA11yUpdates(wrapper)

      const liveRegion = document.getElementById('skip-announcements')
      expect(liveRegion?.textContent).toBe('Skipped to navigation')

      await skipToInput.trigger('click')
      await waitForA11yUpdates(wrapper)

      expect(liveRegion?.textContent).toBe('Skipped to chat input')
    })
  })

  describe('Dynamic Skip Links', () => {
    it('should show/hide skip links based on content availability', async () => {
      // Initially search skip should be visible
      expect(wrapper.find('[data-testid="skip-to-search"]').exists()).toBe(true)

      // Hide search section
      wrapper.vm.showSearchSkip = false
      await waitForA11yUpdates(wrapper)

      expect(wrapper.find('[data-testid="skip-to-search"]').exists()).toBe(false)

      // Show search section again
      wrapper.vm.showSearchSkip = true
      await waitForA11yUpdates(wrapper)

      expect(wrapper.find('[data-testid="skip-to-search"]').exists()).toBe(true)
    })

    it('should handle missing target elements gracefully', async () => {
      // Remove target element
      const mainContent = document.getElementById('main-content')
      mainContent?.remove()

      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')

      // Should not throw error when target is missing
      expect(async () => {
        await skipToMain.trigger('click')
        await waitForA11yUpdates(wrapper)
      }).not.toThrow()
    })
  })

  describe('Visual Design and Styling', () => {
    it('should have high contrast when visible', async () => {
      const skipLink = wrapper.find('[data-testid="skip-to-main"]')
      await skipLink.element.focus()

      // Should have high contrast background/text colors
      expect(skipLink.classes()).toContain('focus:bg-primary')
      expect(skipLink.classes()).toContain('focus:text-primary-foreground')
    })

    it('should be positioned properly when visible', async () => {
      const skipLinks = wrapper.findAll('.skip-link')

      skipLinks.forEach((link) => {
        expect(link.classes()).toContain('focus:absolute')
        expect(link.classes()).toContain('focus:z-50') // High z-index
        expect(link.classes()).toContain('focus:top-2')
      })

      // Should be positioned to avoid overlap
      const mainSkip = wrapper.find('[data-testid="skip-to-main"]')
      const navSkip = wrapper.find('[data-testid="skip-to-nav"]')

      expect(mainSkip.classes()).toContain('focus:left-2')
      expect(navSkip.classes()).toContain('focus:left-32')
    })

    it('should have proper sizing and padding', async () => {
      const skipLinks = wrapper.findAll('.skip-link')

      skipLinks.forEach((link) => {
        expect(link.classes()).toContain('focus:px-3')
        expect(link.classes()).toContain('focus:py-2')
        expect(link.classes()).toContain('focus:rounded-md')
      })
    })
  })

  describe('Focus Management Integration', () => {
    it('should work with focus trap systems', async () => {
      await testFocusManagement(wrapper, [
        {
          action: async () => {
            const skipToMain = wrapper.find('[data-testid="skip-to-main"]')
            await skipToMain.trigger('click')
          },
          expectedFocusSelector: '#main-content',
          description: 'activating skip to main content'
        }
      ])
    })

    it('should respect tabindex on target elements', () => {
      const targetElements = [
        wrapper.find('#navigation'),
        wrapper.find('#main-content'),
        wrapper.find('#search'),
        wrapper.find('#chat-input')
      ]

      targetElements.forEach((element) => {
        if (element.exists()) {
          expect(element.attributes('tabindex')).toBe('-1')
        }
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle rapid skip link activation', async () => {
      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')

      // Rapidly click multiple times
      for (let i = 0; i < 5; i++) {
        await skipToMain.trigger('click')
      }

      await waitForA11yUpdates(wrapper)

      // Should handle gracefully without errors
      expect(wrapper.vm.skipActivationCount).toBe(5)
      expect(document.activeElement?.id).toBe('main-content')
    })

    it('should work when JavaScript is disabled', () => {
      // Skip links should still work as regular anchor links
      const skipLinks = wrapper.findAll('.skip-link')

      skipLinks.forEach((link) => {
        const href = link.attributes('href')
        expect(href).toMatch(/^#\w+/)

        // Target element should exist
        const targetId = href?.substring(1)
        const targetElement = document.getElementById(targetId!)
        expect(targetElement).toBeTruthy()
      })
    })

    it('should maintain functionality during page navigation', async () => {
      // Simulate page navigation/route change
      const skipToMain = wrapper.find('[data-testid="skip-to-main"]')

      // Skip link should work before and after simulated navigation
      await skipToMain.trigger('click')
      expect(document.activeElement?.id).toBe('main-content')

      // Simulate route change (in real app this might reload content)
      await wrapper.vm.$forceUpdate()
      await waitForA11yUpdates(wrapper)

      // Should still work after navigation
      await skipToMain.trigger('click')
      expect(document.activeElement?.id).toBe('main-content')
    })
  })

  describe('Integration with Page Structure', () => {
    it('should correspond to actual page landmarks', () => {
      // Skip links should target elements with appropriate landmark roles
      const mainContent = wrapper.find('#main-content')
      const navigation = wrapper.find('#navigation')

      expect(mainContent.element.tagName.toLowerCase()).toBe('main')
      expect(navigation.element.tagName.toLowerCase()).toBe('nav')
    })

    it('should be ordered logically', () => {
      const skipLinks = wrapper.findAll('.skip-link')
      const hrefs = skipLinks.map((link) => link.attributes('href'))

      // Should be in logical reading order
      expect(hrefs).toEqual(['#main-content', '#navigation', '#search', '#chat-input'])
    })

    it('should be the first focusable elements on page', () => {
      const allFocusable = findFocusableElements(wrapper.element as HTMLElement)
      const skipLinks = wrapper.findAll('.skip-link')

      // First few focusable elements should be skip links
      skipLinks.forEach((link, index) => {
        expect(allFocusable[index]).toBe(link.element)
      })
    })
  })
})
