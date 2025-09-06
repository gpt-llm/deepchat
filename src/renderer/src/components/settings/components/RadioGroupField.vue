<template>
  <div class="radio-group-field space-y-3">
    <Label class="text-sm font-medium">
      {{ label }}
    </Label>
    
    <RadioGroup 
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :disabled="disabled"
      class="flex flex-wrap gap-4"
      :aria-label="label"
    >
      <div
        v-for="option in options"
        :key="option.value"
        class="flex items-center space-x-2"
      >
        <RadioGroupItem
          :value="option.value"
          :id="`${fieldId}-${option.value}`"
          :disabled="disabled"
        />
        <Label
          :for="`${fieldId}-${option.value}`"
          class="text-sm font-normal cursor-pointer"
          :class="{ 'text-muted-foreground': disabled }"
        >
          {{ option.label }}
        </Label>
      </div>
    </RadioGroup>
    
    <p v-if="description" class="text-xs text-muted-foreground">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Option {
  value: string
  label: string
}

interface Props {
  modelValue: string
  label: string
  description?: string
  options: Option[]
  disabled?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

// Generate unique ID for accessibility
const fieldId = computed(() => 
  `radio-group-${props.label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`
)
</script>

<style scoped>
/* Additional styles if needed */
</style>