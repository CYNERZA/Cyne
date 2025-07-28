import figures from 'figures'
import { Box, Text } from 'ink'
import React, { type ReactNode } from 'react'
import { useComponentTheme } from '@inkjs/ui'

/**
 * Alternative implementation of select option functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerSelectOptionConfiguration {
  enableFocusIndicator: boolean
  enableSelectedIndicator: boolean
  enableSmallPointerSupport: boolean
  enableThemeIntegration: boolean
  defaultFocusIndicator: string
  defaultSelectedIndicator: string
  smallPointerIndicator: string
}

export interface CynerSelectOptionState {
  isFocused: boolean
  isSelected: boolean
  hasSmallPointer: boolean
  labelContent: ReactNode
  focusIndicatorSymbol: string
  selectedIndicatorSymbol: string
}

export interface CynerSelectOptionRenderContext {
  configuration: CynerSelectOptionConfiguration
  state: CynerSelectOptionState
  themeStyles: any
  displayElements: {
    focusIndicator?: ReactNode
    labelElement: ReactNode
    selectedIndicator?: ReactNode
  }
}

export type SelectOptionProps = {
  /**
   * Determines if option is focused.
   */
  readonly isFocused: boolean

  /**
   * Determines if option is selected.
   */
  readonly isSelected: boolean

  /**
   * Determines if pointer is shown when selected
   */
  readonly smallPointer?: boolean

  /**
   * Option label.
   */
  readonly children: ReactNode
}

/**
 * Enhanced select option configuration manager
 */
export class CynerSelectOptionConfigurationManager {
  private configuration: CynerSelectOptionConfiguration

  constructor(customConfiguration?: Partial<CynerSelectOptionConfiguration>) {
    this.configuration = {
      enableFocusIndicator: true,
      enableSelectedIndicator: true,
      enableSmallPointerSupport: true,
      enableThemeIntegration: true,
      defaultFocusIndicator: figures.pointer,
      defaultSelectedIndicator: figures.tick,
      smallPointerIndicator: figures.triangleDownSmall,
      ...customConfiguration
    }
  }

  public getOptionConfiguration(): CynerSelectOptionConfiguration {
    return { ...this.configuration }
  }

  public updateOptionConfiguration(updates: Partial<CynerSelectOptionConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public isFocusIndicatorEnabled(): boolean {
    return this.configuration.enableFocusIndicator
  }

  public isSelectedIndicatorEnabled(): boolean {
    return this.configuration.enableSelectedIndicator
  }

  public isSmallPointerSupportEnabled(): boolean {
    return this.configuration.enableSmallPointerSupport
  }

  public isThemeIntegrationEnabled(): boolean {
    return this.configuration.enableThemeIntegration
  }

  public getDefaultFocusIndicator(): string {
    return this.configuration.defaultFocusIndicator
  }

  public getDefaultSelectedIndicator(): string {
    return this.configuration.defaultSelectedIndicator
  }

  public getSmallPointerIndicator(): string {
    return this.configuration.smallPointerIndicator
  }

  public validateConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.defaultFocusIndicator &&
      typeof config.defaultFocusIndicator === 'string' &&
      config.defaultSelectedIndicator &&
      typeof config.defaultSelectedIndicator === 'string' &&
      config.smallPointerIndicator &&
      typeof config.smallPointerIndicator === 'string'
    )
  }
}

/**
 * Enhanced select option state processor
 */
export class CynerSelectOptionStateProcessor {
  private configurationManager: CynerSelectOptionConfigurationManager

  constructor(configurationManager: CynerSelectOptionConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process select option state with enhanced logic
   */
  public processSelectOptionState(props: SelectOptionProps): CynerSelectOptionState {
    const focusIndicatorSymbol = this.determineFocusIndicatorSymbol(props.smallPointer)
    
    return {
      isFocused: props.isFocused,
      isSelected: props.isSelected,
      hasSmallPointer: !!props.smallPointer,
      labelContent: props.children,
      focusIndicatorSymbol,
      selectedIndicatorSymbol: this.configurationManager.getDefaultSelectedIndicator()
    }
  }

  private determineFocusIndicatorSymbol(useSmallPointer?: boolean): string {
    if (!this.configurationManager.isSmallPointerSupportEnabled()) {
      return this.configurationManager.getDefaultFocusIndicator()
    }

    return useSmallPointer
      ? this.configurationManager.getSmallPointerIndicator()
      : this.configurationManager.getDefaultFocusIndicator()
  }

  /**
   * Generate option render context with enhanced theming
   */
  public generateOptionRenderContext(
    state: CynerSelectOptionState,
    themeStyles: any
  ): CynerSelectOptionRenderContext {
    const displayElements = this.generateDisplayElements(state, themeStyles)

    return {
      configuration: this.configurationManager.getOptionConfiguration(),
      state,
      themeStyles,
      displayElements
    }
  }

  private generateDisplayElements(
    state: CynerSelectOptionState,
    themeStyles: any
  ): CynerSelectOptionRenderContext['displayElements'] {
    const elements: CynerSelectOptionRenderContext['displayElements'] = {
      labelElement: (
        <Text {...themeStyles.label({ isFocused: state.isFocused, isSelected: state.isSelected })}>
          {state.labelContent}
        </Text>
      )
    }

    // Add focus indicator if focused and enabled
    if (state.isFocused && this.configurationManager.isFocusIndicatorEnabled()) {
      elements.focusIndicator = (
        <Text {...themeStyles.focusIndicator()}>
          {state.focusIndicatorSymbol}
        </Text>
      )
    }

    // Add selected indicator if selected and enabled
    if (state.isSelected && this.configurationManager.isSelectedIndicatorEnabled()) {
      elements.selectedIndicator = (
        <Text {...themeStyles.selectedIndicator()}>
          {state.selectedIndicatorSymbol}
        </Text>
      )
    }

    return elements
  }

  public getProcessorStatistics(): {
    focusIndicatorEnabled: boolean
    selectedIndicatorEnabled: boolean
    smallPointerSupported: boolean
    themeIntegrationEnabled: boolean
  } {
    return {
      focusIndicatorEnabled: this.configurationManager.isFocusIndicatorEnabled(),
      selectedIndicatorEnabled: this.configurationManager.isSelectedIndicatorEnabled(),
      smallPointerSupported: this.configurationManager.isSmallPointerSupportEnabled(),
      themeIntegrationEnabled: this.configurationManager.isThemeIntegrationEnabled()
    }
  }
}

/**
 * Enhanced select option rendering service
 */
export class CynerSelectOptionRenderingService {
  private configurationManager: CynerSelectOptionConfigurationManager
  private stateProcessor: CynerSelectOptionStateProcessor

  constructor(
    configurationManager?: CynerSelectOptionConfigurationManager,
    stateProcessor?: CynerSelectOptionStateProcessor
  ) {
    this.configurationManager = configurationManager || new CynerSelectOptionConfigurationManager()
    this.stateProcessor = stateProcessor || new CynerSelectOptionStateProcessor(this.configurationManager)
  }

  /**
   * Execute comprehensive select option rendering
   */
  public executeSelectOptionRendering(props: SelectOptionProps): ReactNode {
    try {
      // Get theme styles if theme integration is enabled
      const themeStyles = this.configurationManager.isThemeIntegrationEnabled()
        ? this.getThemeStyles()
        : this.getDefaultStyles()

      // Process option state
      const optionState = this.stateProcessor.processSelectOptionState(props)

      // Generate render context
      const renderContext = this.stateProcessor.generateOptionRenderContext(optionState, themeStyles)

      // Render option component
      return this.renderSelectOptionComponent(renderContext)
    } catch (error) {
      console.error('Select option rendering failed:', error)
      // Return fallback rendering
      return this.renderFallbackSelectOption(props)
    }
  }

  private getThemeStyles(): any {
    const { styles } = useComponentTheme('Select')
    return styles
  }

  private getDefaultStyles(): any {
    // Fallback styles if theme integration is disabled
    return {
      option: () => ({}),
      focusIndicator: () => ({}),
      label: () => ({}),
      selectedIndicator: () => ({})
    }
  }

  private renderSelectOptionComponent(context: CynerSelectOptionRenderContext): ReactNode {
    const { displayElements, themeStyles, state } = context

    return (
      <Box {...themeStyles.option({ isFocused: state.isFocused })}>
        {displayElements.focusIndicator}
        {displayElements.labelElement}
        {displayElements.selectedIndicator}
      </Box>
    )
  }

  private renderFallbackSelectOption(props: SelectOptionProps): ReactNode {
    return (
      <Box>
        {props.isFocused && <Text>{figures.pointer}</Text>}
        <Text>{props.children}</Text>
        {props.isSelected && <Text>{figures.tick}</Text>}
      </Box>
    )
  }

  public getRenderingStatistics(): {
    themeIntegrationEnabled: boolean
    fallbackRenderingAvailable: boolean
    configurationValid: boolean
  } {
    return {
      themeIntegrationEnabled: this.configurationManager.isThemeIntegrationEnabled(),
      fallbackRenderingAvailable: true,
      configurationValid: this.configurationManager.validateConfiguration()
    }
  }

  public getConfigurationManager(): CynerSelectOptionConfigurationManager {
    return this.configurationManager
  }

  public getStateProcessor(): CynerSelectOptionStateProcessor {
    return this.stateProcessor
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerSelectOptionConfigurationManager()
const defaultStateProcessor = new CynerSelectOptionStateProcessor(defaultConfigurationManager)
const defaultRenderingService = new CynerSelectOptionRenderingService(
  defaultConfigurationManager,
  defaultStateProcessor
)

export function SelectOption({
  isFocused,
  isSelected,
  smallPointer,
  children,
}: SelectOptionProps) {
  return defaultRenderingService.executeSelectOptionRendering({
    isFocused,
    isSelected,
    smallPointer,
    children
  })
}
