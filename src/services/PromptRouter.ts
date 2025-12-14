/**
 * Prompt Router - Intelligent prompt classification and routing
 * 
 * Routes prompts to the most appropriate specialized agent based on
 * intent detection, pattern matching, and contextual analysis.
 */

import { Agent, AgentCapability, Priority } from '../types/agents'

// ============================================================================
// Routing Types
// ============================================================================

export interface RoutingDecision {
  agentId: string
  confidence: number
  reasoning: string
  alternativeAgents: Array<{ agentId: string; confidence: number }>
}

export interface PromptAnalysis {
  intent: PromptIntent
  entities: Entity[]
  complexity: 'simple' | 'moderate' | 'complex'
  requiresMultipleAgents: boolean
  suggestedAgents: string[]
}

export type PromptIntent =
  | 'analyze'
  | 'generate'
  | 'fix'
  | 'refactor'
  | 'explain'
  | 'review'
  | 'optimize'
  | 'document'
  | 'test'
  | 'debug'
  | 'architect'
  | 'security_scan'
  | 'general'

export interface Entity {
  type: 'file' | 'function' | 'class' | 'variable' | 'dependency' | 'concept'
  value: string
  startIndex: number
  endIndex: number
}

// ============================================================================
// Routing Patterns
// ============================================================================

interface RoutingPattern {
  agentId: string
  capability: AgentCapability
  patterns: RegExp[]
  keywords: string[]
  priority: number // Higher = more specific
}

const ROUTING_PATTERNS: RoutingPattern[] = [
  // Security Agent
  {
    agentId: 'security',
    capability: 'security',
    priority: 90,
    patterns: [
      /\bsecur(?:e|ity)\b/i,
      /\bvulnerab(?:le|ility|ilities)\b/i,
      /\b(?:xss|csrf|sqli?|injection)\b/i,
      /\bowasp\b/i,
      /\b(?:attack|exploit|malicious)\b/i,
      /\b(?:secret|credential|password|api[_\s]?key)\b/i,
      /\b(?:auth(?:entication|orization)?|oauth|jwt|token)\b/i,
      /\b(?:encrypt|decrypt|hash|salt)\b/i,
      /\b(?:sanitiz|escap|validat)(?:e|ing|ion)\b/i,
    ],
    keywords: [
      'security', 'vulnerability', 'exploit', 'attack', 'injection',
      'xss', 'csrf', 'sql injection', 'authentication', 'authorization',
      'secrets', 'credentials', 'encryption', 'owasp', 'penetration',
    ],
  },

  // Performance Agent
  {
    agentId: 'performance',
    capability: 'performance',
    priority: 85,
    patterns: [
      /\bperformance\b/i,
      /\boptimiz(?:e|ation|ing)\b/i,
      /\b(?:slow|fast|speed)\b/i,
      /\b(?:memory|cpu|ram)\s*(?:usage|leak|consumption)\b/i,
      /\bbottleneck/i,
      /\b(?:profile|profiling|profiler)\b/i,
      /\b(?:cache|caching)\b/i,
      /\b(?:latency|throughput|benchmark)\b/i,
      /\bbig[_\s]?o\b/i,
      /\bcomplexity\b/i,
    ],
    keywords: [
      'performance', 'optimize', 'optimization', 'slow', 'fast', 'speed',
      'memory', 'cpu', 'bottleneck', 'profile', 'cache', 'latency',
      'throughput', 'benchmark', 'complexity', 'big o',
    ],
  },

  // Architecture Agent
  {
    agentId: 'architect',
    capability: 'architecture',
    priority: 80,
    patterns: [
      /\barchitect(?:ure|ural)?\b/i,
      /\bdesign\s*pattern/i,
      /\b(?:solid|dry|kiss)\s*principle/i,
      /\b(?:coupling|cohesion)\b/i,
      /\b(?:modular|monolith|microservice)/i,
      /\b(?:scalab(?:le|ility)|scale)\b/i,
      /\bsystem\s*design\b/i,
      /\b(?:layer|tier)(?:ed|ing)?\b/i,
      /\bdependency\s*(?:injection|inversion)\b/i,
      /\b(?:mvc|mvvm|clean\s*architecture)\b/i,
    ],
    keywords: [
      'architecture', 'design pattern', 'solid', 'coupling', 'cohesion',
      'modular', 'microservice', 'scalable', 'system design', 'layered',
      'dependency injection', 'clean architecture', 'hexagonal',
    ],
  },

  // Documentation Agent
  {
    agentId: 'documentation',
    capability: 'documentation',
    priority: 75,
    patterns: [
      /\bdocument(?:ation|ing|ed)?\b/i,
      /\bcomment(?:s|ed|ing)?\b/i,
      /\breadme\b/i,
      /\bchangelog\b/i,
      /\bapi\s*doc/i,
      /\bjsdoc\b/i,
      /\btypedoc\b/i,
      /\b(?:explain|describe)\s+(?:this|the)\s+code\b/i,
      /\bgenerate\s*(?:docs?|documentation)\b/i,
    ],
    keywords: [
      'document', 'documentation', 'comment', 'readme', 'changelog',
      'api doc', 'jsdoc', 'typedoc', 'explain code', 'describe',
    ],
  },

  // Code Analyst Agent
  {
    agentId: 'analyst',
    capability: 'code_analysis',
    priority: 70,
    patterns: [
      /\breview\b/i,
      /\banalyz(?:e|ing|is)\b/i,
      /\bquality\b/i,
      /\b(?:code|coding)\s*style\b/i,
      /\brefactor(?:ing)?\b/i,
      /\bclean\s*code\b/i,
      /\bbest\s*practice/i,
      /\b(?:lint|linting|eslint)\b/i,
      /\btechnical\s*debt\b/i,
      /\bcode\s*smell/i,
    ],
    keywords: [
      'review', 'analyze', 'quality', 'code style', 'refactor',
      'clean code', 'best practice', 'lint', 'technical debt', 'code smell',
    ],
  },

  // Testing Agent
  {
    agentId: 'testing',
    capability: 'testing',
    priority: 75,
    patterns: [
      /\btest(?:s|ing|ed)?\b/i,
      /\bunit\s*test/i,
      /\bintegration\s*test/i,
      /\be2e\b/i,
      /\bend[_\s]to[_\s]end\b/i,
      /\b(?:jest|mocha|vitest|cypress|playwright)\b/i,
      /\btest\s*coverage\b/i,
      /\bmock(?:s|ed|ing)?\b/i,
      /\bfixture/i,
    ],
    keywords: [
      'test', 'testing', 'unit test', 'integration test', 'e2e',
      'end to end', 'coverage', 'mock', 'fixture', 'jest', 'vitest',
    ],
  },

  // Debugging Agent
  {
    agentId: 'debugger',
    capability: 'debugging',
    priority: 85,
    patterns: [
      /\bdebug(?:ging|ger)?\b/i,
      /\b(?:fix|resolve)\s*(?:bug|issue|error|problem)\b/i,
      /\berror\b/i,
      /\bexception\b/i,
      /\bcrash(?:es|ing)?\b/i,
      /\bbreakpoint/i,
      /\bstack\s*trace\b/i,
      /\b(?:not|doesn't|won't|can't)\s*work/i,
      /\bbroken\b/i,
    ],
    keywords: [
      'debug', 'fix', 'bug', 'error', 'exception', 'crash',
      'breakpoint', 'stack trace', 'not working', 'broken', 'issue',
    ],
  },
]

// ============================================================================
// Intent Detection Patterns
// ============================================================================

const INTENT_PATTERNS: Array<{ intent: PromptIntent; patterns: RegExp[] }> = [
  {
    intent: 'analyze',
    patterns: [/\banalyz[ei]/i, /\bexamin[ei]/i, /\binspect/i, /\bcheck\b/i],
  },
  {
    intent: 'generate',
    patterns: [/\bgenerat[ei]/i, /\bcreate?\b/i, /\bwrite\b/i, /\bbuild\b/i, /\bmake\b/i],
  },
  {
    intent: 'fix',
    patterns: [/\bfix\b/i, /\bresolve\b/i, /\brepair\b/i, /\bcorrect\b/i],
  },
  {
    intent: 'refactor',
    patterns: [/\brefactor/i, /\brestructure/i, /\breorganiz/i, /\bclean\s*up/i],
  },
  {
    intent: 'explain',
    patterns: [/\bexplain/i, /\bunderstand/i, /\bwhat\s+(?:is|does|are)/i, /\bhow\s+does/i],
  },
  {
    intent: 'review',
    patterns: [/\breview/i, /\bevaluat[ei]/i, /\bassess/i, /\bcritiqu[ei]/i],
  },
  {
    intent: 'optimize',
    patterns: [/\boptimiz[ei]/i, /\bimprov[ei]/i, /\benhance/i, /\bspeed\s*up/i],
  },
  {
    intent: 'document',
    patterns: [/\bdocument/i, /\bcomment/i, /\bexplain\s+(?:this|the)\s+code/i],
  },
  {
    intent: 'test',
    patterns: [/\btest/i, /\bverify/i, /\bvalidat[ei]/i],
  },
  {
    intent: 'debug',
    patterns: [/\bdebug/i, /\bfix\s+(?:the\s+)?(?:bug|error|issue)/i, /\btroubleshoot/i],
  },
  {
    intent: 'architect',
    patterns: [/\barchitect/i, /\bdesign/i, /\bstructure/i, /\bplan/i],
  },
  {
    intent: 'security_scan',
    patterns: [/\bsecur/i, /\bvulnerab/i, /\baudit/i, /\bscan\s+for/i],
  },
]

// ============================================================================
// Prompt Router Class
// ============================================================================

export class PromptRouter {
  private agents: Map<string, Agent> = new Map()
  private routingPatterns: RoutingPattern[] = [...ROUTING_PATTERNS]

  /**
   * Register an agent with the router
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent)
  }

  /**
   * Add a custom routing pattern
   */
  addRoutingPattern(pattern: RoutingPattern): void {
    this.routingPatterns.push(pattern)
    // Sort by priority (higher first)
    this.routingPatterns.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Analyze a prompt to determine intent and entities
   */
  analyzePrompt(prompt: string): PromptAnalysis {
    const intent = this.detectIntent(prompt)
    const entities = this.extractEntities(prompt)
    const complexity = this.assessComplexity(prompt)
    const suggestedAgents = this.suggestAgents(prompt)
    const requiresMultipleAgents = this.requiresMultipleAgents(prompt, suggestedAgents)

    return {
      intent,
      entities,
      complexity,
      requiresMultipleAgents,
      suggestedAgents,
    }
  }

  /**
   * Route a prompt to the best agent
   */
  route(prompt: string): RoutingDecision {
    const analysis = this.analyzePrompt(prompt)
    const scores = this.calculateAgentScores(prompt, analysis)

    // Sort by score
    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])

    if (sortedScores.length === 0 || sortedScores[0][1] === 0) {
      // Default to analyst if no match
      return {
        agentId: 'analyst',
        confidence: 0.5,
        reasoning: 'No specific pattern matched, defaulting to general analysis',
        alternativeAgents: [],
      }
    }

    const [topAgentId, topScore] = sortedScores[0]
    const maxPossibleScore = 100

    return {
      agentId: topAgentId,
      confidence: topScore / maxPossibleScore,
      reasoning: this.generateReasoning(prompt, topAgentId, analysis),
      alternativeAgents: sortedScores.slice(1, 4).map(([agentId, score]) => ({
        agentId,
        confidence: score / maxPossibleScore,
      })),
    }
  }

  /**
   * Route to multiple agents for comprehensive analysis
   */
  routeToMultiple(prompt: string, maxAgents: number = 3): RoutingDecision[] {
    const analysis = this.analyzePrompt(prompt)
    const scores = this.calculateAgentScores(prompt, analysis)

    // Sort and take top N
    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxAgents)
      .filter(([_, score]) => score > 20) // Minimum threshold

    return sortedScores.map(([agentId, score]) => ({
      agentId,
      confidence: score / 100,
      reasoning: this.generateReasoning(prompt, agentId, analysis),
      alternativeAgents: [],
    }))
  }

  /**
   * Detect the primary intent of the prompt
   */
  private detectIntent(prompt: string): PromptIntent {
    for (const { intent, patterns } of INTENT_PATTERNS) {
      if (patterns.some(p => p.test(prompt))) {
        return intent
      }
    }
    return 'general'
  }

  /**
   * Extract entities from the prompt
   */
  private extractEntities(prompt: string): Entity[] {
    const entities: Entity[] = []

    // File patterns
    const filePattern = /(?:['"`])?([a-zA-Z0-9_\-\/]+\.[a-zA-Z]+)(?:['"`])?/g
    let match: RegExpExecArray | null
    while ((match = filePattern.exec(prompt)) !== null) {
      entities.push({
        type: 'file',
        value: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }

    // Function/method patterns
    const funcPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g
    while ((match = funcPattern.exec(prompt)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'function', 'class'].includes(match[1])) {
        entities.push({
          type: 'function',
          value: match[1],
          startIndex: match.index,
          endIndex: match.index + match[1].length,
        })
      }
    }

    // Class patterns (PascalCase)
    const classPattern = /\b([A-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)+)\b/g
    while ((match = classPattern.exec(prompt)) !== null) {
      entities.push({
        type: 'class',
        value: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }

    return entities
  }

  /**
   * Assess the complexity of the prompt
   */
  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = prompt.split(/\s+/).length
    const hasMultipleRequests = /\band\b|\balso\b|\badditionally\b/i.test(prompt)
    const hasConditionals = /\bif\b|\bwhen\b|\bunless\b/i.test(prompt)
    const hasCodeBlocks = /```/.test(prompt)

    if (wordCount > 100 || (hasMultipleRequests && hasConditionals) || hasCodeBlocks) {
      return 'complex'
    }
    if (wordCount > 30 || hasMultipleRequests || hasConditionals) {
      return 'moderate'
    }
    return 'simple'
  }

  /**
   * Suggest agents based on prompt content
   */
  private suggestAgents(prompt: string): string[] {
    const suggestions: string[] = []
    const lowerPrompt = prompt.toLowerCase()

    for (const pattern of this.routingPatterns) {
      // Check pattern matches
      const patternMatches = pattern.patterns.some(p => p.test(prompt))
      // Check keyword matches
      const keywordMatches = pattern.keywords.some(k => 
        lowerPrompt.includes(k.toLowerCase())
      )

      if (patternMatches || keywordMatches) {
        if (!suggestions.includes(pattern.agentId)) {
          suggestions.push(pattern.agentId)
        }
      }
    }

    return suggestions
  }

  /**
   * Determine if prompt requires multiple agents
   */
  private requiresMultipleAgents(prompt: string, suggestedAgents: string[]): boolean {
    // Multiple agents suggested
    if (suggestedAgents.length > 2) return true

    // Explicit multi-task patterns
    const multiTaskPatterns = [
      /\band\s+also\b/i,
      /\bfirst\b.*\bthen\b/i,
      /\bcomprehensive(?:ly)?\b/i,
      /\bfull\s+(?:analysis|review|audit)\b/i,
    ]

    return multiTaskPatterns.some(p => p.test(prompt))
  }

  /**
   * Calculate scores for each agent
   */
  private calculateAgentScores(prompt: string, analysis: PromptAnalysis): Map<string, number> {
    const scores = new Map<string, number>()
    const lowerPrompt = prompt.toLowerCase()

    for (const pattern of this.routingPatterns) {
      if (!this.agents.has(pattern.agentId)) continue

      let score = 0

      // Pattern matching (high weight)
      for (const p of pattern.patterns) {
        if (p.test(prompt)) {
          score += 20
        }
      }

      // Keyword matching (medium weight)
      for (const keyword of pattern.keywords) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          score += 10
        }
      }

      // Priority bonus
      score += pattern.priority / 10

      // Intent alignment bonus
      if (this.intentMatchesCapability(analysis.intent, pattern.capability)) {
        score += 15
      }

      if (score > 0) {
        const existing = scores.get(pattern.agentId) || 0
        scores.set(pattern.agentId, Math.max(existing, score))
      }
    }

    return scores
  }

  /**
   * Check if intent matches capability
   */
  private intentMatchesCapability(intent: PromptIntent, capability: AgentCapability): boolean {
    const mapping: Record<PromptIntent, AgentCapability[]> = {
      analyze: ['code_analysis', 'architecture'],
      generate: ['code_generation'],
      fix: ['debugging', 'code_analysis'],
      refactor: ['refactoring', 'code_analysis'],
      explain: ['documentation', 'code_analysis'],
      review: ['review', 'code_analysis'],
      optimize: ['performance'],
      document: ['documentation'],
      test: ['testing'],
      debug: ['debugging'],
      architect: ['architecture'],
      security_scan: ['security'],
      general: [],
    }

    return mapping[intent]?.includes(capability) || false
  }

  /**
   * Generate reasoning for routing decision
   */
  private generateReasoning(
    prompt: string,
    agentId: string,
    analysis: PromptAnalysis
  ): string {
    const pattern = this.routingPatterns.find(p => p.agentId === agentId)
    if (!pattern) {
      return `Defaulting to ${agentId} based on general analysis`
    }

    const matchedKeywords = pattern.keywords.filter(k =>
      prompt.toLowerCase().includes(k.toLowerCase())
    )

    const parts: string[] = []

    if (matchedKeywords.length > 0) {
      parts.push(`Matched keywords: ${matchedKeywords.slice(0, 3).join(', ')}`)
    }

    if (analysis.intent !== 'general') {
      parts.push(`Detected intent: ${analysis.intent}`)
    }

    parts.push(`Complexity: ${analysis.complexity}`)

    return parts.join('. ') + '.'
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let routerInstance: PromptRouter | null = null

export function getRouter(): PromptRouter {
  if (!routerInstance) {
    routerInstance = new PromptRouter()
  }
  return routerInstance
}

export function resetRouter(): void {
  routerInstance = null
}
