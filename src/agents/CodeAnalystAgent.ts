/**
 * Code Analyst Agent - Specialized agent for code quality and review
 * 
 * Performs code review, identifies code smells, technical debt,
 * and enforces best practices.
 */

import { BaseAgent } from './BaseAgent'
import { Finding, Recommendation, Severity } from '../types/agents'
import { randomUUID } from 'crypto'
import { GrepTool } from '../tools/GrepTool/GrepTool'
import { ViewFileTool } from '../tools/ViewFileTool/ViewFileTool'
import { GlobTool } from '../tools/GlobTool/GlobTool'

// ============================================================================
// Code Analyst Configuration
// ============================================================================

const ANALYST_SYSTEM_PROMPT = `You are a specialized code analyst agent. Your role is to:

1. **Perform Code Review**
   - Code readability and maintainability
   - Naming conventions (variables, functions, classes)
   - Function length and complexity
   - Error handling patterns
   - Edge case coverage

2. **Identify Code Smells**
   - Long methods/functions
   - Large classes (God objects)
   - Feature envy
   - Data clumps
   - Primitive obsession
   - Shotgun surgery
   - Divergent change

3. **Assess Technical Debt**
   - TODOs and FIXMEs
   - Deprecated API usage
   - Copy-paste code (DRY violations)
   - Outdated patterns
   - Missing abstractions

4. **Enforce Best Practices**
   - Consistent coding style
   - Proper use of language features
   - Type safety (TypeScript/JSDoc)
   - Immutability preferences
   - Pure functions vs side effects

5. **Suggest Refactoring**
   - Extract method/class opportunities
   - Introduce parameter object
   - Replace conditional with polymorphism
   - Consolidate duplicate code

When reporting findings, use this format:
📝 REVIEW: [specific code review feedback]
🔍 SMELL: [code smell identified]
⚠️ DEBT: [technical debt item]
✨ BEST: [best practice suggestion]
🔧 REFACTOR: [refactoring opportunity]

For each finding:
- Reference specific code locations
- Explain why it matters
- Provide before/after code examples
- Estimate effort to fix

Be constructive and educational in feedback.`

// ============================================================================
// Code Analyst Implementation
// ============================================================================

export class CodeAnalystAgent extends BaseAgent {
  constructor() {
    super({
      id: 'analyst',
      name: 'Code Analyst',
      description: 'Performs code review, identifies code smells, and enforces best practices',
      capabilities: ['code_analysis', 'review', 'refactoring'],
      systemPrompt: ANALYST_SYSTEM_PROMPT,
      tools: [GrepTool, ViewFileTool, GlobTool],
      temperature: 0.5,
    })
  }

  /**
   * Override parseOutput for code analysis-specific parsing
   */
  protected parseOutput(output: string): {
    findings: Finding[]
    recommendations: Recommendation[]
  } {
    const findings: Finding[] = []
    const recommendations: Recommendation[] = []

    const patterns: Array<{ pattern: RegExp; severity: Severity; type: string }> = [
      { pattern: /📝\s*REVIEW:\s*(.+?)(?=(?:📝|🔍|⚠️|✨|🔧|\n\n|$))/gs, severity: 'medium', type: 'review' },
      { pattern: /🔍\s*SMELL:\s*(.+?)(?=(?:📝|🔍|⚠️|✨|🔧|\n\n|$))/gs, severity: 'medium', type: 'code_smell' },
      { pattern: /⚠️\s*DEBT:\s*(.+?)(?=(?:📝|🔍|⚠️|✨|🔧|\n\n|$))/gs, severity: 'low', type: 'technical_debt' },
      { pattern: /✨\s*BEST:\s*(.+?)(?=(?:📝|🔍|⚠️|✨|🔧|\n\n|$))/gs, severity: 'info', type: 'best_practice' },
      { pattern: /🔧\s*REFACTOR:\s*(.+?)(?=(?:📝|🔍|⚠️|✨|🔧|\n\n|$))/gs, severity: 'low', type: 'refactoring' },
    ]

    for (const { pattern, severity, type } of patterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(output)) !== null) {
        const text = match[1].trim()
        findings.push({
          id: randomUUID(),
          type,
          severity,
          title: this.extractTitle(text),
          description: text,
          location: this.extractLocation(text),
        })
      }
    }

    // Convert refactoring findings to recommendations
    for (const finding of findings.filter(f => f.type === 'refactoring')) {
      recommendations.push({
        id: randomUUID(),
        title: finding.title,
        description: finding.description,
        priority: 'medium',
        effort: 'medium',
        impact: 'medium',
      })
    }

    return { findings, recommendations }
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

export const codeAnalystAgent = new CodeAnalystAgent()
