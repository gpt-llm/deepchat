/**
 * Accessibility Tests for ChatInput Component
 * Tests WCAG 2.1 AA compliance for chat input functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChatInput from '@renderer/components/ChatInput.vue'
import {
  testComponentAccessibility,
  testKeyboardNavigation,
  testAriaAttributes,
  testFocusManagement,
  testScreenReaderAnnouncements
} from '../utils/a11y-test-utils'
import {
  waitForA11yUpdates,
  simulateUserInteraction,
  findFocusableElements,
  generateTestId
} from '../utils/test-helpers'

describe('ChatInput Accessibility', () => {
  let wrapper: VueWrapper
  const testId = generateTestId('chatinput')

  beforeEach(async () => {
    // Mock TipTap editor
    const mockEditor = {
      commands: {
        setContent: vi.fn(),
        focus: vi.fn(),
        blur: vi.fn()
      },
      getText: vi.fn().mockReturnValue(''),
      getHTML: vi.fn().mockReturnValue(''),
      isEmpty: vi.fn().mockReturnValue(true),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
      isFocused: vi.fn().mockReturnValue(false),
      view: {
        dom: document.createElement('div')
      }
    }

    // Mock useEditor composable
    vi.doMock('@tiptap/vue-3', () => ({
      EditorContent: {
        name: 'EditorContent',
        template: `<div 
          class="editor-content" 
          contenteditable="true"
          role="textbox"
          :aria-label="$t('chat.input.messageInput')"
          :aria-multiline="true"
          :aria-describedby="$t('chat.input.description')"
          data-testid="chat-editor"
          @input="$emit('input', $event)"
          @keydown="$emit('keydown', $event)"
        ></div>`,
        emits: ['input', 'keydown']
      },
      useEditor: () => mockEditor
    }))

    // Mock Tooltip components
    vi.doMock('@renderer/components/ui/tooltip', () => ({
      TooltipProvider: { name: 'TooltipProvider', template: '<div><slot /></div>' },
      Tooltip: { name: 'Tooltip', template: '<div><slot /></div>' },
      TooltipTrigger: { name: 'TooltipTrigger', template: '<div><slot /></div>' },
      TooltipContent: { name: 'TooltipContent', template: '<div><slot /></div>' }
    }))

    // Mock Button component
    vi.doMock('@renderer/components/ui/button', () => ({
      Button: {
        name: 'Button',
        props: ['variant', 'size', 'disabled'],
        template: `<button 
          :disabled="disabled"
          :class="[variant, size]"
          type="button"
          @click="$emit('click')"
        ><slot /></button>`,
        emits: ['click']
      }
    }))

    wrapper = await testComponentAccessibility(
      ChatInput,
      {
        id: testId,
        disabled: false
      },
      {
        global: {
          stubs: {
            TransitionGroup: {
              name: 'TransitionGroup',
              template: '<div><slot /></div>'
            },
            FileItem: {
              name: 'FileItem',
              props: ['fileName', 'deletable', 'mimeType', 'tokens', 'thumbnail', 'context'],
              template: `<div 
              role="listitem"
              :aria-label="fileName"
              tabindex="0"
              @click="$emit('click')"
              @keydown.enter="$emit('click')"
              @keydown.delete="$emit('delete')"
              @keydown.backspace="$emit('delete')"
            >
              <span>{{ fileName }}</span>
              <button v-if="deletable" @click="$emit('delete')" :aria-label="$t('common.delete')">×</button>
            </div>`,
              emits: ['click', 'delete']
            },
            Icon: {
              name: 'Icon',
              props: ['icon'],
              template: '<span :class="icon" aria-hidden="true"></span>'
            }
          }
        }
      }
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  describe('Basic Accessibility Compliance', () => {
    it('should have proper ARIA structure', () => {
      // Test main container ARIA attributes
      testAriaAttributes(wrapper, {
        role: 'region',
        'aria-label': expect.stringMatching(/file.*drop.*area/i)
      })

      // Check that file list has proper ARIA structure
      const fileListContainer = wrapper.find('[role="list"]')
      if (fileListContainer.exists()) {
        expect(fileListContainer.attributes('aria-label')).toMatch(/file.*list/i)
      }
    })

    it('should have accessible file upload area', () => {
      const dropArea = wrapper.find('[role="region"]')
      expect(dropArea.exists()).toBe(true)
      expect(dropArea.attributes('aria-label')).toBeTruthy()
    })

    it('should have proper input field accessibility', async () => {
      const editorContent = wrapper.find('[data-testid="chat-editor"]')
      expect(editorContent.exists()).toBe(true)

      testAriaAttributes(editorContent, {
        role: 'textbox',
        'aria-multiline': 'true',
        contenteditable: 'true'
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for file operations', async () => {
      // Mock files being present
      await wrapper.setData({
        selectedFiles: [
          {
            metadata: { fileName: 'test.txt' },
            mimeType: 'text/plain',
            token: 100,
            thumbnail: null,
            path: '/test.txt'
          }
        ]
      })

      await waitForA11yUpdates(wrapper)

      const fileItem = wrapper.find('[role="listitem"]')
      expect(fileItem.exists()).toBe(true)

      // Test keyboard navigation on file items
      await testKeyboardNavigation(wrapper, [
        {
          key: 'Tab',
          expectedFocus: '[role="listitem"]'
        },
        {
          key: 'Enter',
          expectedBehavior: () => {
            expect(fileItem.emitted('click')).toBeTruthy()
          }
        },
        {
          key: 'Delete',
          expectedBehavior: () => {
            expect(fileItem.emitted('delete')).toBeTruthy()
          }
        }
      ])
    })

    it('should support keyboard shortcuts for input operations', async () => {
      const editorContent = wrapper.find('[data-testid="chat-editor"]')

      await testKeyboardNavigation(wrapper, [
        {
          key: 'Tab',
          expectedFocus: '[data-testid="chat-editor"]'
        }
      ])

      // Test Ctrl+Enter for send (if implemented)
      await editorContent.trigger('keydown', {
        key: 'Enter',
        ctrlKey: true
      })

      await waitForA11yUpdates(wrapper)

      // Verify send event is emitted
      expect(wrapper.emitted('send')).toBeTruthy()
    })

    it('should handle file upload keyboard interactions', async () => {
      const uploadButton = wrapper.find('button[aria-label*="upload"], button[aria-label*="file"]')

      if (uploadButton.exists()) {
        await uploadButton.trigger('keydown', { key: 'Enter' })
        await waitForA11yUpdates(wrapper)

        // Should trigger file selection
        expect(uploadButton.emitted('click')).toBeTruthy()
      }
    })
  })

  describe('Focus Management', () => {
    it('should manage focus properly during file operations', async () => {
      await testFocusManagement(wrapper, [
        {
          action: async () => {
            // Simulate adding a file
            await wrapper.setData({
              selectedFiles: [
                {
                  metadata: { fileName: 'test.txt' },
                  mimeType: 'text/plain',
                  token: 100,
                  thumbnail: null,
                  path: '/test.txt'
                }
              ]
            })
          },
          expectedFocusSelector: '[role="listitem"]',
          description: 'adding a file'
        },
        {
          action: async () => {
            // Simulate removing the file
            const fileItem = wrapper.find('[role="listitem"]')
            const deleteButton = fileItem.find('button')
            if (deleteButton.exists()) {
              await deleteButton.trigger('click')
            }
          },
          expectedFocusSelector: '[data-testid="chat-editor"]',
          description: 'removing the last file'
        }
      ])
    })

    it('should return focus to editor after file operations', async () => {
      const editor = wrapper.find('[data-testid="chat-editor"]')

      // Focus should be manageable
      await editor.trigger('focus')
      expect(document.activeElement).toBe(editor.element)
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce file upload progress', async () => {
      // Mock aria-live region for file upload announcements
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      document.body.appendChild(liveRegion)

      // Simulate file upload
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      })

      await wrapper.trigger('drop', {
        dataTransfer: {
          files: [file]
        }
      })

      await waitForA11yUpdates(wrapper)

      // Should have announced file upload
      // In a real implementation, this would check the live region content
      expect(liveRegion.textContent).toContain('test.txt')

      document.body.removeChild(liveRegion)
    })

    it('should provide appropriate labels for interactive elements', () => {
      const buttons = wrapper.findAll('button')

      buttons.forEach((button) => {
        // Each button should have either visible text or aria-label
        const hasVisibleText = button.text().trim().length > 0
        const hasAriaLabel = button.attributes('aria-label')
        const hasAriaLabelledby = button.attributes('aria-labelledby')

        expect(
          hasVisibleText || hasAriaLabel || hasAriaLabelledby,
          `Button should have accessible name: ${button.html()}`
        ).toBe(true)
      })
    })
  })

  describe('Error Handling and Validation', () => {
    it('should announce validation errors accessibly', async () => {
      // Mock validation error state
      await wrapper.setData({
        validationError: 'File size too large'
      })

      await waitForA11yUpdates(wrapper)

      const errorElement = wrapper.find('[role="alert"]')
      if (errorElement.exists()) {
        expect(errorElement.text()).toContain('File size too large')
        expect(errorElement.attributes('aria-live')).toBe('assertive')
      }
    })

    it('should provide error context for screen readers', async () => {
      const editor = wrapper.find('[data-testid="chat-editor"]')

      // Mock error state
      await wrapper.setData({
        hasError: true,
        errorMessage: 'Message too long'
      })

      await waitForA11yUpdates(wrapper)

      // Editor should be described by error message
      const ariaDescribedby = editor.attributes('aria-describedby')
      if (ariaDescribedby) {
        const errorElement = document.getElementById(ariaDescribedby)
        expect(errorElement?.textContent).toContain('Message too long')
      }
    })
  })

  describe('Drag and Drop Accessibility', () => {
    it('should provide keyboard alternative to drag and drop', async () => {
      // File upload button should exist as keyboard alternative
      const uploadButton = wrapper.find('button[aria-label*="upload"], input[type="file"]')
      expect(uploadButton.exists()).toBe(true)
    })

    it('should announce drag and drop state changes', async () => {
      const dropArea = wrapper.find('[role="region"]')

      // Simulate drag enter
      await dropArea.trigger('dragenter', {
        dataTransfer: {
          types: ['Files']
        }
      })

      await waitForA11yUpdates(wrapper)

      // Should have visual feedback that's also available to screen readers
      expect(dropArea.classes()).toContain('border-primary')
    })
  })

  describe('Multi-language Support', () => {
    it('should have proper lang attributes for mixed content', async () => {
      // If the input contains content in different languages,
      // it should be properly marked up
      const editor = wrapper.find('[data-testid="chat-editor"]')

      // Mock mixed language content
      await editor.setValue('Hello 世界')
      await waitForA11yUpdates(wrapper)

      // Check if language changes are marked up appropriately
      // This is a placeholder - actual implementation would depend on
      // language detection capabilities
      expect(editor.attributes('lang')).toBeTruthy()
    })
  })

  describe('Integration with Assistive Technologies', () => {
    it('should work with screen reader testing', () => {
      // Find all elements that should be accessible to screen readers
      const focusableElements = findFocusableElements(wrapper.element as HTMLElement)

      // All focusable elements should have appropriate labels
      focusableElements.forEach((element) => {
        const hasAccessibleName =
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          element.textContent?.trim() ||
          element.getAttribute('title')

        expect(hasAccessibleName).toBeTruthy()
      })
    })

    it('should maintain proper tab order', () => {
      const focusableElements = findFocusableElements(wrapper.element as HTMLElement)

      // Check that tab indices are in logical order
      const tabIndices = focusableElements
        .map((el) => parseInt(el.getAttribute('tabindex') || '0'))
        .filter((index) => index >= 0)

      // Should be in ascending order (0 comes first in natural order)
      const sortedIndices = [...tabIndices].sort((a, b) => a - b)
      expect(tabIndices).toEqual(sortedIndices)
    })
  })
})
