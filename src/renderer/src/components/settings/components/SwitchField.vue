<template>
  <div class="switch-field flex items-center justify-between py-2">
    <div class="flex-1">
      <Label :for="fieldId" class="text-sm font-medium cursor-pointer">
        {{ label }}
      </Label>
      <p v-if="description" class="text-xs text-muted-foreground mt-1">
        {{ description }}
      </p>
    </div>

    <Switch
      :id="fieldId"
      :checked="modelValue"
      :disabled="disabled"
      @update:checked="$emit('update:modelValue', $event)"
      :aria-describedby="description ? `${fieldId}-desc` : undefined"
      class="ml-4"
    />

    <div v-if="description" :id="`${fieldId}-desc`" class="sr-only">
      {{ description }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Props {
  modelValue: boolean
  label: string
  description?: string
  disabled?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Generate unique ID for accessibility
const fieldId = computed(
  () =>
    `switch-${props.label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`
)
</script>

<style scoped>
.sr-only {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
</style>
