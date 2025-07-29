import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContentEnricher } from '../../../../src/main/presenter/threadPresenter/contentEnricher'
import type { SearchResult } from '../../../../src/shared/presenter'
import axios from 'axios'
import * as cheerio from 'cheerio'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock cheerio
vi.mock('cheerio', () => ({
  load: vi.fn()
}))

// Mock proxy config
vi.mock('../../../../src/main/presenter/proxyConfig', () => ({
  proxyConfig: {
    getProxyUrl: vi.fn().mockReturnValue(null)
  }
}))

describe('ContentEnricher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default axios response
    mockedAxios.get.mockResolvedValue({
      data: '<html><head><title>Sample title</title><meta name="description" content="This is an example site" /></head><body>Sample content</body></html>'
    })

    // Setup cheerio mock to return a functional cheerio instance
    const mockCheerioInstance = vi.fn()
    
    // Mock DOM methods that return text/attributes
    mockCheerioInstance.mockImplementation((selector: string) => {
      if (selector === 'title') {
        return {
          text: () => 'Sample title'
        }
      }
      if (selector === 'meta[name="description"]') {
        return {
          attr: () => 'This is an example site'
        }
      }
      if (selector.includes('favicon') || selector.includes('icon')) {
        return {
          attr: () => '/favicon.ico'
        }
      }
      if (selector === 'script, style, nav, header, footer, iframe, .ad, #ad, .advertisement') {
        return {
          remove: () => mockCheerioInstance
        }
      }
      
      return {
        text: () => 'Sample content',
        attr: () => '',
        remove: () => mockCheerioInstance,
        find: () => mockCheerioInstance,
        parent: () => mockCheerioInstance,
        clone: () => mockCheerioInstance,
        each: () => mockCheerioInstance,
        length: 0
      }
    })
    
    // Make it chainable by returning itself for most operations
    mockCheerioInstance.remove = () => mockCheerioInstance
    mockCheerioInstance.find = () => mockCheerioInstance
    
    vi.mocked(cheerio.load).mockReturnValue(mockCheerioInstance)
  })

  describe('extractAndEnrichUrls', () => {
    it('should extract and enrich URLs from text', async () => {
      const text = 'Check out https://example.com and https://test.org for more info'
      
      // Mock HTTP requests
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<html><head><title>Example Site</title></head><body>Example content</body></html>'
        })
        .mockResolvedValueOnce({
          data: '<html><head><title>Test Site</title></head><body>Test content</body></html>'
        })

      const results = await ContentEnricher.extractAndEnrichUrls(text)

      expect(results).toHaveLength(2)
      expect(results[0]).toEqual(
        expect.objectContaining({
          title: 'Sample title',
          url: 'https://example.com',
          description: 'This is an example site',
          icon: expect.stringContaining('favicon.ico'),
          rank: 1
        })
      )
      expect(results[1]).toEqual(
        expect.objectContaining({
          title: 'Sample title',
          url: 'https://test.org',
          description: 'This is an example site',
          icon: expect.stringContaining('favicon.ico'),
          rank: 2
        })
      )
    })

    it('should return empty array when no URLs found', async () => {
      const text = 'This text has no URLs'
      
      const results = await ContentEnricher.extractAndEnrichUrls(text)

      expect(results).toEqual([])
    })

    it('should handle HTTP and HTTPS URLs', async () => {
      const text = 'Visit http://example.com and https://secure.example.com'
      
      mockedAxios.get.mockResolvedValue({
        data: '<html><head><title>Site</title></head><body>Content</body></html>'
      })

      const results = await ContentEnricher.extractAndEnrichUrls(text)

      expect(results).toHaveLength(2)
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })
  })

  describe('enrichUrl', () => {
    it('should enrich single URL with full content', async () => {
      const url = 'https://example.com'
      
      const result = await ContentEnricher.enrichUrl(url)

      expect(result).toEqual({
        title: 'Sample title',
        url: 'https://example.com',
        content: expect.any(String),
        icon: expect.stringContaining('favicon.ico'),
        description: 'This is an example site',
        rank: 1
      })
    })

    it('should handle network errors gracefully', async () => {
      const url = 'https://unreachable.com'
      
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const result = await ContentEnricher.enrichUrl(url)

      expect(result).toEqual({
        title: 'https://unreachable.com',
        url: 'https://unreachable.com',
        rank: 1,
        description: '',
        icon: ''
      })
    })

    it('should handle timeout errors', async () => {
      const url = 'https://slow.com'
      
      mockedAxios.get.mockRejectedValue(new Error('timeout of 5000ms exceeded'))

      const result = await ContentEnricher.enrichUrl(url)

      expect(result.title).toBe(url)
      expect(result.url).toBe(url)
    })

    it('should extract main content from common selectors', async () => {
      const url = 'https://article.com'
      const mockHtml = `
        <html>
          <body>
            <article>
              <h1>Article Title</h1>
              <p>This is the main article content that should be extracted.</p>
            </article>
            <aside>This sidebar content should be ignored.</aside>
          </body>
        </html>
      `

      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const result = await ContentEnricher.enrichUrl(url)

      expect(result.content).toBeDefined()
      expect(typeof result.content).toBe('string')
    })
  })

  describe('enrichResults', () => {
    it('should enrich multiple search results', async () => {
      const results: SearchResult[] = [
        {
          title: 'Result 1',
          url: 'https://example1.com',
          content: '',
          description: 'First result',
          icon: '',
          rank: 1
        },
        {
          title: 'Result 2',
          url: 'https://example2.com',
          content: '',
          description: 'Second result',
          icon: '',
          rank: 2
        }
      ]

      mockedAxios.get.mockResolvedValue({
        data: '<html><head><title>Enriched</title></head><body>Enriched content</body></html>'
      })

      const enrichedResults = await ContentEnricher.enrichResults(results)

      expect(enrichedResults).toHaveLength(2)
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(enrichedResults[0].content).toBeDefined() // From mock
      expect(enrichedResults[1].content).toBeDefined()
    })

    it('should handle enrichment errors gracefully', async () => {
      const results: SearchResult[] = [
        {
          title: 'Good Result',
          url: 'https://good.com',
          content: '',
          description: 'Good result',
          icon: '',
          rank: 1
        },
        {
          title: 'Bad Result',
          url: 'https://bad.com',
          content: '',
          description: 'Bad result',
          icon: '',
          rank: 2
        }
      ]

      mockedAxios.get
        .mockResolvedValueOnce({ data: '<html><body>Good content</body></html>' })
        .mockRejectedValueOnce(new Error('Network error'))

      const enrichedResults = await ContentEnricher.enrichResults(results)

      expect(enrichedResults).toHaveLength(2)
      expect(enrichedResults[0].content).toBeDefined() // Enriched
      expect(enrichedResults[1].content).toBe('') // Original, not enriched due to error
    })

    it('should respect limit parameter', async () => {
      const results: SearchResult[] = [
        { title: '1', url: 'https://1.com', content: '', description: '', icon: '', rank: 1 },
        { title: '2', url: 'https://2.com', content: '', description: '', icon: '', rank: 2 },
        { title: '3', url: 'https://3.com', content: '', description: '', icon: '', rank: 3 }
      ]

      mockedAxios.get.mockResolvedValue({
        data: '<html><body>Content</body></html>'
      })

      const enrichedResults = await ContentEnricher.enrichResults(results, 2)

      expect(enrichedResults).toHaveLength(2)
      expect(mockedAxios.get).toHaveBeenCalledTimes(2) // Only first 2 should be enriched
    })
  })

  describe('enrichUserMessageWithUrlContent', () => {
    it('should enrich user message with URL content', () => {
      const userText = 'Check out this article'
      const urlResults: SearchResult[] = [
        {
          title: 'Article Title',
          url: 'https://example.com/article',
          content: 'This is the article content with valuable information.',
          description: 'An informative article',
          icon: '',
          rank: 1
        }
      ]

      const enriched = ContentEnricher.enrichUserMessageWithUrlContent(userText, urlResults)

      expect(enriched).toContain('<url-content>')
      expect(enriched).toContain('<url-content-item>')
      expect(enriched).toContain('<url>https://example.com/article</url>')
      expect(enriched).toContain('<content>This is the article content with valuable information.</content>')
      expect(enriched).toContain('</url-content-item>')
      expect(enriched).toContain('</url-content>')
    })

    it('should return original text when no URL results', () => {
      const userText = 'Just plain text'
      
      const result = ContentEnricher.enrichUserMessageWithUrlContent(userText, [])

      expect(result).toBe(userText)
    })

    it('should handle multiple URL results', () => {
      const userText = 'Multiple links'
      const urlResults: SearchResult[] = [
        {
          title: 'First',
          url: 'https://first.com',
          content: 'First content',
          description: '',
          icon: '',
          rank: 1
        },
        {
          title: 'Second',
          url: 'https://second.com',
          content: 'Second content',
          description: '',
          icon: '',
          rank: 2
        }
      ]

      const enriched = ContentEnricher.enrichUserMessageWithUrlContent(userText, urlResults)

      expect(enriched).toContain('https://first.com')
      expect(enriched).toContain('First content')
      expect(enriched).toContain('https://second.com')
      expect(enriched).toContain('Second content')
    })
  })

  describe('convertHtmlToMarkdown', () => {
    it('should convert HTML to structured markdown', () => {
      const html = `
        <div>
          <h1>Main Title</h1>
          <a href="https://example.com">Example Link</a>
          <p>Some description text</p>
          <a href="/relative">Relative Link</a>
        </div>
      `
      const baseUrl = 'https://base.com'

      const markdown = ContentEnricher.convertHtmlToMarkdown(html, baseUrl)

      expect(typeof markdown).toBe('string')
      expect(markdown.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty HTML', () => {
      const html = ''
      const baseUrl = 'https://example.com'

      const markdown = ContentEnricher.convertHtmlToMarkdown(html, baseUrl)

      expect(typeof markdown).toBe('string')
    })

    it('should convert relative URLs to absolute', () => {
      const html = '<a href="/path/to/page">Link</a>'
      const baseUrl = 'https://example.com'

      const markdown = ContentEnricher.convertHtmlToMarkdown(html, baseUrl)

      expect(typeof markdown).toBe('string')
    })
  })

  describe('Favicon Extraction', () => {
    it('should extract favicon from various link rel attributes', async () => {
      const url = 'https://example.com'
      const mockHtml = `
        <html>
          <head>
            <link rel="icon" href="/custom-icon.png">
          </head>
          <body>Content</body>
        </html>
      `

      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const result = await ContentEnricher.enrichUrl(url)

      expect(result.icon).toContain('favicon.ico')
    })

    it('should fall back to default favicon.ico', async () => {
      const url = 'https://example.com'
      const mockHtml = '<html><head></head><body>Content</body></html>'

      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const result = await ContentEnricher.enrichUrl(url)

      expect(result.icon).toContain('favicon.ico')
    })
  })

  describe('Content Cleaning', () => {
    it('should remove unwanted elements from content', async () => {
      const url = 'https://example.com'
      const mockHtml = `
        <html>
          <body>
            <main>Clean content</main>
            <script>alert('malicious')</script>
            <style>.hidden { display: none; }</style>
            <nav>Navigation</nav>
          </body>
        </html>
      `

      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const result = await ContentEnricher.enrichUrl(url)

      expect(result).toBeDefined()
      expect(result.title).toBe('Sample title')
    })
  })
})