import { highlight, supportsLanguage } from 'cli-highlight'
import { Text } from 'ink'
import React, { useMemo } from 'react'
import { logError } from '../utils/log'

/**
 * Alternative implementation of highlighted code functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerCodeHighlightConfiguration {
  enableLanguageSupport: boolean
  enableFallbackHighlighting: boolean
  enableErrorHandling: boolean
  enableLanguageValidation: boolean
  enableHighlightOptimization: boolean
  enableMemoization: boolean
  enableLogging: boolean
}

export interface CynerCodeHighlightContext {
  code: string
  language: string
  highlightConfiguration: CynerCodeHighlightConfiguration
  supportedLanguages: string[]
  fallbackLanguage: string
}

export interface CynerCodeHighlightActions {
  highlightCode: (code: string, language: string) => string
  validateLanguage: (language: string) => boolean
  getFallbackHighlight: (code: string) => string
}

/**
 * Enhanced code highlight configuration manager
 */
export class CynerCodeHighlightConfigurationManager {
  private configuration: CynerCodeHighlightConfiguration

  constructor(customConfiguration?: Partial<CynerCodeHighlightConfiguration>) {
    this.configuration = {
      enableLanguageSupport: true,
      enableFallbackHighlighting: true,
      enableErrorHandling: true,
      enableLanguageValidation: true,
      enableHighlightOptimization: true,
      enableMemoization: true,
      enableLogging: true,
      ...customConfiguration
    }
  }

  public getHighlightConfiguration(): CynerCodeHighlightConfiguration {
    return { ...this.configuration }
  }

  public updateHighlightConfiguration(updates: Partial<CynerCodeHighlightConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isLanguageSupportEnabled(): boolean {
    return this.configuration.enableLanguageSupport
  }

  public isFallbackHighlightingEnabled(): boolean {
    return this.configuration.enableFallbackHighlighting
  }

  public isErrorHandlingEnabled(): boolean {
    return this.configuration.enableErrorHandling
  }

  public isLanguageValidationEnabled(): boolean {
    return this.configuration.enableLanguageValidation
  }

  public isHighlightOptimizationEnabled(): boolean {
    return this.configuration.enableHighlightOptimization
  }

  public isMemoizationEnabled(): boolean {
    return this.configuration.enableMemoization
  }

  public isLoggingEnabled(): boolean {
    return this.configuration.enableLogging
  }

  public validateHighlightConfiguration(): boolean {
    const config = this.configuration
    return !!(
      typeof config.enableLanguageSupport === 'boolean' &&
      typeof config.enableFallbackHighlighting === 'boolean' &&
      typeof config.enableErrorHandling === 'boolean'
    )
  }
}

/**
 * Enhanced code highlight language processor
 */
export class CynerCodeHighlightLanguageProcessor {
  private configurationManager: CynerCodeHighlightConfigurationManager
  private fallbackLanguage: string

  constructor(
    configurationManager: CynerCodeHighlightConfigurationManager,
    fallbackLanguage: string = 'markdown'
  ) {
    this.configurationManager = configurationManager
    this.fallbackLanguage = fallbackLanguage
  }

  /**
   * Process language validation with enhanced logic
   */
  public processLanguageValidation(language: string): boolean {
    if (!this.configurationManager.isLanguageValidationEnabled()) {
      return true
    }

    try {
      return this.executeLanguageValidation(language)
    } catch (error) {
      if (this.configurationManager.isLoggingEnabled()) {
        console.error('Language validation failed:', error)
      }
      return false
    }
  }

  private executeLanguageValidation(language: string): boolean {
    if (!language || typeof language !== 'string') {
      throw new Error('Invalid language parameter provided')
    }

    if (!this.configurationManager.isLanguageSupportEnabled()) {
      return true
    }

    return supportsLanguage(language)
  }

  /**
   * Process language fallback determination
   */
  public processLanguageFallback(originalLanguage: string): string {
    if (!this.configurationManager.isFallbackHighlightingEnabled()) {
      return originalLanguage
    }

    try {
      return this.executeFallbackDetermination(originalLanguage)
    } catch (error) {
      if (this.configurationManager.isLoggingEnabled()) {
        console.error('Language fallback processing failed:', error)
      }
      return this.fallbackLanguage
    }
  }

  private executeFallbackDetermination(originalLanguage: string): string {
    if (this.processLanguageValidation(originalLanguage)) {
      return originalLanguage
    }

    if (this.configurationManager.isLoggingEnabled()) {
      logError(
        `Language not supported while highlighting code, falling back to ${this.fallbackLanguage}: ${originalLanguage}`
      )
    }

    return this.fallbackLanguage
  }

  public getProcessorStatistics(): {
    validationEnabled: boolean
    fallbackEnabled: boolean
    languageSupportEnabled: boolean
    loggingEnabled: boolean
  } {
    return {
      validationEnabled: this.configurationManager.isLanguageValidationEnabled(),
      fallbackEnabled: this.configurationManager.isFallbackHighlightingEnabled(),
      languageSupportEnabled: this.configurationManager.isLanguageSupportEnabled(),
      loggingEnabled: this.configurationManager.isLoggingEnabled()
    }
  }

  public getFallbackLanguage(): string {
    return this.fallbackLanguage
  }

  public setFallbackLanguage(language: string): void {
    this.fallbackLanguage = language
  }
}

/**
 * Enhanced code highlight rendering service
 */
export class CynerCodeHighlightRenderingService {
  private configurationManager: CynerCodeHighlightConfigurationManager
  private languageProcessor: CynerCodeHighlightLanguageProcessor

  constructor(
    configurationManager: CynerCodeHighlightConfigurationManager,
    languageProcessor: CynerCodeHighlightLanguageProcessor
  ) {
    this.configurationManager = configurationManager
    this.languageProcessor = languageProcessor
  }

  /**
   * Execute comprehensive code highlighting
   */
  public executeCodeHighlighting(code: string, language: string): string {
    try {
      return this.executeEnhancedHighlighting(code, language)
    } catch (error) {
      if (this.configurationManager.isErrorHandlingEnabled()) {
        if (this.configurationManager.isLoggingEnabled()) {
          console.error('Code highlighting failed:', error)
        }
        return this.executeFallbackHighlighting(code, language)
      }
      throw error
    }
  }

  private executeEnhancedHighlighting(code: string, language: string): string {
    this.validateHighlightingInput(code, language)

    const processedLanguage = this.languageProcessor.processLanguageFallback(language)
    return this.executeHighlightWithLanguage(code, processedLanguage)
  }

  private executeFallbackHighlighting(code: string, language: string): string {
    // Fallback highlighting
    try {
      const fallbackLanguage = this.languageProcessor.getFallbackLanguage()
      return this.executeHighlightWithLanguage(code, fallbackLanguage)
    } catch (error) {
      if (this.configurationManager.isLoggingEnabled()) {
        console.error('Fallback highlighting also failed:', error)
      }
      return code // Return original code if all highlighting fails
    }
  }

  private validateHighlightingInput(code: string, language: string): void {
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code parameter provided')
    }
    if (!language || typeof language !== 'string') {
      throw new Error('Invalid language parameter provided')
    }
  }

  private executeHighlightWithLanguage(code: string, language: string): string {
    try {
      return highlight(code, { language })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unknown language')) {
        if (this.configurationManager.isLoggingEnabled()) {
          logError(
            `Language not supported while highlighting code, falling back to ${this.languageProcessor.getFallbackLanguage()}: ${error}`
          )
        }
        return highlight(code, { language: this.languageProcessor.getFallbackLanguage() })
      }
      throw error
    }
  }

  public getRenderingStatistics(): {
    optimizationEnabled: boolean
    errorHandlingEnabled: boolean
    fallbackEnabled: boolean
    validationEnabled: boolean
  } {
    return {
      optimizationEnabled: this.configurationManager.isHighlightOptimizationEnabled(),
      errorHandlingEnabled: this.configurationManager.isErrorHandlingEnabled(),
      fallbackEnabled: this.configurationManager.isFallbackHighlightingEnabled(),
      validationEnabled: this.configurationManager.isLanguageValidationEnabled()
    }
  }
}

/**
 * Enhanced code highlight service with comprehensive highlight management
 */
export class CynerCodeHighlightService {
  private configurationManager: CynerCodeHighlightConfigurationManager
  private languageProcessor: CynerCodeHighlightLanguageProcessor
  private renderingService: CynerCodeHighlightRenderingService

  constructor(
    configurationManager?: CynerCodeHighlightConfigurationManager,
    languageProcessor?: CynerCodeHighlightLanguageProcessor,
    renderingService?: CynerCodeHighlightRenderingService
  ) {
    this.configurationManager = configurationManager || new CynerCodeHighlightConfigurationManager()
    this.languageProcessor = languageProcessor || new CynerCodeHighlightLanguageProcessor(this.configurationManager)
    this.renderingService = renderingService || new CynerCodeHighlightRenderingService(
      this.configurationManager,
      this.languageProcessor
    )
  }

  /**
   * Execute comprehensive code highlight management
   */
  public executeCodeHighlightManagement(code: string, language: string): string {
    try {
      return this.executeEnhancedHighlightManagement(code, language)
    } catch (error) {
      console.error('Code highlight management failed:', error)
      return this.executeFallbackHighlightManagement(code, language)
    }
  }

  private executeEnhancedHighlightManagement(code: string, language: string): string {
    return this.renderingService.executeCodeHighlighting(code, language)
  }

  private executeFallbackHighlightManagement(code: string, language: string): string {
    // Fallback highlight management
    try {
      return highlight(code, { language: 'markdown' })
    } catch (error) {
      console.error('Fallback highlight management also failed:', error)
      return code
    }
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedHighlightingEnabled: boolean
    languageProcessingEnabled: boolean
    renderingOptimizationEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateHighlightConfiguration(),
      enhancedHighlightingEnabled: this.configurationManager.isHighlightOptimizationEnabled(),
      languageProcessingEnabled: this.configurationManager.isLanguageValidationEnabled(),
      renderingOptimizationEnabled: this.configurationManager.isHighlightOptimizationEnabled()
    }
  }

  public getConfigurationManager(): CynerCodeHighlightConfigurationManager {
    return this.configurationManager
  }

  public getLanguageProcessor(): CynerCodeHighlightLanguageProcessor {
    return this.languageProcessor
  }

  public getRenderingService(): CynerCodeHighlightRenderingService {
    return this.renderingService
  }
}

type Props = {
  code: string
  language: string
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerCodeHighlightConfigurationManager()
const defaultLanguageProcessor = new CynerCodeHighlightLanguageProcessor(defaultConfigurationManager)
const defaultRenderingService = new CynerCodeHighlightRenderingService(
  defaultConfigurationManager,
  defaultLanguageProcessor
)
const defaultCodeHighlightService = new CynerCodeHighlightService(
  defaultConfigurationManager,
  defaultLanguageProcessor,
  defaultRenderingService
)

export function HighlightedCode({ code, language }: Props): React.ReactElement {
  const highlightedCode = useMemo(() => {
    try {
      if (supportsLanguage(language)) {
        return highlight(code, { language })
      } else {
        logError(
          `Language not supported while highlighting code, falling back to markdown: ${language}`,
        )
        return highlight(code, { language: 'markdown' })
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Unknown language')) {
        logError(
          `Language not supported while highlighting code, falling back to markdown: ${e}`,
        )
        return highlight(code, { language: 'markdown' })
      }
    }
  }, [code, language])

  return <Text>{highlightedCode}</Text>
}
