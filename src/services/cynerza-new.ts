import chalk from 'chalk'
import { createHash, randomUUID } from 'crypto'
import 'dotenv/config'

import { addToTotalCost } from '../cost-tracker'
import type { AssistantMessage, UserMessage } from '../query'
import { Tool } from '../Tool'
import {
  getOpenAIApiKey,
  getOrCreateUserID,
  getGlobalConfig,
  getActiveApiKey,
  markApiKeyAsFailed,
} from '../utils/config'
import { logError, SESSION_ID } from '../utils/log'
import { USER_AGENT } from '../utils/http'
import {
  createAssistantAPIErrorMessage,
  normalizeContentFromAPI,
} from '../utils/messages.js'
import { countTokens } from '../utils/tokens'
import { logEvent } from './statsig'
import { withVCR } from './vcr'
import { zodToJsonSchema } from 'zod-to-json-schema'
import OpenAI from 'openai'
import type { ChatCompletionStream } from 'openai/lib/ChatCompletionStream'
import { nanoid } from 'nanoid'
import { getCompletion } from './openai'
import { getReasoningEffort } from '../utils/thinking'

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

export const API_ERROR_MESSAGE_PREFIX = 'API Error'
export const NO_CONTENT_MESSAGE = 'Sorry, I cannot provide an answer to that.'
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
    throw new Error('OpenAI API key is required')
  }

  openaiClient = new OpenAI({
    apiKey,
    baseURL: config.openaiBaseUrl || 'https://api.openai.com/v1',
  })

  return openaiClient
}

/**
 * Reset the OpenAI client to force re-creation with new settings
 */
export function resetOpenAIClient(): void {
  openaiClient = null
}

// For backward compatibility with existing code
export const resetAnthropicClient = resetOpenAIClient

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
    id: randomUUID(),
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: message.content || '',
      },
    ],
    tool_calls: message.tool_calls?.map(call => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.function.name,
        arguments: call.function.arguments,
      },
    })) || [],
  }
}

/**
 * Main query function using OpenAI
 */
export async function* query(
  messages: (UserMessage | AssistantMessage)[],
  tools: Tool[] = [],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): AsyncGenerator<StreamResponse> {
  try {
    const client = getOpenAIClient()
    const config = getGlobalConfig()
    
    const model = options.model || config.primaryModel || 'gpt-4'
    const temperature = options.temperature ?? MAIN_QUERY_TEMPERATURE
    const maxTokens = options.maxTokens || 4096

    // Convert messages to OpenAI format
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(msg => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: Array.isArray(msg.content) 
            ? msg.content.map(block => 
                block.type === 'text' ? block.text : ''
              ).join('\n')
            : msg.content
        }
      } else {
        return {
          role: 'assistant',
          content: Array.isArray(msg.content)
            ? msg.content.map(block => 
                block.type === 'text' ? block.text : ''
              ).join('\n')
            : msg.content
        }
      }
    })

    // Convert tools to OpenAI format
    const openaiTools = tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.inputSchema)
      }
    }))

    const response = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    let fullResponse = ''
    let toolCalls: any[] = []

    for await (const chunk of response) {
      const choice = chunk.choices[0]
      if (choice?.delta?.content) {
        fullResponse += choice.delta.content
      }
      
      if (choice?.delta?.tool_calls) {
        toolCalls.push(...choice.delta.tool_calls)
      }

      // Yield the streaming response
      yield {
        id: chunk.id,
        object: chunk.object,
        created: chunk.created,
        model: chunk.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: fullResponse,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined
          },
          finish_reason: choice?.finish_reason || null
        }],
        usage: {
          prompt_tokens: 0, // OpenAI doesn't provide this in streaming
          completion_tokens: 0,
          total_tokens: 0
        }
      }
    }
  } catch (error) {
    logError(error)
    throw error
  }
}

// Simplified versions of the main query functions
export const queryHaiku = query
export const queryOpenAI = query
export const queryOpus = query

// Export for backward compatibility
export { query as main }
