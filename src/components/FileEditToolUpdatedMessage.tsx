import { Hunk } from 'diff'
import { Box, Text } from 'ink'
import * as React from 'react'
import { intersperse } from '../utils/array'
import { StructuredDiff } from './StructuredDiff'
import { getTheme } from '../utils/theme'
import { getCwd } from '../utils/state'
import { relative } from 'path'
import { useTerminalSize } from '../hooks/useTerminalSize'

/**
 * Alternative implementation of file edit tool updated message functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerFileEditMessageConfiguration {
  enablePathDisplayOptimization: boolean
  enableDiffStatistics: boolean
  enableStructuredDiffDisplay: boolean
  enablePathFormatting: boolean
  enableAdditionRemovalCounting: boolean
  enableVerboseMode: boolean
  enableResponsiveLayout: boolean
}

export interface CynerFileEditMessageContext {
  filePath: string
  structuredPatch: Hunk[]
  verbose: boolean
  terminalSize: { columns: number; rows: number }
  diffStatistics: {
    numAdditions: number
    numRemovals: number
  }
}

export interface CynerFileEditMessageActions {
  renderMessage: () => React.ReactNode
  calculateDiffStatistics: (patch: Hunk[]) => { numAdditions: number; numRemovals: number }
  formatFilePath: (filePath: string, verbose: boolean) => string
}

/**
 * Enhanced file edit message configuration manager
 */
export class CynerFileEditMessageConfigurationManager {
  private configuration: CynerFileEditMessageConfiguration

  constructor(customConfiguration?: Partial<CynerFileEditMessageConfiguration>) {
    this.configuration = {
      enablePathDisplayOptimization: true,
      enableDiffStatistics: true,
      enableStructuredDiffDisplay: true,
      enablePathFormatting: true,
      enableAdditionRemovalCounting: true,
      enableVerboseMode: true,
      enableResponsiveLayout: true,
      ...customConfiguration
    }
  }

  public getMessageConfiguration(): CynerFileEditMessageConfiguration {
    return { ...this.configuration }
  }

  public updateMessageConfiguration(updates: Partial<CynerFileEditMessageConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isPathDisplayOptimizationEnabled(): boolean {
    return this.configuration.enablePathDisplayOptimization
  }

  public isDiffStatisticsEnabled(): boolean {
    return this.configuration.enableDiffStatistics
  }

  public isStructuredDiffDisplayEnabled(): boolean {
    return this.configuration.enableStructuredDiffDisplay
  }

  public isPathFormattingEnabled(): boolean {
    return this.configuration.enablePathFormatting
  }

  public isAdditionRemovalCountingEnabled(): boolean {
    return this.configuration.enableAdditionRemovalCounting
  }

  public isVerboseModeEnabled(): boolean {
    return this.configuration.enableVerboseMode
  }

  public isResponsiveLayoutEnabled(): boolean {
    return this.configuration.enableResponsiveLayout
  }

  public validateMessageConfiguration(): boolean {
    const config = this.configuration
    return !!(
      typeof config.enablePathDisplayOptimization === 'boolean' &&
      typeof config.enableDiffStatistics === 'boolean' &&
      typeof config.enableStructuredDiffDisplay === 'boolean'
    )
  }
}

/**
 * Enhanced file edit message diff statistics processor
 */
export class CynerFileEditMessageDiffProcessor {
  private configurationManager: CynerFileEditMessageConfigurationManager

  constructor(configurationManager: CynerFileEditMessageConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process diff statistics with enhanced logic
   */
  public processDiffStatistics(structuredPatch: Hunk[]): { numAdditions: number; numRemovals: number } {
    if (!this.configurationManager.isDiffStatisticsEnabled()) {
      return { numAdditions: 0, numRemovals: 0 }
    }

    try {
      return this.executeDiffStatisticsCalculation(structuredPatch)
    } catch (error) {
      console.error('Diff statistics processing failed:', error)
      return { numAdditions: 0, numRemovals: 0 }
    }
  }

  private executeDiffStatisticsCalculation(structuredPatch: Hunk[]): { numAdditions: number; numRemovals: number } {
    if (!Array.isArray(structuredPatch)) {
      throw new Error('Invalid structured patch provided')
    }

    const numAdditions = this.configurationManager.isAdditionRemovalCountingEnabled()
      ? structuredPatch.reduce(
          (count, hunk) => count + hunk.lines.filter(_ => _.startsWith('+')).length,
          0,
        )
      : 0

    const numRemovals = this.configurationManager.isAdditionRemovalCountingEnabled()
      ? structuredPatch.reduce(
          (count, hunk) => count + hunk.lines.filter(_ => _.startsWith('-')).length,
          0,
        )
      : 0

    return { numAdditions, numRemovals }
  }

  /**
   * Process file path formatting with enhanced logic
   */
  public processFilePathFormatting(filePath: string, verbose: boolean): string {
    if (!this.configurationManager.isPathFormattingEnabled()) {
      return filePath
    }

    try {
      return this.executeFilePathFormatting(filePath, verbose)
    } catch (error) {
      console.error('File path formatting failed:', error)
      return filePath
    }
  }

  private executeFilePathFormatting(filePath: string, verbose: boolean): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided')
    }

    if (!this.configurationManager.isVerboseModeEnabled() && !verbose) {
      return filePath
    }

    if (verbose) {
      return filePath
    }

    try {
      return relative(getCwd(), filePath)
    } catch (error) {
      console.warn('Failed to calculate relative path, using absolute path:', error)
      return filePath
    }
  }

  public getProcessorStatistics(): {
    statisticsEnabled: boolean
    pathFormattingEnabled: boolean
    additionRemovalCountingEnabled: boolean
    verboseModeEnabled: boolean
  } {
    return {
      statisticsEnabled: this.configurationManager.isDiffStatisticsEnabled(),
      pathFormattingEnabled: this.configurationManager.isPathFormattingEnabled(),
      additionRemovalCountingEnabled: this.configurationManager.isAdditionRemovalCountingEnabled(),
      verboseModeEnabled: this.configurationManager.isVerboseModeEnabled()
    }
  }
}

/**
 * Enhanced file edit message rendering service
 */
export class CynerFileEditMessageRenderingService {
  private configurationManager: CynerFileEditMessageConfigurationManager
  private diffProcessor: CynerFileEditMessageDiffProcessor

  constructor(
    configurationManager: CynerFileEditMessageConfigurationManager,
    diffProcessor: CynerFileEditMessageDiffProcessor
  ) {
    this.configurationManager = configurationManager
    this.diffProcessor = diffProcessor
  }

  /**
   * Execute comprehensive file edit message rendering
   */
  public executeMessageRendering(props: Props): React.ReactNode {
    try {
      return this.executeEnhancedRendering(props)
    } catch (error) {
      console.error('File edit message rendering failed:', error)
      return this.executeFallbackRendering(props)
    }
  }

  private executeEnhancedRendering(props: Props): React.ReactNode {
    const { filePath, structuredPatch, verbose } = props

    const diffStats = this.diffProcessor.processDiffStatistics(structuredPatch)
    const formattedPath = this.diffProcessor.processFilePathFormatting(filePath, verbose)

    return this.executeCompleteRendering(formattedPath, structuredPatch, diffStats)
  }

  private executeFallbackRendering(props: Props): React.ReactNode {
    // Fallback rendering
    const { filePath, structuredPatch, verbose } = props
    const basicPath = verbose ? filePath : relative(getCwd(), filePath)
    const basicStats = { numAdditions: 0, numRemovals: 0 }

    return this.executeCompleteRendering(basicPath, structuredPatch, basicStats)
  }

  private executeCompleteRendering(
    formattedPath: string,
    structuredPatch: Hunk[],
    diffStats: { numAdditions: number; numRemovals: number }
  ): React.ReactNode {
    const { columns } = useTerminalSize()
    const { numAdditions, numRemovals } = diffStats

    return React.createElement(Box, { flexDirection: 'column' }, [
      React.createElement(Text, { key: 'header' }, [
        '  ⎿ Updated ',
        React.createElement(Text, { key: 'path', bold: true }, formattedPath),
        numAdditions > 0 || numRemovals > 0 ? ' with ' : '',
        numAdditions > 0 ? [
          React.createElement(Text, { key: 'additions', bold: true }, numAdditions.toString()),
          ' ',
          numAdditions > 1 ? 'additions' : 'addition'
        ] : null,
        numAdditions > 0 && numRemovals > 0 ? ' and ' : null,
        numRemovals > 0 ? [
          React.createElement(Text, { key: 'removals', bold: true }, numRemovals.toString()),
          ' ',
          numRemovals > 1 ? 'removals' : 'removal'
        ] : null
      ]),
      this.renderStructuredDiff(structuredPatch, columns)
    ])
  }

  private renderStructuredDiff(structuredPatch: Hunk[], columns: number): React.ReactNode {
    if (!this.configurationManager.isStructuredDiffDisplayEnabled()) {
      return null
    }

    return intersperse(
      structuredPatch.map(patch => 
        React.createElement(
          Box,
          { 
            key: patch.newStart,
            flexDirection: 'column',
            paddingLeft: 5
          },
          React.createElement(StructuredDiff, {
            patch,
            dim: false,
            width: this.configurationManager.isResponsiveLayoutEnabled() ? columns - 12 : columns
          })
        )
      ),
      i => React.createElement(
        Box,
        { 
          key: `ellipsis-${i}`,
          paddingLeft: 5
        },
        React.createElement(Text, { color: getTheme().secondaryText }, '...')
      )
    )
  }

  public getRenderingStatistics(): {
    pathOptimizationEnabled: boolean
    structuredDiffEnabled: boolean
    responsiveLayoutEnabled: boolean
    diffStatisticsEnabled: boolean
  } {
    return {
      pathOptimizationEnabled: this.configurationManager.isPathDisplayOptimizationEnabled(),
      structuredDiffEnabled: this.configurationManager.isStructuredDiffDisplayEnabled(),
      responsiveLayoutEnabled: this.configurationManager.isResponsiveLayoutEnabled(),
      diffStatisticsEnabled: this.configurationManager.isDiffStatisticsEnabled()
    }
  }
}

/**
 * Enhanced file edit message service with comprehensive message management
 */
export class CynerFileEditMessageService {
  private configurationManager: CynerFileEditMessageConfigurationManager
  private diffProcessor: CynerFileEditMessageDiffProcessor
  private renderingService: CynerFileEditMessageRenderingService

  constructor(
    configurationManager?: CynerFileEditMessageConfigurationManager,
    diffProcessor?: CynerFileEditMessageDiffProcessor,
    renderingService?: CynerFileEditMessageRenderingService
  ) {
    this.configurationManager = configurationManager || new CynerFileEditMessageConfigurationManager()
    this.diffProcessor = diffProcessor || new CynerFileEditMessageDiffProcessor(this.configurationManager)
    this.renderingService = renderingService || new CynerFileEditMessageRenderingService(
      this.configurationManager,
      this.diffProcessor
    )
  }

  /**
   * Execute comprehensive file edit message management
   */
  public executeFileEditMessageManagement(props: Props): React.ReactNode {
    try {
      return this.executeEnhancedMessageManagement(props)
    } catch (error) {
      console.error('File edit message management failed:', error)
      return this.executeFallbackMessageManagement(props)
    }
  }

  private executeEnhancedMessageManagement(props: Props): React.ReactNode {
    return this.renderingService.executeMessageRendering(props)
  }

  private executeFallbackMessageManagement(props: Props): React.ReactNode {
    // Fallback message management
    const { filePath, structuredPatch, verbose } = props
    const basicPath = verbose ? filePath : relative(getCwd(), filePath)

    return React.createElement(Box, { flexDirection: 'column' }, [
      React.createElement(Text, { key: 'fallback-header' }, [
        '  ⎿ Updated ',
        React.createElement(Text, { key: 'fallback-path', bold: true }, basicPath)
      ]),
      React.createElement(Text, { key: 'fallback-content' }, 'File has been updated')
    ])
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedRenderingEnabled: boolean
    diffProcessingEnabled: boolean
    pathOptimizationEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateMessageConfiguration(),
      enhancedRenderingEnabled: this.configurationManager.isStructuredDiffDisplayEnabled(),
      diffProcessingEnabled: this.configurationManager.isDiffStatisticsEnabled(),
      pathOptimizationEnabled: this.configurationManager.isPathDisplayOptimizationEnabled()
    }
  }

  public getConfigurationManager(): CynerFileEditMessageConfigurationManager {
    return this.configurationManager
  }

  public getDiffProcessor(): CynerFileEditMessageDiffProcessor {
    return this.diffProcessor
  }

  public getRenderingService(): CynerFileEditMessageRenderingService {
    return this.renderingService
  }
}

type Props = {
  filePath: string
  structuredPatch: Hunk[]
  verbose: boolean
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerFileEditMessageConfigurationManager()
const defaultDiffProcessor = new CynerFileEditMessageDiffProcessor(defaultConfigurationManager)
const defaultRenderingService = new CynerFileEditMessageRenderingService(
  defaultConfigurationManager,
  defaultDiffProcessor
)
const defaultFileEditMessageService = new CynerFileEditMessageService(
  defaultConfigurationManager,
  defaultDiffProcessor,
  defaultRenderingService
)

export function FileEditToolUpdatedMessage({
  filePath,
  structuredPatch,
  verbose,
}: Props): React.ReactNode {
  const { columns } = useTerminalSize()
  const numAdditions = structuredPatch.reduce(
    (count, hunk) => count + hunk.lines.filter(_ => _.startsWith('+')).length,
    0,
  )
  const numRemovals = structuredPatch.reduce(
    (count, hunk) => count + hunk.lines.filter(_ => _.startsWith('-')).length,
    0,
  )

  return (
    <Box flexDirection="column">
      <Text>
        {'  '}⎿ Updated{' '}
        <Text bold>{verbose ? filePath : relative(getCwd(), filePath)}</Text>
        {numAdditions > 0 || numRemovals > 0 ? ' with ' : ''}
        {numAdditions > 0 ? (
          <>
            <Text bold>{numAdditions}</Text>{' '}
            {numAdditions > 1 ? 'additions' : 'addition'}
          </>
        ) : null}
        {numAdditions > 0 && numRemovals > 0 ? ' and ' : null}
        {numRemovals > 0 ? (
          <>
            <Text bold>{numRemovals}</Text>{' '}
            {numRemovals > 1 ? 'removals' : 'removal'}
          </>
        ) : null}
      </Text>
      {intersperse(
        structuredPatch.map(_ => (
          <Box flexDirection="column" paddingLeft={5} key={_.newStart}>
            <StructuredDiff patch={_} dim={false} width={columns - 12} />
          </Box>
        )),
        i => (
          <Box paddingLeft={5} key={`ellipsis-${i}`}>
            <Text color={getTheme().secondaryText}>...</Text>
          </Box>
        ),
      )}
    </Box>
  )
}
