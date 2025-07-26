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

export const MAIN_QUERY_TEMPERATURE = 0.2

// OpenAI client instance
let openaiClient: OpenAI | null = null

/**
 * Get the OpenAI client, creating it if it doesn't exist
 */
export function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient
  }

  const config = getGlobalConfig()
  const apiKey = getOpenAIApiKey()

  if (!apiKey) {
    throw new Error('OpenAI API key not found')
  }

  openaiClient = new OpenAI({
    apiKey,
    baseURL: config.largeModelBaseURL || 'https://api.openai.com/v1',
  })

  return openaiClient
}

/**
 * Reset the OpenAI client (force recreation on next use)
 */
export function resetOpenAIClient(): void {
  openaiClient = null
}

// For backward compatibility with existing code

// Simplified client management
export const resetOpenAIClientAlias = resetOpenAIClient

/**
 * Verify API key by making a simple request
 */
export async function verifyApiKey(): Promise<boolean> {
  try {
    const client = getOpenAIClient()
    await client.models.list()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Convert OpenAI message format to internal format
 */
function convertOpenAIToInternalFormat(message: OpenAI.Chat.Completions.ChatCompletionMessage): AssistantMessage {
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

/**
 * Main query function using OpenAI
 */
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
  try {
    const config = getGlobalConfig()
    const model = options.model || config.largeModelName || 'gpt-4'
    
    // Convert messages to OpenAI format
    const openaiMessages: any[] = messages.map(msg => {
      if (msg.type === 'assistant') {
        return {
          role: 'assistant',
          content: typeof msg.message.content === 'string' 
            ? msg.message.content 
            : Array.isArray(msg.message.content) && msg.message.content[0]?.type === 'text'
              ? msg.message.content[0].text
              : 'assistant message'
        }
      } else {
        return {
          role: 'user',
          content: typeof msg.message.content === 'string' 
            ? msg.message.content 
            : Array.isArray(msg.message.content) && msg.message.content[0]?.type === 'text'
              ? msg.message.content[0].text
              : 'user message'
        }
      }
    })

    // Add system prompt as first message
    if (systemPrompt.length > 0) {
      openaiMessages.unshift({
        role: 'system',
        content: systemPrompt.join('\n')
      })
    }

    // Convert tools to OpenAI format with proper cloning
    const openaiTools = tools.length > 0 ? tools.map(tool => {
      // Use the inputJSONSchema if available, otherwise convert from Zod schema
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
    }) : undefined

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

    // Convert the response to our expected format
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
      
      // Deduplicate tool calls based on function name and arguments
      const seenToolCalls = new Set<string>()
      
      for (const toolCall of toolCalls) {
        let parsedInput: any = {}
        try {
          // Try to parse the arguments JSON
          parsedInput = JSON.parse(toolCall.function.arguments || '{}')
        } catch (error) {
          // If parsing fails, use the raw arguments string
          console.log('Failed to parse tool arguments:', toolCall.function.arguments)
          parsedInput = { raw_arguments: toolCall.function.arguments }
        }
        
        // Create a unique key for deduplication
        const toolKey = `${toolCall.function.name}:${JSON.stringify(parsedInput)}`
        
        // Skip if we've already seen this exact tool call
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

  } catch (error) {
    logError(error)
    
    // Return an error message instead of throwing
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