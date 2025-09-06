<template>
  <div class="flex p-2 flex-col items-center border-r bg-background" role="navigation" aria-label="Main navigation">
    <!-- Navigation Items -->
    <nav class="flex flex-1 flex-col gap-2" role="list">
      <!-- Chat Section -->
      <Button
        variant="ghost"
        size="icon"
        class="rounded-lg w-9 h-9"
        :class="{ 'bg-accent': modelValue === 'chat' }"
        :aria-current="modelValue === 'chat' ? 'page' : undefined"
        role="listitem"
        @click="$emit('update:modelValue', 'chat')"
      >
        <Icon
          icon="lucide:message-circle"
          :class="['h-5 w-5', modelValue === 'chat' ? ' text-primary' : 'text-muted-foreground']"
        />
        <span class="sr-only">{{ $t('sidebar.chat') }}</span>
      </Button>

      <!-- Settings Section -->

      <Button
        variant="ghost"
        size="icon"
        class="rounded-lg w-9 h-9"
        :class="{ 'bg-accent': modelValue === 'settings' }"
        :aria-current="modelValue === 'settings' ? 'page' : undefined"
        role="listitem"
        @click="$emit('update:modelValue', 'settings')"
      >
        <Icon
          icon="lucide:bolt"
          :class="[
            'h-5 w-5',
            modelValue === 'settings' ? ' text-primary' : 'text-muted-foreground'
          ]"
        />
        <span class="sr-only">{{ $t('sidebar.settings') }}</span>
      </Button>
      <!-- Debug Section -->
      <!-- <Button
        variant="ghost"
        size="icon"
        class="rounded-lg w-9 h-9"
        :class="{ 'bg-accent': modelValue === 'debug' }"
        @click="$emit('update:modelValue', 'debug')"
      >
        <Icon
          icon="lucide:bug"
          :class="['h-5 w-5', modelValue === 'debug' ? ' text-primary' : 'text-muted-foreground']"
        />
        <span class="sr-only">Debug</span>
      </Button> -->
    </nav>
    <!-- User Profile Section -->
    <div class="mt-auto relative flex flex-col items-center" role="group" aria-label="User actions">
      <Button
        variant="ghost"
        size="icon"
        class="w-9 h-9 rounded-lg text-muted-foreground"
        :aria-label="themeStore.isDark ? $t('sidebar.lightMode') : $t('sidebar.darkMode')"
        @click="themeStore.toggleDark()"
      >
        <Icon :icon="themeStore.isDark ? 'lucide:sun' : 'lucide:moon'" class="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="rounded-lg w-9 h-9 text-muted-foreground relative"
        :aria-label="$t('sidebar.userProfile')"
        :aria-describedby="upgrade.hasUpdate ? 'update-indicator' : undefined"
        @click="handleProfileClick"
      >
        <Icon icon="lucide:user" class="h-5 w-5" />
        <span
          v-if="upgrade.hasUpdate"
          id="update-indicator"
          class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"
          role="status"
          :aria-label="$t('sidebar.updateAvailable')"
        ></span>
        <span class="sr-only">{{ $t('sidebar.userProfile') }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { onMounted, watch } from 'vue'
import { useUpgradeStore } from '@/stores/upgrade'
import { useThemeStore } from '@/stores/theme'
defineProps<{
  modelValue: string
}>()

const themeStore = useThemeStore()

const emits = defineEmits<{
  'update:modelValue': [value: string]
}>()

const upgrade = useUpgradeStore()

const handleProfileClick = async () => {
  if (!upgrade.hasUpdate) {
    await upgrade.checkUpdate(true)
  } else {
    if (upgrade.isReadyToInstall) {
      upgrade.openUpdateDialog()
    }
  }

  emits('update:modelValue', 'settings')
}

// 监听更新状态变化，当有新更新时自动显示更新弹窗
watch(
  () => upgrade.isReadyToInstall,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      upgrade.openUpdateDialog()
    }
  }
)

onMounted(() => {
  upgrade.checkUpdate(true)
})
</script>
