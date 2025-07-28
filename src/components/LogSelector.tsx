import React from 'react'
import { Box, Text } from 'ink'
import { Select } from '@inkjs/ui'
import { getTheme } from '../utils/theme'
import { useTerminalSize } from '../hooks/useTerminalSize'
import { formatDate } from '../utils/log'

/**
 * Alternative implementation of log selector functionality
 * Maintains same logic with enhanced patterns and organization
 */

// Define LogOption interface locally since types/logs doesn't exist
export interface LogOption {
  date: string
  forkNumber: number | undefined
  fullPath: string
  messages: any[]
  value: number
  created: Date
  modified: Date
  firstPrompt: string
  messageCount: number
  sidechainNumber: number | undefined
}

export interface CynerLogSelectorConfiguration {
  enableResponsiveLayout: boolean
  enableDateFormatting: boolean
  enableColumnWidthOptimization: boolean
  enableMessageCountDisplay: boolean
  enableBranchInfoDisplay: boolean
  enableTruncationHandling: boolean
  enableHeaderDisplay: boolean
}

export interface CynerLogSelectorContext {
  logs: LogOption[]
  onSelect: (logValue: number) => void
  terminalSize: { rows: number; columns: number }
  layoutConfiguration: {
    indexWidth: number
    modifiedWidth: number
    createdWidth: number
    countWidth: number
  }
}

export interface CynerLogSelectorActions {
  renderLogSelector: () => React.ReactNode
  formatLogOptions: (logs: LogOption[]) => Array<{ label: string; value: string }>
  calculateLayoutDimensions: (terminalSize: { rows: number; columns: number }) => any
}

/**
 * Enhanced log selector configuration manager
 */
export class CynerLogSelectorConfigurationManager {
  private configuration: CynerLogSelectorConfiguration

  constructor(customConfiguration?: Partial<CynerLogSelectorConfiguration>) {
    this.configuration = {
      enableResponsiveLayout: true,
      enableDateFormatting: true,
      enableColumnWidthOptimization: true,
      enableMessageCountDisplay: true,
      enableBranchInfoDisplay: true,
      enableTruncationHandling: true,
      enableHeaderDisplay: true,
      ...customConfiguration
    }
  }

  public getSelectorConfiguration(): CynerLogSelectorConfiguration {
    return { ...this.configuration }
  }

  public updateSelectorConfiguration(updates: Partial<CynerLogSelectorConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isResponsiveLayoutEnabled(): boolean {
    return this.configuration.enableResponsiveLayout
  }

  public isDateFormattingEnabled(): boolean {
    return this.configuration.enableDateFormatting
  }

  public isColumnWidthOptimizationEnabled(): boolean {
    return this.configuration.enableColumnWidthOptimization
  }

  public isMessageCountDisplayEnabled(): boolean {
    return this.configuration.enableMessageCountDisplay
  }

  public isBranchInfoDisplayEnabled(): boolean {
    return this.configuration.enableBranchInfoDisplay
  }

  public isTruncationHandlingEnabled(): boolean {
    return this.configuration.enableTruncationHandling
  }

  public isHeaderDisplayEnabled(): boolean {
    return this.configuration.enableHeaderDisplay
  }

  public validateSelectorConfiguration(): boolean {
    const config = this.configuration
    return !!(
      typeof config.enableResponsiveLayout === 'boolean' &&
      typeof config.enableDateFormatting === 'boolean' &&
      typeof config.enableColumnWidthOptimization === 'boolean'
    )
  }
}

/**
 * Enhanced log selector layout processor
 */
export class CynerLogSelectorLayoutProcessor {
  private configurationManager: CynerLogSelectorConfigurationManager

  constructor(configurationManager: CynerLogSelectorConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process layout calculations with enhanced logic
   */
  public processLayoutCalculations(terminalSize: { rows: number; columns: number }): {
    visibleCount: number
    hiddenCount: number
    columnWidths: {
      indexWidth: number
      modifiedWidth: number
      createdWidth: number
      countWidth: number
    }
  } {
    try {
      return this.executeLayoutCalculations(terminalSize)
    } catch (error) {
      console.error('Layout calculations failed:', error)
      return this.executeFallbackLayoutCalculations(terminalSize)
    }
  }

  private executeLayoutCalculations(terminalSize: { rows: number; columns: number }): {
    visibleCount: number
    hiddenCount: number
    columnWidths: {
      indexWidth: number
      modifiedWidth: number
      createdWidth: number
      countWidth: number
    }
  } {
    const { rows, columns } = terminalSize

    const visibleCount = this.configurationManager.isResponsiveLayoutEnabled()
      ? Math.max(1, rows - 3) // Account for header and footer
      : 10 // Default fallback

    const columnWidths = this.configurationManager.isColumnWidthOptimizationEnabled()
      ? this.calculateOptimizedColumnWidths(columns)
      : this.getDefaultColumnWidths()

    return {
      visibleCount,
      hiddenCount: 0, // Will be calculated later based on logs length
      columnWidths
    }
  }

  private executeFallbackLayoutCalculations(terminalSize: { rows: number; columns: number }): {
    visibleCount: number
    hiddenCount: number
    columnWidths: {
      indexWidth: number
      modifiedWidth: number
      createdWidth: number
      countWidth: number
    }
  } {
    return {
      visibleCount: 10,
      hiddenCount: 0,
      columnWidths: this.getDefaultColumnWidths()
    }
  }

  private calculateOptimizedColumnWidths(columns: number): {
    indexWidth: number
    modifiedWidth: number
    createdWidth: number
    countWidth: number
  } {
    // Responsive column width calculation
    const availableWidth = Math.max(80, columns)
    
    return {
      indexWidth: Math.min(7, Math.floor(availableWidth * 0.08)), // [0] to [99] with extra spaces
      modifiedWidth: Math.min(21, Math.floor(availableWidth * 0.25)), // "Yesterday at 7:49 pm" with space
      createdWidth: Math.min(21, Math.floor(availableWidth * 0.25)), // "Yesterday at 7:49 pm" with space
      countWidth: Math.min(9, Math.floor(availableWidth * 0.1)) // "999 msgs" (right-aligned)
    }
  }

  private getDefaultColumnWidths(): {
    indexWidth: number
    modifiedWidth: number
    createdWidth: number
    countWidth: number
  } {
    return {
      indexWidth: 7, // [0] to [99] with extra spaces
      modifiedWidth: 21, // "Yesterday at 7:49 pm" with space
      createdWidth: 21, // "Yesterday at 7:49 pm" with space
      countWidth: 9 // "999 msgs" (right-aligned)
    }
  }

  public getProcessorStatistics(): {
    responsiveLayoutEnabled: boolean
    columnOptimizationEnabled: boolean
    truncationHandlingEnabled: boolean
  } {
    return {
      responsiveLayoutEnabled: this.configurationManager.isResponsiveLayoutEnabled(),
      columnOptimizationEnabled: this.configurationManager.isColumnWidthOptimizationEnabled(),
      truncationHandlingEnabled: this.configurationManager.isTruncationHandlingEnabled()
    }
  }
}

/**
 * Enhanced log selector option formatter
 */
export class CynerLogSelectorOptionFormatter {
  private configurationManager: CynerLogSelectorConfigurationManager
  private layoutProcessor: CynerLogSelectorLayoutProcessor

  constructor(
    configurationManager: CynerLogSelectorConfigurationManager,
    layoutProcessor: CynerLogSelectorLayoutProcessor
  ) {
    this.configurationManager = configurationManager
    this.layoutProcessor = layoutProcessor
  }

  /**
   * Process log option formatting with enhanced logic
   */
  public processLogOptionFormatting(
    logs: LogOption[],
    columnWidths: any,
    columns: number
  ): Array<{ label: string; value: string }> {
    try {
      return this.executeOptionFormatting(logs, columnWidths, columns)
    } catch (error) {
      console.error('Log option formatting failed:', error)
      return this.executeFallbackOptionFormatting(logs)
    }
  }

  private executeOptionFormatting(
    logs: LogOption[],
    columnWidths: any,
    columns: number
  ): Array<{ label: string; value: string }> {
    if (!Array.isArray(logs)) {
      throw new Error('Invalid logs array provided')
    }

    return logs.map((log, i) => {
      const formattedOption = this.formatSingleLogOption(log, i, columnWidths, columns)
      return {
        label: formattedOption,
        value: log.value.toString()
      }
    })
  }

  private executeFallbackOptionFormatting(logs: LogOption[]): Array<{ label: string; value: string }> {
    // Fallback option formatting
    return logs.map((log, i) => ({
      label: `[${i}] ${log.firstPrompt}`,
      value: log.value.toString()
    }))
  }

  private formatSingleLogOption(
    log: LogOption,
    index: number,
    columnWidths: any,
    columns: number
  ): string {
    const indexStr = `[${index}]`.padEnd(columnWidths.indexWidth)
    
    const modified = this.configurationManager.isDateFormattingEnabled()
      ? formatDate(log.modified).padEnd(columnWidths.modifiedWidth)
      : log.modified.toString().padEnd(columnWidths.modifiedWidth)
    
    const created = this.configurationManager.isDateFormattingEnabled()
      ? formatDate(log.created).padEnd(columnWidths.createdWidth)
      : log.created.toString().padEnd(columnWidths.createdWidth)
    
    const msgCount = this.configurationManager.isMessageCountDisplayEnabled()
      ? `${log.messageCount}`.padStart(columnWidths.countWidth)
      : ''.padStart(columnWidths.countWidth)
    
    const prompt = log.firstPrompt
    
    let branchInfo = ''
    if (this.configurationManager.isBranchInfoDisplayEnabled()) {
      if (log.forkNumber) branchInfo += ` (fork #${log.forkNumber})`
      if (log.sidechainNumber) branchInfo += ` (sidechain #${log.sidechainNumber})`
    }

    const labelTxt = `${indexStr}${modified}${created}${msgCount} ${prompt}${branchInfo}`
    
    return this.configurationManager.isTruncationHandlingEnabled()
      ? this.applyTruncation(labelTxt, columns)
      : labelTxt
  }

  private applyTruncation(labelTxt: string, columns: number): string {
    const maxLength = columns - 2 // Account for "> " selection cursor
    return labelTxt.length > maxLength
      ? `${labelTxt.slice(0, maxLength - 3)}...`
      : labelTxt
  }

  public getFormatterStatistics(): {
    dateFormattingEnabled: boolean
    messageCountDisplayEnabled: boolean
    branchInfoDisplayEnabled: boolean
    truncationHandlingEnabled: boolean
  } {
    return {
      dateFormattingEnabled: this.configurationManager.isDateFormattingEnabled(),
      messageCountDisplayEnabled: this.configurationManager.isMessageCountDisplayEnabled(),
      branchInfoDisplayEnabled: this.configurationManager.isBranchInfoDisplayEnabled(),
      truncationHandlingEnabled: this.configurationManager.isTruncationHandlingEnabled()
    }
  }
}

/**
 * Enhanced log selector rendering service
 */
export class CynerLogSelectorRenderingService {
  private configurationManager: CynerLogSelectorConfigurationManager
  private layoutProcessor: CynerLogSelectorLayoutProcessor
  private optionFormatter: CynerLogSelectorOptionFormatter

  constructor(
    configurationManager: CynerLogSelectorConfigurationManager,
    layoutProcessor: CynerLogSelectorLayoutProcessor,
    optionFormatter: CynerLogSelectorOptionFormatter
  ) {
    this.configurationManager = configurationManager
    this.layoutProcessor = layoutProcessor
    this.optionFormatter = optionFormatter
  }

  /**
   * Execute comprehensive log selector rendering
   */
  public executeLogSelectorRendering(props: LogSelectorProps): React.ReactNode {
    try {
      return this.executeEnhancedRendering(props)
    } catch (error) {
      console.error('Log selector rendering failed:', error)
      return this.executeFallbackRendering(props)
    }
  }

  private executeEnhancedRendering(props: LogSelectorProps): React.ReactNode {
    const { logs, onSelect } = props
    
    if (logs.length === 0) {
      return null
    }

    const { rows, columns } = useTerminalSize()
    const layout = this.layoutProcessor.processLayoutCalculations({ rows, columns })
    const visibleCount = layout.visibleCount
    const hiddenCount = Math.max(0, logs.length - visibleCount)

    const options = this.optionFormatter.processLogOptionFormatting(logs, layout.columnWidths, columns)

    return this.executeCompleteRendering(options, onSelect, visibleCount, hiddenCount)
  }

  private executeFallbackRendering(props: LogSelectorProps): React.ReactNode {
    // Fallback rendering
    const { logs, onSelect } = props
    
    if (logs.length === 0) {
      return null
    }

    const basicOptions = logs.map((log, i) => ({
      label: `[${i}] ${log.firstPrompt}`,
      value: log.value.toString()
    }))

    return React.createElement(
      Box,
      { flexDirection: 'column', height: '100%', width: '100%' },
      React.createElement(Select, {
        options: basicOptions,
        onChange: (index: string) => onSelect(parseInt(index, 10)),
        visibleOptionCount: 10
      })
    )
  }

  private executeCompleteRendering(
    options: Array<{ label: string; value: string }>,
    onSelect: (logValue: number) => void,
    visibleCount: number,
    hiddenCount: number
  ): React.ReactNode {
    return React.createElement(Box, { flexDirection: 'column', height: '100%', width: '100%' }, [
      this.configurationManager.isHeaderDisplayEnabled() ? this.renderHeader() : null,
      React.createElement(Select, {
        key: 'log-select',
        options,
        onChange: (index: string) => onSelect(parseInt(index, 10)),
        visibleOptionCount: visibleCount
      }),
      hiddenCount > 0 ? this.renderHiddenCountInfo(hiddenCount) : null
    ].filter(Boolean))
  }

  private renderHeader(): React.ReactNode {
    const theme = getTheme()
    
    return React.createElement(
      Box,
      { key: 'header', paddingLeft: 9 },
      [
        React.createElement(Text, { key: 'modified-header', bold: true, color: theme.text }, 'Modified'),
        React.createElement(Text, { key: 'modified-spacer' }, '             '),
        React.createElement(Text, { key: 'created-header', bold: true, color: theme.text }, 'Created'),
        React.createElement(Text, { key: 'created-spacer' }, '             '),
        React.createElement(Text, { key: 'messages-header', bold: true, color: theme.text }, '# Messages'),
        React.createElement(Text, { key: 'messages-spacer' }, ' '),
        React.createElement(Text, { key: 'first-message-header', bold: true, color: theme.text }, 'First message')
      ]
    )
  }

  private renderHiddenCountInfo(hiddenCount: number): React.ReactNode {
    return React.createElement(
      Box,
      { key: 'hidden-count', paddingLeft: 2 },
      React.createElement(
        Text,
        { color: getTheme().secondaryText },
        `and ${hiddenCount} more…`
      )
    )
  }

  public getRenderingStatistics(): {
    headerDisplayEnabled: boolean
    responsiveLayoutEnabled: boolean
    columnOptimizationEnabled: boolean
    truncationHandlingEnabled: boolean
  } {
    return {
      headerDisplayEnabled: this.configurationManager.isHeaderDisplayEnabled(),
      responsiveLayoutEnabled: this.configurationManager.isResponsiveLayoutEnabled(),
      columnOptimizationEnabled: this.configurationManager.isColumnWidthOptimizationEnabled(),
      truncationHandlingEnabled: this.configurationManager.isTruncationHandlingEnabled()
    }
  }
}

/**
 * Enhanced log selector service with comprehensive selector management
 */
export class CynerLogSelectorService {
  private configurationManager: CynerLogSelectorConfigurationManager
  private layoutProcessor: CynerLogSelectorLayoutProcessor
  private optionFormatter: CynerLogSelectorOptionFormatter
  private renderingService: CynerLogSelectorRenderingService

  constructor(
    configurationManager?: CynerLogSelectorConfigurationManager,
    layoutProcessor?: CynerLogSelectorLayoutProcessor,
    optionFormatter?: CynerLogSelectorOptionFormatter,
    renderingService?: CynerLogSelectorRenderingService
  ) {
    this.configurationManager = configurationManager || new CynerLogSelectorConfigurationManager()
    this.layoutProcessor = layoutProcessor || new CynerLogSelectorLayoutProcessor(this.configurationManager)
    this.optionFormatter = optionFormatter || new CynerLogSelectorOptionFormatter(
      this.configurationManager,
      this.layoutProcessor
    )
    this.renderingService = renderingService || new CynerLogSelectorRenderingService(
      this.configurationManager,
      this.layoutProcessor,
      this.optionFormatter
    )
  }

  /**
   * Execute comprehensive log selector management
   */
  public executeLogSelectorManagement(props: LogSelectorProps): React.ReactNode {
    try {
      return this.executeEnhancedSelectorManagement(props)
    } catch (error) {
      console.error('Log selector management failed:', error)
      return this.executeFallbackSelectorManagement(props)
    }
  }

  private executeEnhancedSelectorManagement(props: LogSelectorProps): React.ReactNode {
    return this.renderingService.executeLogSelectorRendering(props)
  }

  private executeFallbackSelectorManagement(props: LogSelectorProps): React.ReactNode {
    // Fallback selector management
    const { logs, onSelect } = props
    
    if (logs.length === 0) {
      return null
    }

    return React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, {}, 'Log Selector (Fallback Mode)')
    )
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedRenderingEnabled: boolean
    layoutProcessingEnabled: boolean
    optionFormattingEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateSelectorConfiguration(),
      enhancedRenderingEnabled: this.configurationManager.isResponsiveLayoutEnabled(),
      layoutProcessingEnabled: this.configurationManager.isColumnWidthOptimizationEnabled(),
      optionFormattingEnabled: this.configurationManager.isDateFormattingEnabled()
    }
  }

  public getConfigurationManager(): CynerLogSelectorConfigurationManager {
    return this.configurationManager
  }

  public getLayoutProcessor(): CynerLogSelectorLayoutProcessor {
    return this.layoutProcessor
  }

  public getOptionFormatter(): CynerLogSelectorOptionFormatter {
    return this.optionFormatter
  }

  public getRenderingService(): CynerLogSelectorRenderingService {
    return this.renderingService
  }
}

type LogSelectorProps = {
  logs: LogOption[]
  onSelect: (logValue: number) => void
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerLogSelectorConfigurationManager()
const defaultLayoutProcessor = new CynerLogSelectorLayoutProcessor(defaultConfigurationManager)
const defaultOptionFormatter = new CynerLogSelectorOptionFormatter(
  defaultConfigurationManager,
  defaultLayoutProcessor
)
const defaultRenderingService = new CynerLogSelectorRenderingService(
  defaultConfigurationManager,
  defaultLayoutProcessor,
  defaultOptionFormatter
)
const defaultLogSelectorService = new CynerLogSelectorService(
  defaultConfigurationManager,
  defaultLayoutProcessor,
  defaultOptionFormatter,
  defaultRenderingService
)

export function LogSelector({
  logs,
  onSelect,
}: LogSelectorProps): React.ReactNode {
  const { rows, columns } = useTerminalSize()
  if (logs.length === 0) {
    return null
  }

  const visibleCount = rows - 3 // Account for header and footer
  const hiddenCount = Math.max(0, logs.length - visibleCount)

  // Create formatted options
  // Calculate column widths
  const indexWidth = 7 // [0] to [99] with extra spaces
  const modifiedWidth = 21 // "Yesterday at 7:49 pm" with space
  const createdWidth = 21 // "Yesterday at 7:49 pm" with space
  const countWidth = 9 // "999 msgs" (right-aligned)

  const options = logs.map((log, i) => {
    const index = `[${i}]`.padEnd(indexWidth)
    const modified = formatDate(log.modified).padEnd(modifiedWidth)
    const created = formatDate(log.created).padEnd(createdWidth)
    const msgCount = `${log.messageCount}`.padStart(countWidth)
    const prompt = log.firstPrompt
    let branchInfo = ''
    if (log.forkNumber) branchInfo += ` (fork #${log.forkNumber})`
    if (log.sidechainNumber)
      branchInfo += ` (sidechain #${log.sidechainNumber})`

    const labelTxt = `${index}${modified}${created}${msgCount} ${prompt}${branchInfo}`
    const truncated =
      labelTxt.length > columns - 2 // Account for "> " selection cursor
        ? `${labelTxt.slice(0, columns - 5)}...`
        : labelTxt
    return {
      label: truncated,
      value: log.value.toString(),
    }
  })

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box paddingLeft={9}>
        <Text bold color={getTheme().text}>
          Modified
        </Text>
        <Text>{'             '}</Text>
        <Text bold color={getTheme().text}>
          Created
        </Text>
        <Text>{'             '}</Text>
        <Text bold color={getTheme().text}>
          # Messages
        </Text>
        <Text> </Text>
        <Text bold color={getTheme().text}>
          First message
        </Text>
      </Box>
      <Select
        options={options}
        onChange={index => onSelect(parseInt(index, 10))}
        visibleOptionCount={visibleCount}
      />
      {hiddenCount > 0 && (
        <Box paddingLeft={2}>
          <Text color={getTheme().secondaryText}>and {hiddenCount} more…</Text>
        </Box>
      )}
    </Box>
  )
}
