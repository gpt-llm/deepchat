<template>
  <Dialog v-model:open="isOpen" @update:open="onOpenChange">
    <DialogContent class="max-w-2xl max-h-[80vh] p-0 gap-0 flex flex-col">
      <DialogHeader class="p-6 pb-4 border-b border-border">
        <DialogTitle>{{ title || t('model.selection.title') }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <!-- Search and Filter Controls -->
      <div class="p-6 pb-4 border-b border-border space-y-4">
        <!-- Search Input -->
        <div class="relative">
          <Input
            v-model="searchQuery"
            :placeholder="t('model.selection.searchPlaceholder')"
            class="pl-10"
          />
          <Icon 
            icon="lucide:search" 
            class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" 
          />
        </div>

        <!-- Filter Controls -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <!-- Model Type Filter -->
            <Select v-model="selectedTypeFilter">
              <SelectTrigger class="w-40">
                <SelectValue :placeholder="t('model.selection.filterByType')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{{ t('model.selection.allTypes') }}</SelectItem>
                <SelectItem v-for="type in modelTypes" :key="type" :value="type">
                  {{ type }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Provider Filter -->
            <Select v-model="selectedProviderFilter" v-if="availableProviders.length > 1">
              <SelectTrigger class="w-40">
                <SelectValue :placeholder="t('model.selection.filterByProvider')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{{ t('model.selection.allProviders') }}</SelectItem>
                <SelectItem v-for="provider in availableProviders" :key="provider" :value="provider">
                  {{ provider }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Select All/None Controls -->
          <div class="flex items-center gap-2" v-if="allowMultiple">
            <Button
              variant="outline"
              size="sm"
              @click="selectAllFiltered"
              :disabled="filteredModels.length === 0"
            >
              <Icon icon="lucide:check-circle" class="w-4 h-4 mr-1" />
              {{ t('model.selection.selectAll') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="deselectAll"
              :disabled="selectedModelIds.size === 0"
            >
              <Icon icon="lucide:x-circle" class="w-4 h-4 mr-1" />
              {{ t('model.selection.selectNone') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Model List -->
      <div class="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
        <div v-if="filteredModels.length === 0" class="text-center py-12">
          <Icon icon="lucide:search-x" class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p class="text-muted-foreground">{{ t('model.selection.noModelsFound') }}</p>
        </div>

        <div v-else class="space-y-4">
          <!-- Group by Provider -->
          <div v-for="[providerId, models] in groupedModels" :key="providerId" class="space-y-2">
            <h3 class="text-sm font-semibold text-foreground flex items-center gap-2">
              <ModelIcon :model-id="providerId" class="w-5 h-5" />
              {{ getProviderName(providerId) }}
              <span class="text-xs text-muted-foreground font-normal">
                ({{ models.length }})
              </span>
            </h3>

            <div class="border border-border rounded-lg overflow-hidden">
              <div
                v-for="(model, index) in models"
                :key="model.id"
                :class="[
                  'flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                  index > 0 && 'border-t border-border',
                  selectedModelIds.has(model.id) && 'bg-muted'
                ]"
                @click="toggleModelSelection(model)"
              >
                <!-- Checkbox (for multiple selection) or Radio (for single selection) -->
                <div class="flex items-center">
                  <Checkbox
                    v-if="allowMultiple"
                    :checked="selectedModelIds.has(model.id)"
                    @update:checked="toggleModelSelection(model)"
                    class="mr-0"
                  />
                  <div
                    v-else
                    :class="[
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      selectedModelIds.has(model.id)
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    ]"
                  >
                    <div
                      v-if="selectedModelIds.has(model.id)"
                      class="w-2 h-2 rounded-full bg-primary-foreground"
                    />
                  </div>
                </div>

                <!-- Model Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-foreground truncate">{{ model.name }}</span>
                    <!-- Capability Icons -->
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <Icon
                        v-if="model.vision"
                        icon="lucide:eye"
                        class="w-4 h-4 text-blue-500"
                        :title="t('model.capabilities.vision')"
                      />
                      <Icon
                        v-if="model.functionCall"
                        icon="lucide:function-square"
                        class="w-4 h-4 text-orange-500"
                        :title="t('model.capabilities.functionCall')"
                      />
                      <Icon
                        v-if="model.reasoning"
                        icon="lucide:brain"
                        class="w-4 h-4 text-purple-500"
                        :title="t('model.capabilities.reasoning')"
                      />
                    </div>
                  </div>

                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span class="px-2 py-0.5 rounded-full bg-muted border">{{ model.type || 'chat' }}</span>
                    <span>{{ model.contextLength.toLocaleString() }} tokens</span>
                    <span v-if="model.group">• {{ model.group }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Selection Summary -->
      <div v-if="allowMultiple && selectedModelIds.size > 0" class="px-6 py-3 border-t border-border bg-muted/20">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">
            {{ t('model.selection.selectedCount', { count: selectedModelIds.size }) }}
          </span>
          <Button variant="ghost" size="sm" @click="deselectAll">
            <Icon icon="lucide:x" class="w-4 h-4 mr-1" />
            {{ t('model.selection.clear') }}
          </Button>
        </div>
      </div>

      <!-- Dialog Footer -->
      <DialogFooter class="p-6 pt-4 border-t border-border">
        <Button variant="outline" @click="closeDialog">
          {{ t('dialog.cancel') }}
        </Button>
        <Button
          @click="confirmSelection"
          :disabled="selectedModelIds.size === 0"
        >
          {{ confirmButtonText || t('dialog.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Icon } from '@iconify/vue'
import ModelIcon from '@/components/icons/ModelIcon.vue'
import { type RENDERER_MODEL_META } from '@shared/presenter'
import { ModelType } from '@shared/model'

const { t } = useI18n()

interface Props {
  open: boolean
  models: RENDERER_MODEL_META[]
  selectedModels?: RENDERER_MODEL_META[]
  allowMultiple?: boolean
  title?: string
  description?: string
  confirmButtonText?: string
  filterByType?: string[]
  filterByProvider?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  allowMultiple: true,
  selectedModels: () => [],
  filterByType: () => Object.values(ModelType),
  filterByProvider: () => []
})

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', models: RENDERER_MODEL_META[]): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// Component state
const isOpen = ref(props.open)
const searchQuery = ref('')
const selectedTypeFilter = ref('')
const selectedProviderFilter = ref('')
const selectedModelIds = ref(new Set<string>())

// Initialize selected models
const initializeSelection = () => {
  selectedModelIds.value = new Set(props.selectedModels?.map(model => model.id) || [])
}

// Watch for prop changes
watch(() => props.open, (newVal) => {
  isOpen.value = newVal
  if (newVal) {
    initializeSelection()
  }
})

watch(() => props.selectedModels, () => {
  if (props.open) {
    initializeSelection()
  }
}, { deep: true })

// Available options for filters
const modelTypes = computed(() => {
  const types = new Set<string>()
  props.models.forEach(model => {
    if (model.type) types.add(model.type)
  })
  return Array.from(types).sort()
})

const availableProviders = computed(() => {
  const providers = new Set<string>()
  props.models.forEach(model => {
    providers.add(model.providerId)
  })
  return Array.from(providers).sort()
})

// Filtered models based on search and filters
const filteredModels = computed(() => {
  let filtered = props.models

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(model =>
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query) ||
      model.group?.toLowerCase().includes(query)
    )
  }

  // Apply type filter
  if (selectedTypeFilter.value) {
    filtered = filtered.filter(model => model.type === selectedTypeFilter.value)
  }

  // Apply provider filter
  if (selectedProviderFilter.value) {
    filtered = filtered.filter(model => model.providerId === selectedProviderFilter.value)
  }

  // Apply custom filters
  if (props.filterByType.length > 0) {
    filtered = filtered.filter(model => 
      model.type ? props.filterByType.includes(model.type) : true
    )
  }

  if (props.filterByProvider.length > 0) {
    filtered = filtered.filter(model => 
      props.filterByProvider.includes(model.providerId)
    )
  }

  return filtered
})

// Group models by provider
const groupedModels = computed(() => {
  const groups = new Map<string, RENDERER_MODEL_META[]>()
  
  filteredModels.value.forEach(model => {
    if (!groups.has(model.providerId)) {
      groups.set(model.providerId, [])
    }
    groups.get(model.providerId)!.push(model)
  })

  // Sort models within each group
  groups.forEach((models) => {
    models.sort((a, b) => a.name.localeCompare(b.name))
  })

  return groups
})

// Helper functions
const getProviderName = (providerId: string): string => {
  // You might want to map provider IDs to display names
  return providerId.charAt(0).toUpperCase() + providerId.slice(1)
}

const toggleModelSelection = (model: RENDERER_MODEL_META) => {
  if (props.allowMultiple) {
    if (selectedModelIds.value.has(model.id)) {
      selectedModelIds.value.delete(model.id)
    } else {
      selectedModelIds.value.add(model.id)
    }
  } else {
    selectedModelIds.value = new Set([model.id])
  }
  selectedModelIds.value = new Set(selectedModelIds.value) // Trigger reactivity
}

const selectAllFiltered = () => {
  filteredModels.value.forEach(model => {
    selectedModelIds.value.add(model.id)
  })
  selectedModelIds.value = new Set(selectedModelIds.value)
}

const deselectAll = () => {
  selectedModelIds.value.clear()
  selectedModelIds.value = new Set(selectedModelIds.value)
}

const onOpenChange = (open: boolean) => {
  isOpen.value = open
  emit('update:open', open)
  
  if (!open) {
    // Reset filters and search when closing
    searchQuery.value = ''
    selectedTypeFilter.value = ''
    selectedProviderFilter.value = ''
  }
}

const closeDialog = () => {
  emit('cancel')
  onOpenChange(false)
}

const confirmSelection = () => {
  const selectedModels = props.models.filter(model => 
    selectedModelIds.value.has(model.id)
  )
  emit('confirm', selectedModels)
  onOpenChange(false)
}

// Initialize on mount
initializeSelection()
</script>

<style scoped>
/* Custom scrollbar styles if needed */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
</style>