import React from 'react'
import type { Command } from '../commands'
import { Doctor } from '../screens/Doctor'
import { PRODUCT_NAME } from '../constants/product'

/**
 * Alternative implementation of system health checking functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerSystemDiagnosticsConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  productName: string
  enableDoctorMode: boolean
  enableDiagnosticLogging: boolean
}

export interface CynerSystemDiagnosticsContext {
  onDiagnosticCompletion: (result?: string) => void
  diagnosticMetadata?: {
    sessionId?: string
    initiationTimestamp?: number
    diagnosticScope?: string
  }
}

/**
 * Enhanced system diagnostics command manager
 */
export class CynerSystemDiagnosticsCommandManager {
  private configuration: CynerSystemDiagnosticsConfiguration

  constructor(customConfiguration?: Partial<CynerSystemDiagnosticsConfiguration>) {
    this.configuration = {
      commandIdentifier: 'doctor',
      commandDescription: `Checks the health of your ${PRODUCT_NAME} installation`,
      isCommandEnabled: true,
      isCommandHidden: false,
      productName: PRODUCT_NAME,
      enableDoctorMode: true,
      enableDiagnosticLogging: true,
      ...customConfiguration
    }
  }

  public getCommandConfiguration(): CynerSystemDiagnosticsConfiguration {
    return { ...this.configuration }
  }

  public updateCommandConfiguration(updates: Partial<CynerSystemDiagnosticsConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public async executeSystemDiagnosticsFlow(
    context: CynerSystemDiagnosticsContext
  ): Promise<React.ReactElement> {
    const diagnosticExecutionMetadata = {
      ...context.diagnosticMetadata,
      executionTimestamp: Date.now(),
      commandId: this.configuration.commandIdentifier,
      doctorModeEnabled: this.configuration.enableDoctorMode
    }

    try {
      // Log diagnostic initiation if logging is enabled
      if (this.configuration.enableDiagnosticLogging) {
        console.debug('System diagnostics initiated', diagnosticExecutionMetadata)
      }

      // Create enhanced Doctor component with proper configuration
      const doctorComponentElement = React.createElement(Doctor, {
        onDone: context.onDiagnosticCompletion,
        doctorMode: this.configuration.enableDoctorMode,
      })

      return doctorComponentElement
    } catch (error) {
      console.error('System diagnostics flow execution failed:', error)
      throw new Error(`Failed to execute system diagnostics flow: ${error}`)
    }
  }

  public generateUserFacingCommandName(): string {
    return this.configuration.commandIdentifier
  }

  public validateCommandConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      config.productName &&
      typeof config.productName === 'string'
    )
  }
}

/**
 * Enhanced system diagnostics service with comprehensive health checking
 */
export class CynerSystemDiagnosticsService {
  private commandManager: CynerSystemDiagnosticsCommandManager

  constructor(commandManager?: CynerSystemDiagnosticsCommandManager) {
    this.commandManager = commandManager || new CynerSystemDiagnosticsCommandManager()
  }

  public async initiateSystemHealthCheckProcess(
    completionCallback: (result?: string) => void,
    additionalContext?: any
  ): Promise<React.ReactElement> {
    const diagnosticsContext: CynerSystemDiagnosticsContext = {
      onDiagnosticCompletion: completionCallback,
      diagnosticMetadata: {
        sessionId: `doctor_session_${Date.now()}`,
        initiationTimestamp: Date.now(),
        diagnosticScope: 'full_system_health_check'
      }
    }

    return await this.commandManager.executeSystemDiagnosticsFlow(diagnosticsContext)
  }

  public getSystemDiagnosticsStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    doctorModeEnabled: boolean
    diagnosticLoggingEnabled: boolean
    productName: string
  } {
    const config = this.commandManager.getCommandConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      doctorModeEnabled: config.enableDoctorMode,
      diagnosticLoggingEnabled: config.enableDiagnosticLogging,
      productName: config.productName
    }
  }

  public validateDiagnosticCapabilities(): {
    diagnosticsAvailable: boolean
    capabilityRestrictions: string[]
  } {
    const config = this.commandManager.getCommandConfiguration()
    const restrictions: string[] = []

    if (!config.isCommandEnabled) {
      restrictions.push('Diagnostics command is disabled')
    }

    if (!config.enableDoctorMode) {
      restrictions.push('Doctor mode is disabled')
    }

    return {
      diagnosticsAvailable: restrictions.length === 0,
      capabilityRestrictions: restrictions
    }
  }
}

// Create default instances for backward compatibility
const defaultSystemDiagnosticsManager = new CynerSystemDiagnosticsCommandManager()
const defaultSystemDiagnosticsService = new CynerSystemDiagnosticsService(defaultSystemDiagnosticsManager)

/**
 * Enhanced system diagnostics command with restructured implementation
 */
const cynerSystemDiagnosticsCommand: Command = {
  name: defaultSystemDiagnosticsManager.getCommandConfiguration().commandIdentifier,
  description: defaultSystemDiagnosticsManager.getCommandConfiguration().commandDescription,
  isEnabled: defaultSystemDiagnosticsManager.getCommandConfiguration().isCommandEnabled,
  isHidden: defaultSystemDiagnosticsManager.getCommandConfiguration().isCommandHidden,
  type: 'local-jsx',
  
  userFacingName(): string {
    return defaultSystemDiagnosticsManager.generateUserFacingCommandName()
  },
  
  async call(onDone: (result?: string) => void): Promise<React.ReactElement> {
    return await defaultSystemDiagnosticsService.initiateSystemHealthCheckProcess(onDone)
  },
}

// Export the restructured command maintaining exact same interface
export default cynerSystemDiagnosticsCommand
