import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageManager } from '../../../../src/main/presenter/threadPresenter/messageManager'
import type { ISQLitePresenter, MESSAGE_ROLE, MESSAGE_STATUS, MESSAGE_METADATA } from '../../../../src/shared/presenter'
import type { Message, AssistantMessage, UserMessage } from '../../../../src/shared/chat'

describe('MessageManager', () => {
  let messageManager: MessageManager
  let mockSqlitePresenter: ISQLitePresenter

  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: 'msg-123',
    conversationId: 'conv-123',
    role: 'user',
    content: 'Test message content',
    timestamp: Date.now(),
    status: 'sent',
    usage: null,
    parentId: null,
    orderSeq: 1,
    isContextEdge: 0,
    isVariant: 0,
    ...overrides
  })

  beforeEach(() => {
    mockSqlitePresenter = {
      insertMessage: vi.fn().mockResolvedValue('msg-123'),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      getMessage: vi.fn(),
      getMessageThread: vi.fn(),
      getContextMessages: vi.fn(),
      getLastUserMessage: vi.fn(),
      getMainMessageByParentId: vi.fn(),
      getMessageVariants: vi.fn(),
      updateMessageStatus: vi.fn(),
      updateMessageMetadata: vi.fn(),
      markMessageAsContextEdge: vi.fn(),
      clearAllMessages: vi.fn(),
      getMaxOrderSeq: vi.fn().mockResolvedValue(0),
      getUnfinishedMessages: vi.fn().mockResolvedValue([])
    } as unknown as ISQLitePresenter

    messageManager = new MessageManager(mockSqlitePresenter)
  })

  describe('sendMessage', () => {
    it('should send user message successfully', async () => {
      const metadata: MESSAGE_METADATA = {
        totalTokens: 100,
        generationTime: 1000,
        firstTokenTime: 500,
        tokensPerSecond: 0.1,
        contextUsage: 50,
        inputTokens: 50,
        outputTokens: 50,
        model: 'gpt-4',
        provider: 'openai'
      }

      const result = await messageManager.sendMessage(
        'conv-123',
        'Hello world',
        'user',
        null,
        false,
        metadata
      )

      expect(mockSqlitePresenter.insertMessage).toHaveBeenCalledWith(
        'conv-123',
        'Hello world',
        'user',
        null,
        JSON.stringify(metadata),
        1, // orderSeq
        100, // tokenCount
        'pending',
        0, // isContextEdge
        0 // isVariant
      )
      expect(result.id).toBe('msg-123')
      expect(result.content).toBe('Hello world')
      expect(result.role).toBe('user')
    })

    it('should send assistant message with JSON content', async () => {
      const assistantContent = [
        {
          type: 'content',
          content: 'Hello! How can I help you?',
          status: 'success',
          timestamp: Date.now()
        }
      ]

      const result = await messageManager.sendMessage(
        'conv-123',
        JSON.stringify(assistantContent),
        'assistant',
        'msg-user-123',
        false,
        {
          totalTokens: 50,
          generationTime: 800,
          firstTokenTime: 300,
          tokensPerSecond: 0.0625,
          contextUsage: 25,
          inputTokens: 25,
          outputTokens: 25,
          model: 'gpt-4',
          provider: 'openai'
        }
      )

      expect(result.role).toBe('assistant')
      expect(result.parentId).toBe('msg-user-123')
      expect(Array.isArray(result.content)).toBe(true)
    })
  })

  describe('editMessage', () => {
    it('should edit message content', async () => {
      const mockMessage = createMockMessage()
      mockSqlitePresenter.getMessage = vi.fn().mockResolvedValue(mockMessage)

      const result = await messageManager.editMessage('msg-123', 'Updated content')

      expect(mockSqlitePresenter.updateMessage).toHaveBeenCalledWith(
        'msg-123',
        'Updated content'
      )
      expect(result.content).toBe('Updated content')
    })

    it('should throw error if message not found', async () => {
      mockSqlitePresenter.getMessage = vi.fn().mockResolvedValue(null)

      await expect(messageManager.editMessage('invalid-id', 'content'))
        .rejects.toThrow('Message not found')
    })
  })

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      await messageManager.deleteMessage('msg-123')

      expect(mockSqlitePresenter.deleteMessage).toHaveBeenCalledWith('msg-123')
    })
  })

  describe('retryMessage', () => {
    it('should retry assistant message', async () => {
      const mockAssistantMessage = createMockMessage({
        role: 'assistant',
        parentId: 'msg-user-123'
      })
      mockSqlitePresenter.getMessage = vi.fn().mockResolvedValue(mockAssistantMessage)

      const metadata: MESSAGE_METADATA = {
        totalTokens: 0,
        generationTime: 0,
        firstTokenTime: 0,
        tokensPerSecond: 0,
        contextUsage: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: 'gpt-4',
        provider: 'openai'
      }

      const result = await messageManager.retryMessage('msg-123', metadata)

      expect(mockSqlitePresenter.insertMessage).toHaveBeenCalled()
      expect(result.role).toBe('assistant')
      expect(result.parentId).toBe('msg-user-123')
    })

    it('should throw error for non-assistant message', async () => {
      const mockUserMessage = createMockMessage({ role: 'user' })
      mockSqlitePresenter.getMessage = vi.fn().mockResolvedValue(mockUserMessage)

      await expect(messageManager.retryMessage('msg-123', {} as MESSAGE_METADATA))
        .rejects.toThrow('Only assistant messages can be retried')
    })
  })

  describe('getMessageThread', () => {
    it('should get message thread with pagination', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1', orderSeq: 1 }),
        createMockMessage({ id: 'msg-2', orderSeq: 2 })
      ]
      mockSqlitePresenter.getMessageThread = vi.fn().mockResolvedValue({
        list: mockMessages,
        total: 2
      })

      const result = await messageManager.getMessageThread('conv-123', 1, 10)

      expect(mockSqlitePresenter.getMessageThread).toHaveBeenCalledWith('conv-123', 1, 10)
      expect(result.list).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('updateMessageStatus', () => {
    it('should update message status', async () => {
      await messageManager.updateMessageStatus('msg-123', 'sent')

      expect(mockSqlitePresenter.updateMessageStatus).toHaveBeenCalledWith('msg-123', 'sent')
    })
  })

  describe('updateMessageMetadata', () => {
    it('should update message metadata', async () => {
      const metadata: Partial<MESSAGE_METADATA> = {
        totalTokens: 150,
        generationTime: 2000
      }

      await messageManager.updateMessageMetadata('msg-123', metadata)

      expect(mockSqlitePresenter.updateMessageMetadata).toHaveBeenCalledWith('msg-123', metadata)
    })
  })

  describe('handleMessageError', () => {
    it('should handle message error by updating status and content', async () => {
      const mockMessage = createMockMessage({
        role: 'assistant',
        content: JSON.stringify([
          {
            type: 'content',
            content: 'Previous content',
            status: 'loading',
            timestamp: Date.now()
          }
        ])
      })
      mockSqlitePresenter.getMessage = vi.fn().mockResolvedValue(mockMessage)

      await messageManager.handleMessageError('msg-123', 'Connection timeout')

      expect(mockSqlitePresenter.updateMessageStatus).toHaveBeenCalledWith('msg-123', 'error')
      expect(mockSqlitePresenter.updateMessage).toHaveBeenCalled()
      
      // Check that error block was added to content
      const updateCall = vi.mocked(mockSqlitePresenter.updateMessage).mock.calls[0]
      const updatedContent = JSON.parse(updateCall[1])
      expect(updatedContent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            content: 'Connection timeout',
            status: 'error'
          })
        ])
      )
    })
  })

  describe('getContextMessages', () => {
    it('should get context messages with token limit', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1' }),
        createMockMessage({ id: 'msg-2' })
      ]
      mockSqlitePresenter.getContextMessages = vi.fn().mockResolvedValue(mockMessages)

      const result = await messageManager.getContextMessages('conv-123', 10)

      expect(mockSqlitePresenter.getContextMessages).toHaveBeenCalledWith('conv-123', 10)
      expect(result).toEqual(mockMessages)
    })
  })

  describe('getLastUserMessage', () => {
    it('should get last user message', async () => {
      const mockUserMessage = createMockMessage({ role: 'user' })
      mockSqlitePresenter.getLastUserMessage = vi.fn().mockResolvedValue(mockUserMessage)

      const result = await messageManager.getLastUserMessage('conv-123')

      expect(mockSqlitePresenter.getLastUserMessage).toHaveBeenCalledWith('conv-123')
      expect(result).toEqual(mockUserMessage)
    })
  })

  describe('initializeUnfinishedMessages', () => {
    it('should handle unfinished messages on startup', async () => {
      const unfinishedMessages = [
        createMockMessage({
          role: 'assistant',
          status: 'pending',
          content: JSON.stringify([
            {
              type: 'content',
              content: 'Incomplete message',
              status: 'loading',
              timestamp: Date.now()
            }
          ])
        })
      ]
      mockSqlitePresenter.getUnfinishedMessages = vi.fn().mockResolvedValue(unfinishedMessages)

      await messageManager.initializeUnfinishedMessages()

      expect(mockSqlitePresenter.updateMessage).toHaveBeenCalled()
      expect(mockSqlitePresenter.updateMessageStatus).toHaveBeenCalledWith('msg-123', 'error')
    })
  })

  describe('clearAllMessages', () => {
    it('should clear all messages for conversation', async () => {
      await messageManager.clearAllMessages('conv-123')

      expect(mockSqlitePresenter.clearAllMessages).toHaveBeenCalledWith('conv-123')
    })
  })

  describe('markMessageAsContextEdge', () => {
    it('should mark message as context edge', async () => {
      await messageManager.markMessageAsContextEdge('msg-123', true)

      expect(mockSqlitePresenter.markMessageAsContextEdge).toHaveBeenCalledWith('msg-123', 1)
    })

    it('should unmark message as context edge', async () => {
      await messageManager.markMessageAsContextEdge('msg-123', false)

      expect(mockSqlitePresenter.markMessageAsContextEdge).toHaveBeenCalledWith('msg-123', 0)
    })
  })

  describe('getMessageVariants', () => {
    it('should get message variants', async () => {
      const mockVariants = [
        createMockMessage({ id: 'msg-123', isVariant: 0 }),
        createMockMessage({ id: 'msg-124', isVariant: 1 })
      ]
      mockSqlitePresenter.getMessageVariants = vi.fn().mockResolvedValue(mockVariants)

      const result = await messageManager.getMessageVariants('msg-123')

      expect(mockSqlitePresenter.getMessageVariants).toHaveBeenCalledWith('msg-123')
      expect(result).toEqual(mockVariants)
    })
  })
})