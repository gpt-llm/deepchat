<template>
  <div class="p-6 space-y-6">
    <div class="space-y-4">
      <h1 class="text-2xl font-bold">ModelSelectionDialog Examples</h1>
      <p class="text-muted-foreground">
        This page demonstrates different usage patterns for the ModelSelectionDialog component.
      </p>
    </div>

    <!-- Example Controls -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button @click="showSingleSelectionDialog" variant="outline">
        Single Selection Example
      </Button>
      <Button @click="showMultipleSelectionDialog" variant="outline">
        Multiple Selection Example
      </Button>
      <Button @click="showFilteredDialog" variant="outline">
        Filtered Selection Example
      </Button>
      <Button @click="showPreSelectedDialog" variant="outline">
        Pre-selected Models Example
      </Button>
    </div>

    <!-- Results Display -->
    <div v-if="selectedResults.length > 0" class="mt-6">
      <h3 class="text-lg font-semibold mb-3">Selected Models:</h3>
      <div class="grid gap-2">
        <div
          v-for="model in selectedResults"
          :key="model.id"
          class="flex items-center gap-3 p-3 border rounded-lg"
        >
          <ModelIcon :model-id="model.providerId" class="w-5 h-5" />
          <div>
            <div class="font-medium">{{ model.name }}</div>
            <div class="text-sm text-muted-foreground">
              {{ model.providerId }} • {{ model.type || 'chat' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Components -->
    <ModelSelectionDialog
      v-model:open="singleSelectionOpen"
      :models="availableModels"
      :allow-multiple="false"
      title="Select a Single Model"
      description="Choose one model from the available options."
      confirm-button-text="Use This Model"
      @confirm="handleSingleSelection"
      @cancel="handleCancel"
    />

    <ModelSelectionDialog
      v-model:open="multipleSelectionOpen"
      :models="availableModels"
      :allow-multiple="true"
      title="Select Multiple Models"
      description="Choose one or more models from the available options."
      @confirm="handleMultipleSelection"
      @cancel="handleCancel"
    />

    <ModelSelectionDialog
      v-model:open="filteredDialogOpen"
      :models="availableModels"
      :allow-multiple="true"
      :filter-by-type="[ModelType.Chat]"
      title="Select Chat Models Only"
      description="Only chat models are available for selection."
      @confirm="handleFilteredSelection"
      @cancel="handleCancel"
    />

    <ModelSelectionDialog
      v-model:open="preSelectedDialogOpen"
      :models="availableModels"
      :selected-models="preSelectedModels"
      :allow-multiple="true"
      title="Edit Model Selection"
      description="Modify your existing model selection."
      @confirm="handlePreSelectedSelection"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import ModelSelectionDialog from './ModelSelectionDialog.vue'
import ModelIcon from '@/components/icons/ModelIcon.vue'
import { type RENDERER_MODEL_META } from '@shared/presenter'
import { ModelType } from '@shared/model'

// Dialog states
const singleSelectionOpen = ref(false)
const multipleSelectionOpen = ref(false)
const filteredDialogOpen = ref(false)
const preSelectedDialogOpen = ref(false)

// Results
const selectedResults = ref<RENDERER_MODEL_META[]>([])

// Mock data for examples
const availableModels: RENDERER_MODEL_META[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    group: 'Claude 3.5',
    providerId: 'anthropic',
    enabled: true,
    isCustom: false,
    contextLength: 200000,
    maxTokens: 4096,
    vision: true,
    functionCall: true,
    reasoning: false,
    type: ModelType.Chat
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4 Turbo',
    group: 'GPT-4',
    providerId: 'openai',
    enabled: true,
    isCustom: false,
    contextLength: 128000,
    maxTokens: 4096,
    vision: true,
    functionCall: true,
    reasoning: false,
    type: ModelType.Chat
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    group: 'Gemini 2.0',
    providerId: 'google',
    enabled: true,
    isCustom: false,
    contextLength: 1000000,
    maxTokens: 8192,
    vision: true,
    functionCall: true,
    reasoning: true,
    type: ModelType.Chat
  },
  {
    id: 'text-embedding-3-large',
    name: 'Text Embedding 3 Large',
    group: 'Embeddings',
    providerId: 'openai',
    enabled: true,
    isCustom: false,
    contextLength: 8192,
    maxTokens: 8192,
    vision: false,
    functionCall: false,
    reasoning: false,
    type: ModelType.Embedding
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    group: 'Claude 3',
    providerId: 'anthropic',
    enabled: true,
    isCustom: false,
    contextLength: 200000,
    maxTokens: 4096,
    vision: false,
    functionCall: true,
    reasoning: false,
    type: ModelType.Chat
  }
]

// Pre-selected models for example
const preSelectedModels = computed(() => [
  availableModels[0], // Claude 3.5 Sonnet
  availableModels[1]  // GPT-4 Turbo
])

// Dialog handlers
const showSingleSelectionDialog = () => {
  singleSelectionOpen.value = true
}

const showMultipleSelectionDialog = () => {
  multipleSelectionOpen.value = true
}

const showFilteredDialog = () => {
  filteredDialogOpen.value = true
}

const showPreSelectedDialog = () => {
  preSelectedDialogOpen.value = true
}

// Selection handlers
const handleSingleSelection = (models: RENDERER_MODEL_META[]) => {
  selectedResults.value = models
  console.log('Single selection result:', models[0])
}

const handleMultipleSelection = (models: RENDERER_MODEL_META[]) => {
  selectedResults.value = models
  console.log('Multiple selection result:', models)
}

const handleFilteredSelection = (models: RENDERER_MODEL_META[]) => {
  selectedResults.value = models
  console.log('Filtered selection result:', models)
}

const handlePreSelectedSelection = (models: RENDERER_MODEL_META[]) => {
  selectedResults.value = models
  console.log('Pre-selected dialog result:', models)
}

const handleCancel = () => {
  console.log('Selection cancelled')
}
</script>