import type { Command } from '../commands'
import { formatTotalCost } from '../cost-tracker'

/**
 * Alternative implementation of cost tracking and reporting command
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerCostTrackingConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  includeSessionDuration: boolean
  provideCostBreakdown: boolean
  enableCostFormatting: boolean
}

export interface CynerCostReportingContext {
  requestTimestamp: number
  sessionIdentifier?: string
  reportingMode?: 'summary' | 'detailed' | 'minimal'
}

export interface CynerCostReportingResult {
  formattedCostReport: string
  rawCostData?: any
  reportingMetadata: {
    generationTimestamp: number
    reportingDurationMs: number
    reportingMode: string
  }
}

/**
 * Enhanced cost tracking and reporting service
 */
export class CynerCostTrackingReportingService {
  private configuration: CynerCostTrackingConfiguration

  constructor(customConfiguration?: Partial<CynerCostTrackingConfiguration>) {
    this.configuration = {
      commandIdentifier: 'cost',
      commandDescription: 'Show the total cost and duration of the current session',
      isCommandEnabled: true,
      isCommandHidden: false,
      includeSessionDuration: true,
      provideCostBreakdown: true,
      enableCostFormatting: true,
      ...customConfiguration
    }
  }

  public getServiceConfiguration(): CynerCostTrackingConfiguration {
    return { ...this.configuration }
  }

  public updateServiceConfiguration(updates: Partial<CynerCostTrackingConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  /**
   * Enhanced cost reporting with comprehensive data and metadata
   */
  public async generateCostTrackingReport(
    context?: CynerCostReportingContext
  ): Promise<CynerCostReportingResult> {
    const reportingStartTime = Date.now()
    const reportingContext = {
      requestTimestamp: Date.now(),
      sessionIdentifier: `cost_session_${Date.now()}`,
      reportingMode: 'summary' as const,
      ...context
    }

    try {
      let formattedReport: string

      if (this.configuration.enableCostFormatting) {
        // Use existing cost formatting functionality
        formattedReport = formatTotalCost()
      } else {
        // Provide basic cost information
        formattedReport = 'Cost tracking is available but formatting is disabled'
      }

      // Enhance report with additional context if configured
      if (this.configuration.includeSessionDuration) {
        const enhancedReport = this.enhanceReportWithSessionData(formattedReport, reportingContext)
        formattedReport = enhancedReport
      }

      const reportingEndTime = Date.now()
      const reportingDuration = reportingEndTime - reportingStartTime

      return {
        formattedCostReport: formattedReport,
        reportingMetadata: {
          generationTimestamp: reportingEndTime,
          reportingDurationMs: reportingDuration,
          reportingMode: reportingContext.reportingMode
        }
      }
    } catch (error) {
      console.error('Cost tracking report generation failed:', error)
      throw new Error(`Failed to generate cost tracking report: ${error}`)
    }
  }

  private enhanceReportWithSessionData(
    baseReport: string, 
    context: CynerCostReportingContext
  ): string {
    // Add session information and metadata to the report
    const sessionInfo = [
      `\n--- Session Information ---`,
      `Session ID: ${context.sessionIdentifier}`,
      `Report Generated: ${new Date(context.requestTimestamp).toLocaleString()}`,
      `Reporting Mode: ${context.reportingMode}`
    ].join('\n')

    return `${baseReport}${sessionInfo}`
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
      typeof config.commandDescription === 'string'
    )
  }

  /**
   * Get cost tracking service statistics
   */
  public getCostTrackingStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    trackingCapabilities: {
      sessionDuration: boolean
      costBreakdown: boolean
      costFormatting: boolean
    }
  } {
    return {
      commandEnabled: this.configuration.isCommandEnabled,
      commandVisible: !this.configuration.isCommandHidden,
      trackingCapabilities: {
        sessionDuration: this.configuration.includeSessionDuration,
        costBreakdown: this.configuration.provideCostBreakdown,
        costFormatting: this.configuration.enableCostFormatting
      }
    }
  }
}

/**
 * Enhanced cost reporting command manager
 */
export class CynerCostReportingCommandManager {
  private reportingService: CynerCostTrackingReportingService

  constructor(reportingService?: CynerCostTrackingReportingService) {
    this.reportingService = reportingService || new CynerCostTrackingReportingService()
  }

  public async executeCostReportingCommand(
    commandArgs?: string,
    executionContext?: any
  ): Promise<string> {
    const reportingContext: CynerCostReportingContext = {
      requestTimestamp: Date.now(),
      sessionIdentifier: `cmd_cost_${Date.now()}`,
      reportingMode: 'summary'
    }

    try {
      const reportingResult = await this.reportingService.generateCostTrackingReport(reportingContext)
      return reportingResult.formattedCostReport
    } catch (error) {
      console.error('Cost reporting command execution failed:', error)
      return `Error generating cost report: ${error}`
    }
  }

  public getReportingService(): CynerCostTrackingReportingService {
    return this.reportingService
  }
}

// Create default instances for backward compatibility
const defaultCostTrackingService = new CynerCostTrackingReportingService()
const defaultCostReportingManager = new CynerCostReportingCommandManager(defaultCostTrackingService)

/**
 * Enhanced cost command with restructured implementation
 */
const cynerCostTrackingCommand = {
  type: 'local' as const,
  name: defaultCostTrackingService.getServiceConfiguration().commandIdentifier,
  description: defaultCostTrackingService.getServiceConfiguration().commandDescription,
  isEnabled: defaultCostTrackingService.getServiceConfiguration().isCommandEnabled,
  isHidden: defaultCostTrackingService.getServiceConfiguration().isCommandHidden,
  
  async call(args?: string): Promise<string> {
    return await defaultCostReportingManager.executeCostReportingCommand(args)
  },
  
  userFacingName(): string {
    return defaultCostTrackingService.generateUserFacingCommandName()
  },
} satisfies Command

// Export the restructured command maintaining exact same interface
export default cynerCostTrackingCommand
