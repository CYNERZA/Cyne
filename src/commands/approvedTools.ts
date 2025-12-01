import {
  ProjectConfig,
  getCurrentProjectConfig as getCurrentProjectConfigDefault,
  saveCurrentProjectConfig as saveCurrentProjectConfigDefault,
} from '../utils/config.js'

/**
 * Alternative implementation of project configuration management
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerProjectConfigurationHandler {
  retrieveCurrentProjectConfiguration: () => ProjectConfig
  persistCurrentProjectConfiguration: (config: ProjectConfig) => void
}

export interface CynerApprovedToolsOperationResult {
  operationSuccessful: boolean
  resultMessage: string
  toolCount?: number
  affectedTool?: string
}

/**
 * Enhanced configuration handler with validation and error handling
 */
export class CynerProjectConfigurationManager implements CynerProjectConfigurationHandler {
  private configRetriever: () => ProjectConfig
  private configPersister: (config: ProjectConfig) => void

  constructor(
    configRetriever: () => ProjectConfig = getCurrentProjectConfigDefault,
    configPersister: (config: ProjectConfig) => void = saveCurrentProjectConfigDefault
  ) {
    this.configRetriever = configRetriever
    this.configPersister = configPersister
  }

  public retrieveCurrentProjectConfiguration(): ProjectConfig {
    try {
      return this.configRetriever()
    } catch (error) {
      throw new Error(`Failed to retrieve project configuration: ${error}`)
    }
  }

  public persistCurrentProjectConfiguration(config: ProjectConfig): void {
    try {
      this.configPersister(config)
    } catch (error) {
      throw new Error(`Failed to persist project configuration: ${error}`)
    }
  }

  public validateProjectConfiguration(config: ProjectConfig): boolean {
    return Array.isArray(config.allowedTools) && config.allowedTools.every(tool => typeof tool === 'string')
  }
}

/**
 * Enhanced approved tools service with comprehensive operations
 */
export class CynerApprovedToolsService {
  private configurationManager: CynerProjectConfigurationManager

  constructor(configurationManager?: CynerProjectConfigurationManager) {
    this.configurationManager = configurationManager || new CynerProjectConfigurationManager()
  }

  /**
   * Enhanced method for listing approved tools with directory context
   */
  public executeListApprovedToolsOperation(workingDirectory: string): string {
    const projectConfiguration = this.configurationManager.retrieveCurrentProjectConfiguration()
    
    if (!this.configurationManager.validateProjectConfiguration(projectConfiguration)) {
      throw new Error('Invalid project configuration detected')
    }

    const approvedToolsList = projectConfiguration.allowedTools
    const formattedToolsDisplay = approvedToolsList.length > 0 
      ? approvedToolsList.map((tool, index) => `${index + 1}. ${tool}`).join('\n')
      : '(no approved tools configured)'

    return `Approved tools configuration for directory: ${workingDirectory}\n${formattedToolsDisplay}`
  }

  /**
   * Enhanced method for removing approved tools with validation
   */
  public executeRemoveApprovedToolOperation(targetTool: string): CynerApprovedToolsOperationResult {
    if (!targetTool || typeof targetTool !== 'string') {
      return {
        operationSuccessful: false,
        resultMessage: 'Invalid tool identifier provided',
        affectedTool: targetTool
      }
    }

    const projectConfiguration = this.configurationManager.retrieveCurrentProjectConfiguration()
    
    if (!this.configurationManager.validateProjectConfiguration(projectConfiguration)) {
      return {
        operationSuccessful: false,
        resultMessage: 'Invalid project configuration detected',
        affectedTool: targetTool
      }
    }

    const originalApprovedToolsCount = projectConfiguration.allowedTools.length
    const filteredApprovedTools = projectConfiguration.allowedTools.filter(tool => tool !== targetTool)
    const toolWasRemoved = originalApprovedToolsCount !== filteredApprovedTools.length

    if (toolWasRemoved) {
      projectConfiguration.allowedTools = filteredApprovedTools
      this.configurationManager.persistCurrentProjectConfiguration(projectConfiguration)
      
      return {
        operationSuccessful: true,
        resultMessage: `Successfully removed '${targetTool}' from approved tools list`,
        toolCount: filteredApprovedTools.length,
        affectedTool: targetTool
      }
    } else {
      return {
        operationSuccessful: false,
        resultMessage: `Tool '${targetTool}' was not found in the approved tools list`,
        toolCount: originalApprovedToolsCount,
        affectedTool: targetTool
      }
    }
  }

  /**
   * Additional utility method for comprehensive tool management
   */
  public getApprovedToolsStatistics(): {
    totalApprovedTools: number
    approvedToolsList: string[]
    configurationValid: boolean
  } {
    const projectConfiguration = this.configurationManager.retrieveCurrentProjectConfiguration()
    const isValidConfiguration = this.configurationManager.validateProjectConfiguration(projectConfiguration)

    return {
      totalApprovedTools: projectConfiguration.allowedTools.length,
      approvedToolsList: [...projectConfiguration.allowedTools],
      configurationValid: isValidConfiguration
    }
  }
}

// Backward compatibility layer - maintains exact same API
const defaultConfigurationManager = new CynerProjectConfigurationManager()
const defaultApprovedToolsService = new CynerApprovedToolsService(defaultConfigurationManager)

/**
 * Legacy compatibility function - maintains exact same behavior
 */
export function handleListApprovedTools(
  cwd: string,
  projectConfigHandler?: any
): string {
  if (projectConfigHandler) {
    // Use legacy handler if provided
    const projectConfig = projectConfigHandler.getCurrentProjectConfig()
    return `Allowed tools for ${cwd}:\n${projectConfig.allowedTools.join('\n')}`
  }
  
  // Use new service implementation
  return defaultApprovedToolsService.executeListApprovedToolsOperation(cwd)
}

/**
 * Legacy compatibility function - maintains exact same behavior
 */
export function handleRemoveApprovedTool(
  tool: string,
  projectConfigHandler?: any
): { success: boolean; message: string } {
  if (projectConfigHandler) {
    // Use legacy handler if provided
    const projectConfig = projectConfigHandler.getCurrentProjectConfig()
    const originalToolCount = projectConfig.allowedTools.length
    const updatedAllowedTools = projectConfig.allowedTools.filter(t => t !== tool)

    if (originalToolCount !== updatedAllowedTools.length) {
      projectConfig.allowedTools = updatedAllowedTools
      projectConfigHandler.saveCurrentProjectConfig(projectConfig)
      return {
        success: true,
        message: `Removed ${tool} from the list of approved tools`,
      }
    } else {
      return {
        success: false,
        message: `${tool} was not in the list of approved tools`,
      }
    }
  }

  // Use new service implementation
  const result = defaultApprovedToolsService.executeRemoveApprovedToolOperation(tool)
  return {
    success: result.operationSuccessful,
    message: result.resultMessage
  }
}
