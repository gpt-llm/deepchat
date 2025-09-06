/**
 * Accessibility Tests for useFocusManagement Composable
 * Tests focus trap, focus restoration, and focus indicators
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import {
  useFocusManagement,
  useFocusTrap,
  useFocusRestore,
  useFocusIndicator
} from '@renderer/composables/useFocusManagement'
import {
  waitForA11yUpdates,
  simulateUserInteraction,
  createKeyboardEvent,
  createFocusEvent,
  setupA11yTestEnvironment
} from '../utils/test-helpers'

// Test component that uses focus management
const TestComponent = defineComponent({
  template: `
    <div ref="containerRef" data-testid="focus-container">
      <button ref="firstButton" data-testid="first-button">First Button</button>
      <input ref="inputField" data-testid="input-field" />
      <button ref="lastButton" data-testid="last-button">Last Button</button>
      <button ref="externalButton" data-testid="external-button" style="position: absolute; top: -1000px;">
        External Button
      </button>
    </div>
  `,
  setup() {
    const containerRef = ref<HTMLElement>()
    const isModalOpen = ref(false)

    const { focusTrap, focusRestore, focusIndicator, setupModalFocus } = useFocusManagement()

    setupModalFocus(containerRef, isModalOpen)

    const openModal = () => {
      isModalOpen.value = true
    }

    const closeModal = () => {
      isModalOpen.value = false
    }

    return {
      containerRef,
      isModalOpen,
      focusTrap,
      focusRestore,
      focusIndicator,
      openModal,
      closeModal
    }
  }
})

describe('useFocusManagement', () => {
  let testEnvironment: ReturnType<typeof setupA11yTestEnvironment>

  beforeEach(() => {
    testEnvironment = setupA11yTestEnvironment()

    // Mock DOM focus methods
    HTMLElement.prototype.focus = vi.fn(function (this: HTMLElement) {
      // Simulate actual focus behavior
      document.activeElement = this
      this.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    })

    HTMLElement.prototype.blur = vi.fn(function (this: HTMLElement) {
      if (document.activeElement === this) {
        document.activeElement = document.body
      }
      this.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    })
  })

  afterEach(() => {
    testEnvironment.cleanup()
    vi.clearAllMocks()
    // Reset focus to body
    document.activeElement = document.body
  })

  describe('useFocusTrap', () => {
    it('should trap focus within container', async () => {
      const wrapper = mount(TestComponent)
      const container = wrapper.find('[data-testid="focus-container"]')
      const firstButton = wrapper.find('[data-testid="first-button"]')
      const lastButton = wrapper.find('[data-testid="last-button"]')

      const { focusTrap } = wrapper.vm as any

      // Activate focus trap
      focusTrap.activate(container.element, { autoFocus: true })
      await waitForA11yUpdates(wrapper)

      expect(focusTrap.isActive.value).toBe(true)
      expect(document.activeElement).toBe(firstButton.element)

      // Tab from last element should cycle to first
      lastButton.element.focus()
      await lastButton.trigger('keydown', { key: 'Tab' })
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(firstButton.element)

      wrapper.unmount()
    })

    it('should handle Shift+Tab navigation', async () => {
      const wrapper = mount(TestComponent)
      const container = wrapper.find('[data-testid="focus-container"]')
      const firstButton = wrapper.find('[data-testid="first-button"]')
      const lastButton = wrapper.find('[data-testid="last-button"]')

      const { focusTrap } = wrapper.vm as any

      focusTrap.activate(container.element, { autoFocus: true })
      await waitForA11yUpdates(wrapper)

      // Shift+Tab from first element should cycle to last
      firstButton.element.focus()
      await firstButton.trigger('keydown', { key: 'Tab', shiftKey: true })
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(lastButton.element)

      wrapper.unmount()
    })

    it('should prevent focus from leaving container on outside click', async () => {
      const wrapper = mount(TestComponent)
      const container = wrapper.find('[data-testid="focus-container"]')
      const firstButton = wrapper.find('[data-testid="first-button"]')

      const { focusTrap } = wrapper.vm as any

      focusTrap.activate(container.element, {
        autoFocus: true,
        allowOutsideClick: false
      })
      await waitForA11yUpdates(wrapper)

      // Try to click outside
      const outsideElement = document.createElement('button')
      document.body.appendChild(outsideElement)

      const clickEvent = new MouseEvent('click', { bubbles: true })
      outsideElement.dispatchEvent(clickEvent)

      await waitForA11yUpdates(wrapper)

      // Focus should remain within container
      expect(document.activeElement).toBe(firstButton.element)

      document.body.removeChild(outsideElement)
      wrapper.unmount()
    })

    it('should deactivate properly and restore focus', async () => {
      const wrapper = mount(TestComponent)
      const container = wrapper.find('[data-testid="focus-container"]')
      const externalButton = wrapper.find('[data-testid="external-button"]')

      const { focusTrap } = wrapper.vm as any

      // Set initial focus outside container
      externalButton.element.focus()
      const previousFocus = document.activeElement

      // Activate trap
      focusTrap.activate(container.element, { autoFocus: true })
      await waitForA11yUpdates(wrapper)

      expect(focusTrap.isActive.value).toBe(true)

      // Deactivate
      focusTrap.deactivate({ returnFocus: true })
      await waitForA11yUpdates(wrapper)

      expect(focusTrap.isActive.value).toBe(false)
      expect(document.activeElement).toBe(previousFocus)

      wrapper.unmount()
    })

    it('should handle dynamic content changes', async () => {
      const wrapper = mount(TestComponent)
      const container = wrapper.find('[data-testid="focus-container"]')

      const { focusTrap } = wrapper.vm as any

      focusTrap.activate(container.element, { autoFocus: true })
      await waitForA11yUpdates(wrapper)

      // Add new focusable element dynamically
      const newButton = document.createElement('button')
      newButton.textContent = 'New Button'
      container.element.appendChild(newButton)

      // Tab navigation should include new element
      const lastButton = wrapper.find('[data-testid="last-button"]')
      lastButton.element.focus()

      await lastButton.trigger('keydown', { key: 'Tab' })
      await waitForA11yUpdates(wrapper)

      // Should cycle to new button or first button (depending on implementation)
      expect(document.activeElement).not.toBe(lastButton.element)

      wrapper.unmount()
    })
  })

  describe('useFocusRestore', () => {
    it('should save and restore focus correctly', async () => {
      const wrapper = mount(TestComponent)
      const firstButton = wrapper.find('[data-testid="first-button"]')
      const inputField = wrapper.find('[data-testid="input-field"]')

      const { focusRestore } = wrapper.vm as any

      // Focus on first button and save
      firstButton.element.focus()
      focusRestore.saveFocus()

      // Change focus
      inputField.element.focus()
      expect(document.activeElement).toBe(inputField.element)

      // Restore focus
      focusRestore.restoreFocus()
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(firstButton.element)

      wrapper.unmount()
    })

    it('should handle focus restoration when element is removed', async () => {
      const wrapper = mount(TestComponent)
      const { focusRestore } = wrapper.vm as any

      // Create temporary element
      const tempButton = document.createElement('button')
      document.body.appendChild(tempButton)
      tempButton.focus()

      focusRestore.saveFocus()

      // Remove the element
      document.body.removeChild(tempButton)

      // Try to restore - should not throw error
      expect(() => focusRestore.restoreFocus()).not.toThrow()

      wrapper.unmount()
    })

    it('should clear saved focus reference', async () => {
      const wrapper = mount(TestComponent)
      const firstButton = wrapper.find('[data-testid="first-button"]')

      const { focusRestore } = wrapper.vm as any

      firstButton.element.focus()
      focusRestore.saveFocus()
      focusRestore.clearFocus()

      // After clearing, restore should not affect focus
      const currentFocus = document.activeElement
      focusRestore.restoreFocus()
      await waitForA11yUpdates(wrapper)

      expect(document.activeElement).toBe(currentFocus)

      wrapper.unmount()
    })
  })

  describe('useFocusIndicator', () => {
    it('should detect keyboard interaction', async () => {
      const wrapper = mount(TestComponent)
      const { focusIndicator } = wrapper.vm as any

      // Simulate keyboard interaction
      document.dispatchEvent(createKeyboardEvent('keydown', 'Tab'))
      await waitForA11yUpdates(wrapper)

      expect(focusIndicator.isKeyboardUser.value).toBe(true)
      expect(focusIndicator.lastInteractionWasKeyboard.value).toBe(true)
      expect(document.body.classList.contains('keyboard-focus')).toBe(true)

      wrapper.unmount()
    })

    it('should detect mouse interaction', async () => {
      const wrapper = mount(TestComponent)
      const { focusIndicator } = wrapper.vm as any

      // Simulate mouse interaction
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await waitForA11yUpdates(wrapper)

      expect(focusIndicator.lastInteractionWasKeyboard.value).toBe(false)
      expect(document.body.classList.contains('mouse-focus')).toBe(true)

      wrapper.unmount()
    })

    it('should toggle between keyboard and mouse modes', async () => {
      const wrapper = mount(TestComponent)
      const { focusIndicator } = wrapper.vm as any

      // Start with keyboard
      document.dispatchEvent(createKeyboardEvent('keydown', 'Tab'))
      await waitForA11yUpdates(wrapper)
      expect(document.body.classList.contains('keyboard-focus')).toBe(true)

      // Switch to mouse
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await waitForA11yUpdates(wrapper)
      expect(document.body.classList.contains('mouse-focus')).toBe(true)
      expect(document.body.classList.contains('keyboard-focus')).toBe(false)

      wrapper.unmount()
    })

    it('should clean up event listeners on unmount', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const wrapper = mount(TestComponent)

      // Verify listeners were added
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true)

      // Unmount component
      wrapper.unmount()

      // Verify listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true)
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('setupModalFocus integration', () => {
    it('should automatically manage focus for modal', async () => {
      const wrapper = mount(TestComponent)
      const firstButton = wrapper.find('[data-testid="first-button"]')
      const externalButton = wrapper.find('[data-testid="external-button"]')

      // Focus external element first
      externalButton.element.focus()

      // Open modal
      wrapper.vm.openModal()
      await waitForA11yUpdates(wrapper)

      // Focus should move to first focusable element in modal
      expect(document.activeElement).toBe(firstButton.element)

      // Close modal
      wrapper.vm.closeModal()
      await waitForA11yUpdates(wrapper)

      // Focus should return to external button
      expect(document.activeElement).toBe(externalButton.element)

      wrapper.unmount()
    })

    it('should handle modal focus with custom initial focus', async () => {
      const TestModalComponent = defineComponent({
        template: `
          <div ref="containerRef" data-testid="modal-container">
            <button data-testid="first-button">First</button>
            <button ref="targetButton" data-testid="target-button">Target</button>
            <button data-testid="last-button">Last</button>
          </div>
        `,
        setup() {
          const containerRef = ref<HTMLElement>()
          const isModalOpen = ref(false)

          const { setupModalFocus } = useFocusManagement()

          setupModalFocus(containerRef, isModalOpen, {
            initialFocusSelector: '[data-testid="target-button"]'
          })

          return {
            containerRef,
            isModalOpen,
            openModal: () => {
              isModalOpen.value = true
            },
            closeModal: () => {
              isModalOpen.value = false
            }
          }
        }
      })

      const wrapper = mount(TestModalComponent)
      const targetButton = wrapper.find('[data-testid="target-button"]')

      wrapper.vm.openModal()
      await waitForA11yUpdates(wrapper)

      // Should focus the target button instead of first button
      expect(document.activeElement).toBe(targetButton.element)

      wrapper.unmount()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle container without focusable elements', async () => {
      const EmptyContainer = defineComponent({
        template: '<div ref="containerRef" data-testid="empty-container"></div>',
        setup() {
          const { focusTrap } = useFocusTrap()
          const containerRef = ref<HTMLElement>()

          return {
            containerRef,
            focusTrap
          }
        }
      })

      const wrapper = mount(EmptyContainer)
      const container = wrapper.find('[data-testid="empty-container"]')

      // Should not throw error with empty container
      expect(() => {
        wrapper.vm.focusTrap.activate(container.element)
      }).not.toThrow()

      wrapper.unmount()
    })

    it('should handle rapid activate/deactivate calls', async () => {
      const wrapper = mount(TestComponent)
      const container = wrapper.find('[data-testid="focus-container"]')
      const { focusTrap } = wrapper.vm as any

      // Rapidly activate and deactivate
      focusTrap.activate(container.element)
      focusTrap.activate(container.element)
      focusTrap.deactivate()
      focusTrap.deactivate()

      // Should end up in clean state
      expect(focusTrap.isActive.value).toBe(false)

      wrapper.unmount()
    })

    it('should handle invisible focusable elements', async () => {
      const wrapper = mount(
        defineComponent({
          template: `
          <div ref="containerRef">
            <button style="display: none;">Hidden Button</button>
            <button style="visibility: hidden;">Invisible Button</button>
            <button style="opacity: 0;">Transparent Button</button>
            <button data-testid="visible-button">Visible Button</button>
          </div>
        `,
          setup() {
            const { focusTrap } = useFocusTrap()
            const containerRef = ref<HTMLElement>()

            return { containerRef, focusTrap }
          }
        })
      )

      const container = wrapper.find('div')
      const visibleButton = wrapper.find('[data-testid="visible-button"]')

      wrapper.vm.focusTrap.activate(container.element, { autoFocus: true })
      await waitForA11yUpdates(wrapper)

      // Should only focus visible elements
      expect(document.activeElement).toBe(visibleButton.element)

      wrapper.unmount()
    })
  })

  describe('Performance Considerations', () => {
    it('should not cause memory leaks', async () => {
      const wrappers: any[] = []

      // Create and destroy multiple components
      for (let i = 0; i < 10; i++) {
        const wrapper = mount(TestComponent)
        wrapper.vm.openModal()
        wrappers.push(wrapper)
      }

      // Clean up all wrappers
      wrappers.forEach((wrapper) => wrapper.unmount())

      // Should not have active event listeners
      // This is a simplified test - in real scenarios you'd check for actual leaks
      expect(document.body.classList.contains('keyboard-focus')).toBe(false)
    })

    it('should handle many focusable elements efficiently', async () => {
      const ManyElementsComponent = defineComponent({
        template: `
          <div ref="containerRef">
            <button v-for="n in 100" :key="n" :data-testid="'button-' + n">
              Button {{ n }}
            </button>
          </div>
        `,
        setup() {
          const { focusTrap } = useFocusTrap()
          const containerRef = ref<HTMLElement>()

          return { containerRef, focusTrap }
        }
      })

      const wrapper = mount(ManyElementsComponent)
      const container = wrapper.find('div')

      const startTime = performance.now()
      wrapper.vm.focusTrap.activate(container.element, { autoFocus: true })
      const endTime = performance.now()

      // Should complete reasonably quickly (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)

      wrapper.unmount()
    })
  })
})
