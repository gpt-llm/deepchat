<template>
  <div class="settings-section border rounded-lg p-4 space-y-4" role="group" :aria-labelledby="titleId">
    <div class="section-header">
      <h3 :id="titleId" class="text-lg font-semibold">{{ title }}</h3>
      <p v-if="description" class="text-sm text-muted-foreground mt-1">{{ description }}</p>
    </div>
    
    <div class="section-content space-y-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  description?: string
}

const props = defineProps<Props>()

// Generate unique ID for accessibility
const titleId = computed(() => 
  `settings-section-${props.title.toLowerCase().replace(/\s+/g, '-')}`
)
</script>

<style scoped>
.settings-section {
  @apply bg-card;
}

.section-header h3 {
  @apply text-card-foreground;
}

.section-content {
  @apply space-y-3;
}
</style>