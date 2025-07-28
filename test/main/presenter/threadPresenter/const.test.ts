import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, SEARCH_PROMPT_TEMPLATE, SEARCH_PROMPT_ARTIFACTS_TEMPLATE } from '../../../../src/main/presenter/threadPresenter/const'

describe('ThreadPresenter Constants', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have all required conversation settings', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        systemPrompt: '',
        temperature: 0.7,
        contextLength: 1000,
        maxTokens: 2000,
        providerId: 'deepseek',
        modelId: 'deepseek-chat',
        artifacts: 0
      })
    })

    it('should have reasonable default values', () => {
      expect(DEFAULT_SETTINGS.temperature).toBeGreaterThan(0)
      expect(DEFAULT_SETTINGS.temperature).toBeLessThanOrEqual(2)
      expect(DEFAULT_SETTINGS.contextLength).toBeGreaterThan(0)
      expect(DEFAULT_SETTINGS.maxTokens).toBeGreaterThan(0)
      expect(DEFAULT_SETTINGS.artifacts).toBe(0) // Disabled by default
    })

    it('should use sensible provider and model defaults', () => {
      expect(DEFAULT_SETTINGS.providerId).toBe('deepseek')
      expect(DEFAULT_SETTINGS.modelId).toBe('deepseek-chat')
    })
  })

  describe('SEARCH_PROMPT_TEMPLATE', () => {
    it('should contain required placeholders', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toContain('{{SEARCH_RESULTS}}')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('{{USER_QUERY}}')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('{{CUR_DATE}}')
    })

    it('should provide comprehensive search instructions', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toContain('search results')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('citation')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('[X]')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('webpage')
    })

    it('should include formatting guidelines', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toContain('markdown')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('LaTeX')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('code blocks')
    })

    it('should specify citation requirements', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toContain('footnote citations')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('[1][2]')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('Do not include any URLs')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('only include citations with numbers')
    })

    it('should include quality guidelines', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toContain('100 words')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('2 paragraphs')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('synthesize multiple relevant web pages')
    })

    it('should handle edge cases', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toContain('no search results are provided')
      expect(SEARCH_PROMPT_TEMPLATE).toContain('Do not invent or hallucinate references')
    })
  })

  describe('SEARCH_PROMPT_ARTIFACTS_TEMPLATE', () => {
    it('should contain all standard search template elements', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('{{SEARCH_RESULTS}}')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('{{USER_QUERY}}')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('{{CUR_DATE}}')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('citation')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('[X]')
    })

    it('should include artifacts-specific instructions', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('REQUIRED ARTIFACT USE CASES')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('YOU MUST USE ARTIFACTS FOR THESE')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('HOW TO CREATE ARTIFACTS')
    })

    it('should specify when to use artifacts', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('Reports and documents')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('Complete code implementations')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('Structured content')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('longer than 300 words')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('>15 lines')
    })

    it('should specify artifact types', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('markdown:')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('code:')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('HTML:')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('SVG:')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('mermaid:')
    })

    it('should include content placement rules', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('ENTIRE content within the artifact')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('do not split content')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('DO NOT fragment content')
    })

    it('should specify when NOT to use artifacts', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('DO NOT use artifacts for')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('Simple explanations')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('less than 300 words')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('Short code snippets')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('<15 lines')
    })

    it('should maintain citation requirements within artifacts', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('Still include citations [X]')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('when referencing search results within artifacts')
    })
  })

  describe('Template Consistency', () => {
    it('should have consistent citation format across templates', () => {
      const citationRegex = /\[X\]|\[\d+\]|\[1\]\[2\]/g
      
      const standardCitations = SEARCH_PROMPT_TEMPLATE.match(citationRegex) || []
      const artifactsCitations = SEARCH_PROMPT_ARTIFACTS_TEMPLATE.match(citationRegex) || []
      
      expect(standardCitations.length).toBeGreaterThan(0)
      expect(artifactsCitations.length).toBeGreaterThan(0)
      
      // Both should mention the same citation format
      expect(SEARCH_PROMPT_TEMPLATE).toContain('[1][2]')
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('[1][2]')
    })

    it('should have consistent content quality requirements', () => {
      const qualityKeywords = ['100 words', 'markdown', 'LaTeX', 'code blocks']
      
      qualityKeywords.forEach(keyword => {
        expect(SEARCH_PROMPT_TEMPLATE).toContain(keyword)
        expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain(keyword)
      })
    })

    it('should have consistent placeholder usage', () => {
      const placeholders = ['{{SEARCH_RESULTS}}', '{{USER_QUERY}}', '{{CUR_DATE}}']
      
      placeholders.forEach(placeholder => {
        expect(SEARCH_PROMPT_TEMPLATE).toContain(placeholder)
        expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain(placeholder)
      })
    })
  })

  describe('Template Structure', () => {
    it('should have proper template structure for standard search', () => {
      expect(SEARCH_PROMPT_TEMPLATE).toMatch(/^#.*search results.*{{SEARCH_RESULTS}}/s)
      expect(SEARCH_PROMPT_TEMPLATE).toMatch(/user's message.*{{USER_QUERY}}$/s)
    })

    it('should have proper template structure for artifacts search', () => {
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toMatch(/^#.*search results.*{{SEARCH_RESULTS}}/s)
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toMatch(/user's message.*{{USER_QUERY}}$/s)
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).toContain('# Artifacts Support - MANDATORY')
    })

    it('should have reasonable template lengths', () => {
      // Templates should be comprehensive but not overly verbose
      expect(SEARCH_PROMPT_TEMPLATE.length).toBeGreaterThan(1000)
      expect(SEARCH_PROMPT_TEMPLATE.length).toBeLessThan(5000)
      
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE.length).toBeGreaterThan(2000)
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE.length).toBeLessThan(8000)
    })
  })

  describe('Template Validation', () => {
    it('should not contain unmatched template brackets', () => {
      const unmatched = /\{\{[^}]*\}\}(?!\})|(?<!\{)\{\{[^}]*\}/g
      
      // Check for properly formatted placeholders only
      const standardMatches = SEARCH_PROMPT_TEMPLATE.match(/\{\{[A-Z_]+\}\}/g) || []
      const artifactsMatches = SEARCH_PROMPT_ARTIFACTS_TEMPLATE.match(/\{\{[A-Z_]+\}\}/g) || []
      
      expect(standardMatches.length).toBe(3) // Should have exactly 3 placeholders
      expect(artifactsMatches.length).toBe(3) // Should have exactly 3 placeholders
    })

    it('should not contain HTML tags that could cause XSS', () => {
      const dangerousTags = /<script|<iframe|<object|<embed|javascript:/gi
      
      expect(SEARCH_PROMPT_TEMPLATE).not.toMatch(dangerousTags)
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).not.toMatch(dangerousTags)
    })

    it('should have consistent indentation and formatting', () => {
      // Check that templates don't have excessive whitespace or inconsistent formatting
      expect(SEARCH_PROMPT_TEMPLATE).not.toMatch(/\n\s{10,}/) // No excessive indentation
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).not.toMatch(/\n\s{10,}/)
      
      // Should not have multiple consecutive empty lines
      expect(SEARCH_PROMPT_TEMPLATE).not.toMatch(/\n\s*\n\s*\n\s*\n/)
      expect(SEARCH_PROMPT_ARTIFACTS_TEMPLATE).not.toMatch(/\n\s*\n\s*\n\s*\n/)
    })
  })
})