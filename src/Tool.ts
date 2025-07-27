import { z } from 'zod'
import React from 'react'

// Validation result interface
export interface ValidationResult {
  result: boolean
  message: string
  meta?: any
}

// Tool interface that matches actual tool implementations
export interface Tool<TInput = any, TOutput = any> {
  name: string
  description?: string | (() => Promise<string>)
  inputSchema: z.ZodObject<any>
  inputJSONSchema?: Record<string, unknown>
  
  // Tool lifecycle methods
  isReadOnly: () => boolean
  isEnabled: () => Promise<boolean>
  needsPermissions?: (input: TInput) => boolean
  validateInput?: (input: TInput) => Promise<ValidationResult>
  
  // User-facing methods
  userFacingName: (input?: TInput) => string
  prompt: (options?: { dangerouslySkipPermissions?: boolean }) => Promise<string>
  
  // Tool execution
  call?: (input: TInput, context: ToolUseContext) => AsyncGenerator<any, any, any>
  
  // Rendering methods
  renderResultForAssistant: (data: TOutput) => string
  renderToolUseMessage: (input: TInput, options: { verbose: boolean }) => string
  renderToolUseRejectedMessage: (input?: TInput, options?: { columns?: number; verbose?: boolean }) => React.ReactNode
  renderToolResultMessage?: (data: TOutput, options: { verbose: boolean }) => React.ReactNode
}

// Tool factory helper for creating tools with standardized patterns
export class ToolFactory {
  static createTool(config: {
    name: string
    description?: string
    inputSchema: z.ZodObject<any>
    promptGenerator: (options?: { dangerouslySkipPermissions?: boolean }) => Promise<string>
    readOnlyMode?: boolean
    enabledCheck?: () => Promise<boolean>
    userFacingName?: string
  }): Tool {
    return {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      isReadOnly: () => config.readOnlyMode ?? false,
      isEnabled: config.enabledCheck ?? (() => Promise.resolve(true)),
      userFacingName: () => config.userFacingName ?? config.name,
      prompt: config.promptGenerator,
      renderResultForAssistant: (data) => String(data),
      renderToolUseMessage: () => '',
      renderToolUseRejectedMessage: () => React.createElement('div', {}, 'Tool use rejected'),
    }
  }
}

// Tool use context interface for execution environment
export interface ToolUseContext {
  abortController: AbortController
  messageId: string | undefined
  readFileTimestamps: { [key: string]: number }
  options: {
    tools: Tool[]
    maxThinkingTokens: number
    dangerouslySkipPermissions?: boolean
    slowAndCapableModel: string
    commands: any[]
    forkNumber: number
    messageLogName: string
    verbose: boolean
  }
}
