import { randomUUID } from 'crypto'
import 'dotenv/config'
import { zodToJsonSchema } from 'zod-to-json-schema'
import Anthropic from '@anthropic-ai/sdk'

// Error message constants for OpenAI
export const CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = 'Insufficient credits'
export const INVALID_API_KEY_ERROR_MESSAGE = 'Invalid API key'
export const PROMPT_TOO_LONG_ERROR_MESSAGE = 'Prompt too long'
export const API_ERROR_MESSAGE_PREFIX = 'API Error'
export const NO_CONTENT_MESSAGE = 'Sorry, I cannot provide an answer to that.'

import type { AssistantMessage, UserMessage } from '../query'
import { Tool } from '../Tool'
import {
  getOpenAIApiKey,
  getGlobalConfig,
  getActiveApiKey,
} from '../utils/config'
import { 
  getMemoryBaseURL, 
  hasMemoryCredentials 
} from '../utils/memoryConfig'
import { logError } from '../utils/log'
import OpenAI from 'openai'
import { getCompletion } from './openai'
import { BackendClient } from './backend'
import { AuthService } from './auth'
import { TelemetryClient } from './telemetry'

interface StreamResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  ttftMs?: number
}

export const MAIN_QUERY_TEMPERATURE = 1

/**
 * AI Client Configuration Manager
 * Handles OpenAI client lifecycle and connection management
 */
class AIClientManager {
  private static instance: AIClientManager | null = null
  private openaiClient: OpenAI | null = null
  private anthropicClient: Anthropic | null = null

  static getInstance(): AIClientManager {
    if (!AIClientManager.instance) {
      AIClientManager.instance = new AIClientManager()
    }
    return AIClientManager.instance
  }

  getClient(): OpenAI | Anthropic {
    const config = getGlobalConfig()
    
    // Use Anthropic SDK for Anthropic models
    if (config.primaryProvider === 'anthropic') {
      return this.getAnthropicClient()
    }
    
    // Use OpenAI SDK for everything else
    return this.getOpenAIClient()
  }

  private getOpenAIClient(): OpenAI {
    if (this.openaiClient) {
      return this.openaiClient
    }

    const config = getGlobalConfig()
    const apiKey = getActiveApiKey(config, 'large')

    if (!apiKey) {
      throw new Error('API key not found')
    }

    // Get base URL from memory config if available
    let defaultBaseURL = 'https://api.openai.com/v1'
    if (config.primaryProvider === 'gemini') {
      defaultBaseURL = 'https://generativelanguage.googleapis.com/v1beta/openai'
    }

    let baseURL = config.largeModelBaseURL || defaultBaseURL
    if (hasMemoryCredentials()) {
      const memoryBaseURL = getMemoryBaseURL()
      if (memoryBaseURL) {
        baseURL = memoryBaseURL
      }
    }

    this.openaiClient = new OpenAI({
      apiKey,
      baseURL,
    })

    return this.openaiClient
  }

  private getAnthropicClient(): Anthropic {
    if (this.anthropicClient) {
      return this.anthropicClient
    }

    const config = getGlobalConfig()
    const apiKey = getActiveApiKey(config, 'large')

    if (!apiKey) {
      throw new Error('API key not found')
    }

    // Get base URL from memory config if available
    let baseURL = config.largeModelBaseURL
    if (hasMemoryCredentials()) {
      const memoryBaseURL = getMemoryBaseURL()
      if (memoryBaseURL) {
        baseURL = memoryBaseURL
      }
    }

    this.anthropicClient = new Anthropic({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true, // Safe in Node.js environment
    })

    return this.anthropicClient
  }

  resetClient(): void {
    this.openaiClient = null
    this.anthropicClient = null
  }

  isAnthropicProvider(): boolean {
    const config = getGlobalConfig()
    return config.primaryProvider === 'anthropic'
  }

  async validateConnection(): Promise<boolean> {
    try {
      const config = getGlobalConfig()
      
      if (config.primaryProvider === 'anthropic') {
        // For Anthropic, just check that client can be created
        this.getAnthropicClient()
        return true
      } else {
        const client = this.getOpenAIClient()
        await client.models.list()
        return true
      }
    } catch (error) {
      return false
    }
  }
}

/**
 * Legacy function exports for backward compatibility
 */
export function getOpenAIClient(): OpenAI | Anthropic {
  return AIClientManager.getInstance().getClient()
}

export function resetOpenAIClient(): void {
  AIClientManager.getInstance().resetClient()
}

export const resetOpenAIClientAlias = resetOpenAIClient

export async function verifyApiKey(): Promise<boolean> {
  return AIClientManager.getInstance().validateConnection()
}

/**
 * Check if current provider is Anthropic
 */
export function isAnthropicProvider(): boolean {
  const config = getGlobalConfig()
  return config.primaryProvider === 'anthropic'
}

/**
 * Message Format Transformation Service
 * Handles conversion between internal and external message formats
 */
class MessageFormatService {
  static convertToInternalFormat(message: OpenAI.Chat.Completions.ChatCompletionMessage): AssistantMessage {
    return {
      uuid: randomUUID(),
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: message.content || '',
          },
        ],
      },
      costUSD: 0,
      durationMs: 0,
    }
  }

  static convertMessagesToOpenAI(messages: (UserMessage | AssistantMessage)[]): any[] {
    const openaiMessages: any[] = []
    
    for (const msg of messages) {
      if (msg.type === 'assistant') {
        const assistantMsg = this.transformAssistantMessage(msg)
        openaiMessages.push(assistantMsg)
      } else if (msg.type === 'user') {
        const userMessages = this.transformUserMessage(msg)
        openaiMessages.push(...userMessages)
      }
    }

    return openaiMessages
  }

  private static transformAssistantMessage(msg: AssistantMessage): any {
    const assistantMsg: any = {
      role: 'assistant',
      content: null
    }
    
    const content = msg.message.content
    if (typeof content === 'string') {
      assistantMsg.content = content
    } else if (Array.isArray(content)) {
      const textContent = content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n')
        .trim()
      
      const toolCalls = content
        .filter(block => block.type === 'tool_use')
        .map(block => ({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input)
          }
        }))
      
      assistantMsg.content = textContent || null
      if (toolCalls.length > 0) {
        assistantMsg.tool_calls = toolCalls
      }
    }
    
    return assistantMsg
  }

  private static transformUserMessage(msg: UserMessage): any[] {
    const content = msg.message.content
    
    if (typeof content === 'string') {
      return [{
        role: 'user',
        content: content
      }]
    }
    
    if (Array.isArray(content)) {
      const toolResults = content.filter(block => block.type === 'tool_result')
      
      if (toolResults.length > 0) {
        return toolResults.map(toolResult => ({
          role: 'tool',
          content: typeof toolResult.content === 'string' 
            ? toolResult.content 
            : JSON.stringify(toolResult.content),
          tool_call_id: toolResult.tool_use_id
        }))
      } else {
        const textContent = content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n')
          .trim()
        
        return [{
          role: 'user',
          content: textContent || 'user message'
        }]
      }
    }
    
    return []
  }
}

/**
 * AI Query Processing Service
 * Handles the main AI query execution with OpenAI integration
 */
class AIQueryService {
  private clientManager: AIClientManager
  private messageService: MessageFormatService

  constructor() {
    this.clientManager = AIClientManager.getInstance()
    this.messageService = new MessageFormatService()
  }

  async executeQuery(
    messages: (UserMessage | AssistantMessage)[],
    systemPrompt: string[],
    maxThinkingTokens: number,
    tools: Tool[],
    signal: AbortSignal,
    options: {
      dangerouslySkipPermissions: boolean
      model: string
      prependCLISysprompt: boolean
    },
  ): Promise<AssistantMessage> {
    try {
      // Check quota if authenticated
      if (AuthService.isAuthenticated()) {
        const quotaCheck = await BackendClient.checkQuota()
        if (!quotaCheck.can_send) {
          // Track quota limit event
          TelemetryClient.trackEvent('quota_limit_reached', {
            message: quotaCheck.message,
          })
          
          return {
            uuid: randomUUID(),
            type: 'assistant',
            message: {
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: `⚠️ ${quotaCheck.message}\n\nPlease try again later or upgrade your plan.`,
                },
              ],
            },
            costUSD: 0,
            durationMs: 0,
          } as AssistantMessage
        }
      }

      const config = getGlobalConfig()
      const model = options.model || config.largeModelName || 'gpt-4'
      
      // Route to appropriate SDK based on provider
      if (config.primaryProvider === 'anthropic') {
        return await this.executeAnthropicQuery(messages, systemPrompt, tools, model)
      }

      // Convert messages to OpenAI format
      const openaiMessages = MessageFormatService.convertMessagesToOpenAI(messages)

      // Add system prompt as first message
      if (systemPrompt.length > 0) {
        openaiMessages.unshift({
          role: 'system',
          content: systemPrompt.join('\n')
        })
      }

      // Convert tools to OpenAI format with proper cloning
      const openaiTools = this.transformToolsForOpenAI(tools)

      // Track LLM request
      TelemetryClient.trackEvent('llm_request', {
        provider: config.primaryProvider,
        model,
        tool_count: tools.length,
      })

      const result = await getCompletion(
        'large',
        {
          messages: openaiMessages,
          model,
          temperature: MAIN_QUERY_TEMPERATURE,
          max_tokens: 4096,
          tools: openaiTools,
        }
      )

      const response = this.processQueryResponse(result)

      // Increment usage counter if authenticated
      if (AuthService.isAuthenticated()) {
        BackendClient.incrementUsage().catch(err => {
          console.error('Failed to increment usage:', err)
          logError(err)
        })
      }

      return response

    } catch (error) {
      logError(error)
      
      // Track error
      TelemetryClient.trackEvent('llm_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      
      return this.createErrorResponse(error)
    }
  }

  private async executeAnthropicQuery(
    messages: (UserMessage | AssistantMessage)[],
    systemPrompt: string[],
    tools: Tool[],
    model: string,
  ): Promise<AssistantMessage> {
    const client = this.clientManager.getClient() as Anthropic
    
    // Convert messages to Anthropic format
    const anthropicMessages = this.convertToAnthropicMessages(messages)
    
    // Convert tools to Anthropic format
    const anthropicTools = tools.length > 0 ? this.transformToolsForAnthropic(tools) : undefined
    
    const config = getGlobalConfig()
    
    // Track LLM request
    TelemetryClient.trackEvent('llm_request', {
      provider: 'anthropic',
      model,
      tool_count: tools.length,
    })

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt.join('\n'),
      messages: anthropicMessages,
      tools: anthropicTools,
      temperature: MAIN_QUERY_TEMPERATURE,
    })

    // Convert Anthropic response to our internal format
    const content: any[] = []
    
    for (const block of response.content) {
      if (block.type === 'text') {
        content.push({
          type: 'text',
          text: block.text,
        })
      } else if (block.type === 'tool_use') {
        content.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        })
      }
    }

    return {
      uuid: randomUUID(),
      type: 'assistant',
      message: {
        role: 'assistant',
        content,
      },
      costUSD: 0,
      durationMs: 0,
    } as AssistantMessage
  }

  private convertToAnthropicMessages(messages: (UserMessage | AssistantMessage)[]): any[] {
    const anthropicMessages: any[] = []
    
    for (const msg of messages) {
      if (msg.type === 'assistant') {
        const content: any[] = []
        const msgContent = msg.message.content
        
        if (typeof msgContent === 'string') {
          content.push({ type: 'text', text: msgContent })
        } else if (Array.isArray(msgContent)) {
          for (const block of msgContent) {
            if (block.type === 'text') {
              content.push({ type: 'text', text: block.text })
            } else if (block.type === 'tool_use') {
              content.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input,
              })
            }
          }
        }
        
        anthropicMessages.push({
          role: 'assistant',
          content,
        })
      } else if (msg.type === 'user') {
        const content: any[] = []
        const msgContent = msg.message.content
        
        if (typeof msgContent === 'string') {
          content.push({ type: 'text', text: msgContent })
        } else if (Array.isArray(msgContent)) {
          for (const block of msgContent) {
            if (block.type === 'text') {
              content.push({ type: 'text', text: block.text })
            } else if (block.type === 'tool_result') {
              content.push({
                type: 'tool_result',
                tool_use_id: block.tool_use_id,
                content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
              })
            }
          }
        }
        
        anthropicMessages.push({
          role: 'user',
          content,
        })
      }
    }
    
    return anthropicMessages
  }

  private transformToolsForAnthropic(tools: Tool[]): any[] {
    return tools.map(tool => {
      const safeParameters = tool.inputJSONSchema 
        ? JSON.parse(JSON.stringify(tool.inputJSONSchema))
        : zodToJsonSchema(tool.inputSchema)
      
      return {
        name: tool.name,
        description: tool.description || '',
        input_schema: safeParameters,
      }
    })
  }

  private transformToolsForOpenAI(tools: Tool[]): any[] | undefined {
    if (tools.length === 0) return undefined
    
    return tools.map(tool => {
      const safeParameters = tool.inputJSONSchema 
        ? JSON.parse(JSON.stringify(tool.inputJSONSchema))
        : zodToJsonSchema(tool.inputSchema)
      
      // Ensure description is always a non-empty string
      const description = typeof tool.description === 'string' && tool.description.trim()
        ? tool.description 
        : `Tool: ${tool.name}`
      
      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description,
          parameters: safeParameters
        }
      }
    })
  }

  private processQueryResponse(result: any): AssistantMessage {
    let content: any[] = []
    
    if ('choices' in result && result.choices && result.choices[0]) {
      const choice = result.choices[0]
      
      // Extract content - handle null case for function calling
      const messageContent = choice.message?.content
      if (messageContent !== null && messageContent !== undefined && messageContent.trim()) {
        content.push({
          type: 'text',
          text: messageContent
        })
      }
      
      // Extract tool calls and convert to tool_use format
      const toolCalls = choice.message?.tool_calls || []
      content.push(...this.processToolCalls(toolCalls))
      
      // If we have no content at all, add a default message
      if (content.length === 0) {
        content.push({
          type: 'text',
          text: 'I understand your request.'
        })
      }
    } else {
      content.push({
        type: 'text',
        text: 'No response'
      })
    }

    return {
      uuid: randomUUID(),
      type: 'assistant',
      message: {
        role: 'assistant',
        content: content
      },
      costUSD: 0,
      durationMs: 0
    } as AssistantMessage
  }

  private processToolCalls(toolCalls: any[]): any[] {
    const content: any[] = []
    const seenToolCalls = new Set<string>()
    
    for (const toolCall of toolCalls) {
      let parsedInput: any = {}
      try {
        parsedInput = JSON.parse(toolCall.function.arguments || '{}')
      } catch (error) {
        console.log('Failed to parse tool arguments:', toolCall.function.arguments)
        parsedInput = { raw_arguments: toolCall.function.arguments }
      }
      
      // Create a unique key for deduplication
      const toolKey = `${toolCall.function.name}:${JSON.stringify(parsedInput)}`
      
      if (seenToolCalls.has(toolKey)) {
        continue
      }
      seenToolCalls.add(toolKey)
      
      const toolUse = {
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: parsedInput
      }
      content.push(toolUse)
    }
    
    return content
  }

  private createErrorResponse(error: any): AssistantMessage {
    return {
      uuid: randomUUID(),
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      },
      costUSD: 0,
      durationMs: 0
    } as AssistantMessage
  }
}

/**
 * Main query function exports for backward compatibility
 */
const aiQueryService = new AIQueryService()

export async function queryOpenAI(
  messages: (UserMessage | AssistantMessage)[],
  systemPrompt: string[],
  maxThinkingTokens: number,
  tools: Tool[],
  signal: AbortSignal,
  options: {
    dangerouslySkipPermissions: boolean
    model: string
    prependCLISysprompt: boolean
  },
): Promise<AssistantMessage> {
  return aiQueryService.executeQuery(messages, systemPrompt, maxThinkingTokens, tools, signal, options)
}

/**
 * Legacy query function for backward compatibility
 */
export async function* query(
  messages: (AssistantMessage | UserMessage)[],
  tools: Tool[] = [],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): AsyncGenerator<AssistantMessage> {
  try {
    const result = await queryOpenAI(
      messages,
      ['You are a helpful AI assistant.'],
      0,
      tools,
      new AbortController().signal,
      {
        dangerouslySkipPermissions: false,
        model: options.model || 'gpt-4',
        prependCLISysprompt: false
      }
    )
    yield result
  } catch (error) {
    yield {
      uuid: randomUUID(),
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      },
      costUSD: 0,
      durationMs: 0
    } as AssistantMessage
  }
}

// Simplified versions of the main query functions
export const queryHaiku = queryOpenAI
export const queryOpus = queryOpenAI

// Additional required exports
export function formatSystemPromptWithContext(
  systemPrompt: string[],
  context: { [k: string]: string },
): string[] {
  if (Object.entries(context).length === 0) {
    return systemPrompt
  }

  return [
    ...systemPrompt,
    `\nAs you answer the user's questions, you can use the following context:\n`,
    ...Object.entries(context).map(
      ([key, value]) => `<context name="${key}">${value}</context>`,
    ),
  ]
}

// Export for backward compatibility
export { queryOpenAI as main }