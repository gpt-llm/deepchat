<template>
  <ScrollArea class="w-full h-full p-4">
    <div class="w-full max-w-4xl mx-auto space-y-6" role="tabpanel" aria-labelledby="a11y-tab">
      <!-- Page Header -->
      <div class="space-y-2">
        <h2 id="a11y-title" class="text-2xl font-semibold">
          {{ t('settings.accessibility.title') }}
        </h2>
        <p class="text-muted-foreground">
          {{ t('settings.accessibility.description') }}
        </p>
      </div>

      <!-- Screen Reader Support Section -->
      <SettingsSection
        :title="t('settings.accessibility.screenReader.title')"
        :description="t('settings.accessibility.screenReader.description')"
      >
        <div class="space-y-4">
          <SwitchField
            :model-value="settings.screenReader.enabled"
            @update:model-value="(value) => updateScreenReaderSettings({ enabled: value })"
            :label="t('settings.accessibility.screenReader.enabled')"
            :description="t('settings.accessibility.screenReader.enabledDesc')"
          />

          <SwitchField
            :model-value="settings.screenReader.announceNewMessages"
            @update:model-value="
              (value) => updateScreenReaderSettings({ announceNewMessages: value })
            "
            :label="t('settings.accessibility.screenReader.announceMessages')"
            :disabled="!settings.screenReader.enabled"
          />

          <SwitchField
            :model-value="settings.screenReader.detailedDescriptions"
            @update:model-value="
              (value) => updateScreenReaderSettings({ detailedDescriptions: value })
            "
            :label="t('settings.accessibility.screenReader.detailedDesc')"
            :disabled="!settings.screenReader.enabled"
          />

          <SwitchField
            :model-value="settings.screenReader.reduceVerbosity"
            @update:model-value="(value) => updateScreenReaderSettings({ reduceVerbosity: value })"
            :label="t('settings.accessibility.screenReader.reduceVerbosity')"
            :disabled="!settings.screenReader.enabled"
          />
        </div>
      </SettingsSection>

      <!-- Keyboard Navigation Section -->
      <SettingsSection
        :title="t('settings.accessibility.keyboard.title')"
        :description="t('settings.accessibility.keyboard.description')"
      >
        <div class="space-y-4">
          <SwitchField
            :model-value="settings.keyboard.enhancedNavigation"
            @update:model-value="(value) => updateKeyboardSettings({ enhancedNavigation: value })"
            :label="t('settings.accessibility.keyboard.enhanced')"
          />

          <SwitchField
            :model-value="settings.keyboard.showFocusIndicators"
            @update:model-value="(value) => updateKeyboardSettings({ showFocusIndicators: value })"
            :label="t('settings.accessibility.keyboard.focusIndicators')"
          />

          <SwitchField
            :model-value="settings.keyboard.enableSkipLinks"
            @update:model-value="(value) => updateKeyboardSettings({ enableSkipLinks: value })"
            :label="t('settings.accessibility.keyboard.skipLinks')"
          />

          <!-- Keyboard Shortcuts Configuration -->
          <div class="pt-4 border-t">
            <h4 class="font-medium mb-4">{{ t('settings.accessibility.keyboard.shortcuts') }}</h4>

            <div class="grid gap-4 sm:grid-cols-2">
              <ShortcutField
                :model-value="settings.keyboard.shortcuts.skipToMain"
                @update:model-value="(value) => updateShortcut('skipToMain', value)"
                :label="t('settings.accessibility.keyboard.skipToMain')"
              />

              <ShortcutField
                :model-value="settings.keyboard.shortcuts.newConversation"
                @update:model-value="(value) => updateShortcut('newConversation', value)"
                :label="t('settings.accessibility.keyboard.newConversation')"
              />

              <ShortcutField
                :model-value="settings.keyboard.shortcuts.settings"
                @update:model-value="(value) => updateShortcut('settings', value)"
                :label="t('settings.accessibility.keyboard.settings')"
              />

              <ShortcutField
                :model-value="settings.keyboard.shortcuts.help"
                @update:model-value="(value) => updateShortcut('help', value)"
                :label="t('settings.accessibility.keyboard.help')"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      <!-- Visual Accessibility Section -->
      <SettingsSection
        :title="t('settings.accessibility.visual.title')"
        :description="t('settings.accessibility.visual.description')"
      >
        <div class="space-y-4">
          <SwitchField
            :model-value="settings.visual.highContrast"
            @update:model-value="(value) => updateVisualSettings({ highContrast: value })"
            :label="t('settings.accessibility.visual.highContrast')"
          />

          <SwitchField
            :model-value="settings.visual.reducedMotion"
            @update:model-value="(value) => updateVisualSettings({ reducedMotion: value })"
            :label="t('settings.accessibility.visual.reducedMotion')"
          />

          <!-- Font Size Selection -->
          <RadioGroupField
            :model-value="settings.visual.fontSize"
            @update:model-value="(value) => updateVisualSettings({ fontSize: value as any })"
            :label="t('settings.accessibility.visual.fontSize')"
            :options="fontSizeOptions"
          />

          <!-- Focus Indicator Style -->
          <RadioGroupField
            :model-value="settings.visual.focusIndicatorStyle"
            @update:model-value="
              (value) => updateVisualSettings({ focusIndicatorStyle: value as any })
            "
            :label="t('settings.accessibility.visual.focusIndicator')"
            :options="focusIndicatorOptions"
          />

          <!-- Contrast Level -->
          <RadioGroupField
            :model-value="settings.visual.contrastLevel"
            @update:model-value="(value) => updateVisualSettings({ contrastLevel: value as any })"
            :label="t('settings.accessibility.visual.contrastLevel')"
            :options="contrastLevelOptions"
          />
        </div>
      </SettingsSection>

      <!-- Cognitive Assistance Section -->
      <SettingsSection
        :title="t('settings.accessibility.cognitive.title')"
        :description="t('settings.accessibility.cognitive.description')"
      >
        <div class="space-y-4">
          <SwitchField
            :model-value="settings.cognitive.simplifiedMode"
            @update:model-value="(value) => updateCognitiveSettings({ simplifiedMode: value })"
            :label="t('settings.accessibility.cognitive.simplifiedMode')"
          />

          <SwitchField
            :model-value="settings.cognitive.readingAssistance"
            @update:model-value="(value) => updateCognitiveSettings({ readingAssistance: value })"
            :label="t('settings.accessibility.cognitive.readingAssistance')"
          />

          <SwitchField
            :model-value="settings.cognitive.autoImageDescriptions"
            @update:model-value="
              (value) => updateCognitiveSettings({ autoImageDescriptions: value })
            "
            :label="t('settings.accessibility.cognitive.autoImageDesc')"
          />

          <SwitchField
            :model-value="settings.cognitive.stepByStepGuidance"
            @update:model-value="(value) => updateCognitiveSettings({ stepByStepGuidance: value })"
            :label="t('settings.accessibility.cognitive.stepByStep')"
          />
        </div>
      </SettingsSection>

      <!-- Audio and Voice Section -->
      <SettingsSection
        :title="t('settings.accessibility.audio.title')"
        :description="t('settings.accessibility.audio.description')"
      >
        <div class="space-y-4">
          <SwitchField
            :model-value="settings.audio.voiceAnnouncements"
            @update:model-value="(value) => updateAudioSettings({ voiceAnnouncements: value })"
            :label="t('settings.accessibility.audio.voiceAnnouncements')"
          />

          <SwitchField
            :model-value="settings.audio.soundFeedback"
            @update:model-value="(value) => updateAudioSettings({ soundFeedback: value })"
            :label="t('settings.accessibility.audio.soundFeedback')"
          />

          <!-- Voice Speed -->
          <RadioGroupField
            :model-value="settings.audio.voiceSpeed"
            @update:model-value="(value) => updateAudioSettings({ voiceSpeed: value as any })"
            :label="t('settings.accessibility.audio.voiceSpeed')"
            :options="voiceSpeedOptions"
            :disabled="!settings.audio.voiceAnnouncements"
          />

          <!-- Announcement Volume -->
          <RadioGroupField
            :model-value="settings.audio.announcementVolume"
            @update:model-value="
              (value) => updateAudioSettings({ announcementVolume: value as any })
            "
            :label="t('settings.accessibility.audio.volume')"
            :options="volumeOptions"
            :disabled="!settings.audio.soundFeedback"
          />
        </div>
      </SettingsSection>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3 pt-6 border-t">
        <Button variant="outline" @click="resetToDefaults">
          {{ t('settings.accessibility.resetDefaults') }}
        </Button>

        <Button @click="saveSettings">
          {{ t('settings.accessibility.save') }}
        </Button>
      </div>
    </div>
  </ScrollArea>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useAccessibilityStore } from '@/stores/accessibility'
import SettingsSection from './components/SettingsSection.vue'
import SwitchField from './components/SwitchField.vue'
import ShortcutField from './components/ShortcutField.vue'
import RadioGroupField from './components/RadioGroupField.vue'

const { t } = useI18n()
const accessibilityStore = useAccessibilityStore()

const {
  settings,
  updateScreenReaderSettings,
  updateKeyboardSettings,
  updateVisualSettings,
  updateCognitiveSettings,
  updateAudioSettings,
  resetToDefaults: storeResetToDefaults,
  saveSettings: storeSaveSettings,
  loadSettings
} = accessibilityStore

// Font size options
const fontSizeOptions = computed(() => [
  { value: 'small', label: t('settings.accessibility.visual.fontSizes.small') },
  { value: 'normal', label: t('settings.accessibility.visual.fontSizes.normal') },
  { value: 'large', label: t('settings.accessibility.visual.fontSizes.large') },
  { value: 'extra-large', label: t('settings.accessibility.visual.fontSizes.extraLarge') }
])

// Focus indicator options
const focusIndicatorOptions = computed(() => [
  { value: 'default', label: t('settings.accessibility.visual.focusStyles.default') },
  { value: 'thick', label: t('settings.accessibility.visual.focusStyles.thick') },
  { value: 'high-contrast', label: t('settings.accessibility.visual.focusStyles.highContrast') }
])

// Contrast level options
const contrastLevelOptions = computed(() => [
  { value: 'AA', label: t('settings.accessibility.visual.contrastLevels.aa') },
  { value: 'AAA', label: t('settings.accessibility.visual.contrastLevels.aaa') }
])

// Voice speed options
const voiceSpeedOptions = computed(() => [
  { value: 'slow', label: t('settings.accessibility.audio.voiceSpeeds.slow') },
  { value: 'normal', label: t('settings.accessibility.audio.voiceSpeeds.normal') },
  { value: 'fast', label: t('settings.accessibility.audio.voiceSpeeds.fast') }
])

// Volume options
const volumeOptions = computed(() => [
  { value: 'low', label: t('settings.accessibility.audio.volumes.low') },
  { value: 'medium', label: t('settings.accessibility.audio.volumes.medium') },
  { value: 'high', label: t('settings.accessibility.audio.volumes.high') }
])

// Update shortcut helper
const updateShortcut = async (
  key: keyof typeof settings.value.keyboard.shortcuts,
  value: string
) => {
  const shortcuts = { ...settings.value.keyboard.shortcuts, [key]: value }
  await updateKeyboardSettings({ shortcuts })
}

// Action handlers
const resetToDefaults = async () => {
  try {
    await storeResetToDefaults()
    accessibilityStore.announceMessage(t('settings.accessibility.resetSuccess'), 'polite')
    accessibilityStore.playSoundFeedback('success')
  } catch (error) {
    console.error('Failed to reset accessibility settings:', error)
    accessibilityStore.announceMessage(t('settings.accessibility.resetError'), 'assertive')
    accessibilityStore.playSoundFeedback('error')
  }
}

const saveSettings = async () => {
  try {
    await storeSaveSettings()
    accessibilityStore.announceMessage(t('settings.accessibility.saveSuccess'), 'polite')
    accessibilityStore.playSoundFeedback('success')
  } catch (error) {
    console.error('Failed to save accessibility settings:', error)
    accessibilityStore.announceMessage(t('settings.accessibility.saveError'), 'assertive')
    accessibilityStore.playSoundFeedback('error')
  }
}

// Load settings on mount
onMounted(async () => {
  await loadSettings()
})
</script>

<style scoped>
/* Custom styles for accessibility settings */
.a11y-settings {
  /* Settings will be applied via the store */
}
</style>
