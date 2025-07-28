import InkLink from 'ink-link'
import { Text } from 'ink'
import React from 'react'
import { env } from '../utils/env'

/**
 * Alternative implementation of link functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerLinkConfiguration {
  enableTerminalSupport: boolean
  enableHyperlinkDetection: boolean
  enableFallbackRendering: boolean
  enableContentOptimization: boolean
  enableUnderlineStyle: boolean
  enableEnvironmentDetection: boolean
  enableLinkValidation: boolean
}

export interface CynerLinkContext {
  url: string
  children?: React.ReactNode
  linkConfiguration: CynerLinkConfiguration
  terminalInfo: {
    name: string | undefined
    supportsLinks: boolean
  }
  displayContent: React.ReactNode
}

export interface CynerLinkActions {
  renderLink: () => React.ReactNode
  determineLinkSupport: (terminal: string | undefined) => boolean
  formatDisplayContent: (url: string, children?: React.ReactNode) => React.ReactNode
}

/**
 * Enhanced link configuration manager
 */
export class CynerLinkConfigurationManager {
  private configuration: CynerLinkConfiguration
  private supportedTerminals: string[]

  constructor(
    customConfiguration?: Partial<CynerLinkConfiguration>,
    supportedTerminals?: string[]
  ) {
    this.configuration = {
      enableTerminalSupport: true,
      enableHyperlinkDetection: true,
      enableFallbackRendering: true,
      enableContentOptimization: true,
      enableUnderlineStyle: true,
      enableEnvironmentDetection: true,
      enableLinkValidation: true,
      ...customConfiguration
    }
    this.supportedTerminals = supportedTerminals || ['iTerm.app', 'WezTerm', 'Hyper', 'VSCode']
  }

  public getLinkConfiguration(): CynerLinkConfiguration {
    return { ...this.configuration }
  }

  public updateLinkConfiguration(updates: Partial<CynerLinkConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isTerminalSupportEnabled(): boolean {
    return this.configuration.enableTerminalSupport
  }

  public isHyperlinkDetectionEnabled(): boolean {
    return this.configuration.enableHyperlinkDetection
  }

  public isFallbackRenderingEnabled(): boolean {
    return this.configuration.enableFallbackRendering
  }

  public isContentOptimizationEnabled(): boolean {
    return this.configuration.enableContentOptimization
  }

  public isUnderlineStyleEnabled(): boolean {
    return this.configuration.enableUnderlineStyle
  }

  public isEnvironmentDetectionEnabled(): boolean {
    return this.configuration.enableEnvironmentDetection
  }

  public isLinkValidationEnabled(): boolean {
    return this.configuration.enableLinkValidation
  }

  public getSupportedTerminals(): string[] {
    return [...this.supportedTerminals]
  }

  public addSupportedTerminal(terminal: string): void {
    if (!this.supportedTerminals.includes(terminal)) {
      this.supportedTerminals.push(terminal)
    }
  }

  public removeSupportedTerminal(terminal: string): void {
    this.supportedTerminals = this.supportedTerminals.filter(t => t !== terminal)
  }

  public validateLinkConfiguration(): boolean {
    const config = this.configuration
    return !!(
      typeof config.enableTerminalSupport === 'boolean' &&
      typeof config.enableHyperlinkDetection === 'boolean' &&
      typeof config.enableFallbackRendering === 'boolean'
    )
  }
}

/**
 * Enhanced link terminal detector
 */
export class CynerLinkTerminalDetector {
  private configurationManager: CynerLinkConfigurationManager

  constructor(configurationManager: CynerLinkConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process terminal support detection with enhanced logic
   */
  public processTerminalSupportDetection(terminal: string | undefined): boolean {
    if (!this.configurationManager.isTerminalSupportEnabled()) {
      return false
    }

    try {
      return this.executeTerminalDetection(terminal)
    } catch (error) {
      console.error('Terminal support detection failed:', error)
      return false
    }
  }

  private executeTerminalDetection(terminal: string | undefined): boolean {
    if (!this.configurationManager.isEnvironmentDetectionEnabled()) {
      return true // Assume support if detection is disabled
    }

    if (!terminal || typeof terminal !== 'string') {
      return false
    }

    const supportedTerminals = this.configurationManager.getSupportedTerminals()
    return supportedTerminals.includes(terminal)
  }

  /**
   * Process environment information gathering
   */
  public processEnvironmentInfo(): { name: string | undefined; supportsLinks: boolean } {
    try {
      return this.executeEnvironmentInfoGathering()
    } catch (error) {
      console.error('Environment info gathering failed:', error)
      return { name: undefined, supportsLinks: false }
    }
  }

  private executeEnvironmentInfoGathering(): { name: string | undefined; supportsLinks: boolean } {
    const terminalName = this.configurationManager.isEnvironmentDetectionEnabled() 
      ? env.terminal 
      : undefined

    const supportsLinks = this.processTerminalSupportDetection(terminalName)

    return {
      name: terminalName,
      supportsLinks
    }
  }

  public getDetectorStatistics(): {
    terminalSupportEnabled: boolean
    environmentDetectionEnabled: boolean
    supportedTerminalsCount: number
    hyperlinkDetectionEnabled: boolean
  } {
    return {
      terminalSupportEnabled: this.configurationManager.isTerminalSupportEnabled(),
      environmentDetectionEnabled: this.configurationManager.isEnvironmentDetectionEnabled(),
      supportedTerminalsCount: this.configurationManager.getSupportedTerminals().length,
      hyperlinkDetectionEnabled: this.configurationManager.isHyperlinkDetectionEnabled()
    }
  }
}

/**
 * Enhanced link content processor
 */
export class CynerLinkContentProcessor {
  private configurationManager: CynerLinkConfigurationManager

  constructor(configurationManager: CynerLinkConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process display content determination with enhanced logic
   */
  public processDisplayContent(url: string, children?: React.ReactNode): React.ReactNode {
    if (!this.configurationManager.isContentOptimizationEnabled()) {
      return children || url
    }

    try {
      return this.executeContentProcessing(url, children)
    } catch (error) {
      console.error('Display content processing failed:', error)
      return url
    }
  }

  private executeContentProcessing(url: string, children?: React.ReactNode): React.ReactNode {
    this.validateContentInput(url)

    // Determine what text to display - use children or fall back to the URL itself
    return children || url
  }

  private validateContentInput(url: string): void {
    if (this.configurationManager.isLinkValidationEnabled()) {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL parameter provided')
      }
    }
  }

  /**
   * Process link rendering strategy determination
   */
  public processRenderingStrategy(
    url: string,
    displayContent: React.ReactNode,
    supportsLinks: boolean
  ): 'hyperlink' | 'underline' | 'plain' {
    try {
      return this.executeRenderingStrategyDetermination(url, displayContent, supportsLinks)
    } catch (error) {
      console.error('Rendering strategy determination failed:', error)
      return 'plain'
    }
  }

  private executeRenderingStrategyDetermination(
    url: string,
    displayContent: React.ReactNode,
    supportsLinks: boolean
  ): 'hyperlink' | 'underline' | 'plain' {
    // Use InkLink to get clickable links when we can, or to get a nice fallback when we can't
    if (supportsLinks || displayContent !== url) {
      return 'hyperlink'
    }

    // But if we don't have a title and just have a url *and* are not a terminal that supports links
    // that doesn't support clickable links anyway, just show the URL with underline
    if (this.configurationManager.isUnderlineStyleEnabled()) {
      return 'underline'
    }

    return 'plain'
  }

  public getProcessorStatistics(): {
    contentOptimizationEnabled: boolean
    linkValidationEnabled: boolean
    underlineStyleEnabled: boolean
    fallbackRenderingEnabled: boolean
  } {
    return {
      contentOptimizationEnabled: this.configurationManager.isContentOptimizationEnabled(),
      linkValidationEnabled: this.configurationManager.isLinkValidationEnabled(),
      underlineStyleEnabled: this.configurationManager.isUnderlineStyleEnabled(),
      fallbackRenderingEnabled: this.configurationManager.isFallbackRenderingEnabled()
    }
  }
}

/**
 * Enhanced link rendering service
 */
export class CynerLinkRenderingService {
  private configurationManager: CynerLinkConfigurationManager
  private terminalDetector: CynerLinkTerminalDetector
  private contentProcessor: CynerLinkContentProcessor

  constructor(
    configurationManager: CynerLinkConfigurationManager,
    terminalDetector: CynerLinkTerminalDetector,
    contentProcessor: CynerLinkContentProcessor
  ) {
    this.configurationManager = configurationManager
    this.terminalDetector = terminalDetector
    this.contentProcessor = contentProcessor
  }

  /**
   * Execute comprehensive link rendering
   */
  public executeLinkRendering(url: string, children?: React.ReactNode): React.ReactNode {
    try {
      return this.executeEnhancedRendering(url, children)
    } catch (error) {
      console.error('Link rendering failed:', error)
      return this.executeFallbackRendering(url, children)
    }
  }

  private executeEnhancedRendering(url: string, children?: React.ReactNode): React.ReactNode {
    const environmentInfo = this.terminalDetector.processEnvironmentInfo()
    const displayContent = this.contentProcessor.processDisplayContent(url, children)
    const renderingStrategy = this.contentProcessor.processRenderingStrategy(
      url,
      displayContent,
      environmentInfo.supportsLinks
    )

    return this.executeRenderingByStrategy(url, displayContent, renderingStrategy)
  }

  private executeFallbackRendering(url: string, children?: React.ReactNode): React.ReactNode {
    // Fallback rendering
    const displayContent = children || url
    return React.createElement(Text, {}, displayContent)
  }

  private executeRenderingByStrategy(
    url: string,
    displayContent: React.ReactNode,
    strategy: 'hyperlink' | 'underline' | 'plain'
  ): React.ReactNode {
    switch (strategy) {
      case 'hyperlink':
        return React.createElement(
          InkLink,
          { url },
          React.createElement(Text, {}, displayContent)
        )
      
      case 'underline':
        return React.createElement(Text, { underline: true }, displayContent)
      
      case 'plain':
      default:
        return React.createElement(Text, {}, displayContent)
    }
  }

  public getRenderingStatistics(): {
    hyperlinkDetectionEnabled: boolean
    fallbackRenderingEnabled: boolean
    terminalSupportEnabled: boolean
    contentOptimizationEnabled: boolean
  } {
    return {
      hyperlinkDetectionEnabled: this.configurationManager.isHyperlinkDetectionEnabled(),
      fallbackRenderingEnabled: this.configurationManager.isFallbackRenderingEnabled(),
      terminalSupportEnabled: this.configurationManager.isTerminalSupportEnabled(),
      contentOptimizationEnabled: this.configurationManager.isContentOptimizationEnabled()
    }
  }
}

/**
 * Enhanced link service with comprehensive link management
 */
export class CynerLinkService {
  private configurationManager: CynerLinkConfigurationManager
  private terminalDetector: CynerLinkTerminalDetector
  private contentProcessor: CynerLinkContentProcessor
  private renderingService: CynerLinkRenderingService

  constructor(
    configurationManager?: CynerLinkConfigurationManager,
    terminalDetector?: CynerLinkTerminalDetector,
    contentProcessor?: CynerLinkContentProcessor,
    renderingService?: CynerLinkRenderingService
  ) {
    this.configurationManager = configurationManager || new CynerLinkConfigurationManager()
    this.terminalDetector = terminalDetector || new CynerLinkTerminalDetector(this.configurationManager)
    this.contentProcessor = contentProcessor || new CynerLinkContentProcessor(this.configurationManager)
    this.renderingService = renderingService || new CynerLinkRenderingService(
      this.configurationManager,
      this.terminalDetector,
      this.contentProcessor
    )
  }

  /**
   * Execute comprehensive link management
   */
  public executeLinkManagement(url: string, children?: React.ReactNode): React.ReactNode {
    try {
      return this.executeEnhancedLinkManagement(url, children)
    } catch (error) {
      console.error('Link management failed:', error)
      return this.executeFallbackLinkManagement(url, children)
    }
  }

  private executeEnhancedLinkManagement(url: string, children?: React.ReactNode): React.ReactNode {
    return this.renderingService.executeLinkRendering(url, children)
  }

  private executeFallbackLinkManagement(url: string, children?: React.ReactNode): React.ReactNode {
    // Fallback link management
    const displayContent = children || url
    return React.createElement(Text, {}, displayContent)
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedRenderingEnabled: boolean
    terminalDetectionEnabled: boolean
    contentProcessingEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateLinkConfiguration(),
      enhancedRenderingEnabled: this.configurationManager.isHyperlinkDetectionEnabled(),
      terminalDetectionEnabled: this.configurationManager.isTerminalSupportEnabled(),
      contentProcessingEnabled: this.configurationManager.isContentOptimizationEnabled()
    }
  }

  public getConfigurationManager(): CynerLinkConfigurationManager {
    return this.configurationManager
  }

  public getTerminalDetector(): CynerLinkTerminalDetector {
    return this.terminalDetector
  }

  public getContentProcessor(): CynerLinkContentProcessor {
    return this.contentProcessor
  }

  public getRenderingService(): CynerLinkRenderingService {
    return this.renderingService
  }
}

type LinkProps = {
  url: string
  children?: React.ReactNode
}

// Terminals that support hyperlinks
const LINK_SUPPORTING_TERMINALS = ['iTerm.app', 'WezTerm', 'Hyper', 'VSCode']

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerLinkConfigurationManager()
const defaultTerminalDetector = new CynerLinkTerminalDetector(defaultConfigurationManager)
const defaultContentProcessor = new CynerLinkContentProcessor(defaultConfigurationManager)
const defaultRenderingService = new CynerLinkRenderingService(
  defaultConfigurationManager,
  defaultTerminalDetector,
  defaultContentProcessor
)
const defaultLinkService = new CynerLinkService(
  defaultConfigurationManager,
  defaultTerminalDetector,
  defaultContentProcessor,
  defaultRenderingService
)

export default function Link({ url, children }: LinkProps): React.ReactNode {
  const supportsLinks = LINK_SUPPORTING_TERMINALS.includes(env.terminal ?? '')

  // Determine what text to display - use children or fall back to the URL itself
  const displayContent = children || url

  // Use InkLink to get clickable links when we can, or to get a nice fallback when we can't
  if (supportsLinks || displayContent !== url) {
    return (
      <InkLink url={url}>
        <Text>{displayContent}</Text>
      </InkLink>
    )
  } else {
    // But if we don't have a title and just have a url *and* are not a terminal that supports links
    // that doesn't support clickable links anyway, just show the URL
    return <Text underline>{displayContent}</Text>
  }
}
