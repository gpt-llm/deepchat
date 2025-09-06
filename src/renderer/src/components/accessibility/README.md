# Accessibility Components

This directory contains accessibility enhancements for the DeepChat application, implementing WCAG 2.1 AA compliance features.

## Components

### SkipLinks.vue

Provides keyboard-only visible skip navigation links that allow users to quickly jump to main sections of the interface.

**Usage:**
```vue
<template>
  <SkipLinks :show-chat-input="true" />
  <!-- Your app content -->
  <main id="main-content">
    <!-- Main content here -->
  </main>
  <nav id="navigation">
    <!-- Navigation here -->
  </nav>
  <aside id="sidebar">
    <!-- Sidebar content -->
  </aside>
  <div id="chat-input">
    <!-- Chat input component -->
  </div>
</template>
```

**Props:**
- `showChatInput` (boolean, default: true): Whether to show the skip link to chat input

### AccessibleDialogContent.vue

Enhanced dialog component with comprehensive accessibility features including focus management, ARIA attributes, and keyboard navigation.

**Usage:**
```vue
<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button>Open Dialog</Button>
    </DialogTrigger>
    <AccessibleDialogContent 
      title="Settings" 
      description="Configure your preferences"
      :auto-focus="true"
      initial-focus-selector="input[type='text']"
    >
      <template #title>Custom Title</template>
      <template #description>Custom description</template>
      
      <!-- Dialog content -->
      <input type="text" placeholder="Focus will go here first" />
      
      <template #actions>
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
      </template>
    </AccessibleDialogContent>
  </Dialog>
</template>
```

**Props:**
- `title` (string): Dialog title text
- `description` (string): Dialog description text  
- `showCloseButton` (boolean, default: true): Whether to show X close button
- `closeButtonLabel` (string, default: "关闭对话框"): Accessible label for close button
- `bodyClass` (string): Additional CSS classes for dialog body
- `initialFocusSelector` (string): CSS selector for initial focus element
- `autoFocus` (boolean, default: true): Whether to auto-focus first interactive element

## Composables

### useFocusManagement.ts

Comprehensive focus management utilities including focus traps, focus restoration, and keyboard interaction detection.

**Usage:**
```vue
<script setup lang="ts">
import { useFocusManagement } from '@/composables/useFocusManagement'

const { focusTrap, focusRestore, focusIndicator, setupModalFocus } = useFocusManagement()

// For modal dialogs
const modalRef = ref()
const isModalOpen = ref(false)

setupModalFocus(modalRef, isModalOpen, {
  autoFocus: true,
  allowOutsideClick: false
})

// Manual focus trap control
const activateTrap = () => {
  const container = document.getElementById('my-container')
  if (container) {
    focusTrap.activate(container, { autoFocus: true })
  }
}

const deactivateTrap = () => {
  focusTrap.deactivate({ returnFocus: true })
}
</script>
```

**Available Functions:**

#### useFocusTrap()
- `activate(container, options)`: Activate focus trap on container
- `deactivate(options)`: Deactivate focus trap
- `isActive`: Reactive boolean indicating trap status

#### useFocusRestore()
- `saveFocus()`: Save currently focused element
- `restoreFocus()`: Restore focus to saved element
- `clearFocus()`: Clear saved focus reference

#### useFocusIndicator()
- `isKeyboardUser`: Reactive boolean for keyboard interaction detection
- `lastInteractionWasKeyboard`: Reactive boolean for last interaction type

#### setupModalFocus()
Convenience function that combines focus trap and restoration for modals.

## Enhanced Dialog Components

The existing dialog components (`DialogContent.vue`, `DialogScrollContent.vue`) have been enhanced with accessibility features while maintaining backward compatibility.

**New Props Added:**
- `enableA11yEnhancements` (boolean, default: true): Enable accessibility enhancements

**Features Added:**
- Automatic focus management on open/close
- Focus restoration when dialog closes
- Enhanced focus indicators
- Proper ARIA attributes
- Keyboard trap functionality

## Styling

### accessibility.css

Global CSS that provides:
- Focus indicator enhancements
- High contrast mode support
- Reduced motion preferences
- Screen reader utilities
- Skip link styling
- Dialog accessibility enhancements

**Import in your main CSS:**
```css
@import './components/accessibility/accessibility.css';
```

### CSS Classes Available

- `.sr-only`: Screen reader only content
- `.sr-only-focusable`: Visible when focused
- `.keyboard-focus`: Applied to body when keyboard navigation detected
- `.mouse-focus`: Applied to body when mouse navigation detected  
- `.focus-enhanced`: Enhanced focus styling
- `.focus-trap-active`: Applied to focus trap containers

## Integration Examples

### Complete Modal Example

```vue
<template>
  <div>
    <SkipLinks />
    
    <Dialog v-model:open="showModal">
      <DialogTrigger as-child>
        <Button>Open Settings</Button>
      </DialogTrigger>
      
      <AccessibleDialogContent 
        title="Application Settings"
        description="Configure your DeepChat preferences"
        initial-focus-selector="input[name='username']"
      >
        <form @submit.prevent="saveSettings">
          <div class="space-y-4">
            <div>
              <label for="username">Username</label>
              <input 
                id="username" 
                name="username" 
                type="text" 
                v-model="settings.username"
                aria-required="true"
              />
            </div>
            
            <div>
              <label for="theme">Theme</label>
              <select id="theme" name="theme" v-model="settings.theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>
          
          <template #actions>
            <DialogClose as-child>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Settings</Button>
          </template>
        </form>
      </AccessibleDialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SkipLinks } from '@/components/accessibility'
import { AccessibleDialogContent } from '@/components/accessibility'

const showModal = ref(false)
const settings = ref({
  username: '',
  theme: 'auto'
})

const saveSettings = () => {
  // Save logic
  showModal.value = false
}
</script>
```

### Focus Trap Example

```vue
<template>
  <div>
    <button @click="showPanel = true">Show Panel</button>
    
    <div 
      v-if="showPanel" 
      ref="panelRef"
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-title"
    >
      <h2 id="panel-title">Custom Panel</h2>
      <input type="text" placeholder="Input 1" />
      <input type="text" placeholder="Input 2" />
      <button @click="closePanel">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFocusTrap } from '@/composables/useFocusManagement'

const showPanel = ref(false)
const panelRef = ref()
const { activate, deactivate } = useFocusTrap()

watch(showPanel, (isOpen) => {
  if (isOpen && panelRef.value) {
    activate(panelRef.value, { autoFocus: true })
  } else {
    deactivate({ returnFocus: true })
  }
})

const closePanel = () => {
  showPanel.value = false
}
</script>
```

## Testing

To test accessibility features:

1. **Keyboard Navigation**: Tab through all interactive elements
2. **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
3. **Focus Management**: Ensure focus moves logically and is trapped in modals
4. **Skip Links**: Press Tab from page top to reveal skip links
5. **High Contrast**: Test in high contrast mode
6. **Reduced Motion**: Test with reduced motion preferences

## Browser Support

These components support:
- Chrome/Edge 88+
- Firefox 85+  
- Safari 14+
- Screen readers: NVDA, JAWS, VoiceOver
- Keyboard navigation
- High contrast mode
- Reduced motion preferences

## Standards Compliance

Implements WCAG 2.1 AA guidelines:
- 1.3.1 Info and Relationships
- 2.1.1 Keyboard Navigation  
- 2.1.2 No Keyboard Trap
- 2.4.1 Bypass Blocks (Skip Links)
- 2.4.3 Focus Order
- 2.4.7 Focus Visible
- 3.2.1 On Focus
- 4.1.2 Name, Role, Value