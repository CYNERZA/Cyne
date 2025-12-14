/**
 * Architect Agent - Specialized agent for system design and architecture analysis
 * 
 * Evaluates code architecture, design patterns, coupling/cohesion,
 * and provides scalability recommendations.
 */

import { BaseAgent } from './BaseAgent'
import { Finding, Recommendation, Severity } from '../types/agents'
import { randomUUID } from 'crypto'
import { GrepTool } from '../tools/GrepTool/GrepTool'
import { ViewFileTool } from '../tools/ViewFileTool/ViewFileTool'
import { GlobTool } from '../tools/GlobTool/GlobTool'
import { ListDirTool } from '../tools/ListDirTool/ListDirTool'

// ============================================================================
// Architect Agent Configuration
// ============================================================================

const ARCHITECT_SYSTEM_PROMPT = `You are a specialized software architect agent. Your role is to:

1. **Analyze System Architecture**
   - Layered architecture and separation of concerns
   - Module boundaries and dependencies
   - Data flow and control flow
   - Integration patterns

2. **Evaluate Design Patterns**
   - Identify patterns in use (Factory, Singleton, Observer, etc.)
   - Suggest appropriate patterns for problems
   - Identify anti-patterns and code smells
   - Recommend pattern improvements

3. **Assess Code Quality Metrics**
   - Coupling (afferent/efferent)
   - Cohesion (functional, communicational, etc.)
   - Abstraction levels
   - Instability metrics

4. **Provide Scalability Analysis**
   - Horizontal vs vertical scaling considerations
   - Stateless vs stateful components
   - Caching layer opportunities
   - Database scaling patterns

5. **Review SOLID Principles**
   - Single Responsibility
   - Open/Closed
   - Liskov Substitution
   - Interface Segregation
   - Dependency Inversion

When reporting findings, use this format:
🏗️ ARCHITECTURE: [description of architectural concern]
🔗 COUPLING: [description of coupling issues]
📦 COHESION: [description of cohesion issues]
🎯 PATTERN: [design pattern recommendation]
📈 SCALE: [scalability consideration]

For each finding:
- Explain the architectural impact
- Reference specific files/modules
- Suggest concrete improvements
- Consider migration complexity

Focus on strategic, high-impact architectural decisions.`

// ============================================================================
// Architect Agent Implementation
// ============================================================================

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super({
      id: 'architect',
      name: 'Architect Agent',
      description: 'Analyzes system architecture, design patterns, and provides scalability recommendations',
      capabilities: ['architecture'],
      systemPrompt: ARCHITECT_SYSTEM_PROMPT,
      tools: [GrepTool, ViewFileTool, GlobTool, ListDirTool],
      temperature: 0.5,
    })
  }

  /**
   * Override parseOutput for architecture-specific parsing
   */
  protected parseOutput(output: string): {
    findings: Finding[]
    recommendations: Recommendation[]
  } {
    const findings: Finding[] = []
    const recommendations: Recommendation[] = []

    const patterns: Array<{ pattern: RegExp; severity: Severity; type: string }> = [
      { pattern: /🏗️\s*ARCHITECTURE:\s*(.+?)(?=(?:🏗️|🔗|📦|🎯|📈|\n\n|$))/gs, severity: 'high', type: 'architecture' },
      { pattern: /🔗\s*COUPLING:\s*(.+?)(?=(?:🏗️|🔗|📦|🎯|📈|\n\n|$))/gs, severity: 'medium', type: 'coupling' },
      { pattern: /📦\s*COHESION:\s*(.+?)(?=(?:🏗️|🔗|📦|🎯|📈|\n\n|$))/gs, severity: 'medium', type: 'cohesion' },
      { pattern: /🎯\s*PATTERN:\s*(.+?)(?=(?:🏗️|🔗|📦|🎯|📈|\n\n|$))/gs, severity: 'low', type: 'pattern' },
      { pattern: /📈\s*SCALE:\s*(.+?)(?=(?:🏗️|🔗|📦|🎯|📈|\n\n|$))/gs, severity: 'info', type: 'scalability' },
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
        })
      }
    }

    // Convert pattern findings to recommendations
    for (const finding of findings.filter(f => f.type === 'pattern')) {
      recommendations.push({
        id: randomUUID(),
        title: finding.title,
        description: finding.description,
        priority: 'medium',
        effort: 'high',
        impact: 'high',
      })
    }

    return { findings, recommendations }
  }

  private extractTitle(text: string): string {
    const firstSentence = text.split(/[.!?\n]/)[0]
    return firstSentence.slice(0, 100)
  }
}

export const architectAgent = new ArchitectAgent()
