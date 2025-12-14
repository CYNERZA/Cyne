/**
 * Base Agent - Abstract base class for specialized agents
 * 
 * Provides common functionality and interface for all specialized agents
 * in the Cyne multi-agent system.
 */

import { randomUUID, UUID } from 'crypto'
import { Tool } from '../Tool'
import {
  Agent,
  AgentCapability,
  AgentResult,
  AgentTask,
  Finding,
  Priority,
  Recommendation,
  Severity,
  TaskContext,
} from '../types/agents'
import { query, AssistantMessage, Message } from '../query'
import { createUserMessage, normalizeMessages } from '../utils/messages'
import { getContext } from '../context'
import { hasPermissionsToUseTool } from '../permissions'

// ============================================================================
// Base Agent Configuration
// ============================================================================

export interface AgentConfig {
  id: string
  name: string
  description: string
  capabilities: AgentCapability[]
  systemPrompt: string
  tools?: Tool[]
  maxTokens?: number
  temperature?: number
  defaultPriority?: Priority
}

// ============================================================================
// Abstract Base Agent Class
// ============================================================================

export abstract class BaseAgent implements Agent {
  id: string
  name: string
  description: string
  capabilities: AgentCapability[]
  systemPrompt: string
  tools: Tool[]
  maxConcurrentTasks: number = 1
  defaultPriority: Priority

  protected maxTokens: number
  protected temperature: number

  constructor(config: AgentConfig) {
    this.id = config.id
    this.name = config.name
    this.description = config.description
    this.capabilities = config.capabilities
    this.systemPrompt = config.systemPrompt
    this.tools = config.tools || []
    this.maxTokens = config.maxTokens || 4096
    this.temperature = config.temperature || 0.7
    this.defaultPriority = config.defaultPriority || 'medium'
  }

  /**
   * Execute a task with this agent
   */
  async *execute(
    input: string,
    context?: TaskContext,
    abortController?: AbortController
  ): AsyncGenerator<{ progress: number; message?: string }, AgentResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    let toolCalls = 0

    try {
      // Prepare messages
      const userMessage = createUserMessage(this.buildPrompt(input, context))
      const messages: Message[] = [userMessage]

      // Build system prompt
      const systemPrompts = [this.systemPrompt, this.getAdditionalSystemPrompt(context)]
        .filter(Boolean) as string[]

      yield { progress: 10, message: 'Initializing analysis...' }

      // Get context
      const generalContext = await getContext()

      yield { progress: 20, message: 'Processing request...' }

      // Execute query
      const findings: Finding[] = []
      const recommendations: Recommendation[] = []
      let outputText = ''
      let lastMessage: AssistantMessage | null = null

      for await (const message of query(
        messages,
        systemPrompts,
        generalContext,
        hasPermissionsToUseTool,
        {
          abortController: abortController || new AbortController(),
          options: {
            dangerouslySkipPermissions: false,
            tools: this.tools,
            commands: [],
            verbose: false,
          },
          readFileTimestamps: new Map(),
        }
      )) {
        messages.push(message)

        if (message.type === 'assistant') {
          lastMessage = message
          tokensUsed += message.message.usage?.output_tokens || 0

          // Extract text content
          for (const content of message.message.content) {
            if (content.type === 'text') {
              outputText += content.text
            } else if (content.type === 'tool_use') {
              toolCalls++
            }
          }

          yield { progress: 50, message: 'Analyzing results...' }
        }
      }

      yield { progress: 80, message: 'Extracting findings...' }

      // Parse findings and recommendations from output
      const parsed = this.parseOutput(outputText)
      findings.push(...parsed.findings)
      recommendations.push(...parsed.recommendations)

      yield { progress: 100, message: 'Complete' }

      return {
        success: true,
        output: outputText,
        findings,
        recommendations,
        metrics: {
          durationMs: Date.now() - startTime,
          tokensUsed,
          toolCalls,
          retries: 0,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        metrics: {
          durationMs: Date.now() - startTime,
          tokensUsed,
          toolCalls,
          retries: 0,
        },
      }
    }
  }

  /**
   * Build the prompt with context
   */
  protected buildPrompt(input: string, context?: TaskContext): string {
    let prompt = input

    if (context?.activeFiles?.length) {
      prompt += `\n\nActive files in context:\n${context.activeFiles.join('\n')}`
    }

    if (context?.recentChanges?.length) {
      prompt += `\n\nRecent changes:\n${context.recentChanges.join('\n')}`
    }

    return prompt
  }

  /**
   * Get additional system prompt based on context
   */
  protected getAdditionalSystemPrompt(context?: TaskContext): string | undefined {
    return undefined
  }

  /**
   * Parse output to extract findings and recommendations
   * Subclasses can override for specialized parsing
   */
  protected parseOutput(output: string): {
    findings: Finding[]
    recommendations: Recommendation[]
  } {
    const findings: Finding[] = []
    const recommendations: Recommendation[] = []

    // Look for structured finding patterns
    const findingPatterns = [
      /(?:finding|issue|problem|bug|vulnerability):\s*(.+?)(?:\n|$)/gi,
      /(?:⚠️|❌|🔴|🟡|🟠)\s*(.+?)(?:\n|$)/g,
    ]

    for (const pattern of findingPatterns) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(output)) !== null) {
        findings.push({
          id: randomUUID(),
          type: this.id,
          severity: this.detectSeverity(match[1]),
          title: match[1].slice(0, 100),
          description: match[1],
        })
      }
    }

    // Look for recommendation patterns
    const recPatterns = [
      /(?:recommend|suggest|should|consider):\s*(.+?)(?:\n|$)/gi,
      /(?:💡|✅|🔧|📝)\s*(.+?)(?:\n|$)/g,
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
          impact: 'medium',
        })
      }
    }

    return { findings, recommendations }
  }

  /**
   * Detect severity from text
   */
  protected detectSeverity(text: string): Severity {
    const lowerText = text.toLowerCase()
    if (/critical|severe|urgent|danger/i.test(lowerText)) return 'critical'
    if (/high|important|major/i.test(lowerText)) return 'high'
    if (/medium|moderate/i.test(lowerText)) return 'medium'
    if (/low|minor/i.test(lowerText)) return 'low'
    return 'info'
  }
}
