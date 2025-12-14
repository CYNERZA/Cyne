/**
 * Performance Agent - Specialized agent for performance analysis
 * 
 * Analyzes code for performance bottlenecks, memory issues,
 * algorithm complexity, and optimization opportunities.
 */

import { BaseAgent } from './BaseAgent'
import { Finding, Recommendation, Severity } from '../types/agents'
import { randomUUID } from 'crypto'
import { GrepTool } from '../tools/GrepTool/GrepTool'
import { ViewFileTool } from '../tools/ViewFileTool/ViewFileTool'
import { GlobTool } from '../tools/GlobTool/GlobTool'

// ============================================================================
// Performance Agent Configuration
// ============================================================================

const PERFORMANCE_SYSTEM_PROMPT = `You are a specialized performance analyst agent. Your role is to:

1. **Identify Performance Bottlenecks**
   - N+1 queries and database inefficiencies
   - Unnecessary re-renders and DOM operations
   - Blocking operations on main thread
   - Memory leaks and excessive allocations
   - Inefficient loops and iterations

2. **Analyze Algorithm Complexity**
   - Time complexity (Big O notation)
   - Space complexity
   - Suggest more efficient algorithms
   - Identify unnecessary computations

3. **Evaluate Resource Usage**
   - Memory consumption patterns
   - CPU-intensive operations
   - Network request optimization
   - Bundle size impact

4. **Recommend Optimizations**
   - Caching strategies
   - Lazy loading opportunities
   - Code splitting suggestions
   - Memoization candidates
   - Async/parallel processing

When reporting findings, use this format:
🐌 CRITICAL: [description] - severe performance impact
⚡ HIGH: [description] - noticeable performance degradation
📊 MEDIUM: [description] - optimization opportunity
💡 LOW: [description] - minor improvement possible

For each finding:
- Explain the performance impact
- Estimate severity (ms saved, memory reduced)
- Provide optimized code example when possible
- Consider tradeoffs (readability vs performance)

Focus on measurable, impactful optimizations.`

// ============================================================================
// Performance Agent Implementation
// ============================================================================

export class PerformanceAgent extends BaseAgent {
  constructor() {
    super({
      id: 'performance',
      name: 'Performance Agent',
      description: 'Analyzes code for performance bottlenecks and optimization opportunities',
      capabilities: ['performance'],
      systemPrompt: PERFORMANCE_SYSTEM_PROMPT,
      tools: [GrepTool, ViewFileTool, GlobTool],
      temperature: 0.4,
    })
  }

  /**
   * Override parseOutput for performance-specific parsing
   */
  protected parseOutput(output: string): {
    findings: Finding[]
    recommendations: Recommendation[]
  } {
    const findings: Finding[] = []
    const recommendations: Recommendation[] = []

    // Parse performance-specific finding patterns
    const patterns: Array<{ pattern: RegExp; severity: Severity }> = [
      { pattern: /🐌\s*CRITICAL:\s*(.+?)(?=(?:🐌|⚡|📊|💡|\n\n|$))/gs, severity: 'critical' },
      { pattern: /⚡\s*HIGH:\s*(.+?)(?=(?:🐌|⚡|📊|💡|\n\n|$))/gs, severity: 'high' },
      { pattern: /📊\s*MEDIUM:\s*(.+?)(?=(?:🐌|⚡|📊|💡|\n\n|$))/gs, severity: 'medium' },
      { pattern: /💡\s*LOW:\s*(.+?)(?=(?:🐌|⚡|📊|💡|\n\n|$))/gs, severity: 'low' },
    ]

    for (const { pattern, severity } of patterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(output)) !== null) {
        const text = match[1].trim()
        findings.push({
          id: randomUUID(),
          type: 'performance',
          severity,
          title: this.extractTitle(text),
          description: text,
          location: this.extractLocation(text),
        })
      }
    }

    // Extract optimization recommendations
    const recPatterns = [
      /(?:optimize|improve|cache|memoize):\s*(.+?)(?:\n|$)/gi,
      /(?:suggestion|recommendation):\s*(.+?)(?:\n|$)/gi,
    ]

    for (const pattern of recPatterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(output)) !== null) {
        recommendations.push({
          id: randomUUID(),
          title: match[1].slice(0, 100),
          description: match[1],
          priority: 'medium',
          effort: 'medium',
          impact: 'high',
        })
      }
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

  /**
   * Quick static analysis for common performance anti-patterns
   */
  static quickScan(code: string): Finding[] {
    const findings: Finding[] = []
    const antiPatterns = [
      { pattern: /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)/g, issue: 'Nested loops (O(n²) complexity)', severity: 'high' as Severity },
      { pattern: /\.forEach\([^)]+\)\s*[^;]*\.forEach/g, issue: 'Nested forEach (consider optimization)', severity: 'medium' as Severity },
      { pattern: /JSON\.parse\(JSON\.stringify/g, issue: 'Deep clone via JSON (slow for large objects)', severity: 'medium' as Severity },
      { pattern: /new Array\(\d{4,}\)/g, issue: 'Large array allocation', severity: 'low' as Severity },
      { pattern: /\.filter\([^)]+\)\.map\(/g, issue: 'Chained filter+map (consider reduce)', severity: 'low' as Severity },
      { pattern: /await\s+[^;]+await\s+[^;]+await/g, issue: 'Sequential awaits (consider Promise.all)', severity: 'medium' as Severity },
    ]

    for (const { pattern, issue, severity } of antiPatterns) {
      const matches = code.matchAll(pattern)
      for (const match of matches) {
        findings.push({
          id: randomUUID(),
          type: 'performance',
          severity,
          title: issue,
          description: `Found pattern: ${match[0].slice(0, 80)}...`,
          evidence: match[0],
        })
      }
    }

    return findings
  }
}

export const performanceAgent = new PerformanceAgent()
