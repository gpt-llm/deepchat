<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="handleBackdropClick"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <!-- 标题 -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ formattedMessage.title }}
        </h3>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </button>
      </div>

      <!-- 状态图标 -->
      <div class="flex justify-center mb-4">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center"
          :class="statusIconClass"
        >
          <svg class="w-8 h-8" :class="statusIconColor" fill="currentColor" viewBox="0 0 20 20">
            <path
              v-if="detectionResult?.state === 'no_enabled_models'"
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
            <path
              v-else-if="detectionResult?.state === 'empty_model_list'"
              d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
            />
            <path
              v-else-if="detectionResult?.state === 'all_models_disabled'"
              fill-rule="evenodd"
              d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
              clip-rule="evenodd"
            />
            <path
              v-else
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>

      <!-- 消息内容 -->
      <div class="text-center mb-6">
        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ formattedMessage.message }}
        </p>
      </div>

      <!-- 详细信息（可折叠） -->
      <div v-if="detectionResult && showDetails" class="mb-4">
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">提供商状态</h4>
          <div class="space-y-2">
            <div
              v-for="provider in detectionResult.providerDetails"
              :key="provider.providerId"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center">
                <div
                  class="w-2 h-2 rounded-full mr-2"
                  :class="provider.isEnabled ? 'bg-green-500' : 'bg-gray-400'"
                ></div>
                <span class="text-gray-700 dark:text-gray-300">{{ provider.providerName }}</span>
              </div>
              <span class="text-gray-500 dark:text-gray-400">
                {{ provider.enabledModelsCount }}/{{ provider.totalModelsCount }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-col space-y-3">
        <button
          v-for="action in formattedMessage.actions"
          :key="action"
          @click="handleAction(action)"
          class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {{ action }}
        </button>

        <!-- 详情切换按钮 -->
        <button
          v-if="detectionResult"
          @click="showDetails = !showDetails"
          class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-colors"
        >
          {{ showDetails ? '隐藏详情' : '显示详情' }}
        </button>

        <!-- 关闭按钮 -->
        <button
          @click="handleClose"
          class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          暂时忽略
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useRouter } from 'vue-router'
// import type { ModelDetectionResult } from '@/stores/settings'

// Props
interface Props {
  autoClose?: boolean
  backdropClickClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoClose: true,
  backdropClickClose: true
})

// Emits
const emit = defineEmits<{
  close: []
  action: [string]
}>()

// Store and router
const settingsStore = useSettingsStore()
const router = useRouter()

// Local state
const showDetails = ref(false)

// Computed
const isVisible = computed(() => settingsStore.isModelDetectionDialogVisible)
const detectionResult = computed(() => settingsStore.modelDetectionResult)

const formattedMessage = computed(() => {
  if (!detectionResult.value) {
    return { title: '', message: '', actions: [] }
  }
  return settingsStore.formatModelDetectionMessage(detectionResult.value)
})

const statusIconClass = computed(() => {
  const state = detectionResult.value?.state
  switch (state) {
    case 'no_enabled_models':
      return 'bg-red-100 dark:bg-red-900/20'
    case 'empty_model_list':
      return 'bg-yellow-100 dark:bg-yellow-900/20'
    case 'all_models_disabled':
      return 'bg-orange-100 dark:bg-orange-900/20'
    default:
      return 'bg-green-100 dark:bg-green-900/20'
  }
})

const statusIconColor = computed(() => {
  const state = detectionResult.value?.state
  switch (state) {
    case 'no_enabled_models':
      return 'text-red-600 dark:text-red-400'
    case 'empty_model_list':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'all_models_disabled':
      return 'text-orange-600 dark:text-orange-400'
    default:
      return 'text-green-600 dark:text-green-400'
  }
})

// Methods
const handleClose = () => {
  settingsStore.hideModelDetectionDialog()
  emit('close')
}

const handleBackdropClick = () => {
  if (props.backdropClickClose) {
    handleClose()
  }
}

const handleAction = async (action: string) => {
  emit('action', action)

  // 根据不同的操作执行相应的逻辑
  switch (action) {
    case '前往设置页面':
    case '启用推荐提供商':
      await router.push('/settings/providers')
      break
    case '前往模型管理':
    case '启用推荐模型':
      await router.push('/settings/models')
      break
    case '检查网络连接':
    case '验证 API 配置':
      await router.push('/settings/providers')
      break
    case '重新刷新模型列表':
      try {
        await settingsStore.refreshAllModels()
        // 刷新后重新检测
        setTimeout(() => {
          settingsStore.triggerModelDetection()
        }, 2000)
      } catch (error) {
        console.error('刷新模型列表失败:', error)
      }
      break
    default:
      console.log('未处理的操作:', action)
  }

  // 执行操作后关闭对话框
  if (props.autoClose) {
    handleClose()
  }
}
</script>

<style scoped>
/* 动画效果 */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

.bg-white {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .bg-white {
    background-color: theme('colors.gray.800');
  }
}
</style>
