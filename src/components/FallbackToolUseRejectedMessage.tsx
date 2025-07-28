import * as React from 'react'
import { getTheme } from '../utils/theme'
import { Text } from 'ink'
import { PRODUCT_NAME } from '../constants/product'

/**
 * Alternative implementation of fallback tool use rejected message functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerFallbackMessageConfiguration {
  enableThemeIntegration: boolean
  enableProductNameDisplay: boolean
  enableMessageFormatting: boolean
  enableErrorStyling: boolean
  enableMessageValidation: boolean
  enableRenderingOptimization: boolean
  enableContentCustomization: boolean
}

export interface CynerFallbackMessageContext {
  productName: string
  theme: any
  messageConfiguration: CynerFallbackMessageConfiguration
  formattingOptions: {
    prefix: string
    errorColor: string
    baseMessage: string
  }
}

export interface CynerFallbackMessageActions {
  renderMessage: () => React.ReactNode
  formatMessage: (productName: string) => string
  validateMessageContent: () => boolean
}

/**
 * Enhanced fallback message configuration manager
 */
export class CynerFallbackMessageConfigurationManager {
  private configuration: CynerFallbackMessageConfiguration

  constructor(customConfiguration?: Partial<CynerFallbackMessageConfiguration>) {
    this.configuration = {
      enableThemeIntegration: true,
      enableProductNameDisplay: true,
      enableMessageFormatting: true,
      enableErrorStyling: true,
      enableMessageValidation: true,
      enableRenderingOptimization: true,
      enableContentCustomization: true,
      ...customConfiguration
    }
  }

  public getMessageConfiguration(): CynerFallbackMessageConfiguration {
    return { ...this.configuration }
  }

  public updateMessageConfiguration(updates: Partial<CynerFallbackMessageConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isThemeIntegrationEnabled(): boolean {
    return this.configuration.enableThemeIntegration
  }

  public isProductNameDisplayEnabled(): boolean {
    return this.configuration.enableProductNameDisplay
  }

  public isMessageFormattingEnabled(): boolean {
    return this.configuration.enableMessageFormatting
  }

  public isErrorStylingEnabled(): boolean {
    return this.configuration.enableErrorStyling
  }

  public isMessageValidationEnabled(): boolean {
    return this.configuration.enableMessageValidation
  }

  public isRenderingOptimizationEnabled(): boolean {
    return this.configuration.enableRenderingOptimization
  }

  public isContentCustomizationEnabled(): boolean {
    return this.configuration.enableContentCustomization
  }

  public validateMessageConfiguration(): boolean {
    const config = this.configuration
    return !!(
      typeof config.enableThemeIntegration === 'boolean' &&
      typeof config.enableProductNameDisplay === 'boolean' &&
      typeof config.enableMessageFormatting === 'boolean'
    )
  }
}

/**
 * Enhanced fallback message content processor
 */
export class CynerFallbackMessageContentProcessor {
  private configurationManager: CynerFallbackMessageConfigurationManager

  constructor(configurationManager: CynerFallbackMessageConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process message content with enhanced logic
   */
  public processMessageContent(productName: string): string {
    try {
      return this.executeContentProcessingWithValidation(productName)
    } catch (error) {
      console.error('Message content processing failed:', error)
      return this.executeFallbackContentProcessing(productName)
    }
  }

  private executeContentProcessingWithValidation(productName: string): string {
    if (this.configurationManager.isMessageValidationEnabled()) {
      this.validateContentInput(productName)
    }

    return this.executeEnhancedContentFormatting(productName)
  }

  private executeFallbackContentProcessing(productName: string): string {
    // Fallback content processing
    return `No (tell ${productName} what to do differently)`
  }

  private validateContentInput(productName: string): void {
    if (!productName || typeof productName !== 'string') {
      throw new Error('Invalid product name provided for message content')
    }
  }

  private executeEnhancedContentFormatting(productName: string): string {
    if (!this.configurationManager.isMessageFormattingEnabled()) {
      return `No (tell ${productName} what to do differently)`
    }

    const formattedProductName = this.configurationManager.isProductNameDisplayEnabled() 
      ? productName 
      : 'the system'

    return `No (tell ${formattedProductName} what to do differently)`
  }

  public getProcessorStatistics(): {
    validationEnabled: boolean
    formattingEnabled: boolean
    productNameDisplayEnabled: boolean
    contentCustomizationEnabled: boolean
  } {
    return {
      validationEnabled: this.configurationManager.isMessageValidationEnabled(),
      formattingEnabled: this.configurationManager.isMessageFormattingEnabled(),
      productNameDisplayEnabled: this.configurationManager.isProductNameDisplayEnabled(),
      contentCustomizationEnabled: this.configurationManager.isContentCustomizationEnabled()
    }
  }
}

/**
 * Enhanced fallback message rendering service
 */
export class CynerFallbackMessageRenderingService {
  private configurationManager: CynerFallbackMessageConfigurationManager
  private contentProcessor: CynerFallbackMessageContentProcessor

  constructor(
    configurationManager: CynerFallbackMessageConfigurationManager,
    contentProcessor: CynerFallbackMessageContentProcessor
  ) {
    this.configurationManager = configurationManager
    this.contentProcessor = contentProcessor
  }

  /**
   * Execute comprehensive message rendering
   */
  public executeMessageRendering(productName: string): React.ReactNode {
    try {
      return this.executeEnhancedRendering(productName)
    } catch (error) {
      console.error('Message rendering failed:', error)
      return this.executeFallbackRendering(productName)
    }
  }

  private executeEnhancedRendering(productName: string): React.ReactNode {
    if (!this.configurationManager.isRenderingOptimizationEnabled()) {
      return this.executeFallbackRendering(productName)
    }

    const messageContent = this.contentProcessor.processMessageContent(productName)
    return this.executeStyledRendering(messageContent)
  }

  private executeFallbackRendering(productName: string): React.ReactNode {
    // Fallback rendering
    const messageContent = `No (tell ${productName} what to do differently)`
    return this.executeBasicRendering(messageContent)
  }

  private executeStyledRendering(messageContent: string): React.ReactNode {
    const theme = this.configurationManager.isThemeIntegrationEnabled() ? getTheme() : null
    const errorColor = theme?.error || 'red'

    return React.createElement(Text, {}, [
      '\u00A0\u00A0⎿ \u00A0',
      React.createElement(
        Text,
        {
          key: 'error-message',
          color: this.configurationManager.isErrorStylingEnabled() ? errorColor : undefined
        },
        messageContent
      )
    ])
  }

  private executeBasicRendering(messageContent: string): React.ReactNode {
    return React.createElement(Text, {}, [
      '\u00A0\u00A0⎿ \u00A0',
      React.createElement(Text, { key: 'basic-message' }, messageContent)
    ])
  }

  public getRenderingStatistics(): {
    optimizationEnabled: boolean
    themeIntegrationEnabled: boolean
    errorStylingEnabled: boolean
    contentCustomizationEnabled: boolean
  } {
    return {
      optimizationEnabled: this.configurationManager.isRenderingOptimizationEnabled(),
      themeIntegrationEnabled: this.configurationManager.isThemeIntegrationEnabled(),
      errorStylingEnabled: this.configurationManager.isErrorStylingEnabled(),
      contentCustomizationEnabled: this.configurationManager.isContentCustomizationEnabled()
    }
  }
}

/**
 * Enhanced fallback message service with comprehensive message management
 */
export class CynerFallbackMessageService {
  private configurationManager: CynerFallbackMessageConfigurationManager
  private contentProcessor: CynerFallbackMessageContentProcessor
  private renderingService: CynerFallbackMessageRenderingService

  constructor(
    configurationManager?: CynerFallbackMessageConfigurationManager,
    contentProcessor?: CynerFallbackMessageContentProcessor,
    renderingService?: CynerFallbackMessageRenderingService
  ) {
    this.configurationManager = configurationManager || new CynerFallbackMessageConfigurationManager()
    this.contentProcessor = contentProcessor || new CynerFallbackMessageContentProcessor(this.configurationManager)
    this.renderingService = renderingService || new CynerFallbackMessageRenderingService(
      this.configurationManager,
      this.contentProcessor
    )
  }

  /**
   * Execute comprehensive fallback message management
   */
  public executeFallbackMessageManagement(): React.ReactNode {
    try {
      return this.executeEnhancedMessageManagement()
    } catch (error) {
      console.error('Fallback message management failed:', error)
      return this.executeFallbackMessageRendering()
    }
  }

  private executeEnhancedMessageManagement(): React.ReactNode {
    const productName = PRODUCT_NAME
    return this.renderingService.executeMessageRendering(productName)
  }

  private executeFallbackMessageRendering(): React.ReactNode {
    // Fallback message management
    return React.createElement(Text, {}, [
      '\u00A0\u00A0⎿ \u00A0',
      React.createElement(
        Text,
        { key: 'fallback-message', color: 'red' },
        `No (tell ${PRODUCT_NAME} what to do differently)`
      )
    ])
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedRenderingEnabled: boolean
    contentProcessingEnabled: boolean
    themeIntegrationEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateMessageConfiguration(),
      enhancedRenderingEnabled: this.configurationManager.isRenderingOptimizationEnabled(),
      contentProcessingEnabled: this.configurationManager.isMessageFormattingEnabled(),
      themeIntegrationEnabled: this.configurationManager.isThemeIntegrationEnabled()
    }
  }

  public getConfigurationManager(): CynerFallbackMessageConfigurationManager {
    return this.configurationManager
  }

  public getContentProcessor(): CynerFallbackMessageContentProcessor {
    return this.contentProcessor
  }

  public getRenderingService(): CynerFallbackMessageRenderingService {
    return this.renderingService
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerFallbackMessageConfigurationManager()
const defaultContentProcessor = new CynerFallbackMessageContentProcessor(defaultConfigurationManager)
const defaultRenderingService = new CynerFallbackMessageRenderingService(
  defaultConfigurationManager,
  defaultContentProcessor
)
const defaultFallbackMessageService = new CynerFallbackMessageService(
  defaultConfigurationManager,
  defaultContentProcessor,
  defaultRenderingService
)

export function FallbackToolUseRejectedMessage(): React.ReactNode {
  return (
    <Text>
      &nbsp;&nbsp;⎿ &nbsp;
      <Text color={getTheme().error}>
        No (tell {PRODUCT_NAME} what to do differently)
      </Text>
    </Text>
  )
}
