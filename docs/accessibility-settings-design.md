# DeepChat 无障碍设置系统设计

## 设计概述

设计独立的无障碍设置面板，提供全面的个性化无障碍选项，确保不同需求的用户都能获得最佳体验。

## 设置页面架构

### 主设置页面布局

```
BEFORE (当前设置页面):
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                    [X]                  │
├─────────────────────────────────────────────────────────────────┤
│ [General] [Model] [Data] [About]                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Settings Content Area                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

AFTER (新增无障碍设置):
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                    [Help] [X]          │
├─────────────────────────────────────────────────────────────────┤
│ [General] [Model] [Accessibility] [Data] [About]               │  
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Settings Content Area                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 无障碍设置面板详细设计

```
┌─────────────────────────────────────────────────────────────────┐
│ Accessibility Settings                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Screen Reader Support ─────────────────────────────────────┐ │
│ │ [✓] Enable screen reader optimizations                     │ │
│ │ [✓] Announce new messages                                  │ │
│ │ [✓] Detailed button descriptions                           │ │
│ │ [ ] Reduce verbose announcements                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Keyboard Navigation ───────────────────────────────────────┐ │
│ │ [✓] Enhanced keyboard navigation                           │ │
│ │ [✓] Show focus indicators                                  │ │
│ │ [✓] Enable skip links                                     │ │
│ │                                                           │ │
│ │ Keyboard Shortcuts:                                       │ │
│ │ Skip to main content:     [Ctrl+Alt+M]                   │ │
│ │ New conversation:         [Ctrl+Alt+N]                   │ │
│ │ Settings:                [Ctrl+Alt+S]                   │ │
│ │ Help:                   [Ctrl+Alt+H]                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Visual Accessibility ──────────────────────────────────────┐ │
│ │ [✓] High contrast mode                                     │ │
│ │ [✓] Reduce motion and animations                           │ │
│ │                                                           │ │
│ │ Font Size: [Small] [●Normal] [Large] [Extra Large]       │ │
│ │ Focus Indicator: [●Default] [Thick] [High Contrast]      │ │
│ │ Contrast Level: [●AA] [AAA]                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Cognitive Assistance ──────────────────────────────────────┐ │
│ │ [✓] Simplified interface mode                              │ │
│ │ [✓] Reading assistance tools                               │ │
│ │ [✓] Auto-generate image descriptions                       │ │
│ │ [ ] Step-by-step guidance                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Audio & Voice ─────────────────────────────────────────────┐ │
│ │ [✓] Voice announcements                                    │ │
│ │ [✓] Sound feedback for actions                            │ │
│ │                                                           │ │
│ │ Voice Speed: [Slow] [●Normal] [Fast]                      │ │
│ │ Announcement Volume: [Low] [●Medium] [High]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                   [Reset to Defaults] [Save]   │
└─────────────────────────────────────────────────────────────────┘
```

## 技术实现设计

### 1. 设置存储架构

```typescript
// src/shared/types/accessibility.ts
export interface AccessibilitySettings {
  // 屏幕阅读器支持
  screenReader: {
    enabled: boolean
    announceNewMessages: boolean
    detailedDescriptions: boolean
    reduceVerbosity: boolean
  }
  
  // 键盘导航
  keyboard: {
    enhancedNavigation: boolean
    showFocusIndicators: boolean
    enableSkipLinks: boolean
    shortcuts: {
      skipToMain: string
      newConversation: string
      settings: string
      help: string
    }
  }
  
  // 视觉辅助
  visual: {
    highContrast: boolean
    reducedMotion: boolean
    fontSize: 'small' | 'normal' | 'large' | 'extra-large'
    focusIndicatorStyle: 'default' | 'thick' | 'high-contrast'
    contrastLevel: 'AA' | 'AAA'
  }
  
  // 认知辅助
  cognitive: {
    simplifiedMode: boolean
    readingAssistance: boolean
    autoImageDescriptions: boolean
    stepByStepGuidance: boolean
  }
  
  // 音频和语音
  audio: {
    voiceAnnouncements: boolean
    soundFeedback: boolean
    voiceSpeed: 'slow' | 'normal' | 'fast'
    announcementVolume: 'low' | 'medium' | 'high'
  }
}
```

### 2. 状态管理

```typescript
// src/renderer/src/stores/accessibility.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { AccessibilitySettings } from '@/shared/types/accessibility'

export const useAccessibilityStore = defineStore('accessibility', () => {
  // 设置状态
  const settings = ref<AccessibilitySettings>({
    screenReader: {
      enabled: false,
      announceNewMessages: true,
      detailedDescriptions: true,
      reduceVerbosity: false
    },
    keyboard: {
      enhancedNavigation: false,
      showFocusIndicators: true,
      enableSkipLinks: true,
      shortcuts: {
        skipToMain: 'Ctrl+Alt+M',
        newConversation: 'Ctrl+Alt+N',
        settings: 'Ctrl+Alt+S',
        help: 'Ctrl+Alt+H'
      }
    },
    visual: {
      highContrast: false,
      reducedMotion: false,
      fontSize: 'normal',
      focusIndicatorStyle: 'default',
      contrastLevel: 'AA'
    },
    cognitive: {
      simplifiedMode: false,
      readingAssistance: false,
      autoImageDescriptions: false,
      stepByStepGuidance: false
    },
    audio: {
      voiceAnnouncements: false,
      soundFeedback: true,
      voiceSpeed: 'normal',
      announcementVolume: 'medium'
    }
  })
  
  // 计算属性
  const isScreenReaderOptimized = computed(() => 
    settings.value.screenReader.enabled
  )
  
  const isKeyboardNavigationEnabled = computed(() => 
    settings.value.keyboard.enhancedNavigation
  )
  
  const isHighContrastEnabled = computed(() => 
    settings.value.visual.highContrast
  )
  
  const isReducedMotionEnabled = computed(() => 
    settings.value.visual.reducedMotion
  )
  
  // 方法
  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    settings.value = { ...settings.value, ...newSettings }
  }
  
  const resetToDefaults = () => {
    // 重置为默认设置的实现
  }
  
  const loadSettings = async () => {
    // 从配置文件加载设置
  }
  
  const saveSettings = async () => {
    // 保存设置到配置文件
  }
  
  // 监听设置变化并应用
  watch(settings, (newSettings) => {
    applyA11ySettings(newSettings)
  }, { deep: true })
  
  return {
    settings: readonly(settings),
    isScreenReaderOptimized,
    isKeyboardNavigationEnabled,
    isHighContrastEnabled,
    isReducedMotionEnabled,
    updateSettings,
    resetToDefaults,
    loadSettings,
    saveSettings
  }
})
```

### 3. 设置页面组件

```vue
<!-- src/renderer/src/components/settings/A11ySettings.vue -->
<template>
  <div class="a11y-settings" role="tabpanel" aria-labelledby="a11y-tab">
    <!-- 页面标题 -->
    <div class="settings-header">
      <h2 id="a11y-title" class="text-2xl font-semibold">
        {{ t('settings.accessibility.title') }}
      </h2>
      <p class="text-muted-foreground">
        {{ t('settings.accessibility.description') }}
      </p>
    </div>
    
    <!-- 屏幕阅读器支持区域 -->
    <SettingsSection 
      :title="t('settings.accessibility.screenReader.title')"
      :description="t('settings.accessibility.screenReader.description')"
    >
      <div class="space-y-4">
        <SwitchField
          v-model="settings.screenReader.enabled"
          :label="t('settings.accessibility.screenReader.enabled')"
          :description="t('settings.accessibility.screenReader.enabledDesc')"
        />
        
        <SwitchField
          v-model="settings.screenReader.announceNewMessages"
          :label="t('settings.accessibility.screenReader.announceMessages')"
          :disabled="!settings.screenReader.enabled"
        />
        
        <SwitchField
          v-model="settings.screenReader.detailedDescriptions"
          :label="t('settings.accessibility.screenReader.detailedDesc')"
          :disabled="!settings.screenReader.enabled"
        />
        
        <SwitchField
          v-model="settings.screenReader.reduceVerbosity"
          :label="t('settings.accessibility.screenReader.reduceVerbosity')"
          :disabled="!settings.screenReader.enabled"
        />
      </div>
    </SettingsSection>
    
    <!-- 键盘导航区域 -->
    <SettingsSection
      :title="t('settings.accessibility.keyboard.title')"
      :description="t('settings.accessibility.keyboard.description')"
    >
      <div class="space-y-4">
        <SwitchField
          v-model="settings.keyboard.enhancedNavigation"
          :label="t('settings.accessibility.keyboard.enhanced')"
        />
        
        <SwitchField
          v-model="settings.keyboard.showFocusIndicators"
          :label="t('settings.accessibility.keyboard.focusIndicators')"
        />
        
        <SwitchField
          v-model="settings.keyboard.enableSkipLinks"
          :label="t('settings.accessibility.keyboard.skipLinks')"
        />
        
        <!-- 键盘快捷键配置 -->
        <div class="keyboard-shortcuts">
          <h4 class="font-medium mb-3">{{ t('settings.accessibility.keyboard.shortcuts') }}</h4>
          
          <div class="grid grid-cols-2 gap-4">
            <ShortcutField
              v-model="settings.keyboard.shortcuts.skipToMain"
              :label="t('settings.accessibility.keyboard.skipToMain')"
            />
            
            <ShortcutField
              v-model="settings.keyboard.shortcuts.newConversation"
              :label="t('settings.accessibility.keyboard.newConversation')"
            />
            
            <ShortcutField
              v-model="settings.keyboard.shortcuts.settings"
              :label="t('settings.accessibility.keyboard.settings')"
            />
            
            <ShortcutField
              v-model="settings.keyboard.shortcuts.help"
              :label="t('settings.accessibility.keyboard.help')"
            />
          </div>
        </div>
      </div>
    </SettingsSection>
    
    <!-- 视觉辅助区域 -->
    <SettingsSection
      :title="t('settings.accessibility.visual.title')"
      :description="t('settings.accessibility.visual.description')"
    >
      <div class="space-y-4">
        <SwitchField
          v-model="settings.visual.highContrast"
          :label="t('settings.accessibility.visual.highContrast')"
        />
        
        <SwitchField
          v-model="settings.visual.reducedMotion"
          :label="t('settings.accessibility.visual.reducedMotion')"
        />
        
        <!-- 字体大小选择 -->
        <RadioGroupField
          v-model="settings.visual.fontSize"
          :label="t('settings.accessibility.visual.fontSize')"
          :options="fontSizeOptions"
        />
        
        <!-- 焦点指示器样式 -->
        <RadioGroupField
          v-model="settings.visual.focusIndicatorStyle"
          :label="t('settings.accessibility.visual.focusIndicator')"
          :options="focusIndicatorOptions"
        />
        
        <!-- 对比度级别 -->
        <RadioGroupField
          v-model="settings.visual.contrastLevel"
          :label="t('settings.accessibility.visual.contrastLevel')"
          :options="contrastLevelOptions"
        />
      </div>
    </SettingsSection>
    
    <!-- 认知辅助区域 -->
    <SettingsSection
      :title="t('settings.accessibility.cognitive.title')"
      :description="t('settings.accessibility.cognitive.description')"
    >
      <div class="space-y-4">
        <SwitchField
          v-model="settings.cognitive.simplifiedMode"
          :label="t('settings.accessibility.cognitive.simplifiedMode')"
        />
        
        <SwitchField
          v-model="settings.cognitive.readingAssistance"
          :label="t('settings.accessibility.cognitive.readingAssistance')"
        />
        
        <SwitchField
          v-model="settings.cognitive.autoImageDescriptions"
          :label="t('settings.accessibility.cognitive.autoImageDesc')"
        />
        
        <SwitchField
          v-model="settings.cognitive.stepByStepGuidance"
          :label="t('settings.accessibility.cognitive.stepByStep')"
        />
      </div>
    </SettingsSection>
    
    <!-- 音频和语音区域 -->
    <SettingsSection
      :title="t('settings.accessibility.audio.title')"
      :description="t('settings.accessibility.audio.description')"
    >
      <div class="space-y-4">
        <SwitchField
          v-model="settings.audio.voiceAnnouncements"
          :label="t('settings.accessibility.audio.voiceAnnouncements')"
        />
        
        <SwitchField
          v-model="settings.audio.soundFeedback"
          :label="t('settings.accessibility.audio.soundFeedback')"
        />
        
        <!-- 语音速度 -->
        <RadioGroupField
          v-model="settings.audio.voiceSpeed"
          :label="t('settings.accessibility.audio.voiceSpeed')"
          :options="voiceSpeedOptions"
          :disabled="!settings.audio.voiceAnnouncements"
        />
        
        <!-- 通知音量 -->
        <RadioGroupField
          v-model="settings.audio.announcementVolume"
          :label="t('settings.accessibility.audio.volume')"
          :options="volumeOptions"
          :disabled="!settings.audio.soundFeedback"
        />
      </div>
    </SettingsSection>
    
    <!-- 操作按钮 -->
    <div class="settings-actions">
      <Button variant="outline" @click="resetToDefaults">
        {{ t('settings.accessibility.resetDefaults') }}
      </Button>
      
      <Button @click="saveSettings">
        {{ t('settings.accessibility.save') }}
      </Button>
    </div>
  </div>
</template>
```

### 4. 辅助组件

```vue
<!-- src/renderer/src/components/settings/components/SettingsSection.vue -->
<template>
  <div class="settings-section" role="group" :aria-labelledby="titleId">
    <div class="section-header">
      <h3 :id="titleId" class="text-lg font-medium">{{ title }}</h3>
      <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    
    <div class="section-content">
      <slot />
    </div>
  </div>
</template>
```

```vue
<!-- src/renderer/src/components/settings/components/SwitchField.vue -->
<template>
  <div class="switch-field">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <Label :for="fieldId" class="text-sm font-medium">{{ label }}</Label>
        <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
      </div>
      
      <Switch
        :id="fieldId"
        :checked="modelValue"
        :disabled="disabled"
        @update:checked="$emit('update:modelValue', $event)"
        :aria-describedby="description ? `${fieldId}-desc` : undefined"
      />
    </div>
    
    <p v-if="description" :id="`${fieldId}-desc`" class="sr-only">{{ description }}</p>
  </div>
</template>
```

```vue
<!-- src/renderer/src/components/settings/components/ShortcutField.vue -->
<template>
  <div class="shortcut-field">
    <Label :for="fieldId" class="text-sm font-medium">{{ label }}</Label>
    
    <div class="flex items-center space-x-2">
      <Input
        :id="fieldId"
        :value="displayValue"
        readonly
        class="font-mono"
        @focus="startRecording"
        :aria-describedby="`${fieldId}-help`"
      />
      
      <Button
        variant="outline"
        size="sm"
        @click="startRecording"
        :aria-label="t('settings.accessibility.keyboard.recordShortcut')"
      >
        {{ isRecording ? t('settings.accessibility.keyboard.recording') : t('settings.accessibility.keyboard.change') }}
      </Button>
    </div>
    
    <p :id="`${fieldId}-help`" class="text-xs text-muted-foreground">
      {{ t('settings.accessibility.keyboard.shortcutHelp') }}
    </p>
  </div>
</template>
```

## 设置页面导航扩展

```vue
<!-- src/renderer/src/views/SettingsTabView.vue 修改 -->
<template>
  <div class="settings-container">
    <!-- 添加 Accessibility 标签页 -->
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-5">
        <TabsTrigger value="general">{{ t('settings.general.title') }}</TabsTrigger>
        <TabsTrigger value="model">{{ t('settings.model.title') }}</TabsTrigger>
        <TabsTrigger value="accessibility">{{ t('settings.accessibility.title') }}</TabsTrigger>
        <TabsTrigger value="data">{{ t('settings.data.title') }}</TabsTrigger>
        <TabsTrigger value="about">{{ t('settings.about.title') }}</TabsTrigger>
      </TabsList>
      
      <!-- ... 其他标签页内容 ... -->
      
      <TabsContent value="accessibility">
        <A11ySettings />
      </TabsContent>
    </Tabs>
  </div>
</template>
```

## 国际化文本

```json
// src/renderer/src/i18n/zh-CN/accessibility.json
{
  "settings": {
    "accessibility": {
      "title": "无障碍访问",
      "description": "配置无障碍访问选项，提升使用体验",
      
      "screenReader": {
        "title": "屏幕阅读器支持",
        "description": "优化屏幕阅读器用户的使用体验",
        "enabled": "启用屏幕阅读器优化",
        "enabledDesc": "针对屏幕阅读器用户优化界面和交互",
        "announceMessages": "通知新消息",
        "detailedDesc": "详细按钮描述",
        "reduceVerbosity": "减少冗长通知"
      },
      
      "keyboard": {
        "title": "键盘导航",
        "description": "增强键盘操作和快捷键支持",
        "enhanced": "增强键盘导航",
        "focusIndicators": "显示焦点指示器",
        "skipLinks": "启用跳过链接",
        "shortcuts": "键盘快捷键",
        "skipToMain": "跳转到主内容",
        "newConversation": "新建会话",
        "settings": "设置",
        "help": "帮助",
        "recordShortcut": "录制快捷键",
        "recording": "录制中...",
        "change": "更改",
        "shortcutHelp": "点击更改按钮并按下想要的快捷键组合"
      },
      
      "visual": {
        "title": "视觉辅助",
        "description": "调整视觉效果和对比度设置",
        "highContrast": "高对比度模式",
        "reducedMotion": "减少动画效果",
        "fontSize": "字体大小",
        "focusIndicator": "焦点指示器样式",
        "contrastLevel": "对比度级别"
      },
      
      "cognitive": {
        "title": "认知辅助",
        "description": "简化界面和提供认知辅助功能",
        "simplifiedMode": "简化界面模式",
        "readingAssistance": "阅读辅助工具",
        "autoImageDesc": "自动图片描述",
        "stepByStep": "分步操作引导"
      },
      
      "audio": {
        "title": "音频和语音",
        "description": "配置音频反馈和语音通知",
        "voiceAnnouncements": "语音通知",
        "soundFeedback": "操作音效反馈",
        "voiceSpeed": "语音速度",
        "volume": "通知音量"
      },
      
      "resetDefaults": "重置默认设置",
      "save": "保存设置"
    }
  }
}
```

这套设计确保了无障碍设置的完整性和可用性，为不同需求的用户提供个性化的无障碍体验配置。