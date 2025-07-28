import { Command } from '../commands'

/**
 * Alternative implementation of PR comments functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerPRCommentsCommandConfiguration {
  commandIdentifier: string
  commandDescription: string
  progressMessage: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  commandType: 'prompt'
  enableDetailedCommentParsing: boolean
  includeCodeContext: boolean
  enableCommentThreading: boolean
  showDiffHunks: boolean
}

export interface CynerPRCommentsPromptContext {
  userArguments: string
  gitHubAPICommands: {
    getPRInfo: string
    getPRComments: string
    getReviewComments: string
    getFileContent: string
  }
  responseFormat: {
    noCommentsMessage: string
    sectionHeader: string
    codeBlockFormat: string
  }
}

export interface CynerPRCommentsPromptStructure {
  promptRole: 'user'
  promptContent: Array<{
    type: 'text'
    text: string
  }>
  generatedTimestamp: number
}

/**
 * Enhanced PR comments command configuration manager
 */
export class CynerPRCommentsCommandConfigurationManager {
  private configuration: CynerPRCommentsCommandConfiguration

  constructor(customConfiguration?: Partial<CynerPRCommentsCommandConfiguration>) {
    this.configuration = {
      commandIdentifier: 'pr-comments',
      commandDescription: 'Get comments from a GitHub pull request',
      progressMessage: 'fetching PR comments',
      isCommandEnabled: true,
      isCommandHidden: false,
      commandType: 'prompt',
      enableDetailedCommentParsing: true,
      includeCodeContext: true,
      enableCommentThreading: true,
      showDiffHunks: true,
      ...customConfiguration
    }
  }

  public getCommandConfiguration(): CynerPRCommentsCommandConfiguration {
    return { ...this.configuration }
  }

  public updateCommandConfiguration(updates: Partial<CynerPRCommentsCommandConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public getCommandIdentifier(): string {
    return this.configuration.commandIdentifier
  }

  public getCommandDescription(): string {
    return this.configuration.commandDescription
  }

  public getProgressMessage(): string {
    return this.configuration.progressMessage
  }

  public isCommandEnabled(): boolean {
    return this.configuration.isCommandEnabled
  }

  public isCommandHidden(): boolean {
    return this.configuration.isCommandHidden
  }

  public getCommandType(): 'prompt' {
    return this.configuration.commandType
  }

  public isDetailedCommentParsingEnabled(): boolean {
    return this.configuration.enableDetailedCommentParsing
  }

  public shouldIncludeCodeContext(): boolean {
    return this.configuration.includeCodeContext
  }

  public isCommentThreadingEnabled(): boolean {
    return this.configuration.enableCommentThreading
  }

  public shouldShowDiffHunks(): boolean {
    return this.configuration.showDiffHunks
  }

  public validateCommandConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      config.progressMessage &&
      typeof config.progressMessage === 'string' &&
      config.commandType === 'prompt'
    )
  }
}

/**
 * Enhanced PR comments prompt generator with advanced formatting
 */
export class CynerPRCommentsPromptGenerator {
  private configurationManager: CynerPRCommentsCommandConfigurationManager

  constructor(configurationManager: CynerPRCommentsCommandConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Generate comprehensive PR comments prompt with enhanced instructions
   */
  public generatePRCommentsPrompt(userArguments: string): CynerPRCommentsPromptStructure {
    const promptContext = this.preparePRCommentsPromptContext(userArguments)
    const promptText = this.buildComprehensivePromptText(promptContext)

    return {
      promptRole: 'user',
      promptContent: [
        {
          type: 'text',
          text: promptText
        }
      ],
      generatedTimestamp: Date.now()
    }
  }

  private preparePRCommentsPromptContext(userArguments: string): CynerPRCommentsPromptContext {
    return {
      userArguments,
      gitHubAPICommands: {
        getPRInfo: 'gh pr view --json number,headRepository',
        getPRComments: 'gh api /repos/{owner}/{repo}/issues/{number}/comments',
        getReviewComments: 'gh api /repos/{owner}/{repo}/pulls/{number}/comments',
        getFileContent: 'gh api /repos/{owner}/{repo}/contents/{path}?ref={branch} | jq .content -r | base64 -d'
      },
      responseFormat: {
        noCommentsMessage: 'No comments found.',
        sectionHeader: '## Comments',
        codeBlockFormat: 'diff'
      }
    }
  }

  private buildComprehensivePromptText(context: CynerPRCommentsPromptContext): string {
    const baseInstructions = this.generateBaseInstructions()
    const stepByStepProcedure = this.generateStepByStepProcedure(context)
    const formattingGuidelines = this.generateFormattingGuidelines(context)
    const additionalRequirements = this.generateAdditionalRequirements()
    const userInputSection = this.generateUserInputSection(context.userArguments)

    return [
      baseInstructions,
      stepByStepProcedure,
      formattingGuidelines,
      additionalRequirements,
      userInputSection
    ].filter(Boolean).join('\n\n')
  }

  private generateBaseInstructions(): string {
    return `You are an AI assistant integrated into a git-based version control system. Your task is to fetch and display comments from a GitHub pull request.`
  }

  private generateStepByStepProcedure(context: CynerPRCommentsPromptContext): string {
    const steps = [
      `1. Use \`${context.gitHubAPICommands.getPRInfo}\` to get the PR number and repository info`,
      `2. Use \`${context.gitHubAPICommands.getPRComments}\` to get PR-level comments`,
      `3. Use \`${context.gitHubAPICommands.getReviewComments}\` to get review comments. Pay particular attention to the following fields: \`body\`, \`diff_hunk\`, \`path\`, \`line\`, etc.`
    ]

    if (this.configurationManager.shouldIncludeCodeContext()) {
      steps.push(`   If the comment references some code, consider fetching it using eg \`${context.gitHubAPICommands.getFileContent}\``)
    }

    steps.push(
      '4. Parse and format all comments in a readable way',
      '5. Return ONLY the formatted comments, with no additional text'
    )

    return `Follow these steps:\n\n${steps.join('\n')}`
  }

  private generateFormattingGuidelines(context: CynerPRCommentsPromptContext): string {
    let guidelines = `Format the comments as:\n\n${context.responseFormat.sectionHeader}\n\n[For each comment thread:]\n- @author file.ts#line:`

    if (this.configurationManager.shouldShowDiffHunks()) {
      guidelines += `\n  \`\`\`${context.responseFormat.codeBlockFormat}\n  [diff_hunk from the API response]\n  \`\`\``
    }

    guidelines += '\n  > quoted comment text'

    if (this.configurationManager.isCommentThreadingEnabled()) {
      guidelines += '\n  \n  [any replies indented]'
    }

    guidelines += `\n\nIf there are no comments, return "${context.responseFormat.noCommentsMessage}"`

    return guidelines
  }

  private generateAdditionalRequirements(): string {
    const requirements = [
      '1. Only show the actual comments, no explanatory text',
      '2. Include both PR-level and code review comments'
    ]

    if (this.configurationManager.isCommentThreadingEnabled()) {
      requirements.push('3. Preserve the threading/nesting of comment replies')
    }

    if (this.configurationManager.isDetailedCommentParsingEnabled()) {
      requirements.push('4. Show the file and line number context for code review comments')
    }

    requirements.push('5. Use jq to parse the JSON responses from the GitHub API')

    return `Remember:\n${requirements.join('\n')}`
  }

  private generateUserInputSection(userArguments: string): string {
    return userArguments ? `Additional user input: ${userArguments}` : ''
  }

  public getPromptStatistics(): {
    detailedParsingEnabled: boolean
    codeContextEnabled: boolean
    threadingEnabled: boolean
    diffHunksEnabled: boolean
  } {
    return {
      detailedParsingEnabled: this.configurationManager.isDetailedCommentParsingEnabled(),
      codeContextEnabled: this.configurationManager.shouldIncludeCodeContext(),
      threadingEnabled: this.configurationManager.isCommentThreadingEnabled(),
      diffHunksEnabled: this.configurationManager.shouldShowDiffHunks()
    }
  }
}

/**
 * Enhanced PR comments command service with comprehensive prompt generation
 */
export class CynerPRCommentsCommandService {
  private configurationManager: CynerPRCommentsCommandConfigurationManager
  private promptGenerator: CynerPRCommentsPromptGenerator

  constructor(
    configurationManager?: CynerPRCommentsCommandConfigurationManager,
    promptGenerator?: CynerPRCommentsPromptGenerator
  ) {
    this.configurationManager = configurationManager || new CynerPRCommentsCommandConfigurationManager()
    this.promptGenerator = promptGenerator || new CynerPRCommentsPromptGenerator(this.configurationManager)
  }

  /**
   * Execute enhanced PR comments prompt generation
   */
  public async executePRCommentsPromptGeneration(userArguments: string): Promise<Array<{
    role: 'user'
    content: Array<{
      type: 'text'
      text: string
    }>
  }>> {
    try {
      // Generate comprehensive prompt structure
      const promptStructure = this.promptGenerator.generatePRCommentsPrompt(userArguments)

      // Return formatted prompt for command execution
      return [{
        role: promptStructure.promptRole,
        content: promptStructure.promptContent
      }]
    } catch (error) {
      console.error('PR comments prompt generation failed:', error)
      throw new Error(`Failed to generate PR comments prompt: ${error}`)
    }
  }

  public getCommandStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    promptGenerationEnabled: boolean
    advancedFeaturesEnabled: boolean
  } {
    const config = this.configurationManager.getCommandConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      promptGenerationEnabled: true,
      advancedFeaturesEnabled: config.enableDetailedCommentParsing && config.includeCodeContext
    }
  }

  public getConfigurationManager(): CynerPRCommentsCommandConfigurationManager {
    return this.configurationManager
  }

  public getPromptGenerator(): CynerPRCommentsPromptGenerator {
    return this.promptGenerator
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerPRCommentsCommandConfigurationManager()
const defaultPromptGenerator = new CynerPRCommentsPromptGenerator(defaultConfigurationManager)
const defaultPRCommentsCommandService = new CynerPRCommentsCommandService(
  defaultConfigurationManager,
  defaultPromptGenerator
)

/**
 * Enhanced PR comments command with restructured implementation
 */
const cynerPRCommentsCommand = {
  type: defaultConfigurationManager.getCommandType(),
  name: defaultConfigurationManager.getCommandIdentifier(),
  description: defaultConfigurationManager.getCommandDescription(),
  progressMessage: defaultConfigurationManager.getProgressMessage(),
  isEnabled: defaultConfigurationManager.isCommandEnabled(),
  isHidden: defaultConfigurationManager.isCommandHidden(),
  
  userFacingName(): string {
    return defaultConfigurationManager.getCommandIdentifier()
  },
  
  async getPromptForCommand(args: string): Promise<Array<{
    role: 'user'
    content: Array<{
      type: 'text'
      text: string
    }>
  }>> {
    return await defaultPRCommentsCommandService.executePRCommentsPromptGeneration(args)
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerPRCommentsCommand
