<template>
  <div class="shortcut-field space-y-2">
    <Label :for="fieldId" class="text-sm font-medium">
      {{ label }}
    </Label>

    <div class="flex items-center space-x-2">
      <Input
        :id="fieldId"
        :value="displayValue"
        readonly
        class="font-mono text-sm flex-1 cursor-pointer"
        :class="{ 'ring-2 ring-primary': isRecording }"
        @focus="startRecording"
        @keydown="handleKeyDown"
        :aria-describedby="`${fieldId}-help`"
        :aria-label="`${label}: ${displayValue}${isRecording ? ', Press keys to record shortcut' : ', Click to change'}`"
      />

      <Button
        variant="outline"
        size="sm"
        @click="startRecording"
        :aria-label="isRecording ? 'Recording shortcut...' : 'Change shortcut'"
        :disabled="isRecording"
      >
        {{ isRecording ? tFallback('recording') : tFallback('change') }}
      </Button>

      <Button
        v-if="isRecording"
        variant="ghost"
        size="sm"
        @click="cancelRecording"
        :aria-label="t('cancel')"
      >
        {{ tFallback('cancel') }}
      </Button>
    </div>

    <p :id="`${fieldId}-help`" class="text-xs text-muted-foreground">
      {{ helpText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface Props {
  modelValue: string
  label: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const isRecording = ref(false)
const pressedKeys = ref(new Set<string>())

// Generate unique ID for accessibility
const fieldId = computed(
  () =>
    `shortcut-${props.label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`
)

const displayValue = computed(() => {
  if (isRecording.value && pressedKeys.value.size > 0) {
    return Array.from(pressedKeys.value).join('+')
  }
  return props.modelValue || tFallback('settings.accessibility.keyboard.noShortcut')
})

const helpText = computed(() => {
  if (isRecording.value) {
    return tFallback('settings.accessibility.keyboard.recordingHelp')
  }
  return tFallback('settings.accessibility.keyboard.shortcutHelp')
})

const startRecording = async () => {
  isRecording.value = true
  pressedKeys.value.clear()
  await nextTick()
  // Focus the input to capture keydown events
  const input = document.getElementById(fieldId.value) as HTMLInputElement
  if (input) {
    input.focus()
  }
}

const cancelRecording = () => {
  isRecording.value = false
  pressedKeys.value.clear()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!isRecording.value) return

  event.preventDefault()
  event.stopPropagation()

  // Map special keys
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    Control: 'Ctrl',
    Meta: 'Cmd',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Esc'
  }

  let key = event.key
  if (keyMap[key]) {
    key = keyMap[key]
  }

  // Add modifier keys
  if (event.ctrlKey && key !== 'Ctrl') pressedKeys.value.add('Ctrl')
  if (event.altKey && key !== 'Alt') pressedKeys.value.add('Alt')
  if (event.shiftKey && key !== 'Shift') pressedKeys.value.add('Shift')
  if (event.metaKey && key !== 'Cmd') pressedKeys.value.add('Cmd')

  // Add main key (if not a modifier)
  if (!['Control', 'Alt', 'Shift', 'Meta', 'Ctrl', 'Cmd'].includes(key)) {
    pressedKeys.value.add(key)

    // Complete recording when we have a main key
    setTimeout(() => {
      finishRecording()
    }, 100)
  }
}

const finishRecording = () => {
  if (pressedKeys.value.size > 0) {
    const shortcut = Array.from(pressedKeys.value).join('+')
    emit('update:modelValue', shortcut)
  }

  isRecording.value = false
  pressedKeys.value.clear()
}

// Set default translations if not available
const defaultTranslations = {
  recording: 'Recording...',
  change: 'Change',
  cancel: 'Cancel',
  'settings.accessibility.keyboard.noShortcut': 'No shortcut set',
  'settings.accessibility.keyboard.recordingHelp': 'Press the key combination you want to use',
  'settings.accessibility.keyboard.shortcutHelp':
    'Click the Change button and press the desired key combination'
}

// Fallback function for translations
const tFallback = (key: string) => {
  try {
    return t(key)
  } catch {
    return defaultTranslations[key as keyof typeof defaultTranslations] || key
  }
}
</script>

<style scoped>
.shortcut-field .font-mono {
  font-family:
    ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Inconsolata, 'Liberation Mono', 'Courier New',
    monospace;
}
</style>
