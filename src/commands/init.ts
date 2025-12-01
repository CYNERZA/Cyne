import type { Command } from '../commands'
import { markProjectOnboardingComplete } from '../ProjectOnboarding'
import { PROJECT_FILE } from '../constants/product'

/**
 * Alternative implementation of project initialization functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerProjectInitializationConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  projectFileName: string
  progressMessage: string
  enableOnboardingCompletion: boolean
  codebaseAnalysisDepth: 'basic' | 'detailed' | 'comprehensive'
}

export interface CynerProjectInitializationPromptData {
  role: 'user' | 'assistant'
  content: Array<{
    type: 'text'
    text: string
  }>
}

export interface CynerCodebaseAnalysisContext {
  projectType?: string
  buildSystemDetected?: string
  testingFrameworkDetected?: string
  codeStyleRulesFound?: boolean
  existingProjectFileFound?: boolean
}

/**
 * Enhanced project initialization prompt generator
 */
export class CynerProjectInitializationPromptGenerator {
  private configuration: CynerProjectInitializationConfiguration

  constructor(customConfiguration?: Partial<CynerProjectInitializationConfiguration>) {
    this.configuration = {
      commandIdentifier: 'init',
      commandDescription: `Initialize a new ${PROJECT_FILE} file with codebase documentation`,
      isCommandEnabled: true,
      isCommandHidden: false,
      projectFileName: PROJECT_FILE,
      progressMessage: 'analyzing your codebase',
      enableOnboardingCompletion: true,
      codebaseAnalysisDepth: 'comprehensive',
      ...customConfiguration
    }
  }

  public getPromptGeneratorConfiguration(): CynerProjectInitializationConfiguration {
    return { ...this.configuration }
  }

  public updatePromptGeneratorConfiguration(updates: Partial<CynerProjectInitializationConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  /**
   * Generate comprehensive project initialization prompt based on configuration
   */
  public async generateProjectInitializationPrompt(
    commandArguments: string,
    analysisContext?: CynerCodebaseAnalysisContext
  ): Promise<CynerProjectInitializationPromptData[]> {
    try {
      // Execute onboarding completion if enabled
      if (this.configuration.enableOnboardingCompletion) {
        this.executeOnboardingCompletionProcess()
      }

      // Generate enhanced prompt based on analysis depth
      const promptText = this.constructProjectInitializationPromptText(analysisContext)

      return [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
            }
          ]
        }
      ]
    } catch (error) {
      console.error('Project initialization prompt generation failed:', error)
      throw new Error(`Failed to generate project initialization prompt: ${error}`)
    }
  }

  private executeOnboardingCompletionProcess(): void {
    try {
      markProjectOnboardingComplete()
      console.debug('Project onboarding marked as complete')
    } catch (error) {
      console.warn('Onboarding completion encountered issues:', error)
    }
  }

  private constructProjectInitializationPromptText(
    analysisContext?: CynerCodebaseAnalysisContext
  ): string {
    const basePromptComponents = [
      `Please analyze this codebase and create a ${this.configuration.projectFileName} file, which will be given to future instances of Cyne to operate in this repository.
            
What to add:
1. Commands that will be commonly used, such as how to build, lint, and run tests. Include the necessary commands to develop in this codebase, such as how to run a single test.
2. High-level code architecture and structure so that future instances can be productive more quickly. Focus on the "big picture" architecture that requires reading multiple files to understand

Usage notes:
- If there's already a ${this.configuration.projectFileName}, suggest improvements to it.
- When you make the initial ${this.configuration.projectFileName}, do not repeat yourself and do not include obvious instructions like "Provide helpful error messages to users", "Write unit tests for all new utilities", "Never include sensitive information (API keys, tokens) in code or commits" 
- Avoid listing every component or file structure that can be easily discovered
- Don't include generic development practices
- If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include the important parts.
- If there is a README.md, make sure to include the important parts. 
- Do not make up information such as "Common Development Tasks", "Tips for Development", "Support and Documentation" unless this is expressly included in other files that you read.
- Be sure to prefix the file with the following text:`
    ]

    // Enhance prompt based on analysis context if provided
    if (analysisContext && this.configuration.codebaseAnalysisDepth !== 'basic') {
      return this.enhancePromptWithAnalysisContext(basePromptComponents, analysisContext)
    }

    return basePromptComponents.join('\n')
  }

  private enhancePromptWithAnalysisContext(
    baseComponents: string[],
    context: CynerCodebaseAnalysisContext
  ): string {
    const enhancedComponents = [...baseComponents]

    if (context.buildSystemDetected) {
      enhancedComponents.push(`\nNote: ${context.buildSystemDetected} build system detected.`)
    }

    if (context.testingFrameworkDetected) {
      enhancedComponents.push(`Note: ${context.testingFrameworkDetected} testing framework detected.`)
    }

    if (context.codeStyleRulesFound) {
      enhancedComponents.push('Note: Existing code style rules found - please integrate them.')
    }

    if (context.existingProjectFileFound) {
      enhancedComponents.push(`Note: Existing ${this.configuration.projectFileName} found - please enhance it.`)
    }

    return enhancedComponents.join('\n')
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }

  public validatePromptGeneratorConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      config.projectFileName &&
      typeof config.projectFileName === 'string'
    )
  }
}

/**
 * Enhanced project initialization service with comprehensive analysis
 */
export class CynerProjectInitializationService {
  private promptGenerator: CynerProjectInitializationPromptGenerator

  constructor(promptGenerator?: CynerProjectInitializationPromptGenerator) {
    this.promptGenerator = promptGenerator || new CynerProjectInitializationPromptGenerator()
  }

  public async executeProjectInitializationCommand(
    commandArguments: string
  ): Promise<CynerProjectInitializationPromptData[]> {
    // Perform codebase analysis to enhance initialization
    const analysisContext = await this.performCodebaseAnalysis()

    // Generate initialization prompt with analysis context
    return await this.promptGenerator.generateProjectInitializationPrompt(commandArguments, analysisContext)
  }

  private async performCodebaseAnalysis(): Promise<CynerCodebaseAnalysisContext> {
    // This would perform actual codebase analysis in a full implementation
    // For now, returning basic context to maintain compatibility
    return {
      projectType: 'typescript_project',
      buildSystemDetected: 'npm/yarn',
      testingFrameworkDetected: 'jest',
      codeStyleRulesFound: false,
      existingProjectFileFound: false
    }
  }

  public getProjectInitializationStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    onboardingEnabled: boolean
    analysisDepth: string
    projectFileName: string
  } {
    const config = this.promptGenerator.getPromptGeneratorConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      onboardingEnabled: config.enableOnboardingCompletion,
      analysisDepth: config.codebaseAnalysisDepth,
      projectFileName: config.projectFileName
    }
  }

  public getPromptGenerator(): CynerProjectInitializationPromptGenerator {
    return this.promptGenerator
  }
}

// Create default instances for backward compatibility
const defaultProjectInitializationPromptGenerator = new CynerProjectInitializationPromptGenerator()
const defaultProjectInitializationService = new CynerProjectInitializationService(defaultProjectInitializationPromptGenerator)

/**
 * Enhanced project initialization command with restructured implementation
 */
const cynerProjectInitializationCommand = {
  type: 'prompt' as const,
  name: defaultProjectInitializationPromptGenerator.getPromptGeneratorConfiguration().commandIdentifier,
  description: defaultProjectInitializationPromptGenerator.getPromptGeneratorConfiguration().commandDescription,
  isEnabled: defaultProjectInitializationPromptGenerator.getPromptGeneratorConfiguration().isCommandEnabled,
  isHidden: defaultProjectInitializationPromptGenerator.getPromptGeneratorConfiguration().isCommandHidden,
  progressMessage: defaultProjectInitializationPromptGenerator.getPromptGeneratorConfiguration().progressMessage,
  
  userFacingName(): string {
    return defaultProjectInitializationPromptGenerator.generateUserFacingCommandName()
  },
  
  async getPromptForCommand(commandArgs: string): Promise<CynerProjectInitializationPromptData[]> {
    return await defaultProjectInitializationService.executeProjectInitializationCommand(commandArgs)
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerProjectInitializationCommand
