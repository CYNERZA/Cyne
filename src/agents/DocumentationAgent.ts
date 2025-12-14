/**
 * Documentation Agent - Specialized agent for documentation and commenting
 * 
 * Generates documentation, analyzes comment quality, creates README files,
 * and produces API documentation.
 */

import { BaseAgent } from './BaseAgent'
import { Finding, Recommendation, Artifact } from '../types/agents'
import { randomUUID } from 'crypto'
import { GrepTool } from '../tools/GrepTool/GrepTool'
import { ViewFileTool } from '../tools/ViewFileTool/ViewFileTool'
import { GlobTool } from '../tools/GlobTool/GlobTool'

// ============================================================================
// Documentation Agent Configuration
// ============================================================================

const DOCUMENTATION_SYSTEM_PROMPT = `You are a specialized documentation agent. Your role is to:

1. **Analyze Documentation Quality**
   - Function/method documentation completeness
   - Parameter and return type documentation
   - Example usage in comments
   - Module-level documentation

2. **Generate Documentation**
   - JSDoc/TSDoc comments for functions
   - Class and interface documentation
   - Module overview documentation
   - Inline explanatory comments

3. **Create README Content**
   - Project overview sections
   - Installation instructions
   - Usage examples
   - API reference sections
   - Contributing guidelines

4. **Produce API Documentation**
   - Endpoint documentation
   - Request/response schemas
   - Authentication requirements
   - Rate limiting information

5. **Write Changelogs**
   - Version history entries
   - Breaking changes documentation
   - Migration guides
   - Release notes

When documenting code, follow these guidelines:
- Be concise but complete
- Focus on the "why" not just the "what"
- Include examples for complex code
- Document edge cases and exceptions
- Use consistent formatting

Output format for documentation:
📄 MISSING: [undocumented item]
✏️ IMPROVE: [documentation improvement]
📚 GENERATE: [generated documentation]

For generated documentation, provide ready-to-use content.`

// ============================================================================
// Documentation Agent Implementation
// ============================================================================

export class DocumentationAgent extends BaseAgent {
  constructor() {
    super({
      id: 'documentation',
      name: 'Documentation Agent',
      description: 'Analyzes and generates code documentation, README files, and API docs',
      capabilities: ['documentation'],
      systemPrompt: DOCUMENTATION_SYSTEM_PROMPT,
      tools: [GrepTool, ViewFileTool, GlobTool],
      temperature: 0.6,
    })
  }

  /**
   * Override parseOutput for documentation-specific parsing
   */
  protected parseOutput(output: string): {
    findings: Finding[]
    recommendations: Recommendation[]
  } {
    const findings: Finding[] = []
    const recommendations: Recommendation[] = []

    const patterns: Array<{ pattern: RegExp; type: string }> = [
      { pattern: /📄\s*MISSING:\s*(.+?)(?=(?:📄|✏️|📚|\n\n|$))/gs, type: 'missing_docs' },
      { pattern: /✏️\s*IMPROVE:\s*(.+?)(?=(?:📄|✏️|📚|\n\n|$))/gs, type: 'improve_docs' },
    ]

    for (const { pattern, type } of patterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(output)) !== null) {
        const text = match[1].trim()
        findings.push({
          id: randomUUID(),
          type,
          severity: type === 'missing_docs' ? 'medium' : 'low',
          title: this.extractTitle(text),
          description: text,
          location: this.extractLocation(text),
        })
      }
    }

    // Extract generated documentation as recommendations
    const generatePattern = /📚\s*GENERATE:\s*(.+?)(?=(?:📄|✏️|📚|\n\n```|$))/gs
    let match: RegExpExecArray | null
    while ((match = generatePattern.exec(output)) !== null) {
      recommendations.push({
        id: randomUUID(),
        title: 'Generated documentation',
        description: match[1].trim(),
        priority: 'low',
        effort: 'low',
        impact: 'medium',
        implementation: match[1].trim(),
      })
    }

    return { findings, recommendations }
  }

  /**
   * Extract documentation artifacts from output
   */
  extractArtifacts(output: string): Artifact[] {
    const artifacts: Artifact[] = []

    // Look for code blocks that represent generated documentation
    const codeBlockPattern = /```(?:typescript|javascript|jsdoc|markdown|md)?\n([\s\S]*?)```/g
    let match: RegExpExecArray | null
    
    while ((match = codeBlockPattern.exec(output)) !== null) {
      const content = match[1].trim()
      
      // Detect artifact type
      let type: Artifact['type'] = 'documentation'
      let name = 'generated_docs'
      
      if (content.includes('# ') || content.includes('## ')) {
        type = 'documentation'
        name = 'README.md'
      } else if (content.startsWith('/**') || content.startsWith('/*')) {
        type = 'code'
        name = 'jsdoc_comments'
      }

      artifacts.push({
        id: randomUUID(),
        type,
        name,
        content,
      })
    }

    return artifacts
  }

  private extractTitle(text: string): string {
    const firstSentence = text.split(/[.!?\n]/)[0]
    return firstSentence.slice(0, 100)
  }

  private extractLocation(text: string): Finding['location'] | undefined {
    const locationPattern = /([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)(?::|\s+line\s+)(\d+)/i
    const match = locationPattern.exec(text)
    
    if (match) {
      return {
        file: match[1],
        startLine: parseInt(match[2], 10),
        endLine: parseInt(match[2], 10),
      }
    }
    
    return undefined
  }
}

export const documentationAgent = new DocumentationAgent()
