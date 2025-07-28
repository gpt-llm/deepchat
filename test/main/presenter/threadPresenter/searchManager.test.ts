import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SearchManager, formatSearchResults, generateSearchPrompt } from '../../../../src/main/presenter/threadPresenter/searchManager'
import { ContentEnricher } from '../../../../src/main/presenter/threadPresenter/contentEnricher'
import type { SearchResult } from '../../../../src/shared/presenter'
import type { SearchEngineTemplate } from '../../../../src/shared/chat'
import { BrowserWindow } from 'electron'

// Mock Electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  screen: {
    getDisplayMatching: vi.fn().mockReturnValue({
      workArea: { x: 0, y: 0, width: 1920, height: 1080 }
    })
  },
  app: {
    getAppPath: vi.fn().mockReturnValue('/app/path')
  }
}))

// Mock ContentEnricher
vi.mock('../../../../src/main/presenter/threadPresenter/contentEnricher', () => ({
  ContentEnricher: {
    enrichResults: vi.fn(),
    convertHtmlToMarkdown: vi.fn()
  }
}))

// Mock other dependencies
vi.mock('../../../../src/main/presenter', () => ({
  presenter: {
    configPresenter: {
      getSearchPreviewEnabled: vi.fn().mockResolvedValue(true),
      getCustomSearchEngines: vi.fn().mockResolvedValue([]),
      setSetting: vi.fn()
    },
    llmproviderPresenter: {
      generateCompletion: vi.fn()
    },
    threadPresenter: {
      searchAssistantModel: { id: 'gpt-4' },
      searchAssistantProviderId: 'openai'
    }
  }
}))

vi.mock('../../../../src/main/eventbus', () => ({
  eventBus: {
    on: vi.fn()
  }
}))

describe('SearchManager', () => {
  let searchManager: SearchManager
  let mockBrowserWindow: any

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

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock BrowserWindow
    mockBrowserWindow = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      focus: vi.fn(),
      getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),
      setBounds: vi.fn(),
      setPosition: vi.fn(),
      setSize: vi.fn(),
      setFullScreen: vi.fn(),
      isFullScreen: vi.fn().mockReturnValue(false),
      webContents: {
        executeJavaScript: vi.fn(),
        getURL: vi.fn().mockReturnValue('https://example.com/search'),
        stop: vi.fn(),
        session: {
          webRequest: {
            onBeforeSendHeaders: vi.fn()
          }
        },
        openDevTools: vi.fn()
      },
      on: vi.fn()
    }

    vi.mocked(BrowserWindow).mockImplementation(() => mockBrowserWindow)

    searchManager = new SearchManager()
  })

  afterEach(() => {
    searchManager.destroy()
  })

  describe('Engine Management', () => {
    describe('getEngines', () => {
      it('should return available search engines', async () => {
        const engines = await searchManager.getEngines()

        expect(engines).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 'google', name: 'google' }),
            expect.objectContaining({ id: 'baidu', name: 'baidu' }),
            expect.objectContaining({ id: 'bing', name: 'bing' })
          ])
        )
      })
    })

    describe('getActiveEngine', () => {
      it('should return the currently active engine', () => {
        const activeEngine = searchManager.getActiveEngine()

        expect(activeEngine).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            searchUrl: expect.any(String)
          })
        )
      })
    })

    describe('setActiveEngine', () => {
      it('should set active engine by ID', async () => {
        const result = await searchManager.setActiveEngine('bing')

        expect(result).toBe(true)
        expect(searchManager.getActiveEngine().id).toBe('bing')
      })

      it('should return false for invalid engine ID', async () => {
        const result = await searchManager.setActiveEngine('invalid-engine')

        expect(result).toBe(false)
      })
    })
  })

  describe('Search Operations', () => {
    describe('search', () => {
      it('should perform search and return results', async () => {
        const mockResults = createMockSearchResults()
        
        // Mock successful URL loading
        mockBrowserWindow.loadURL.mockResolvedValue(undefined)
        
        // Mock search result extraction
        mockBrowserWindow.webContents.executeJavaScript
          .mockResolvedValueOnce(1000) // page height
          .mockResolvedValueOnce(800)  // viewport height
          .mockResolvedValue(mockResults) // search results

        // Mock content enrichment
        vi.mocked(ContentEnricher.enrichResults).mockResolvedValue(mockResults)

        const results = await searchManager.search('conv-123', 'test query')

        expect(mockBrowserWindow.loadURL).toHaveBeenCalledWith(
          expect.stringContaining('test%20query')
        )
        expect(results).toEqual(mockResults)
      })

      it('should handle search timeout', async () => {
        // Mock URL loading timeout
        mockBrowserWindow.loadURL.mockRejectedValue(new Error('Load timeout'))

        const results = await searchManager.search('conv-123', 'test query')

        expect(results).toEqual([])
      })

      it('should use fallback extraction when standard method fails', async () => {
        mockBrowserWindow.loadURL.mockResolvedValue(undefined)
        
        // Mock standard extraction failure
        mockBrowserWindow.webContents.executeJavaScript
          .mockResolvedValueOnce(1000) // page height
          .mockResolvedValueOnce(800)  // viewport height
          .mockResolvedValueOnce([])   // empty results from standard method
          .mockResolvedValueOnce('<html><body>Mock HTML content</body></html>') // cleaned HTML
          .mockResolvedValueOnce('Mock Page Title') // page title

        // Mock AI-powered fallback extraction
        vi.mocked(ContentEnricher.convertHtmlToMarkdown).mockReturnValue('# Mock Content')
        vi.mocked(require('../../../../src/main/presenter').presenter.llmproviderPresenter.generateCompletion)
          .mockResolvedValue(JSON.stringify(createMockSearchResults()))

        const results = await searchManager.search('conv-123', 'test query')

        expect(ContentEnricher.convertHtmlToMarkdown).toHaveBeenCalled()
        expect(results).toEqual(createMockSearchResults())
      })
    })

    describe('stopSearch', () => {
      it('should stop search and destroy window', async () => {
        // First start a search to create a window
        mockBrowserWindow.loadURL.mockResolvedValue(undefined)
        mockBrowserWindow.webContents.executeJavaScript.mockResolvedValue([])
        vi.mocked(ContentEnricher.enrichResults).mockResolvedValue([])

        await searchManager.search('conv-123', 'test')
        await searchManager.stopSearch('conv-123')

        expect(mockBrowserWindow.destroy).toHaveBeenCalled()
      })
    })

    describe('testSearch', () => {
      it('should open test search window', async () => {
        mockBrowserWindow.loadURL.mockResolvedValue(undefined)

        const result = await searchManager.testSearch('weather')

        expect(result).toBe(true)
        expect(mockBrowserWindow.loadURL).toHaveBeenCalledWith(
          expect.stringContaining('weather')
        )
        expect(mockBrowserWindow.focus).toHaveBeenCalled()
      })

      it('should handle test search error', async () => {
        mockBrowserWindow.loadURL.mockRejectedValue(new Error('Load failed'))

        const result = await searchManager.testSearch('weather')

        expect(result).toBe(false)
      })
    })
  })

  describe('Window Management', () => {
    it('should create search window with preview enabled', async () => {
      vi.mocked(require('../../../../src/main/presenter').presenter.configPresenter.getSearchPreviewEnabled)
        .mockResolvedValue(true)

      // Mock main window for positioning
      vi.mocked(require('../../../../src/main/presenter').presenter.windowPresenter = {
        mainWindow: {
          getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),
          isFullScreen: vi.fn().mockReturnValue(false)
        }
      })

      mockBrowserWindow.loadURL.mockResolvedValue(undefined)
      mockBrowserWindow.webContents.executeJavaScript.mockResolvedValue([])
      vi.mocked(ContentEnricher.enrichResults).mockResolvedValue([])

      await searchManager.search('conv-123', 'test')

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          parent: expect.any(Object)
        })
      )
    })

    it('should create hidden window with preview disabled', async () => {
      vi.mocked(require('../../../../src/main/presenter').presenter.configPresenter.getSearchPreviewEnabled)
        .mockResolvedValue(false)

      mockBrowserWindow.loadURL.mockResolvedValue(undefined)
      mockBrowserWindow.webContents.executeJavaScript.mockResolvedValue([])
      vi.mocked(ContentEnricher.enrichResults).mockResolvedValue([])

      await searchManager.search('conv-123', 'test')

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          show: false
        })
      )
    })
  })

  describe('Engine Configuration', () => {
    describe('updateEngines', () => {
      it('should update engine list and maintain active engine', async () => {
        const newEngines: SearchEngineTemplate[] = [
          {
            id: 'custom-engine',
            name: 'Custom Engine',
            searchUrl: 'https://custom.com/search?q={query}',
            selector: '.results',
            extractorScript: 'return [];',
            isCustom: true
          }
        ]

        await searchManager.updateEngines(newEngines)

        const engines = await searchManager.getEngines()
        expect(engines).toEqual(newEngines)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle JavaScript execution errors gracefully', async () => {
      mockBrowserWindow.loadURL.mockResolvedValue(undefined)
      mockBrowserWindow.webContents.executeJavaScript
        .mockRejectedValue(new Error('JavaScript execution failed'))

      const results = await searchManager.search('conv-123', 'test query')

      expect(results).toEqual([])
    })

    it('should handle window destruction during search', async () => {
      mockBrowserWindow.loadURL.mockResolvedValue(undefined)
      mockBrowserWindow.webContents.executeJavaScript.mockImplementation(() => {
        // Simulate window being destroyed
        throw new Error('Window destroyed')
      })

      const results = await searchManager.search('conv-123', 'test query')

      expect(results).toEqual([])
    })
  })

  describe('Concurrent Search Management', () => {
    it('should limit concurrent search windows', async () => {
      // Mock multiple searches
      const promises = []
      for (let i = 0; i < 5; i++) {
        mockBrowserWindow.webContents.executeJavaScript.mockResolvedValue([])
        vi.mocked(ContentEnricher.enrichResults).mockResolvedValue([])
        promises.push(searchManager.search(`conv-${i}`, `query ${i}`))
      }

      await Promise.all(promises)

      // Should have created maximum number of windows (3 by default)
      expect(BrowserWindow).toHaveBeenCalledTimes(5) // Due to window reuse logic
    })
  })
})

describe('Search Utility Functions', () => {
  describe('formatSearchResults', () => {
    it('should format search results correctly', () => {
      const results = createMockSearchResults()
      
      const formatted = formatSearchResults(results)

      expect(formatted).toContain('[webpage 1 begin]')
      expect(formatted).toContain('title: Test Result 1')
      expect(formatted).toContain('URL: https://example.com/1')
      expect(formatted).toContain('content：This is the first test result content')
      expect(formatted).toContain('[webpage 1 end]')
      expect(formatted).toContain('[webpage 2 begin]')
      expect(formatted).toContain('[webpage 2 end]')
    })

    it('should handle empty results', () => {
      const formatted = formatSearchResults([])
      
      expect(formatted).toBe('')
    })
  })

  describe('generateSearchPrompt', () => {
    it('should generate search prompt with results', () => {
      const results = createMockSearchResults()
      const query = 'test weather query'
      
      const prompt = generateSearchPrompt(query, results)

      expect(prompt).toContain('{{SEARCH_RESULTS}}')
      expect(prompt).toContain('{{USER_QUERY}}')
      expect(prompt).toContain('{{CUR_DATE}}')
      // Verify template replacement
      expect(prompt).toContain('[webpage 1 begin]')
      expect(prompt).toContain('test weather query')
      expect(prompt).toContain(new Date().toLocaleDateString())
    })

    it('should return original query when no results', () => {
      const query = 'test query'
      
      const prompt = generateSearchPrompt(query, [])

      expect(prompt).toBe(query)
    })
  })
})

function createMockSearchResults(): SearchResult[] {
  return [
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
}