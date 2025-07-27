import { randomUUID } from 'crypto'
import 'dotenv/config'
import { zodToJsonSchema } from 'zod-to-json-schema'

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
} from '../utils/config'
import { logError } from '../utils/log'
import OpenAI from 'openai'
import { getCompletion } from './openai'

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

  static getInstance(): AIClientManager {
    if (!AIClientManager.instance) {
      AIClientManager.instance = new AIClientManager()
    }
    return AIClientManager.instance
  }

  getClient(): OpenAI {
    if (this.openaiClient) {
      return this.openaiClient
    }

    const config = getGlobalConfig()
    const apiKey = getOpenAIApiKey()

    if (!apiKey) {
      throw new Error('OpenAI API key not found')
    }

    this.openaiClient = new OpenAI({
      apiKey,
      baseURL: config.largeModelBaseURL || 'https://api.openai.com/v1',
    })

    return this.openaiClient
  }

  resetClient(): void {
    this.openaiClient = null
  }

  async validateConnection(): Promise<boolean> {
    try {
      const client = this.getClient()
      await client.models.list()
      return true
    } catch (error) {
      return false
    }
  }
}

/**
 * Legacy function exports for backward compatibility
 */
export function getOpenAIClient(): OpenAI {
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
      const config = getGlobalConfig()
      const model = options.model || config.largeModelName || 'gpt-4'
      
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

      return this.processQueryResponse(result)

    } catch (error) {
      logError(error)
      return this.createErrorResponse(error)
    }
  }

  private transformToolsForOpenAI(tools: Tool[]): any[] | undefined {
    if (tools.length === 0) return undefined
    
    return tools.map(tool => {
      const safeParameters = tool.inputJSONSchema 
        ? JSON.parse(JSON.stringify(tool.inputJSONSchema))
        : zodToJsonSchema(tool.inputSchema)
      
      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description || '',
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