import { LLM_PROVIDER, MODEL_META } from '@shared/presenter'
import {
  ModelDetectionState,
  ModelDetectionResult,
  ProviderDetail,
  FormattedDetectionMessage,
  ProviderModelDetectionResult
} from '@shared/modelDetection'

// 重新导出，保持向后兼容
export { ModelDetectionState }

export type {
  ModelDetectionResult,
  ProviderDetail,
  FormattedDetectionMessage,
  ProviderModelDetectionResult
}

/**
 * 模型检测服务类
 * 负责检测用户的模型启用状态，区分不同的场景
 */
export class ModelDetectionService {
  /**
   * 检测指定 provider 是否有启用的模型
   * @param providerId provider ID
   * @param providers 所有 provider 配置
   * @param getProviderModels 获取 provider 模型列表的方法
   * @param getCustomModels 获取自定义模型列表的方法
   * @param getModelStatus 获取模型启用状态的方法
   */
  static async detectProviderEnabledModels(
    providerId: string,
    providers: LLM_PROVIDER[],
    getProviderModels: (providerId: string) => MODEL_META[],
    getCustomModels: (providerId: string) => MODEL_META[],
    getModelStatus: (providerId: string, modelId: string) => boolean
  ): Promise<ProviderModelDetectionResult> {
    const provider = providers.find((p) => p.id === providerId)
    if (!provider || !provider.enable) {
      return {
        hasEnabledModels: false,
        totalModels: 0,
        enabledModels: 0,
        isFirstTimeSetup: false
      }
    }

    // 获取所有模型（标准模型 + 自定义模型）
    const standardModels = getProviderModels(providerId) || []
    const customModels = getCustomModels(providerId) || []
    const allModels = [...standardModels, ...customModels]

    const totalModels = allModels.length
    const enabledModels = allModels.filter((model) => getModelStatus(providerId, model.id)).length

    // 判断是否是首次设置：如果 provider 启用了但没有任何模型，认为是首次设置
    const isFirstTimeSetup = provider.enable && totalModels === 0

    return {
      hasEnabledModels: enabledModels > 0,
      totalModels,
      enabledModels,
      isFirstTimeSetup
    }
  }

  /**
   * 全面检测用户的模型启用状态
   * @param providers 所有 provider 配置
   * @param getProviderModels 获取 provider 模型列表的方法
   * @param getCustomModels 获取自定义模型列表的方法
   * @param getModelStatus 获取模型启用状态的方法
   * @param refreshTimestamps provider 刷新时间戳（用于判断是否是自动刷新）
   */
  static async detectOverallModelState(
    providers: LLM_PROVIDER[],
    getProviderModels: (providerId: string) => MODEL_META[],
    getCustomModels: (providerId: string) => MODEL_META[],
    getModelStatus: (providerId: string, modelId: string) => boolean,
    refreshTimestamps?: Record<string, number>
  ): Promise<ModelDetectionResult> {
    const enabledProviders = providers.filter((p) => p.enable)
    const providerDetails: ProviderDetail[] = []

    let totalEnabledModels = 0
    let hasAnyModels = false
    let hasFirstTimeSetupProviders = false

    // 检测每个启用的 provider
    for (const provider of enabledProviders) {
      const detection = await this.detectProviderEnabledModels(
        provider.id,
        providers,
        getProviderModels,
        getCustomModels,
        getModelStatus
      )

      providerDetails.push({
        providerId: provider.id,
        providerName: provider.name,
        isEnabled: true,
        totalModelsCount: detection.totalModels,
        enabledModelsCount: detection.enabledModels,
        hasModels: detection.totalModels > 0,
        isFirstTimeSetup: detection.isFirstTimeSetup
      })

      totalEnabledModels += detection.enabledModels
      if (detection.totalModels > 0) {
        hasAnyModels = true
      }
      if (detection.isFirstTimeSetup) {
        hasFirstTimeSetupProviders = true
      }
    }

    // 添加禁用的 provider 信息
    const disabledProviders = providers.filter((p) => !p.enable)
    for (const provider of disabledProviders) {
      const standardModels = getProviderModels(provider.id) || []
      const customModels = getCustomModels(provider.id) || []
      const totalModels = standardModels.length + customModels.length

      providerDetails.push({
        providerId: provider.id,
        providerName: provider.name,
        isEnabled: false,
        totalModelsCount: totalModels,
        enabledModelsCount: 0,
        hasModels: totalModels > 0,
        isFirstTimeSetup: false
      })
    }

    // 确定检测状态
    let state: ModelDetectionState
    let shouldShowGuidance = false
    const suggestedActions: string[] = []

    if (enabledProviders.length === 0) {
      state = ModelDetectionState.NO_ENABLED_MODELS
      shouldShowGuidance = true
      suggestedActions.push('启用至少一个 AI 提供商')
    } else if (totalEnabledModels > 0) {
      state = ModelDetectionState.HAS_ENABLED_MODELS
      shouldShowGuidance = false
    } else if (!hasAnyModels || hasFirstTimeSetupProviders) {
      // 有启用的 provider 但没有模型，可能是首次设置或模型列表为空
      state = ModelDetectionState.EMPTY_MODEL_LIST

      // 检查是否是因为自动刷新导致的临时状态
      const isRecentRefresh =
        refreshTimestamps &&
        Object.values(refreshTimestamps).some(
          (timestamp) => Date.now() - timestamp < 5000 // 5秒内的刷新认为是临时状态
        )

      if (!isRecentRefresh) {
        shouldShowGuidance = true
        suggestedActions.push('检查 API 配置是否正确')
        suggestedActions.push('等待模型列表加载完成')
      }
    } else {
      // 有模型但都被禁用了
      state = ModelDetectionState.ALL_MODELS_DISABLED
      shouldShowGuidance = true
      suggestedActions.push('启用至少一个模型')
      suggestedActions.push('在设置中管理模型启用状态')
    }

    return {
      state,
      enabledProvidersCount: enabledProviders.length,
      enabledModelsCount: totalEnabledModels,
      providerDetails,
      shouldShowGuidance,
      suggestedActions
    }
  }

  /**
   * 检查是否应该跳过对话框显示
   * 在某些情况下（如自动刷新、临时状态）不应该打扰用户
   */
  static shouldSkipDialog(
    detectionResult: ModelDetectionResult,
    lastDialogShownTime?: number,
    minIntervalMs: number = 30000 // 30秒最小间隔
  ): boolean {
    // 如果有启用的模型，不需要显示对话框
    if (detectionResult.state === ModelDetectionState.HAS_ENABLED_MODELS) {
      return true
    }

    // 如果不建议显示引导，跳过
    if (!detectionResult.shouldShowGuidance) {
      return true
    }

    // 检查时间间隔，避免频繁弹窗
    if (lastDialogShownTime && Date.now() - lastDialogShownTime < minIntervalMs) {
      return true
    }

    // 如果是模型列表为空的状态，且有首次设置的 provider，给一些时间加载
    if (detectionResult.state === ModelDetectionState.EMPTY_MODEL_LIST) {
      const hasFirstTimeProvider = detectionResult.providerDetails.some((p) => p.isFirstTimeSetup)
      if (hasFirstTimeProvider) {
        return true // 首次设置时给更多时间
      }
    }

    return false
  }

  /**
   * 格式化检测结果为用户友好的消息
   */
  static formatDetectionMessage(detectionResult: ModelDetectionResult): FormattedDetectionMessage {
    switch (detectionResult.state) {
      case ModelDetectionState.NO_ENABLED_MODELS:
        return {
          title: '没有启用的 AI 提供商',
          message: '您还没有启用任何 AI 提供商。请先配置并启用至少一个 AI 提供商来开始使用。',
          actions: ['前往设置页面', '启用推荐提供商']
        }

      case ModelDetectionState.EMPTY_MODEL_LIST:
        return {
          title: '没有可用的模型',
          message: '已启用的 AI 提供商没有加载到模型列表。请检查网络连接和 API 配置。',
          actions: ['检查网络连接', '验证 API 配置', '重新刷新模型列表']
        }

      case ModelDetectionState.ALL_MODELS_DISABLED:
        return {
          title: '所有模型都已禁用',
          message: '虽然有可用的模型，但它们都被禁用了。请启用至少一个模型来开始对话。',
          actions: ['启用推荐模型', '前往模型管理']
        }

      case ModelDetectionState.HAS_ENABLED_MODELS:
      default:
        return {
          title: '模型配置正常',
          message: `当前有 ${detectionResult.enabledModelsCount} 个启用的模型可供使用。`,
          actions: []
        }
    }
  }
}
