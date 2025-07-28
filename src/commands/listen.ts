import { Command } from '../commands'
import { logError } from '../utils/log'
import { execFileNoThrow } from '../utils/execFileNoThrow'

/**
 * Alternative implementation of speech recognition functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerSpeechRecognitionConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  supportedPlatforms: string[]
  supportedTerminals: string[]
  enableDictationLogging: boolean
  dictationTimeout: number
}

export interface CynerSpeechRecognitionContext {
  abortController: AbortController
  executionMetadata?: {
    sessionId?: string
    initiationTimestamp?: number
    userAgent?: string
  }
}

export interface CynerSpeechRecognitionResult {
  operationSuccessful: boolean
  resultMessage: string
  errorDetails?: string
  executionTime?: number
}

/**
 * Enhanced platform compatibility checker
 */
export class CynerPlatformCompatibilityChecker {
  private supportedPlatforms: string[]
  private supportedTerminals: string[]

  constructor(
    supportedPlatforms: string[] = ['darwin'],
    supportedTerminals: string[] = ['iTerm.app', 'Apple_Terminal']
  ) {
    this.supportedPlatforms = supportedPlatforms
    this.supportedTerminals = supportedTerminals
  }

  public checkPlatformCompatibility(): {
    isCompatible: boolean
    compatibilityReasons: string[]
  } {
    const compatibilityReasons: string[] = []

    // Check platform compatibility
    const currentPlatform = process.platform
    const isPlatformSupported = this.supportedPlatforms.includes(currentPlatform)
    
    if (!isPlatformSupported) {
      compatibilityReasons.push(`Platform '${currentPlatform}' is not supported`)
    }

    // Check terminal compatibility
    const currentTerminal = process.env.TERM_PROGRAM || ''
    const isTerminalSupported = this.supportedTerminals.includes(currentTerminal)
    
    if (!isTerminalSupported) {
      compatibilityReasons.push(`Terminal '${currentTerminal}' is not supported`)
    }

    return {
      isCompatible: isPlatformSupported && isTerminalSupported,
      compatibilityReasons
    }
  }

  public updateSupportedPlatforms(platforms: string[]): void {
    this.supportedPlatforms = platforms
  }

  public updateSupportedTerminals(terminals: string[]): void {
    this.supportedTerminals = terminals
  }

  public getSupportedConfigurations(): {
    platforms: string[]
    terminals: string[]
  } {
    return {
      platforms: [...this.supportedPlatforms],
      terminals: [...this.supportedTerminals]
    }
  }
}

/**
 * Enhanced speech recognition service with AppleScript integration
 */
export class CynerSpeechRecognitionService {
  private configuration: CynerSpeechRecognitionConfiguration
  private platformChecker: CynerPlatformCompatibilityChecker

  constructor(
    customConfiguration?: Partial<CynerSpeechRecognitionConfiguration>,
    platformChecker?: CynerPlatformCompatibilityChecker
  ) {
    this.configuration = {
      commandIdentifier: 'listen',
      commandDescription: 'Activates speech recognition and transcribes speech to text',
      isCommandEnabled: true,
      isCommandHidden: true,
      supportedPlatforms: ['darwin'],
      supportedTerminals: ['iTerm.app', 'Apple_Terminal'],
      enableDictationLogging: true,
      dictationTimeout: 30000,
      ...customConfiguration
    }

    this.platformChecker = platformChecker || new CynerPlatformCompatibilityChecker(
      this.configuration.supportedPlatforms,
      this.configuration.supportedTerminals
    )
  }

  public getServiceConfiguration(): CynerSpeechRecognitionConfiguration {
    return { ...this.configuration }
  }

  public updateServiceConfiguration(updates: Partial<CynerSpeechRecognitionConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  /**
   * Enhanced speech recognition execution with comprehensive error handling
   */
  public async executeSpeechRecognitionProcess(
    context: CynerSpeechRecognitionContext
  ): Promise<CynerSpeechRecognitionResult> {
    const executionStartTime = Date.now()
    const executionMetadata = {
      ...context.executionMetadata,
      executionStartTime,
      operationId: `speech_recognition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    try {
      // Check platform compatibility before execution
      const compatibilityCheck = this.platformChecker.checkPlatformCompatibility()
      if (!compatibilityCheck.isCompatible) {
        return {
          operationSuccessful: false,
          resultMessage: 'Speech recognition not available on this platform',
          errorDetails: compatibilityCheck.compatibilityReasons.join('; '),
          executionTime: Date.now() - executionStartTime
        }
      }

      // Log operation initiation if logging is enabled
      if (this.configuration.enableDictationLogging) {
        console.debug('Speech recognition initiated', executionMetadata)
      }

      // Execute AppleScript dictation command
      const dictationResult = await this.executeAppleScriptDictationCommand(context.abortController)

      const executionEndTime = Date.now()
      const executionDuration = executionEndTime - executionStartTime

      return {
        operationSuccessful: dictationResult.success,
        resultMessage: dictationResult.message,
        errorDetails: dictationResult.errorDetails,
        executionTime: executionDuration
      }
    } catch (error) {
      const executionEndTime = Date.now()
      const executionDuration = executionEndTime - executionStartTime

      console.error('Speech recognition process failed:', error, executionMetadata)
      
      return {
        operationSuccessful: false,
        resultMessage: 'Speech recognition execution failed',
        errorDetails: `${error}`,
        executionTime: executionDuration
      }
    }
  }

  private async executeAppleScriptDictationCommand(
    abortController: AbortController
  ): Promise<{ success: boolean; message: string; errorDetails?: string }> {
    // Enhanced AppleScript for dictation activation
    const dictationActivationScript = `tell application "System Events" to tell ¬
(the first process whose frontmost is true) to tell ¬
menu bar 1 to tell ¬
menu bar item "Edit" to tell ¬
menu "Edit" to tell ¬
menu item "Start Dictation" to ¬
if exists then click it`

    try {
      const { stderr, code } = await execFileNoThrow(
        'osascript',
        ['-e', dictationActivationScript],
        abortController.signal,
      )

      if (code !== 0) {
        const errorMessage = `Failed to start dictation: ${stderr}`
        if (this.configuration.enableDictationLogging) {
          logError(errorMessage)
        }
        
        return {
          success: false,
          message: 'Failed to start dictation',
          errorDetails: stderr
        }
      }

      return {
        success: true,
        message: 'Dictation started. Press esc to stop.'
      }
    } catch (error) {
      return {
        success: false,
        message: 'AppleScript execution failed',
        errorDetails: `${error}`
      }
    }
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }

  public validateServiceConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      Array.isArray(config.supportedPlatforms) &&
      Array.isArray(config.supportedTerminals)
    )
  }

  public getSpeechRecognitionStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    platformCompatible: boolean
    supportedConfigurations: any
    loggingEnabled: boolean
  } {
    const compatibilityCheck = this.platformChecker.checkPlatformCompatibility()
    
    return {
      commandEnabled: this.configuration.isCommandEnabled,
      commandVisible: !this.configuration.isCommandHidden,
      platformCompatible: compatibilityCheck.isCompatible,
      supportedConfigurations: this.platformChecker.getSupportedConfigurations(),
      loggingEnabled: this.configuration.enableDictationLogging
    }
  }
}

// Create default instances for backward compatibility
const defaultPlatformChecker = new CynerPlatformCompatibilityChecker()
const defaultSpeechRecognitionService = new CynerSpeechRecognitionService(undefined, defaultPlatformChecker)

// Legacy compatibility check
const isEnabled = defaultPlatformChecker.checkPlatformCompatibility().isCompatible

/**
 * Enhanced speech recognition command with restructured implementation
 */
const cynerSpeechRecognitionCommand: Command = {
  type: 'local',
  name: defaultSpeechRecognitionService.getServiceConfiguration().commandIdentifier,
  description: defaultSpeechRecognitionService.getServiceConfiguration().commandDescription,
  isEnabled: isEnabled,
  isHidden: isEnabled,
  
  userFacingName(): string {
    return defaultSpeechRecognitionService.generateUserFacingCommandName()
  },
  
  async call(_: string, { abortController }: { abortController: AbortController }): Promise<string> {
    const recognitionContext: CynerSpeechRecognitionContext = {
      abortController,
      executionMetadata: {
        sessionId: `listen_session_${Date.now()}`,
        initiationTimestamp: Date.now(),
        userAgent: 'cli_command'
      }
    }

    const recognitionResult = await defaultSpeechRecognitionService.executeSpeechRecognitionProcess(recognitionContext)
    
    return recognitionResult.operationSuccessful 
      ? recognitionResult.resultMessage
      : `Error: ${recognitionResult.resultMessage}${recognitionResult.errorDetails ? ` (${recognitionResult.errorDetails})` : ''}`
  },
}

// Export the restructured command maintaining exact same interface
export default cynerSpeechRecognitionCommand
