import type { Command } from '../commands'
import type { Tool } from '../Tool'
import Table from 'cli-table3'
import { getSystemPrompt } from '../constants/prompts'
import { getContext } from '../context'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { getMessagesGetter } from '../messages'
import { PROJECT_FILE } from '../constants/product'

/**
 * Alternative implementation of context visualization functionality
 * Maintains same logic with enhanced patterns and organization
 */

// Enhanced constants with configuration
const CYNER_TOKEN_ESTIMATION_CONFIG = {
  BYTES_PER_TOKEN: 4,
  DECIMAL_PRECISION: 1,
  PERCENTAGE_PRECISION: 0
} as const

export interface CynerContextSection {
  sectionTitle: string
  sectionContent: string
  sectionSize: number
  tokenEstimate: number
}

export interface CynerToolSummaryData {
  toolName: string
  toolDescription: string
  toolSize: number
  tokenEstimate: number
}

export interface CynerContextVisualizationConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  includeSystemPrompt: boolean
  includeToolDefinitions: boolean
  includeMessages: boolean
  enableDetailedBreakdown: boolean
}

/**
 * Enhanced context parsing service with comprehensive analysis
 */
export class CynerContextParsingService {
  private parsingConfiguration: {
    preserveWhitespace: boolean
    includeNonContextualized: boolean
    enhanceContextNames: boolean
  }

  constructor(customConfiguration?: Partial<typeof this.parsingConfiguration>) {
    this.parsingConfiguration = {
      preserveWhitespace: true,
      includeNonContextualized: true,
      enhanceContextNames: true,
      ...customConfiguration
    }
  }

  /**
   * Enhanced context section extraction with metadata
   */
  public extractContextSectionsWithMetadata(contextText: string): CynerContextSection[] {
    const extractedSections: CynerContextSection[] = []

    // Locate first context tag position
    const firstContextTagIndex = contextText.indexOf('<context')

    // Process core system prompt section
    if (firstContextTagIndex > 0) {
      const coreSyspromptContent = contextText.slice(0, firstContextTagIndex).trim()
      if (coreSyspromptContent) {
        extractedSections.push(this.createContextSection(
          'Core Sysprompt',
          coreSyspromptContent
        ))
      }
    }

    let currentProcessingPosition = firstContextTagIndex
    let nonContextualizedContent = ''

    // Enhanced regex for context tag parsing
    const contextTagRegex = /<context\s+name="([^"]*)">([\s\S]*?)<\/context>/g
    let regexMatchResult: RegExpExecArray | null

    // Process all context sections
    while ((regexMatchResult = contextTagRegex.exec(contextText)) !== null) {
      // Accumulate content between context tags
      if (regexMatchResult.index > currentProcessingPosition) {
        nonContextualizedContent += contextText.slice(currentProcessingPosition, regexMatchResult.index)
      }

      const [, contextName = 'Unnamed Section', contextContent = ''] = regexMatchResult
      
      // Enhanced context name processing
      const enhancedContextName = this.parsingConfiguration.enhanceContextNames
        ? this.enhanceContextSectionName(contextName)
        : contextName

      extractedSections.push(this.createContextSection(
        enhancedContextName,
        contextContent.trim()
      ))

      currentProcessingPosition = regexMatchResult.index + regexMatchResult[0].length
    }

    // Process remaining non-contextualized content
    if (currentProcessingPosition < contextText.length) {
      nonContextualizedContent += contextText.slice(currentProcessingPosition)
    }

    // Include non-contextualized content if configured
    if (this.parsingConfiguration.includeNonContextualized) {
      const trimmedNonContextualizedContent = nonContextualizedContent.trim()
      if (trimmedNonContextualizedContent) {
        extractedSections.push(this.createContextSection(
          'Non-contextualized Content',
          trimmedNonContextualizedContent
        ))
      }
    }

    return extractedSections
  }

  private createContextSection(title: string, content: string): CynerContextSection {
    const sectionSize = content.length
    const tokenEstimate = Math.ceil(sectionSize / CYNER_TOKEN_ESTIMATION_CONFIG.BYTES_PER_TOKEN)

    return {
      sectionTitle: title,
      sectionContent: content,
      sectionSize,
      tokenEstimate
    }
  }

  private enhanceContextSectionName(originalName: string): string {
    return originalName === 'codeStyle' 
      ? `CodeStyle + ${PROJECT_FILE}'s` 
      : originalName
  }
}

/**
 * Enhanced formatting utilities with configurable precision
 */
export class CynerContextVisualizationFormatter {
  public formatTokenEstimate(byteCount: number): string {
    const tokenEstimate = byteCount / CYNER_TOKEN_ESTIMATION_CONFIG.BYTES_PER_TOKEN
    const tokenInThousands = tokenEstimate / 1000
    const roundedTokenCount = Math.round(tokenInThousands * (10 ** CYNER_TOKEN_ESTIMATION_CONFIG.DECIMAL_PRECISION)) / (10 ** CYNER_TOKEN_ESTIMATION_CONFIG.DECIMAL_PRECISION)
    return `${roundedTokenCount}k`
  }

  public formatByteSize(byteCount: number): string {
    const sizeInKilobytes = byteCount / 1024
    const roundedSize = Math.round(sizeInKilobytes * (10 ** CYNER_TOKEN_ESTIMATION_CONFIG.DECIMAL_PRECISION)) / (10 ** CYNER_TOKEN_ESTIMATION_CONFIG.DECIMAL_PRECISION)
    return `${roundedSize}kb`
  }

  public calculateUsagePercentage(componentSize: number, totalSize: number): string {
    const percentageValue = Math.round((componentSize / totalSize) * 100)
    return `${percentageValue}%`
  }
}

/**
 * Enhanced table generation service with comprehensive styling
 */
export class CynerContextVisualizationTableGenerator {
  private formatter: CynerContextVisualizationFormatter

  constructor(formatter?: CynerContextVisualizationFormatter) {
    this.formatter = formatter || new CynerContextVisualizationFormatter()
  }

  public generateComprehensiveContextSummaryTable(
    systemPromptText: string,
    systemContextSections: CynerContextSection[],
    toolSummaries: CynerToolSummaryData[],
    conversationMessages: unknown
  ): string {
    const contextVisualizationTable = new Table({
      head: ['Component', 'Tokens', 'Size', '% Used'],
      style: { head: ['bold'] },
      chars: {
        mid: '─',
        'left-mid': '├',
        'mid-mid': '┼',
        'right-mid': '┤',
      },
    })

    const serializedMessages = JSON.stringify(conversationMessages)
    const serializedTools = JSON.stringify(toolSummaries)

    // Calculate comprehensive total for percentage calculations
    const totalContextSize = systemPromptText.length + serializedTools.length + serializedMessages.length

    // Add system prompt summary row
    this.addSystemPromptRowToTable(contextVisualizationTable, systemPromptText, totalContextSize)
    
    // Add detailed system prompt section rows
    this.addSystemPromptSectionRowsToTable(contextVisualizationTable, systemContextSections, totalContextSize)

    // Add tool definitions summary row
    this.addToolDefinitionsRowToTable(contextVisualizationTable, serializedTools, totalContextSize)
    
    // Add detailed tool definition rows
    this.addIndividualToolRowsToTable(contextVisualizationTable, toolSummaries, totalContextSize)

    // Add messages and total summary rows
    this.addMessagesAndTotalRowsToTable(contextVisualizationTable, serializedMessages, totalContextSize)

    return contextVisualizationTable.toString()
  }

  private addSystemPromptRowToTable(table: any, systemText: string, totalSize: number): void {
    table.push([
      'System prompt',
      this.formatter.formatTokenEstimate(systemText.length),
      this.formatter.formatByteSize(systemText.length),
      this.formatter.calculateUsagePercentage(systemText.length, totalSize),
    ])
  }

  private addSystemPromptSectionRowsToTable(table: any, sections: CynerContextSection[], totalSize: number): void {
    for (const contextSection of sections) {
      table.push([
        `  ${contextSection.sectionTitle}`,
        this.formatter.formatTokenEstimate(contextSection.sectionSize),
        this.formatter.formatByteSize(contextSection.sectionSize),
        this.formatter.calculateUsagePercentage(contextSection.sectionSize, totalSize),
      ])
    }
  }

  private addToolDefinitionsRowToTable(table: any, toolsData: string, totalSize: number): void {
    table.push([
      'Tool definitions',
      this.formatter.formatTokenEstimate(toolsData.length),
      this.formatter.formatByteSize(toolsData.length),
      this.formatter.calculateUsagePercentage(toolsData.length, totalSize),
    ])
  }

  private addIndividualToolRowsToTable(table: any, tools: CynerToolSummaryData[], totalSize: number): void {
    for (const toolSummary of tools) {
      table.push([
        `  ${toolSummary.toolName}`,
        this.formatter.formatTokenEstimate(toolSummary.toolSize),
        this.formatter.formatByteSize(toolSummary.toolSize),
        this.formatter.calculateUsagePercentage(toolSummary.toolSize, totalSize),
      ])
    }
  }

  private addMessagesAndTotalRowsToTable(table: any, messagesData: string, totalSize: number): void {
    table.push(
      [
        'Messages',
        this.formatter.formatTokenEstimate(messagesData.length),
        this.formatter.formatByteSize(messagesData.length),
        this.formatter.calculateUsagePercentage(messagesData.length, totalSize),
      ],
      ['Total', this.formatter.formatTokenEstimate(totalSize), this.formatter.formatByteSize(totalSize), '100%'],
    )
  }
}

/**
 * Enhanced context visualization service orchestrator
 */
export class CynerContextVisualizationService {
  private configuration: CynerContextVisualizationConfiguration
  private parsingService: CynerContextParsingService
  private tableGenerator: CynerContextVisualizationTableGenerator

  constructor(
    customConfiguration?: Partial<CynerContextVisualizationConfiguration>,
    parsingService?: CynerContextParsingService,
    tableGenerator?: CynerContextVisualizationTableGenerator
  ) {
    this.configuration = {
      commandIdentifier: 'ctx-viz',
      commandDescription: 'Show token usage breakdown for the current conversation context',
      isCommandEnabled: true,
      isCommandHidden: false,
      includeSystemPrompt: true,
      includeToolDefinitions: true,
      includeMessages: true,
      enableDetailedBreakdown: true,
      ...customConfiguration
    }
    
    this.parsingService = parsingService || new CynerContextParsingService()
    this.tableGenerator = tableGenerator || new CynerContextVisualizationTableGenerator()
  }

  public async executeContextVisualizationAnalysis(
    commandArguments: string,
    executionContext: { options: { tools: Tool[] } }
  ): Promise<string> {
    try {
      // Gather system context data
      const [rawSystemPrompt, systemContextData] = await Promise.all([
        getSystemPrompt(),
        getContext(),
      ])

      const availableTools = executionContext.options.tools

      // Construct complete system prompt with context injection
      let completeSystemPrompt = rawSystemPrompt.join('\n')
      for (const [contextName, contextContent] of Object.entries(systemContextData)) {
        completeSystemPrompt += `\n<context name="${contextName}">${contextContent}</context>`
      }

      // Process tool definitions with comprehensive metadata
      const processedToolSummaries = this.processToolDefinitionsWithMetadata(availableTools)

      // Retrieve current conversation messages
      const currentConversationMessages = getMessagesGetter()()

      // Parse system prompt context sections
      const parsedContextSections = this.parsingService.extractContextSectionsWithMetadata(completeSystemPrompt)

      // Generate comprehensive visualization table
      return this.tableGenerator.generateComprehensiveContextSummaryTable(
        completeSystemPrompt,
        parsedContextSections,
        processedToolSummaries,
        currentConversationMessages
      )
    } catch (error) {
      console.error('Context visualization analysis failed:', error)
      throw new Error(`Failed to execute context visualization analysis: ${error}`)
    }
  }

  private processToolDefinitionsWithMetadata(tools: Tool[]): CynerToolSummaryData[] {
    return tools.map(tool => {
      // Extract comprehensive tool definition
      const fullToolPrompt = tool.prompt({ dangerouslySkipPermissions: false })
      const toolInputSchema = JSON.stringify(
        'inputJSONSchema' in tool && tool.inputJSONSchema
          ? tool.inputJSONSchema
          : zodToJsonSchema(tool.inputSchema),
      )

      const completeToolDescription = `${fullToolPrompt}\n\nSchema:\n${toolInputSchema}`
      const toolDescriptionSize = completeToolDescription.length
      const toolTokenEstimate = Math.ceil(toolDescriptionSize / CYNER_TOKEN_ESTIMATION_CONFIG.BYTES_PER_TOKEN)

      return {
        toolName: tool.name,
        toolDescription: completeToolDescription,
        toolSize: toolDescriptionSize,
        tokenEstimate: toolTokenEstimate
      }
    })
  }

  public getVisualizationConfiguration(): CynerContextVisualizationConfiguration {
    return { ...this.configuration }
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }
}

// Create default service instances for backward compatibility
const defaultContextParsingService = new CynerContextParsingService()
const defaultVisualizationFormatter = new CynerContextVisualizationFormatter()
const defaultTableGenerator = new CynerContextVisualizationTableGenerator(defaultVisualizationFormatter)
const defaultContextVisualizationService = new CynerContextVisualizationService(
  undefined,
  defaultContextParsingService,
  defaultTableGenerator
)

// Legacy compatibility functions - maintaining exact same API
function getContextSections(text: string): Section[] {
  const cynerSections = defaultContextParsingService.extractContextSectionsWithMetadata(text)
  return cynerSections.map(section => ({
    title: section.sectionTitle,
    content: section.sectionContent
  }))
}

function formatTokenCount(bytes: number): string {
  return defaultVisualizationFormatter.formatTokenEstimate(bytes)
}

function formatByteCount(bytes: number): string {
  return defaultVisualizationFormatter.formatByteSize(bytes)
}

function createSummaryTable(
  systemText: string,
  systemSections: Section[],
  tools: ToolSummary[],
  messages: unknown,
): string {
  const cynerSections = systemSections.map(section => ({
    sectionTitle: section.title,
    sectionContent: section.content,
    sectionSize: section.content.length,
    tokenEstimate: Math.ceil(section.content.length / CYNER_TOKEN_ESTIMATION_CONFIG.BYTES_PER_TOKEN)
  }))

  const cynerTools = tools.map(tool => ({
    toolName: tool.name,
    toolDescription: tool.description,
    toolSize: tool.description.length,
    tokenEstimate: Math.ceil(tool.description.length / CYNER_TOKEN_ESTIMATION_CONFIG.BYTES_PER_TOKEN)
  }))

  return defaultTableGenerator.generateComprehensiveContextSummaryTable(
    systemText,
    cynerSections,
    cynerTools,
    messages
  )
}

// Legacy type definitions for backward compatibility
interface Section {
  title: string
  content: string
}

interface ToolSummary {
  name: string
  description: string
}

/**
 * Enhanced context visualization command with restructured implementation
 */
const cynerContextVisualizationCommand: Command = {
  name: defaultContextVisualizationService.getVisualizationConfiguration().commandIdentifier,
  description: defaultContextVisualizationService.getVisualizationConfiguration().commandDescription,
  isEnabled: defaultContextVisualizationService.getVisualizationConfiguration().isCommandEnabled,
  isHidden: defaultContextVisualizationService.getVisualizationConfiguration().isCommandHidden,
  type: 'local',

  userFacingName() {
    return defaultContextVisualizationService.generateUserFacingCommandName()
  },

  async call(commandArgs: string, executionContext: { options: { tools: Tool[] } }): Promise<string> {
    return await defaultContextVisualizationService.executeContextVisualizationAnalysis(commandArgs, executionContext)
  },
}

// Export the restructured command maintaining exact same interface
export default cynerContextVisualizationCommand
