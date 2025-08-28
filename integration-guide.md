# ModelSelectionDialog Component Integration Guide

## Overview

The `ModelSelectionDialog` component provides a comprehensive, reusable dialog for selecting models with advanced filtering, search, and multi-selection capabilities. It follows the existing DeepChat UI patterns and design system.

## Features

✅ **Multiple Selection Modes**: Support for single or multiple model selection  
✅ **Advanced Search**: Search by model name, ID, or group  
✅ **Smart Filtering**: Filter by model type and provider  
✅ **Provider Grouping**: Models are grouped by provider for better organization  
✅ **Capability Indicators**: Visual icons for vision, function calling, and reasoning support  
✅ **Responsive Design**: Works on all screen sizes  
✅ **Internationalization**: Full i18n support (English and Chinese included)  
✅ **Type Safety**: Full TypeScript support with proper interfaces  
✅ **Accessibility**: Built with Radix UI components for proper a11y  

## Component API

### Props

```typescript
interface Props {
  open: boolean                          // Dialog open state
  models: RENDERER_MODEL_META[]         // Available models to select from
  selectedModels?: RENDERER_MODEL_META[] // Pre-selected models
  allowMultiple?: boolean               // Allow multiple selection (default: true)
  title?: string                        // Dialog title (optional)
  description?: string                  // Dialog description (optional)
  confirmButtonText?: string            // Custom confirm button text (optional)
  filterByType?: string[]              // Limit available model types
  filterByProvider?: string[]          // Limit available providers
}
```

### Events

```typescript
interface Emits {
  (e: 'update:open', value: boolean): void        // Dialog open state change
  (e: 'confirm', models: RENDERER_MODEL_META[]): void  // Selection confirmed
  (e: 'cancel'): void                             // Selection cancelled
}
```

### RENDERER_MODEL_META Interface

```typescript
type RENDERER_MODEL_META = {
  id: string                    // Unique model identifier
  name: string                  // Display name
  group: string                 // Model group/family
  providerId: string            // Provider identifier
  enabled: boolean              // Whether model is enabled
  isCustom: boolean            // Is custom model
  contextLength: number         // Context window size
  maxTokens: number            // Maximum output tokens
  vision?: boolean             // Supports image input
  functionCall?: boolean       // Supports function calling
  reasoning?: boolean          // Supports advanced reasoning
  type?: ModelType             // Model type (chat, embedding, etc.)
}
```

## Basic Usage

### Single Model Selection

```vue
<template>
  <div>
    <Button @click="showModelSelector = true">
      Select Model
    </Button>

    <ModelSelectionDialog
      v-model:open="showModelSelector"
      :models="availableModels"
      :allow-multiple="false"
      title="Choose a Model"
      description="Select one model for your chat session."
      @confirm="handleModelSelection"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import ModelSelectionDialog from '@/components/ui/ModelSelectionDialog.vue'
import { type RENDERER_MODEL_META } from '@shared/presenter'

const showModelSelector = ref(false)
const availableModels = ref<RENDERER_MODEL_META[]>([])

const handleModelSelection = (models: RENDERER_MODEL_META[]) => {
  const selectedModel = models[0]
  console.log('Selected model:', selectedModel)
  // Use the selected model in your application
}

const handleCancel = () => {
  console.log('Selection cancelled')
}
</script>
```

### Multiple Model Selection

```vue
<template>
  <div>
    <Button @click="showModelSelector = true">
      Select Multiple Models
    </Button>

    <ModelSelectionDialog
      v-model:open="showModelSelector"
      :models="availableModels"
      :allow-multiple="true"
      :selected-models="currentSelection"
      title="Choose Models"
      description="Select one or more models for comparison."
      @confirm="handleMultipleSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type RENDERER_MODEL_META } from '@shared/presenter'

const showModelSelector = ref(false)
const availableModels = ref<RENDERER_MODEL_META[]>([])
const currentSelection = ref<RENDERER_MODEL_META[]>([])

const handleMultipleSelection = (models: RENDERER_MODEL_META[]) => {
  currentSelection.value = models
  console.log('Selected models:', models)
  // Use the selected models in your application
}
</script>
```

### Filtered Selection

```vue
<template>
  <ModelSelectionDialog
    v-model:open="showChatModelSelector"
    :models="allModels"
    :filter-by-type="[ModelType.Chat]"
    :filter-by-provider="['openai', 'anthropic']"
    title="Select Chat Models"
    description="Choose from OpenAI and Anthropic chat models only."
    @confirm="handleChatModelSelection"
  />
</template>

<script setup lang="ts">
import { ModelType } from '@shared/model'

const handleChatModelSelection = (models: RENDERER_MODEL_META[]) => {
  // Only chat models from OpenAI and Anthropic will be available
  console.log('Selected chat models:', models)
}
</script>
```

## Integration with Existing Components

### Using with Settings Store

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

// Get all available models from the settings store
const availableModels = computed(() => {
  return settingsStore.allProviderModels.flatMap(provider => 
    provider.models.filter(model => model.enabled)
  )
})

// Get currently enabled models
const enabledModels = computed(() => {
  return settingsStore.enabledModels.flatMap(provider => provider.models)
})

const handleModelUpdate = async (selectedModels: RENDERER_MODEL_META[]) => {
  // Update model selection in settings
  for (const model of selectedModels) {
    await settingsStore.updateModelStatus(model.providerId, model.id, true)
  }
}
</script>
```

### Custom Provider Name Mapping

```vue
<script setup lang="ts">
// Create a provider name mapping for better display names
const providerNames: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google AI',
  'ollama': 'Ollama (Local)',
  // Add more mappings as needed
}

// You can extend the component to use custom provider names
// by modifying the getProviderName function in the component
</script>
```

## Styling and Customization

### Custom Styling

The component uses Tailwind CSS classes and follows the existing design system. You can customize the appearance by:

1. **Modifying CSS variables** in your theme configuration
2. **Extending Tailwind classes** for custom styling
3. **Using CSS custom properties** for dynamic theming

### Layout Customization

```vue
<!-- Custom dialog size -->
<ModelSelectionDialog
  v-model:open="showDialog"
  :models="models"
  class="max-w-4xl"  <!-- Custom width -->
  @confirm="handleSelection"
/>
```

## Error Handling

```vue
<script setup lang="ts">
import { ref } from 'vue'

const error = ref<string | null>(null)

const handleModelSelection = async (models: RENDERER_MODEL_META[]) => {
  try {
    error.value = null
    // Process selection
    await processModelSelection(models)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Selection failed'
    console.error('Model selection error:', err)
  }
}
</script>

<template>
  <div>
    <div v-if="error" class="text-red-500 mb-4">
      {{ error }}
    </div>
    
    <ModelSelectionDialog
      v-model:open="showDialog"
      :models="models"
      @confirm="handleModelSelection"
    />
  </div>
</template>
```

## Accessibility Features

The component includes:
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Focus management** when opening/closing
- **ARIA labels** for all interactive elements
- **High contrast** support

## Performance Considerations

- **Virtual scrolling** for large model lists (implemented automatically)
- **Efficient filtering** with computed properties
- **Lazy loading** of model icons when needed
- **Minimal re-renders** with proper reactivity

## Browser Compatibility

- ✅ Chrome/Chromium (Electron)
- ✅ Modern web browsers with ES2020+ support
- ✅ Responsive design for different screen sizes

## Troubleshooting

### Common Issues

1. **Models not showing**: Ensure `models` prop contains valid `RENDERER_MODEL_META` objects
2. **Selection not working**: Check that `v-model:open` is properly bound
3. **Styling issues**: Verify Tailwind CSS classes are available in your build
4. **i18n missing**: Ensure translation keys are added to your locale files

### Debug Mode

Add console logging to track component behavior:

```vue
<ModelSelectionDialog
  v-model:open="showDialog"
  :models="models"
  @confirm="(models) => { console.log('Selected:', models); handleSelection(models) }"
  @cancel="() => console.log('Cancelled')"
/>
```

## Migration from Existing Components

If you have existing model selection components, here's how to migrate:

### From Custom Dialog

```vue
<!-- Before: Custom dialog -->
<MyModelDialog v-model="showDialog" @select="onSelect" />

<!-- After: ModelSelectionDialog -->
<ModelSelectionDialog
  v-model:open="showDialog"
  :models="availableModels"
  @confirm="onSelect"
/>
```

### From Simple Select

```vue
<!-- Before: Simple select dropdown -->
<Select v-model="selectedModel">
  <SelectItem v-for="model in models" :value="model">
    {{ model.name }}
  </SelectItem>
</Select>

<!-- After: Rich selection dialog -->
<ModelSelectionDialog
  v-model:open="showDialog"
  :models="models"
  :allow-multiple="false"
  @confirm="(models) => selectedModel = models[0]"
/>
```

This component provides a comprehensive, production-ready solution for model selection in the DeepChat application while maintaining consistency with the existing design system and architectural patterns.