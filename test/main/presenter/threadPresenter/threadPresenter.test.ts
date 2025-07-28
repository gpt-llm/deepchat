import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThreadPresenter } from '../../../../src/main/presenter/threadPresenter'
import { MessageManager } from '../../../../src/main/presenter/threadPresenter/messageManager'
import { SearchManager } from '../../../../src/main/presenter/threadPresenter/searchManager'
import { eventBus } from '../../../../src/main/eventbus'
import type {
  ISQLitePresenter,
  ILlmProviderPresenter,
  IConfigPresenter,
  CONVERSATION,
  CONVERSATION_SETTINGS,
  MESSAGE_ROLE,
  MESSAGE_STATUS,
  MESSAGE_METADATA,
  SearchResult,
  LLMAgentEventData,
  MCPToolResponse
} from '../../../../src/shared/presenter'
import type { AssistantMessage, UserMessage, UserMessageContent, AssistantMessageBlock } from '../../../../src/shared/chat'

// Mock dependencies
vi.mock('../../../../src/main/presenter/threadPresenter/messageManager')
vi.mock('../../../../src/main/presenter/threadPresenter/searchManager')
vi.mock('../../../../src/main/eventbus')
vi.mock('../../../../src/main/presenter', () => ({
  presenter: {
    tabPresenter: {
      getTab: vi.fn(),
      switchTab: vi.fn()
    },
    mcpPresenter: {
      callTool: vi.fn(),
      getAllToolDefinitions: vi.fn().mockResolvedValue([]),
      grantPermission: vi.fn(),
      isServerRunning: vi.fn().mockResolvedValue(true)
    }
  }
}))

// Test data factories
const createMockConversation = (overrides: Partial<CONVERSATION> = {}): CONVERSATION => ({
  id: 'conv-123',
  title: 'Test Conversation',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  is_new: 0,
  is_pinned: 0,
  settings: {
    systemPrompt: '',
    temperature: 0.7,
    contextLength: 4000,
    maxTokens: 2000,
    providerId: 'openai',
    modelId: 'gpt-4',
    artifacts: 0,
    enabledMcpTools: []
  },
  ...overrides
})

const createMockUserMessage = (overrides: Partial<UserMessage> = {}): UserMessage => ({
  id: 'msg-user-123',
  conversationId: 'conv-123',
  role: 'user',
  content: {
    text: 'Hello, how are you?',
    files: [],
    search: false,
    think: false
  } as UserMessageContent,
  timestamp: Date.now(),
  status: 'sent',
  usage: null,
  parentId: null,
  orderSeq: 1,
  isContextEdge: 0,
  isVariant: 0,
  ...overrides
})

const createMockAssistantMessage = (overrides: Partial<AssistantMessage> = {}): AssistantMessage => ({
  id: 'msg-assistant-123',
  conversationId: 'conv-123',
  role: 'assistant',
  content: [
    {
      type: 'content',
      content: 'Hello! I am doing well, thank you.',
      status: 'success',
      timestamp: Date.now()
    }
  ] as AssistantMessageBlock[],
  timestamp: Date.now(),
  status: 'sent',
  usage: null,
  parentId: 'msg-user-123',
  orderSeq: 2,
  isContextEdge: 0,
  isVariant: 0,
  ...overrides
})

const createMockSearchResults = (): SearchResult[] => [
  {
    title: 'Test Result 1',
    url: 'https://example.com/1',
    content: 'This is the first test result content',
    description: 'First test result',
    icon: 'https://example.com/icon1.png',
    rank: 1
  },
  {
    title: 'Test Result 2',
    url: 'https://example.com/2',
    content: 'This is the second test result content',
    description: 'Second test result',
    icon: 'https://example.com/icon2.png',
    rank: 2
  }
]

describe('ThreadPresenter', () => {
  let threadPresenter: ThreadPresenter
  let mockSqlitePresenter: ISQLitePresenter
  let mockLlmProviderPresenter: ILlmProviderPresenter
  let mockConfigPresenter: IConfigPresenter
  let mockMessageManager: MessageManager
  let mockSearchManager: SearchManager

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock objects
    mockSqlitePresenter = {
      createConversation: vi.fn().mockResolvedValue('conv-123'),
      getConversation: vi.fn(),
      updateConversation: vi.fn(),
      deleteConversation: vi.fn(),
      getConversationList: vi.fn(),
      getConversationCount: vi.fn().mockResolvedValue(10),
      getMaxOrderSeq: vi.fn().mockResolvedValue(0),
      insertMessage: vi.fn(),
      addMessageAttachment: vi.fn(),
      getMessageAttachments: vi.fn().mockResolvedValue([]),
      deleteAllMessages: vi.fn(),
      runTransaction: vi.fn()
    } as unknown as ISQLitePresenter

    mockLlmProviderPresenter = {
      startStreamCompletion: vi.fn(),
      stopStream: vi.fn(),
      generateCompletion: vi.fn().mockResolvedValue('Generated response'),
      summaryTitles: vi.fn().mockResolvedValue('Generated Title'),
      getModelList: vi.fn().mockResolvedValue([{ id: 'gpt-4', name: 'GPT-4' }])
    } as unknown as ILlmProviderPresenter

    mockConfigPresenter = {
      getModelConfig: vi.fn().mockReturnValue({
        maxTokens: 2000,
        contextLength: 4000,
        temperature: 0.7,
        vision: false,
        functionCall: true
      }),
      getSetting: vi.fn(),
      setSetting: vi.fn(),
      getDefaultProviders: vi.fn().mockReturnValue([{ id: 'openai', name: 'OpenAI' }]),
      getMcpServers: vi.fn().mockResolvedValue({})
    } as unknown as IConfigPresenter

    // Mock MessageManager methods
    mockMessageManager = {
      sendMessage: vi.fn(),
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
      retryMessage: vi.fn(),
      getMessage: vi.fn(),
      getMessageThread: vi.fn(),
      getContextMessages: vi.fn(),
      getLastUserMessage: vi.fn(),
      getMainMessageByParentId: vi.fn(),
      getMessageVariants: vi.fn(),
      updateMessageStatus: vi.fn(),
      updateMessageMetadata: vi.fn(),
      markMessageAsContextEdge: vi.fn(),
      handleMessageError: vi.fn(),
      clearAllMessages: vi.fn(),
      initializeUnfinishedMessages: vi.fn()
    } as unknown as MessageManager

    // Mock SearchManager methods
    mockSearchManager = {
      getEngines: vi.fn().mockResolvedValue([]),
      getActiveEngine: vi.fn().mockReturnValue({ id: 'google', name: 'Google' }),
      setActiveEngine: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockResolvedValue(createMockSearchResults()),
      testSearch: vi.fn().mockResolvedValue(true),
      stopSearch: vi.fn(),
      destroy: vi.fn()
    } as unknown as SearchManager

    // Mock the constructors
    vi.mocked(MessageManager).mockImplementation(() => mockMessageManager)
    vi.mocked(SearchManager).mockImplementation(() => mockSearchManager)

    // Create ThreadPresenter instance
    threadPresenter = new ThreadPresenter(
      mockSqlitePresenter,
      mockLlmProviderPresenter,
      mockConfigPresenter
    )
  })

  afterEach(() => {
    threadPresenter.destroy()
  })

  describe('Conversation Management', () => {
    describe('createConversation', () => {
      it('should create a new conversation with default settings', async () => {
        const mockConversation = createMockConversation()
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(null)
        mockSqlitePresenter.createConversation = vi.fn().mockResolvedValue('conv-123')

        const result = await threadPresenter.createConversation('Test Title', {}, 1)

        expect(result).toBe('conv-123')
        expect(mockSqlitePresenter.createConversation).toHaveBeenCalledWith(
          'Test Title',
          expect.objectContaining({
            systemPrompt: '',
            temperature: 0.7,
            contextLength: 1000,
            maxTokens: 2000,
            providerId: 'deepseek',
            modelId: 'deepseek-chat'
          })
        )
      })

      it('should reuse empty conversation when not forced to create new', async () => {
        const existingConversation = createMockConversation()
        mockSqlitePresenter.getConversationList = vi.fn().mockResolvedValue({
          list: [existingConversation],
          total: 1
        })
        mockMessageManager.getMessageThread = vi.fn().mockResolvedValue({
          list: [],
          total: 0
        })

        const result = await threadPresenter.createConversation('Test Title', {}, 1)

        expect(result).toBe(existingConversation.id)
        expect(mockSqlitePresenter.createConversation).not.toHaveBeenCalled()
      })

      it('should force create new conversation when specified', async () => {
        const existingConversation = createMockConversation()
        mockSqlitePresenter.getConversationList = vi.fn().mockResolvedValue({
          list: [existingConversation],
          total: 1
        })
        mockSqlitePresenter.createConversation = vi.fn().mockResolvedValue('conv-new')

        const result = await threadPresenter.createConversation(
          'Test Title',
          {},
          1,
          { forceNewAndActivate: true }
        )

        expect(result).toBe('conv-new')
        expect(mockSqlitePresenter.createConversation).toHaveBeenCalled()
      })
    })

    describe('setActiveConversation', () => {
      it('should set active conversation for tab', async () => {
        const mockConversation = createMockConversation()
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)

        await threadPresenter.setActiveConversation('conv-123', 1)

        expect(mockSqlitePresenter.getConversation).toHaveBeenCalledWith('conv-123')
        expect(eventBus.sendToRenderer).toHaveBeenCalledWith(
          'conversation:activated',
          'all',
          { conversationId: 'conv-123', tabId: 1 }
        )
      })

      it('should switch to existing tab if conversation already open', async () => {
        const mockConversation = createMockConversation()
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        
        // Set up conversation already open in tab 2
        await threadPresenter.setActiveConversation('conv-123', 2)
        
        // Try to open same conversation in tab 1
        await threadPresenter.setActiveConversation('conv-123', 1)

        expect(vi.mocked(require('../../../../src/main/presenter').presenter.tabPresenter.switchTab))
          .toHaveBeenCalledWith(2)
      })

      it('should throw error if conversation not found', async () => {
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(null)

        await expect(threadPresenter.setActiveConversation('invalid-id', 1))
          .rejects.toThrow('Conversation invalid-id not found')
      })
    })

    describe('deleteConversation', () => {
      it('should delete conversation and clean up active bindings', async () => {
        // Set up active conversation
        await threadPresenter.setActiveConversation('conv-123', 1)
        
        await threadPresenter.deleteConversation('conv-123')

        expect(mockSqlitePresenter.deleteConversation).toHaveBeenCalledWith('conv-123')
        expect(eventBus.sendToRenderer).toHaveBeenCalledWith(
          'conversation:list_updated',
          'all',
          expect.any(Array)
        )
      })
    })

    describe('updateConversationSettings', () => {
      it('should update conversation settings with model config defaults', async () => {
        const existingConversation = createMockConversation()
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(existingConversation)

        await threadPresenter.updateConversationSettings('conv-123', {
          modelId: 'gpt-4-turbo',
          temperature: 0.5
        })

        expect(mockSqlitePresenter.updateConversation).toHaveBeenCalledWith(
          'conv-123',
          {
            settings: expect.objectContaining({
              modelId: 'gpt-4-turbo',
              temperature: 0.5,
              maxTokens: 2000, // From model config
              contextLength: 4000 // From model config
            })
          }
        )
      })
    })
  })

  describe('Message Management', () => {
    describe('sendMessage', () => {
      it('should send user message and generate AI response', async () => {
        const mockConversation = createMockConversation()
        const mockUserMessage = createMockUserMessage()
        const mockAssistantMessage = createMockAssistantMessage()

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        mockMessageManager.sendMessage = vi.fn()
          .mockResolvedValueOnce(mockUserMessage)
          .mockResolvedValueOnce(mockAssistantMessage)
        mockMessageManager.getMessageThread = vi.fn().mockResolvedValue({
          list: [mockUserMessage],
          total: 1
        })

        const result = await threadPresenter.sendMessage('conv-123', 'Hello', 'user')

        expect(mockMessageManager.sendMessage).toHaveBeenCalledTimes(2) // User + Assistant
        expect(result).toEqual(mockAssistantMessage)
        expect(mockSqlitePresenter.updateConversation).toHaveBeenCalledWith(
          'conv-123',
          expect.objectContaining({ is_new: 0 })
        )
      })

      it('should return null for non-user messages', async () => {
        const mockConversation = createMockConversation()
        const mockAssistantMessage = createMockAssistantMessage()

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        mockMessageManager.sendMessage = vi.fn().mockResolvedValue(mockAssistantMessage)

        const result = await threadPresenter.sendMessage('conv-123', 'Response', 'assistant')

        expect(result).toBeNull()
        expect(mockMessageManager.sendMessage).toHaveBeenCalledTimes(1)
      })
    })

    describe('retryMessage', () => {
      it('should retry assistant message and setup generation state', async () => {
        const mockAssistantMessage = createMockAssistantMessage()
        const mockUserMessage = createMockUserMessage()
        const mockConversation = createMockConversation()

        mockMessageManager.getMessage = vi.fn()
          .mockResolvedValueOnce(mockAssistantMessage)
          .mockResolvedValueOnce(mockUserMessage)
        mockMessageManager.retryMessage = vi.fn().mockResolvedValue(mockAssistantMessage)
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)

        const result = await threadPresenter.retryMessage('msg-assistant-123')

        expect(mockMessageManager.retryMessage).toHaveBeenCalledWith(
          'msg-assistant-123',
          expect.objectContaining({
            model: 'gpt-4',
            provider: 'openai'
          })
        )
        expect(result).toEqual(mockAssistantMessage)
      })

      it('should throw error for non-assistant messages', async () => {
        const mockUserMessage = createMockUserMessage()
        mockMessageManager.getMessage = vi.fn().mockResolvedValue(mockUserMessage)

        await expect(threadPresenter.retryMessage('msg-user-123'))
          .rejects.toThrow('只能重试助手消息')
      })
    })

    describe('editMessage', () => {
      it('should edit message content', async () => {
        const mockMessage = createMockUserMessage()
        mockMessageManager.editMessage = vi.fn().mockResolvedValue(mockMessage)

        const result = await threadPresenter.editMessage('msg-123', 'Updated content')

        expect(mockMessageManager.editMessage).toHaveBeenCalledWith('msg-123', 'Updated content')
        expect(result).toEqual(mockMessage)
      })
    })

    describe('deleteMessage', () => {
      it('should delete message', async () => {
        await threadPresenter.deleteMessage('msg-123')

        expect(mockMessageManager.deleteMessage).toHaveBeenCalledWith('msg-123')
      })
    })
  })

  describe('Search Functionality', () => {
    describe('search engine management', () => {
      it('should get available search engines', async () => {
        const mockEngines = [{ id: 'google', name: 'Google' }]
        mockSearchManager.getEngines = vi.fn().mockResolvedValue(mockEngines)

        const result = await threadPresenter.getSearchEngines()

        expect(result).toEqual(mockEngines)
        expect(mockSearchManager.getEngines).toHaveBeenCalled()
      })

      it('should set active search engine', async () => {
        await threadPresenter.setActiveSearchEngine('bing')

        expect(mockSearchManager.setActiveEngine).toHaveBeenCalledWith('bing')
      })

      it('should test search engine', async () => {
        const result = await threadPresenter.testSearchEngine('weather')

        expect(mockSearchManager.testSearch).toHaveBeenCalledWith('weather')
        expect(result).toBe(true)
      })
    })

    describe('search assistant model', () => {
      it('should set search assistant model', () => {
        const mockModel = { id: 'gpt-4', name: 'GPT-4' }
        
        threadPresenter.setSearchAssistantModel(mockModel, 'openai')

        expect(threadPresenter.searchAssistantModel).toEqual(mockModel)
        expect(threadPresenter.searchAssistantProviderId).toBe('openai')
      })
    })
  })

  describe('Streaming and LLM Agent Events', () => {
    describe('handleLLMAgentResponse', () => {
      it('should handle content response event', async () => {
        const mockMessage = createMockAssistantMessage()
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        // Set up generating state
        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        const eventData: LLMAgentEventData = {
          eventId: 'msg-assistant-123',
          content: 'Hello world!'
        }

        await threadPresenter.handleLLMAgentResponse(eventData)

        expect(mockMessageManager.editMessage).toHaveBeenCalledWith(
          'msg-assistant-123',
          expect.stringContaining('Hello world!')
        )
      })

      it('should handle tool call start event', async () => {
        const mockMessage = createMockAssistantMessage()
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        const eventData: LLMAgentEventData = {
          eventId: 'msg-assistant-123',
          tool_call: 'start',
          tool_call_id: 'tool-123',
          tool_call_name: 'search_web',
          tool_call_params: '{"query": "test"}'
        }

        await threadPresenter.handleLLMAgentResponse(eventData)

        expect(mockMessageManager.editMessage).toHaveBeenCalled()
        // Verify tool call block was added
        const updatedContent = JSON.parse(vi.mocked(mockMessageManager.editMessage).mock.calls[0][1])
        expect(updatedContent).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'tool_call',
              tool_call: expect.objectContaining({
                id: 'tool-123',
                name: 'search_web'
              })
            })
          ])
        )
      })

      it('should handle permission required event', async () => {
        const mockMessage = createMockAssistantMessage()
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        const eventData: LLMAgentEventData = {
          eventId: 'msg-assistant-123',
          tool_call: 'permission-required',
          tool_call_id: 'tool-123',
          tool_call_name: 'file_write',
          tool_call_response: 'Permission required for file operations',
          permission_request: {
            toolName: 'file_write',
            serverName: 'filesystem',
            permissionType: 'write',
            description: 'Write access needed for file operations'
          }
        }

        await threadPresenter.handleLLMAgentResponse(eventData)

        expect(mockMessageManager.editMessage).toHaveBeenCalled()
        const updatedContent = JSON.parse(vi.mocked(mockMessageManager.editMessage).mock.calls[0][1])
        expect(updatedContent).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'tool_call_permission',
              status: 'pending',
              extra: expect.objectContaining({
                permissionType: 'write',
                serverName: 'filesystem',
                needsUserAction: true
              })
            })
          ])
        )
      })
    })

    describe('handleLLMAgentEnd', () => {
      it('should finalize message without pending permissions', async () => {
        const mockMessage = createMockAssistantMessage()
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now() - 5000,
          firstTokenTime: Date.now() - 4000,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        const eventData: LLMAgentEventData = {
          eventId: 'msg-assistant-123',
          userStop: false
        }

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(createMockConversation())
        mockMessageManager.getMessage = vi.fn().mockResolvedValue(mockMessage)

        await threadPresenter.handleLLMAgentEnd(eventData)

        expect(mockMessageManager.updateMessageStatus).toHaveBeenCalledWith('msg-assistant-123', 'sent')
        expect(mockMessageManager.updateMessageMetadata).toHaveBeenCalledWith(
          'msg-assistant-123',
          expect.objectContaining({
            totalTokens: expect.any(Number),
            generationTime: expect.any(Number),
            tokensPerSecond: expect.any(Number)
          })
        )
      })

      it('should keep message in generating state with pending permissions', async () => {
        const mockMessage = createMockAssistantMessage({
          content: [
            {
              type: 'tool_call_permission',
              content: 'Permission required',
              status: 'pending',
              timestamp: Date.now(),
              tool_call: {
                id: 'tool-123',
                name: 'file_write',
                params: '{}',
                server_name: 'filesystem'
              }
            }
          ]
        })
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        const eventData: LLMAgentEventData = {
          eventId: 'msg-assistant-123',
          userStop: false
        }

        await threadPresenter.handleLLMAgentEnd(eventData)

        // Should not finalize message, should remain in generating state
        expect(mockMessageManager.updateMessageStatus).not.toHaveBeenCalledWith('msg-assistant-123', 'sent')
        expect(threadPresenter['generatingMessages'].has('msg-assistant-123')).toBe(true)
      })
    })

    describe('handleLLMAgentError', () => {
      it('should handle error and clean up generating state', async () => {
        const mockMessage = createMockAssistantMessage()
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        const eventData: LLMAgentEventData = {
          eventId: 'msg-assistant-123',
          error: 'Connection timeout'
        }

        await threadPresenter.handleLLMAgentError(eventData)

        expect(mockMessageManager.handleMessageError).toHaveBeenCalledWith(
          'msg-assistant-123',
          'Connection timeout'
        )
        expect(threadPresenter['generatingMessages'].has('msg-assistant-123')).toBe(false)
      })
    })
  })

  describe('Permission Handling', () => {
    describe('handlePermissionResponse', () => {
      it('should grant permission and restart agent loop', async () => {
        const mockMessage = createMockAssistantMessage({
          content: [
            {
              type: 'tool_call_permission',
              content: 'Permission required for file operations',
              status: 'pending',
              timestamp: Date.now(),
              tool_call: {
                id: 'tool-123',
                name: 'file_write',
                params: '{"path": "/test.txt"}',
                server_name: 'filesystem'
              },
              extra: {
                serverName: 'filesystem',
                permissionType: 'write',
                needsUserAction: true
              }
            }
          ]
        })

        mockMessageManager.getMessage = vi.fn().mockResolvedValue(mockMessage)
        vi.mocked(require('../../../../src/main/presenter').presenter.mcpPresenter.grantPermission)
          .mockResolvedValue(undefined)

        // Mock generating state
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }
        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        await threadPresenter.handlePermissionResponse(
          'msg-assistant-123',
          'tool-123',
          true,
          'write',
          true
        )

        expect(mockMessageManager.editMessage).toHaveBeenCalled()
        expect(vi.mocked(require('../../../../src/main/presenter').presenter.mcpPresenter.grantPermission))
          .toHaveBeenCalledWith('filesystem', 'write', true)
      })

      it('should deny permission and finalize message', async () => {
        const mockMessage = createMockAssistantMessage({
          content: [
            {
              type: 'tool_call_permission',
              content: 'Permission required for file operations',
              status: 'pending',
              timestamp: Date.now(),
              tool_call: {
                id: 'tool-123',
                name: 'file_write',
                params: '{"path": "/test.txt"}',
                server_name: 'filesystem'
              }
            }
          ]
        })

        mockMessageManager.getMessage = vi.fn().mockResolvedValue(mockMessage)

        await threadPresenter.handlePermissionResponse(
          'msg-assistant-123',
          'tool-123',
          false,
          'write',
          false
        )

        expect(mockMessageManager.editMessage).toHaveBeenCalled()
        expect(mockMessageManager.updateMessageStatus).toHaveBeenCalledWith('msg-assistant-123', 'sent')
      })

      it('should throw error if permission block not found', async () => {
        const mockMessage = createMockAssistantMessage()
        mockMessageManager.getMessage = vi.fn().mockResolvedValue(mockMessage)

        await expect(threadPresenter.handlePermissionResponse(
          'msg-assistant-123',
          'nonexistent-tool',
          true,
          'write',
          true
        )).rejects.toThrow('Permission block not found')
      })
    })
  })

  describe('Generation Control', () => {
    describe('stopMessageGeneration', () => {
      it('should stop message generation and clean up state', async () => {
        const mockMessage = createMockAssistantMessage()
        const generatingState = {
          message: mockMessage,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null,
          isSearching: true
        }

        threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

        await threadPresenter.stopMessageGeneration('msg-assistant-123')

        expect(mockSearchManager.stopSearch).toHaveBeenCalledWith('conv-123')
        expect(mockLlmProviderPresenter.stopStream).toHaveBeenCalledWith('msg-assistant-123')
        expect(mockMessageManager.updateMessageStatus).toHaveBeenCalledWith('msg-assistant-123', 'error')
        expect(threadPresenter['generatingMessages'].has('msg-assistant-123')).toBe(false)
      })
    })

    describe('stopConversationGeneration', () => {
      it('should stop all generation for conversation', async () => {
        const mockMessage1 = createMockAssistantMessage({ id: 'msg-1' })
        const mockMessage2 = createMockAssistantMessage({ id: 'msg-2' })
        
        const generatingState1 = {
          message: mockMessage1,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }
        
        const generatingState2 = {
          message: mockMessage2,
          conversationId: 'conv-123',
          startTime: Date.now(),
          firstTokenTime: null,
          promptTokens: 100,
          reasoningStartTime: null,
          reasoningEndTime: null,
          lastReasoningTime: null
        }

        threadPresenter['generatingMessages'].set('msg-1', generatingState1)
        threadPresenter['generatingMessages'].set('msg-2', generatingState2)

        await threadPresenter.stopConversationGeneration('conv-123')

        expect(mockLlmProviderPresenter.stopStream).toHaveBeenCalledWith('msg-1')
        expect(mockLlmProviderPresenter.stopStream).toHaveBeenCalledWith('msg-2')
        expect(threadPresenter['generatingMessages'].size).toBe(0)
      })
    })
  })

  describe('Conversation Export', () => {
    describe('exportConversation', () => {
      it('should export conversation to markdown format', async () => {
        const mockConversation = createMockConversation()
        const mockMessages = [createMockUserMessage(), createMockAssistantMessage()]

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        mockMessageManager.getMessageThread = vi.fn().mockResolvedValue({
          list: mockMessages,
          total: 2
        })

        const result = await threadPresenter.exportConversation('conv-123', 'markdown')

        expect(result.filename).toMatch(/^export_deepchat_.*\.md$/)
        expect(result.content).toContain('# Test Conversation')
        expect(result.content).toContain('👤 用户')
        expect(result.content).toContain('🤖 助手')
        expect(result.content).toContain('Hello, how are you?')
      })

      it('should export conversation to HTML format', async () => {
        const mockConversation = createMockConversation()
        const mockMessages = [createMockUserMessage(), createMockAssistantMessage()]

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        mockMessageManager.getMessageThread = vi.fn().mockResolvedValue({
          list: mockMessages,
          total: 2
        })

        const result = await threadPresenter.exportConversation('conv-123', 'html')

        expect(result.filename).toMatch(/^export_deepchat_.*\.html$/)
        expect(result.content).toContain('<!DOCTYPE html>')
        expect(result.content).toContain('<title>Test Conversation</title>')
        expect(result.content).toContain('用户')
        expect(result.content).toContain('助手')
      })

      it('should throw error for non-existent conversation', async () => {
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(null)

        await expect(threadPresenter.exportConversation('invalid-id'))
          .rejects.toThrow('会话不存在')
      })
    })
  })

  describe('Fork Conversation', () => {
    describe('forkConversation', () => {
      it('should create conversation fork with message history', async () => {
        const sourceConversation = createMockConversation()
        const targetMessage = createMockUserMessage()
        const messageHistory = [
          createMockUserMessage({ id: 'msg-1', orderSeq: 1 }),
          createMockAssistantMessage({ id: 'msg-2', orderSeq: 2 })
        ]

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(sourceConversation)
        mockSqlitePresenter.createConversation = vi.fn().mockResolvedValue('conv-forked')
        mockMessageManager.getMessage = vi.fn().mockResolvedValue(targetMessage)
        mockSqlitePresenter.getMaxOrderSeq = vi.fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(1)

        // Mock getMessageHistory method
        const getMessageHistorySpy = vi.spyOn(threadPresenter as any, 'getMessageHistory')
          .mockResolvedValue(messageHistory)

        const result = await threadPresenter.forkConversation(
          'conv-123',
          'msg-user-123',
          'Forked Conversation'
        )

        expect(result).toBe('conv-forked')
        expect(mockSqlitePresenter.createConversation).toHaveBeenCalledWith('Forked Conversation')
        expect(mockSqlitePresenter.insertMessage).toHaveBeenCalledTimes(2)
        expect(getMessageHistorySpy).toHaveBeenCalledWith('msg-user-123', 100)
      })

      it('should throw error if source conversation not found', async () => {
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(null)

        await expect(threadPresenter.forkConversation(
          'invalid-id',
          'msg-123',
          'Fork'
        )).rejects.toThrow('源会话不存在')
      })
    })
  })

  describe('Title Generation', () => {
    describe('summaryTitles', () => {
      it('should generate conversation title using AI', async () => {
        const mockConversation = createMockConversation()
        const mockMessages = [
          createMockUserMessage(),
          createMockAssistantMessage()
        ]

        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        threadPresenter['getContextMessages'] = vi.fn().mockResolvedValue(mockMessages)
        mockLlmProviderPresenter.summaryTitles = vi.fn().mockResolvedValue('Generated Title')

        const result = await threadPresenter.summaryTitles(undefined, 'conv-123')

        expect(result).toBe('Generated Title')
        expect(mockLlmProviderPresenter.summaryTitles).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'assistant' })
          ]),
          'openai',
          'gpt-4'
        )
      })

      it('should clean title removing thinking tags', async () => {
        const mockConversation = createMockConversation()
        mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
        threadPresenter['getContextMessages'] = vi.fn().mockResolvedValue([])
        mockLlmProviderPresenter.summaryTitles = vi.fn()
          .mockResolvedValue('<think>Planning title</think>Clean Title')

        const result = await threadPresenter.summaryTitles(undefined, 'conv-123')

        expect(result).toBe('Clean Title')
      })
    })
  })

  describe('Integration Tests - Multi-function Collaboration', () => {
    it('should handle complete message flow from user input to AI response', async () => {
      // Setup: Create conversation and messages
      const mockConversation = createMockConversation()
      const mockUserMessage = createMockUserMessage()
      const mockAssistantMessage = createMockAssistantMessage()
      
      mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
      mockMessageManager.sendMessage = vi.fn()
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage)
      mockMessageManager.getMessageThread = vi.fn().mockResolvedValue({
        list: [mockUserMessage],
        total: 1
      })

      // Simulate streaming completion
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'response', data: { eventId: 'msg-assistant-123', content: 'Hello!' } }
          yield { type: 'end', data: { eventId: 'msg-assistant-123', userStop: false } }
        }
      }
      mockLlmProviderPresenter.startStreamCompletion = vi.fn().mockReturnValue(mockStream)

      // Execute: Send message and start completion
      const result = await threadPresenter.sendMessage('conv-123', 'Hello', 'user')
      
      // Simulate the stream completion that would be triggered
      const state = threadPresenter['generatingMessages'].get('msg-assistant-123')
      if (state) {
        await threadPresenter.startStreamCompletion(state.conversationId, 'msg-assistant-123')
      }

      // Verify: Complete flow executed correctly
      expect(result).toEqual(mockAssistantMessage)
      expect(mockMessageManager.sendMessage).toHaveBeenCalledTimes(2)
      expect(mockLlmProviderPresenter.startStreamCompletion).toHaveBeenCalled()
      expect(mockSqlitePresenter.updateConversation).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({ is_new: 0 })
      )
    })

    it('should handle search-enabled message with results processing', async () => {
      const mockConversation = createMockConversation()
      const mockUserMessage = createMockUserMessage({
        content: {
          text: 'What is the weather like today?',
          files: [],
          search: true,
          think: false
        }
      })
      const mockAssistantMessage = createMockAssistantMessage()
      const mockSearchResults = createMockSearchResults()

      mockSqlitePresenter.getConversation = vi.fn().mockResolvedValue(mockConversation)
      mockMessageManager.sendMessage = vi.fn()
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage)
      mockMessageManager.getMessageThread = vi.fn().mockResolvedValue({
        list: [mockUserMessage],
        total: 1
      })
      mockSearchManager.search = vi.fn().mockResolvedValue(mockSearchResults)

      // Mock context methods
      threadPresenter['getContextMessages'] = vi.fn().mockResolvedValue([mockUserMessage])
      threadPresenter['getLastUserMessage'] = vi.fn().mockResolvedValue(mockUserMessage)

      const result = await threadPresenter.sendMessage('conv-123', 'What is the weather?', 'user')

      expect(result).toEqual(mockAssistantMessage)
      expect(threadPresenter['generatingMessages'].has(mockAssistantMessage.id)).toBe(true)
    })

    it('should handle permission flow from request to approval', async () => {
      const mockMessage = createMockAssistantMessage({
        content: [
          {
            type: 'tool_call_permission',
            content: 'Permission required for file operations',
            status: 'pending',
            timestamp: Date.now(),
            tool_call: {
              id: 'tool-123',
              name: 'file_write',
              params: '{"path": "/test.txt"}',
              server_name: 'filesystem'
            },
            extra: {
              serverName: 'filesystem',
              permissionType: 'write',
              needsUserAction: true
            }
          }
        ]
      })

      mockMessageManager.getMessage = vi.fn().mockResolvedValue(mockMessage)
      vi.mocked(require('@/presenter').presenter.mcpPresenter.grantPermission)
        .mockResolvedValue(undefined)

      // Set up generating state
      const generatingState = {
        message: mockMessage,
        conversationId: 'conv-123',
        startTime: Date.now(),
        firstTokenTime: null,
        promptTokens: 100,
        reasoningStartTime: null,
        reasoningEndTime: null,
        lastReasoningTime: null
      }
      threadPresenter['generatingMessages'].set('msg-assistant-123', generatingState)

      // Grant permission
      await threadPresenter.handlePermissionResponse(
        'msg-assistant-123',
        'tool-123',
        true,
        'write',
        true
      )

      // Verify permission was granted and state updated
      expect(vi.mocked(require('@/presenter').presenter.mcpPresenter.grantPermission))
        .toHaveBeenCalledWith('filesystem', 'write', true)
      expect(mockMessageManager.editMessage).toHaveBeenCalled()
    })
  })
})