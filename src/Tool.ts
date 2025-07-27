import { z } from 'zod'

// Abstract base interface for tool execution
export interface ToolExecutionInterface {
  name: string
  description?: string
  inputSchema: z.ZodObject<any>
  inputJSONSchema?: Record<string, unknown>
}

// Enhanced tool capabilities interface
export interface ToolCapabilities {
  isReadOnly: () => boolean
  isEnabled: () => Promise<boolean>
  getPromptConfiguration: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
}

// Composite tool interface combining execution and capabilities
export interface Tool extends ToolExecutionInterface, ToolCapabilities {
  // Legacy compatibility wrapper for existing prompt method
  prompt: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
}

// Tool factory helper for creating tools with standardized patterns
export class ToolFactory {
  static createTool(config: {
    name: string
    description?: string
    inputSchema: z.ZodObject<any>
    promptGenerator: (options: { dangerouslySkipPermissions: boolean }) => Promise<string>
    readOnlyMode?: boolean
    enabledCheck?: () => Promise<boolean>
  }): Tool {
    return {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      isReadOnly: () => config.readOnlyMode ?? false,
      isEnabled: config.enabledCheck ?? (() => Promise.resolve(true)),
      getPromptConfiguration: config.promptGenerator,
      prompt: config.promptGenerator, // Legacy compatibility
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
