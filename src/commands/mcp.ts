import type { Command } from '../commands'
import { listMCPServers, getClients } from '../services/mcpClient'
import { PRODUCT_COMMAND } from '../constants/product'
import chalk from 'chalk'
import { getTheme } from '../utils/theme'

/**
 * Alternative implementation of MCP server status functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerMCPServerStatusConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  productCommand: string
  enableColoredOutput: boolean
  enableSortingByName: boolean
  showDetailedStatus: boolean
}

export interface CynerMCPServerInfo {
  serverName: string
  connectionStatus: 'connected' | 'disconnected'
  serverType?: string
  connectionMetadata?: {
    lastConnected?: number
    connectionAttempts?: number
    errorDetails?: string
  }
}

export interface CynerMCPStatusReportData {
  totalConfiguredServers: number
  connectedServers: number
  disconnectedServers: number
  serverStatusList: CynerMCPServerInfo[]
  hasConfiguredServers: boolean
}

/**
 * Enhanced MCP server status analyzer with comprehensive reporting
 */
export class CynerMCPServerStatusAnalyzer {
  private configuration: CynerMCPServerStatusConfiguration

  constructor(customConfiguration?: Partial<CynerMCPServerStatusConfiguration>) {
    this.configuration = {
      commandIdentifier: 'mcp',
      commandDescription: 'Show MCP server connection status',
      isCommandEnabled: true,
      isCommandHidden: false,
      productCommand: PRODUCT_COMMAND,
      enableColoredOutput: true,
      enableSortingByName: true,
      showDetailedStatus: false,
      ...customConfiguration
    }
  }

  public getAnalyzerConfiguration(): CynerMCPServerStatusConfiguration {
    return { ...this.configuration }
  }

  public updateAnalyzerConfiguration(updates: Partial<CynerMCPServerStatusConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  /**
   * Enhanced MCP server status analysis with comprehensive data collection
   */
  public async analyzeMCPServerConnectionStatus(): Promise<CynerMCPStatusReportData> {
    try {
      // Gather MCP server configuration and client status
      const configuredServers = listMCPServers()
      const activeClients = await getClients()

      // Process server status information
      const serverStatusList = this.processServerStatusInformation(activeClients)
      
      // Calculate comprehensive statistics
      const statusStatistics = this.calculateServerStatusStatistics(serverStatusList, configuredServers)

      return {
        totalConfiguredServers: Object.keys(configuredServers).length,
        connectedServers: statusStatistics.connectedCount,
        disconnectedServers: statusStatistics.disconnectedCount,
        serverStatusList,
        hasConfiguredServers: Object.keys(configuredServers).length > 0
      }
    } catch (error) {
      console.error('MCP server status analysis failed:', error)
      throw new Error(`Failed to analyze MCP server status: ${error}`)
    }
  }

  private processServerStatusInformation(clients: any[]): CynerMCPServerInfo[] {
    let processedServerInfo = clients.map(client => ({
      serverName: client.name,
      connectionStatus: client.type === 'connected' ? 'connected' as const : 'disconnected' as const,
      serverType: client.type,
      connectionMetadata: {
        lastConnected: Date.now(), // Would be actual data in real implementation
        connectionAttempts: 1,
        errorDetails: client.type !== 'connected' ? 'Connection failed' : undefined
      }
    }))

    // Sort by name if configured
    if (this.configuration.enableSortingByName) {
      processedServerInfo = processedServerInfo.sort((a, b) => a.serverName.localeCompare(b.serverName))
    }

    return processedServerInfo
  }

  private calculateServerStatusStatistics(
    serverList: CynerMCPServerInfo[], 
    configuredServers: any
  ): { connectedCount: number; disconnectedCount: number } {
    const connectedCount = serverList.filter(server => server.connectionStatus === 'connected').length
    const disconnectedCount = serverList.filter(server => server.connectionStatus === 'disconnected').length

    return { connectedCount, disconnectedCount }
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }

  public validateAnalyzerConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      config.productCommand &&
      typeof config.productCommand === 'string'
    )
  }
}

/**
 * Enhanced MCP status report formatter with theming support
 */
export class CynerMCPStatusReportFormatter {
  private analyzerConfiguration: CynerMCPServerStatusConfiguration

  constructor(analyzerConfiguration: CynerMCPServerStatusConfiguration) {
    this.analyzerConfiguration = analyzerConfiguration
  }

  /**
   * Generate formatted MCP server status report with enhanced styling
   */
  public generateFormattedStatusReport(statusData: CynerMCPStatusReportData): string {
    // Handle case when no servers are configured
    if (!statusData.hasConfiguredServers) {
      return this.generateNoServersConfiguredMessage()
    }

    // Generate detailed server status report
    return this.generateDetailedServerStatusReport(statusData)
  }

  private generateNoServersConfiguredMessage(): string {
    return `⎿  No MCP servers configured. Run \`${this.analyzerConfiguration.productCommand} mcp\` to learn about how to configure MCP servers.`
  }

  private generateDetailedServerStatusReport(statusData: CynerMCPStatusReportData): string {
    const reportComponents = ['⎿  MCP Server Status']

    // Generate individual server status lines
    const serverStatusLines = this.generateServerStatusLines(statusData.serverStatusList)
    reportComponents.push(...serverStatusLines)

    // Add summary if detailed status is enabled
    if (this.analyzerConfiguration.showDetailedStatus) {
      const summaryLine = this.generateStatusSummaryLine(statusData)
      reportComponents.push(summaryLine)
    }

    return reportComponents.join('\n')
  }

  private generateServerStatusLines(serverList: CynerMCPServerInfo[]): string[] {
    return serverList.map(serverInfo => {
      const statusText = serverInfo.connectionStatus
      const formattedStatus = this.formatConnectionStatus(statusText, serverInfo.connectionStatus === 'connected')
      
      return `⎿  • ${serverInfo.serverName}: ${formattedStatus}`
    })
  }

  private formatConnectionStatus(statusText: string, isConnected: boolean): string {
    if (!this.analyzerConfiguration.enableColoredOutput) {
      return statusText
    }

    const theme = getTheme()
    const statusColor = isConnected ? theme.success : theme.error
    return chalk.hex(statusColor)(statusText)
  }

  private generateStatusSummaryLine(statusData: CynerMCPStatusReportData): string {
    return `⎿  Summary: ${statusData.connectedServers} connected, ${statusData.disconnectedServers} disconnected`
  }
}

/**
 * Enhanced MCP server management service with comprehensive status reporting
 */
export class CynerMCPServerManagementService {
  private statusAnalyzer: CynerMCPServerStatusAnalyzer
  private reportFormatter: CynerMCPStatusReportFormatter

  constructor(
    statusAnalyzer?: CynerMCPServerStatusAnalyzer,
    reportFormatter?: CynerMCPStatusReportFormatter
  ) {
    this.statusAnalyzer = statusAnalyzer || new CynerMCPServerStatusAnalyzer()
    this.reportFormatter = reportFormatter || new CynerMCPStatusReportFormatter(
      this.statusAnalyzer.getAnalyzerConfiguration()
    )
  }

  /**
   * Execute comprehensive MCP server status reporting
   */
  public async executeMCPServerStatusReporting(): Promise<string> {
    try {
      // Analyze current MCP server status
      const statusAnalysisData = await this.statusAnalyzer.analyzeMCPServerConnectionStatus()

      // Generate formatted status report
      const formattedStatusReport = this.reportFormatter.generateFormattedStatusReport(statusAnalysisData)

      return formattedStatusReport
    } catch (error) {
      console.error('MCP server status reporting failed:', error)
      return `Error: Failed to generate MCP server status report (${error})`
    }
  }

  public getMCPServerStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    coloredOutputEnabled: boolean
    sortingEnabled: boolean
    detailedStatusEnabled: boolean
  } {
    const config = this.statusAnalyzer.getAnalyzerConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      coloredOutputEnabled: config.enableColoredOutput,
      sortingEnabled: config.enableSortingByName,
      detailedStatusEnabled: config.showDetailedStatus
    }
  }

  public getStatusAnalyzer(): CynerMCPServerStatusAnalyzer {
    return this.statusAnalyzer
  }

  public getReportFormatter(): CynerMCPStatusReportFormatter {
    return this.reportFormatter
  }
}

// Create default instances for backward compatibility
const defaultMCPStatusAnalyzer = new CynerMCPServerStatusAnalyzer()
const defaultMCPReportFormatter = new CynerMCPStatusReportFormatter(
  defaultMCPStatusAnalyzer.getAnalyzerConfiguration()
)
const defaultMCPServerManagementService = new CynerMCPServerManagementService(
  defaultMCPStatusAnalyzer,
  defaultMCPReportFormatter
)

/**
 * Enhanced MCP server status command with restructured implementation
 */
const cynerMCPServerStatusCommand = {
  type: 'local' as const,
  name: defaultMCPStatusAnalyzer.getAnalyzerConfiguration().commandIdentifier,
  description: defaultMCPStatusAnalyzer.getAnalyzerConfiguration().commandDescription,
  isEnabled: defaultMCPStatusAnalyzer.getAnalyzerConfiguration().isCommandEnabled,
  isHidden: defaultMCPStatusAnalyzer.getAnalyzerConfiguration().isCommandHidden,
  
  async call(): Promise<string> {
    return await defaultMCPServerManagementService.executeMCPServerStatusReporting()
  },
  
  userFacingName(): string {
    return defaultMCPStatusAnalyzer.generateUserFacingCommandName()
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerMCPServerStatusCommand
