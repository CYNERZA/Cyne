import { MACRO } from '../constants/macros.js'
import type { Command } from '../commands'
import { RELEASE_NOTES } from '../constants/releaseNotes'

/**
 * Alternative implementation of release notes functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerReleaseNotesCommandConfiguration {
  commandIdentifier: string
  commandDescription: string
  isCommandEnabled: boolean
  isCommandHidden: boolean
  commandType: 'local'
  enableVersionSpecification: boolean
  showFormattedOutput: boolean
  includeVersionHeader: boolean
  useBulletPointFormat: boolean
  defaultToCurrentVersion: boolean
}

export interface CynerReleaseNotesContext {
  currentVersion: string
  requestedVersion: string
  availableVersions: string[]
  releaseNotesData: Record<string, string[]>
  queryTimestamp: number
}

export interface CynerReleaseNotesOutput {
  headerText: string
  formattedNotes: string
  fullOutput: string
  notesFound: boolean
  versionExists: boolean
  noteCount: number
}

/**
 * Enhanced release notes command configuration manager
 */
export class CynerReleaseNotesCommandConfigurationManager {
  private configuration: CynerReleaseNotesCommandConfiguration

  constructor(customConfiguration?: Partial<CynerReleaseNotesCommandConfiguration>) {
    this.configuration = {
      commandIdentifier: 'release-notes',
      commandDescription: 'Show release notes for the current or specified version',
      isCommandEnabled: false,
      isCommandHidden: false,
      commandType: 'local',
      enableVersionSpecification: true,
      showFormattedOutput: true,
      includeVersionHeader: true,
      useBulletPointFormat: true,
      defaultToCurrentVersion: true,
      ...customConfiguration
    }
  }

  public getCommandConfiguration(): CynerReleaseNotesCommandConfiguration {
    return { ...this.configuration }
  }

  public updateCommandConfiguration(updates: Partial<CynerReleaseNotesCommandConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public getCommandIdentifier(): string {
    return this.configuration.commandIdentifier
  }

  public getCommandDescription(): string {
    return this.configuration.commandDescription
  }

  public isCommandEnabled(): boolean {
    return this.configuration.isCommandEnabled
  }

  public isCommandHidden(): boolean {
    return this.configuration.isCommandHidden
  }

  public getCommandType(): 'local' {
    return this.configuration.commandType
  }

  public isVersionSpecificationEnabled(): boolean {
    return this.configuration.enableVersionSpecification
  }

  public shouldShowFormattedOutput(): boolean {
    return this.configuration.showFormattedOutput
  }

  public shouldIncludeVersionHeader(): boolean {
    return this.configuration.includeVersionHeader
  }

  public shouldUseBulletPointFormat(): boolean {
    return this.configuration.useBulletPointFormat
  }

  public shouldDefaultToCurrentVersion(): boolean {
    return this.configuration.defaultToCurrentVersion
  }

  public validateCommandConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.commandDescription &&
      typeof config.commandDescription === 'string' &&
      config.commandType === 'local'
    )
  }
}

/**
 * Enhanced release notes data processor with version management
 */
export class CynerReleaseNotesDataProcessor {
  private configurationManager: CynerReleaseNotesCommandConfigurationManager

  constructor(configurationManager: CynerReleaseNotesCommandConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process release notes context with enhanced version handling
   */
  public processReleaseNotesContext(userArguments: string): CynerReleaseNotesContext {
    const currentVersion = MACRO.VERSION
    const requestedVersion = this.determineRequestedVersion(userArguments, currentVersion)
    
    return {
      currentVersion,
      requestedVersion,
      availableVersions: Object.keys(RELEASE_NOTES),
      releaseNotesData: RELEASE_NOTES,
      queryTimestamp: Date.now()
    }
  }

  private determineRequestedVersion(userArguments: string, currentVersion: string): string {
    // If user specified a version, use that
    if (this.configurationManager.isVersionSpecificationEnabled() && userArguments) {
      const trimmedArgs = userArguments.trim()
      if (trimmedArgs) {
        return trimmedArgs
      }
    }

    // Otherwise default to current version if configured
    return this.configurationManager.shouldDefaultToCurrentVersion() ? currentVersion : ''
  }

  /**
   * Generate formatted release notes output with enhanced styling
   */
  public generateFormattedReleaseNotesOutput(context: CynerReleaseNotesContext): CynerReleaseNotesOutput {
    const releaseNotes = context.releaseNotesData[context.requestedVersion]
    
    // Handle case when no notes exist
    if (!releaseNotes || releaseNotes.length === 0) {
      return this.generateNoNotesAvailableOutput(context.requestedVersion)
    }

    // Generate formatted output
    return this.generateFormattedNotesOutput(context.requestedVersion, releaseNotes)
  }

  private generateNoNotesAvailableOutput(requestedVersion: string): CynerReleaseNotesOutput {
    const fullOutput = `No release notes available for version ${requestedVersion}.`
    
    return {
      headerText: '',
      formattedNotes: '',
      fullOutput,
      notesFound: false,
      versionExists: false,
      noteCount: 0
    }
  }

  private generateFormattedNotesOutput(version: string, notes: string[]): CynerReleaseNotesOutput {
    const headerText = this.generateVersionHeader(version)
    const formattedNotes = this.formatReleaseNotes(notes)
    const fullOutput = this.combineHeaderAndNotes(headerText, formattedNotes)

    return {
      headerText,
      formattedNotes,
      fullOutput,
      notesFound: true,
      versionExists: true,
      noteCount: notes.length
    }
  }

  private generateVersionHeader(version: string): string {
    if (!this.configurationManager.shouldIncludeVersionHeader()) {
      return ''
    }
    return `Release notes for version ${version}:`
  }

  private formatReleaseNotes(notes: string[]): string {
    if (!this.configurationManager.shouldUseBulletPointFormat()) {
      return notes.join('\n')
    }
    return notes.map(note => `• ${note}`).join('\n')
  }

  private combineHeaderAndNotes(headerText: string, formattedNotes: string): string {
    if (!headerText) {
      return formattedNotes
    }
    return `${headerText}\n\n${formattedNotes}`
  }

  public getProcessorStatistics(): {
    versionSpecificationEnabled: boolean
    formattedOutputEnabled: boolean
    bulletPointsEnabled: boolean
    headerIncluded: boolean
    defaultVersionEnabled: boolean
  } {
    return {
      versionSpecificationEnabled: this.configurationManager.isVersionSpecificationEnabled(),
      formattedOutputEnabled: this.configurationManager.shouldShowFormattedOutput(),
      bulletPointsEnabled: this.configurationManager.shouldUseBulletPointFormat(),
      headerIncluded: this.configurationManager.shouldIncludeVersionHeader(),
      defaultVersionEnabled: this.configurationManager.shouldDefaultToCurrentVersion()
    }
  }
}

/**
 * Enhanced release notes command service with comprehensive formatting
 */
export class CynerReleaseNotesCommandService {
  private configurationManager: CynerReleaseNotesCommandConfigurationManager
  private dataProcessor: CynerReleaseNotesDataProcessor

  constructor(
    configurationManager?: CynerReleaseNotesCommandConfigurationManager,
    dataProcessor?: CynerReleaseNotesDataProcessor
  ) {
    this.configurationManager = configurationManager || new CynerReleaseNotesCommandConfigurationManager()
    this.dataProcessor = dataProcessor || new CynerReleaseNotesDataProcessor(this.configurationManager)
  }

  /**
   * Execute comprehensive release notes display service
   */
  public async executeReleaseNotesDisplayService(userArguments: string): Promise<string> {
    try {
      // Process release notes context
      const notesContext = this.dataProcessor.processReleaseNotesContext(userArguments)

      // Generate formatted output
      const formattedOutput = this.dataProcessor.generateFormattedReleaseNotesOutput(notesContext)

      return formattedOutput.fullOutput
    } catch (error) {
      console.error('Release notes display service failed:', error)
      return `Error: Failed to display release notes (${error})`
    }
  }

  public getServiceStatistics(): {
    commandEnabled: boolean
    commandVisible: boolean
    formattingEnabled: boolean
    versionHandlingEnabled: boolean
  } {
    const config = this.configurationManager.getCommandConfiguration()
    return {
      commandEnabled: config.isCommandEnabled,
      commandVisible: !config.isCommandHidden,
      formattingEnabled: config.showFormattedOutput && config.useBulletPointFormat,
      versionHandlingEnabled: config.enableVersionSpecification && config.defaultToCurrentVersion
    }
  }

  public getConfigurationManager(): CynerReleaseNotesCommandConfigurationManager {
    return this.configurationManager
  }

  public getDataProcessor(): CynerReleaseNotesDataProcessor {
    return this.dataProcessor
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerReleaseNotesCommandConfigurationManager()
const defaultDataProcessor = new CynerReleaseNotesDataProcessor(defaultConfigurationManager)
const defaultReleaseNotesCommandService = new CynerReleaseNotesCommandService(
  defaultConfigurationManager,
  defaultDataProcessor
)

/**
 * Enhanced release notes command with restructured implementation
 */
const cynerReleaseNotesCommand: Command = {
  description: defaultConfigurationManager.getCommandDescription(),
  isEnabled: defaultConfigurationManager.isCommandEnabled(),
  isHidden: defaultConfigurationManager.isCommandHidden(),
  name: defaultConfigurationManager.getCommandIdentifier(),
  type: defaultConfigurationManager.getCommandType(),
  
  userFacingName(): string {
    return defaultConfigurationManager.getCommandIdentifier()
  },
  
  async call(args: string): Promise<string> {
    return await defaultReleaseNotesCommandService.executeReleaseNotesDisplayService(args)
  },
}

// Export the restructured command maintaining exact same interface
export default cynerReleaseNotesCommand
