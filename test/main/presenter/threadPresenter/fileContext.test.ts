import { describe, it, expect } from 'vitest'
import { getFileContext } from '../../../../src/main/presenter/threadPresenter/fileContext'
import type { MessageFile } from '../../../../src/shared/chat'

describe('fileContext', () => {
  const createMockFile = (overrides: Partial<MessageFile> = {}): MessageFile => ({
    name: 'test.txt',
    path: '/path/to/test.txt',
    content: 'File content here',
    mimeType: 'text/plain',
    token: 10,
    metadata: {
      fileSize: 1024,
      lastModified: Date.now()
    },
    ...overrides
  })

  describe('getFileContext', () => {
    it('should return empty string for no files', () => {
      const result = getFileContext([])

      expect(result).toBe('')
    })

    it('should format single file context', () => {
      const files = [createMockFile()]

      const result = getFileContext(files)

      expect(result).toContain('<files>')
      expect(result).toContain('<file>')
      expect(result).toContain('<name>test.txt</name>')
      expect(result).toContain('<mimeType>text/plain</mimeType>')
      expect(result).toContain('<size>1024</size>')
      expect(result).toContain('<path>/path/to/test.txt</path>')
      expect(result).toContain('<content>File content here</content>')
      expect(result).toContain('</file>')
      expect(result).toContain('</files>')
    })

    it('should format multiple files context', () => {
      const files = [
        createMockFile({
          name: 'file1.txt',
          path: '/path/file1.txt',
          content: 'Content 1'
        }),
        createMockFile({
          name: 'file2.js',
          path: '/path/file2.js',
          content: 'console.log("hello")',
          mimeType: 'application/javascript'
        })
      ]

      const result = getFileContext(files)

      expect(result).toContain('file1.txt')
      expect(result).toContain('file2.js')
      expect(result).toContain('Content 1')
      expect(result).toContain('console.log("hello")')
      expect(result).toContain('text/plain')
      expect(result).toContain('application/javascript')
    })

    it('should exclude content for image files', () => {
      const files = [
        createMockFile({
          name: 'image.png',
          mimeType: 'image/png',
          content: 'base64imagedata...'
        }),
        createMockFile({
          name: 'document.txt',
          mimeType: 'text/plain',
          content: 'Text content'
        })
      ]

      const result = getFileContext(files)

      expect(result).toContain('image.png')
      expect(result).toContain('document.txt')
      expect(result).toContain('Text content')
      expect(result).not.toContain('base64imagedata...')
      expect(result).toContain('<content></content>') // Empty content for image
      expect(result).toContain('<content>Text content</content>') // Content for text file
    })

    it('should handle files with various MIME types', () => {
      const files = [
        createMockFile({
          name: 'script.js',
          mimeType: 'application/javascript',
          content: 'const x = 1;'
        }),
        createMockFile({
          name: 'data.json',
          mimeType: 'application/json',
          content: '{"key": "value"}'
        }),
        createMockFile({
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
          content: 'jpeg-data'
        }),
        createMockFile({
          name: 'video.mp4',
          mimeType: 'video/mp4',
          content: 'video-data'
        })
      ]

      const result = getFileContext(files)

      expect(result).toContain('application/javascript')
      expect(result).toContain('application/json')
      expect(result).toContain('image/jpeg')
      expect(result).toContain('video/mp4')
      expect(result).toContain('const x = 1;')
      expect(result).toContain('{"key": "value"}')
      expect(result).not.toContain('jpeg-data') // Image content excluded
      expect(result).toContain('video-data') // Video content included (not image)
    })

    it('should handle files with special characters in content', () => {
      const files = [createMockFile({
        name: 'special.xml',
        content: '<xml>Content with &lt; &gt; &amp; characters</xml>',
        mimeType: 'application/xml'
      })]

      const result = getFileContext(files)

      expect(result).toContain('<xml>Content with &lt; &gt; &amp; characters</xml>')
    })

    it('should handle files with empty content', () => {
      const files = [createMockFile({
        name: 'empty.txt',
        content: '',
        mimeType: 'text/plain'
      })]

      const result = getFileContext(files)

      expect(result).toContain('<content></content>')
    })

    it('should handle files with undefined or null content gracefully', () => {
      const files = [createMockFile({
        name: 'undefined.txt',
        content: undefined as any,
        mimeType: 'text/plain'
      })]

      const result = getFileContext(files)

      expect(result).toContain('<content>undefined</content>')
    })

    it('should preserve file order in output', () => {
      const files = [
        createMockFile({ name: 'first.txt', content: 'First' }),
        createMockFile({ name: 'second.txt', content: 'Second' }),
        createMockFile({ name: 'third.txt', content: 'Third' })
      ]

      const result = getFileContext(files)

      const firstIndex = result.indexOf('first.txt')
      const secondIndex = result.indexOf('second.txt')
      const thirdIndex = result.indexOf('third.txt')

      expect(firstIndex).toBeLessThan(secondIndex)
      expect(secondIndex).toBeLessThan(thirdIndex)
    })

    it('should handle large file sizes in metadata', () => {
      const files = [createMockFile({
        name: 'large.bin',
        content: 'Binary content',
        metadata: {
          fileSize: 1024 * 1024 * 10, // 10MB
          lastModified: Date.now()
        }
      })]

      const result = getFileContext(files)

      expect(result).toContain('<size>10485760</size>')
    })

    it('should format output with proper spacing and structure', () => {
      const files = [createMockFile()]

      const result = getFileContext(files)

      // Check for proper XML-like structure
      expect(result.trim()).toMatch(/^<files>[\s\S]*<\/files>$/)
      expect(result).toContain('\n  <files>\n')
      expect(result).toContain('    <file>')
      expect(result).toContain('    </file>')
      expect(result).toContain('  </files>')
    })
  })
})