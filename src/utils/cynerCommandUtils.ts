/**
 * Alternative Implementation: Cyne Command System Utilities
 * This module demonstrates alternative patterns for command handling
 * while preserving the same functionality as the original implementations
 */

import { Command } from '../commands'

/**
 * Alternative Implementation: Command Registry Manager
 * Different approach to managing and executing commands
 */
export class CynerCommandRegistryManager {
  private static instance: CynerCommandRegistryManager
  private commands: Map<string, Command> = new Map()
  private commandAliases: Map<string, string> = new Map()
  private commandCategories: Map<string, string[]> = new Map()

  private constructor() {}

  static getInstance(): CynerCommandRegistryManager {
    if (!CynerCommandRegistryManager.instance) {
      CynerCommandRegistryManager.instance = new CynerCommandRegistryManager()
    }
    return CynerCommandRegistryManager.instance
  }

  registerCommand(command: Command): void {
    this.commands.set(command.name, command)
    
    // Auto-categorize commands
    const category = this.determineCommandCategory(command)
    if (!this.commandCategories.has(category)) {
      this.commandCategories.set(category, [])
    }
    this.commandCategories.get(category)!.push(command.name)
  }

  registerCommandAlias(alias: string, commandName: string): void {
    this.commandAliases.set(alias, commandName)
  }

  getCommand(nameOrAlias: string): Command | undefined {
    // Check direct name first
    let command = this.commands.get(nameOrAlias)
    if (command) return command

    // Check aliases
    const actualName = this.commandAliases.get(nameOrAlias)
    if (actualName) {
      return this.commands.get(actualName)
    }

    return undefined
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values())
  }

  getCommandsByCategory(category: string): Command[] {
    const commandNames = this.commandCategories.get(category) || []
    return commandNames
      .map(name => this.commands.get(name))
      .filter((cmd): cmd is Command => cmd !== undefined)
  }

  getAvailableCategories(): string[] {
    return Array.from(this.commandCategories.keys())
  }

  isCommandAvailable(nameOrAlias: string): boolean {
    return this.getCommand(nameOrAlias) !== undefined
  }

  private determineCommandCategory(command: Command): string {
    // Alternative implementation: Smart categorization
    const name = command.name.toLowerCase()
    const description = command.description.toLowerCase()

    if (name.includes('config') || description.includes('configuration')) {
      return 'configuration'
    }
    if (name.includes('mcp') || description.includes('mcp')) {
      return 'mcp'
    }
    if (name.includes('help') || name.includes('doctor') || description.includes('help')) {
      return 'utility'
    }
    if (name.includes('cost') || description.includes('cost')) {
      return 'monitoring'
    }
    if (name.includes('clear') || name.includes('reset')) {
      return 'session'
    }
    
    return 'general'
  }

  searchCommands(query: string): Command[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllCommands().filter(command => 
      command.name.toLowerCase().includes(lowerQuery) ||
      command.description.toLowerCase().includes(lowerQuery)
    )
  }

  clearRegistry(): void {
    this.commands.clear()
    this.commandAliases.clear()
    this.commandCategories.clear()
  }
}

/**
 * Alternative Implementation: Command Execution Context
 * Different approach to command execution tracking
 */
export class CynerCommandExecutionContext {
  private executionHistory: Array<CynerCommandExecution> = []
  private currentExecution: CynerCommandExecution | null = null
  private maxHistorySize: number = 100

  startExecution(command: Command, args: any[] = []): string {
    const execution: CynerCommandExecution = {
      id: this.generateExecutionId(),
      command,
      args,
      startTime: new Date(),
      status: 'running'
    }

    this.currentExecution = execution
    this.addToHistory(execution)
    
    return execution.id
  }

  completeExecution(executionId: string, result?: any): void {
    const execution = this.findExecution(executionId)
    if (execution) {
      execution.status = 'completed'
      execution.endTime = new Date()
      execution.result = result
      
      if (this.currentExecution?.id === executionId) {
        this.currentExecution = null
      }
    }
  }

  failExecution(executionId: string, error: Error): void {
    const execution = this.findExecution(executionId)
    if (execution) {
      execution.status = 'failed'
      execution.endTime = new Date()
      execution.error = error
      
      if (this.currentExecution?.id === executionId) {
        this.currentExecution = null
      }
    }
  }

  getCurrentExecution(): CynerCommandExecution | null {
    return this.currentExecution
  }

  getExecutionHistory(): CynerCommandExecution[] {
    return [...this.executionHistory]
  }

  getExecutionById(id: string): CynerCommandExecution | undefined {
    return this.findExecution(id)
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private findExecution(id: string): CynerCommandExecution | undefined {
    return this.executionHistory.find(exec => exec.id === id)
  }

  private addToHistory(execution: CynerCommandExecution): void {
    this.executionHistory.push(execution)
    
    // Maintain max history size
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift()
    }
  }

  clearHistory(): void {
    this.executionHistory = []
    this.currentExecution = null
  }
}

/**
 * Alternative Implementation: Command Execution Interface
 * Enhanced execution tracking data structure
 */
export interface CynerCommandExecution {
  id: string
  command: Command
  args: any[]
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed'
  result?: any
  error?: Error
}

/**
 * Alternative Implementation: Command Validator
 * Different approach to command validation and permission checking
 */
export class CynerCommandValidator {
  private permissionCheckers: Map<string, (command: Command, args: any[]) => boolean> = new Map()
  private validationRules: Map<string, (command: Command, args: any[]) => string | null> = new Map()

  registerPermissionChecker(commandName: string, checker: (command: Command, args: any[]) => boolean): void {
    this.permissionCheckers.set(commandName, checker)
  }

  registerValidationRule(ruleName: string, validator: (command: Command, args: any[]) => string | null): void {
    this.validationRules.set(ruleName, validator)
  }

  validateCommand(command: Command, args: any[] = []): CynerCommandValidationResult {
    const result: CynerCommandValidationResult = {
      isValid: true,
      hasPermission: true,
      errors: [],
      warnings: []
    }

    // Check permissions
    const permissionChecker = this.permissionCheckers.get(command.name)
    if (permissionChecker) {
      result.hasPermission = permissionChecker(command, args)
      if (!result.hasPermission) {
        result.isValid = false
        result.errors.push(`Permission denied for command: ${command.name}`)
      }
    }

    // Run validation rules
    for (const [ruleName, validator] of this.validationRules) {
      const validationError = validator(command, args)
      if (validationError) {
        result.isValid = false
        result.errors.push(`${ruleName}: ${validationError}`)
      }
    }

    // Check if command is enabled
    if (command.isEnabled === false) {
      result.isValid = false
      result.errors.push(`Command is disabled: ${command.name}`)
    }

    return result
  }

  validateCommandByName(commandName: string, args: any[] = []): CynerCommandValidationResult {
    const commandRegistry = CynerCommandRegistryManager.getInstance()
    const command = commandRegistry.getCommand(commandName)
    
    if (!command) {
      return {
        isValid: false,
        hasPermission: false,
        errors: [`Command not found: ${commandName}`],
        warnings: []
      }
    }

    return this.validateCommand(command, args)
  }
}

/**
 * Alternative Implementation: Command Validation Result Interface
 * Enhanced validation result structure
 */
export interface CynerCommandValidationResult {
  isValid: boolean
  hasPermission: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Alternative Implementation: Command Processor
 * Different approach to command processing and execution
 */
export class CynerCommandProcessor {
  private registry: CynerCommandRegistryManager
  private validator: CynerCommandValidator
  private executionContext: CynerCommandExecutionContext
  private preprocessors: Array<(command: Command, args: any[]) => any[]> = []
  private postprocessors: Array<(result: any, execution: CynerCommandExecution) => any> = []

  constructor() {
    this.registry = CynerCommandRegistryManager.getInstance()
    this.validator = new CynerCommandValidator()
    this.executionContext = new CynerCommandExecutionContext()
  }

  addPreprocessor(preprocessor: (command: Command, args: any[]) => any[]): void {
    this.preprocessors.push(preprocessor)
  }

  addPostprocessor(postprocessor: (result: any, execution: CynerCommandExecution) => any): void {
    this.postprocessors.push(postprocessor)
  }

  async processCommand(commandName: string, args: any[] = []): Promise<CynerCommandProcessingResult> {
    const command = this.registry.getCommand(commandName)
    
    if (!command) {
      return {
        success: false,
        error: `Command not found: ${commandName}`,
        executionId: null
      }
    }

    // Validate command
    const validation = this.validator.validateCommand(command, args)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        executionId: null,
        validationResult: validation
      }
    }

    // Preprocess arguments
    let processedArgs = args
    for (const preprocessor of this.preprocessors) {
      processedArgs = preprocessor(command, processedArgs)
    }

    // Start execution
    const executionId = this.executionContext.startExecution(command, processedArgs)

    try {
      // Execute command based on its type
      let result: any
      
      if (command.type === 'local') {
        // Local command - requires args and context
        const context = {
          options: {
            commands: this.registry.getAllCommands(),
            tools: [], // Would need to be passed in or retrieved
            slowAndCapableModel: 'gpt-4' // Would need to be retrieved from config
          },
          abortController: new AbortController(),
          setForkConvoWithMessagesOnTheNextRender: () => {} // Placeholder
        }
        result = await command.call(processedArgs.join(' '), context)
      } else if (command.type === 'local-jsx') {
        // JSX command - requires onDone callback and context
        result = await new Promise((resolve) => {
          const context = {
            setForkConvoWithMessagesOnTheNextRender: () => {} // Placeholder
          }
          command.call(resolve, context as any)
        })
      } else if (command.type === 'prompt') {
        // Prompt command - return the prompt
        result = await command.getPromptForCommand(processedArgs.join(' '))
      } else {
        throw new Error(`Unknown command type for command`)
      }

      // Post-process result
      const execution = this.executionContext.getExecutionById(executionId)!
      for (const postprocessor of this.postprocessors) {
        result = postprocessor(result, execution)
      }

      // Complete execution
      this.executionContext.completeExecution(executionId, result)

      return {
        success: true,
        result,
        executionId,
        validationResult: validation
      }
    } catch (error) {
      // Fail execution
      this.executionContext.failExecution(executionId, error as Error)

      return {
        success: false,
        error: (error as Error).message,
        executionId,
        validationResult: validation
      }
    }
  }

  getExecutionContext(): CynerCommandExecutionContext {
    return this.executionContext
  }

  getValidator(): CynerCommandValidator {
    return this.validator
  }

  getRegistry(): CynerCommandRegistryManager {
    return this.registry
  }
}

/**
 * Alternative Implementation: Command Processing Result Interface
 * Enhanced processing result structure
 */
export interface CynerCommandProcessingResult {
  success: boolean
  result?: any
  error?: string
  executionId: string | null
  validationResult?: CynerCommandValidationResult
}
