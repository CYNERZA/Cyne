import { useInput } from 'ink'
import { type SelectState } from './use-select-state'

/**
 * Alternative implementation of select input functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerSelectInputConfiguration {
  enableKeyboardNavigation: boolean
  enableArrowKeys: boolean
  enableReturnKey: boolean
  enableInputValidation: boolean
  enableEventLogging: boolean
  enableStateIntegration: boolean
  enableInputFiltering: boolean
}

export interface CynerSelectInputContext {
  isDisabled: boolean
  state: SelectState
  inputConfiguration: CynerSelectInputConfiguration
  keyHandlers: {
    downArrow: () => void
    upArrow: () => void
    return: () => void
  }
}

export interface CynerSelectInputActions {
  handleDownArrow: () => void
  handleUpArrow: () => void
  handleReturn: () => void
  processKeyInput: (input: string, key: any) => void
}

/**
 * Enhanced select input configuration manager
 */
export class CynerSelectInputConfigurationManager {
  private configuration: CynerSelectInputConfiguration

  constructor(customConfiguration?: Partial<CynerSelectInputConfiguration>) {
    this.configuration = {
      enableKeyboardNavigation: true,
      enableArrowKeys: true,
      enableReturnKey: true,
      enableInputValidation: true,
      enableEventLogging: true,
      enableStateIntegration: true,
      enableInputFiltering: true,
      ...customConfiguration
    }
  }

  public getInputConfiguration(): CynerSelectInputConfiguration {
    return { ...this.configuration }
  }

  public updateInputConfiguration(updates: Partial<CynerSelectInputConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isKeyboardNavigationEnabled(): boolean {
    return this.configuration.enableKeyboardNavigation
  }

  public areArrowKeysEnabled(): boolean {
    return this.configuration.enableArrowKeys
  }

  public isReturnKeyEnabled(): boolean {
    return this.configuration.enableReturnKey
  }

  public isInputValidationEnabled(): boolean {
    return this.configuration.enableInputValidation
  }

  public isEventLoggingEnabled(): boolean {
    return this.configuration.enableEventLogging
  }

  public isStateIntegrationEnabled(): boolean {
    return this.configuration.enableStateIntegration
  }

  public isInputFilteringEnabled(): boolean {
    return this.configuration.enableInputFiltering
  }

  public validateInputConfiguration(): boolean {
    const config = this.configuration
    return !!(
      typeof config.enableKeyboardNavigation === 'boolean' &&
      typeof config.enableArrowKeys === 'boolean' &&
      typeof config.enableReturnKey === 'boolean'
    )
  }
}

/**
 * Enhanced select input event processor
 */
export class CynerSelectInputEventProcessor {
  private configurationManager: CynerSelectInputConfigurationManager

  constructor(configurationManager: CynerSelectInputConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process keyboard input events with enhanced logic
   */
  public processKeyboardInput(
    input: string, 
    key: any, 
    state: SelectState, 
    isDisabled: boolean
  ): void {
    if (isDisabled || !this.configurationManager.isKeyboardNavigationEnabled()) {
      return
    }

    try {
      this.executeKeyboardInputProcessing(input, key, state)
    } catch (error) {
      if (this.configurationManager.isEventLoggingEnabled()) {
        console.error('Keyboard input processing failed:', error)
      }
      this.executeFallbackInputProcessing(input, key, state)
    }
  }

  private executeKeyboardInputProcessing(input: string, key: any, state: SelectState): void {
    if (this.configurationManager.isInputValidationEnabled()) {
      this.validateKeyInput(key)
    }

    this.executeKeyHandling(key, state)
  }

  private executeFallbackInputProcessing(input: string, key: any, state: SelectState): void {
    // Fallback input processing
    this.executeKeyHandling(key, state)
  }

  private validateKeyInput(key: any): void {
    if (!key || typeof key !== 'object') {
      throw new Error('Invalid key input provided')
    }
  }

  private executeKeyHandling(key: any, state: SelectState): void {
    if (key.downArrow && this.configurationManager.areArrowKeysEnabled()) {
      state.focusNextOption()
      if (this.configurationManager.isEventLoggingEnabled()) {
        console.debug('Down arrow key processed')
      }
    }

    if (key.upArrow && this.configurationManager.areArrowKeysEnabled()) {
      state.focusPreviousOption()
      if (this.configurationManager.isEventLoggingEnabled()) {
        console.debug('Up arrow key processed')
      }
    }

    if (key.return && this.configurationManager.isReturnKeyEnabled()) {
      state.selectFocusedOption()
      if (this.configurationManager.isEventLoggingEnabled()) {
        console.debug('Return key processed')
      }
    }
  }

  public getProcessorStatistics(): {
    validationEnabled: boolean
    loggingEnabled: boolean
    arrowKeysEnabled: boolean
    returnKeyEnabled: boolean
  } {
    return {
      validationEnabled: this.configurationManager.isInputValidationEnabled(),
      loggingEnabled: this.configurationManager.isEventLoggingEnabled(),
      arrowKeysEnabled: this.configurationManager.areArrowKeysEnabled(),
      returnKeyEnabled: this.configurationManager.isReturnKeyEnabled()
    }
  }
}

/**
 * Enhanced select input service with comprehensive input management
 */
export class CynerSelectInputService {
  private configurationManager: CynerSelectInputConfigurationManager
  private eventProcessor: CynerSelectInputEventProcessor

  constructor(
    configurationManager?: CynerSelectInputConfigurationManager,
    eventProcessor?: CynerSelectInputEventProcessor
  ) {
    this.configurationManager = configurationManager || new CynerSelectInputConfigurationManager()
    this.eventProcessor = eventProcessor || new CynerSelectInputEventProcessor(this.configurationManager)
  }

  /**
   * Execute comprehensive select input management
   */
  public executeSelectInputManagement(props: UseSelectProps): void {
    try {
      this.executeEnhancedInputManagement(props)
    } catch (error) {
      console.error('Select input management failed:', error)
      this.executeFallbackInputManagement(props)
    }
  }

  private executeEnhancedInputManagement(props: UseSelectProps): void {
    const { isDisabled = false, state } = props

    if (!this.configurationManager.isStateIntegrationEnabled()) {
      return this.executeFallbackInputManagement(props)
    }

    // Enhanced input management with validation
    this.setupEnhancedInputHandling(isDisabled, state)
  }

  private executeFallbackInputManagement(props: UseSelectProps): void {
    // Fallback input management
    const { isDisabled = false, state } = props
    this.setupBasicInputHandling(isDisabled, state)
  }

  private setupEnhancedInputHandling(isDisabled: boolean, state: SelectState): void {
    // Enhanced input setup with event processor
    const inputHandler = (input: string, key: any) => {
      this.eventProcessor.processKeyboardInput(input, key, state, isDisabled)
    }

    // Setup input with enhanced configuration
    this.executeInputSetup(inputHandler, isDisabled)
  }

  private setupBasicInputHandling(isDisabled: boolean, state: SelectState): void {
    // Basic input setup
    const inputHandler = (input: string, key: any) => {
      if (key.downArrow) {
        state.focusNextOption()
      }

      if (key.upArrow) {
        state.focusPreviousOption()
      }

      if (key.return) {
        state.selectFocusedOption()
      }
    }

    this.executeInputSetup(inputHandler, isDisabled)
  }

  private executeInputSetup(inputHandler: (input: string, key: any) => void, isDisabled: boolean): void {
    // This would call useInput in the actual implementation
    // For now, we'll delegate to the original useSelect function
    useInput(inputHandler, { isActive: !isDisabled })
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedProcessingEnabled: boolean
    eventLoggingEnabled: boolean
    stateIntegrationEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateInputConfiguration(),
      enhancedProcessingEnabled: true,
      eventLoggingEnabled: this.configurationManager.isEventLoggingEnabled(),
      stateIntegrationEnabled: this.configurationManager.isStateIntegrationEnabled()
    }
  }

  public getConfigurationManager(): CynerSelectInputConfigurationManager {
    return this.configurationManager
  }

  public getEventProcessor(): CynerSelectInputEventProcessor {
    return this.eventProcessor
  }
}

export type UseSelectProps = {
  /**
   * When disabled, user input is ignored.
   *
   * @default false
   */
  isDisabled?: boolean

  /**
   * Select state.
   */
  state: SelectState
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerSelectInputConfigurationManager()
const defaultEventProcessor = new CynerSelectInputEventProcessor(defaultConfigurationManager)
const defaultSelectInputService = new CynerSelectInputService(
  defaultConfigurationManager,
  defaultEventProcessor
)

export const useSelect = ({ isDisabled = false, state }: UseSelectProps) => {
  useInput(
    (_input, key) => {
      if (key.downArrow) {
        state.focusNextOption()
      }

      if (key.upArrow) {
        state.focusPreviousOption()
      }

      if (key.return) {
        state.selectFocusedOption()
      }
    },
    { isActive: !isDisabled },
  )
}
