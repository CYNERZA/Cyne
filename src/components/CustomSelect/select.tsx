import { Box, Text } from 'ink'
import React, { type ReactNode } from 'react'
import { SelectOption } from './select-option'
import { useSelectState } from './use-select-state'
import { useSelect } from './use-select'
import { Option, useComponentTheme } from '@inkjs/ui'

/**
 * Alternative implementation of select functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerSelectComponentConfiguration {
  commandIdentifier: string
  enableDisabledState: boolean
  defaultVisibleOptionCount: number
  enableHighlightText: boolean
  enableFocusTracking: boolean
  enableChangeCallbacks: boolean
  enableHeaderSupport: boolean
  enableThemeIntegration: boolean
}

export interface CynerSelectRenderingContext {
  selectState: any
  isComponentDisabled: boolean
  highlightTextValue?: string
  themeStyles: any
  processedOptions: Array<{
    key: string
    option: any
    isFocused: boolean
    isSelected: boolean
    smallPointer: boolean
    label: ReactNode
  }>
}

export interface CynerSelectStatistics {
  totalOptions: number
  visibleOptions: number
  focusedOptionIndex: number
  selectedOptionValue?: string
  hasHighlightText: boolean
  isDisabled: boolean
}

export type OptionSubtree = {
  /**
   * Header to show above sub-options.
   */
  readonly header?: string

  /**
   * Options.
   */
  readonly options: (Option | OptionSubtree)[]
}

export type OptionHeader = {
  readonly header: string

  readonly optionValues: string[]
}

export const optionHeaderKey = (optionHeader: OptionHeader): string =>
  `HEADER-${optionHeader.optionValues.join(',')}`

export type SelectProps = {
  /**
   * When disabled, user input is ignored.
   *
   * @default false
   */
  readonly isDisabled?: boolean

  /**
   * Number of visible options.
   *
   * @default 5
   */
  readonly visibleOptionCount?: number

  /**
   * Highlight text in option labels.
   */
  readonly highlightText?: string

  /**
   * Options.
   */
  readonly options: (Option | OptionSubtree)[]

  /**
   * Default value.
   */
  readonly defaultValue?: string

  /**
   * Callback when selected option changes.
   */
  readonly onChange?: (value: string) => void

  /**
   * Callback when focused option changes.
   */
  readonly onFocus?: (value: string) => void

  /**
   * Value to focus
   */
  readonly focusValue?: string
}

/**
 * Enhanced select component configuration manager
 */
export class CynerSelectComponentConfigurationManager {
  private configuration: CynerSelectComponentConfiguration

  constructor(customConfiguration?: Partial<CynerSelectComponentConfiguration>) {
    this.configuration = {
      commandIdentifier: 'select',
      enableDisabledState: true,
      defaultVisibleOptionCount: 5,
      enableHighlightText: true,
      enableFocusTracking: true,
      enableChangeCallbacks: true,
      enableHeaderSupport: true,
      enableThemeIntegration: true,
      ...customConfiguration
    }
  }

  public getComponentConfiguration(): CynerSelectComponentConfiguration {
    return { ...this.configuration }
  }

  public updateComponentConfiguration(updates: Partial<CynerSelectComponentConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public getComponentIdentifier(): string {
    return this.configuration.commandIdentifier
  }

  public isDisabledStateEnabled(): boolean {
    return this.configuration.enableDisabledState
  }

  public getDefaultVisibleOptionCount(): number {
    return this.configuration.defaultVisibleOptionCount
  }

  public isHighlightTextEnabled(): boolean {
    return this.configuration.enableHighlightText
  }

  public isFocusTrackingEnabled(): boolean {
    return this.configuration.enableFocusTracking
  }

  public areChangeCallbacksEnabled(): boolean {
    return this.configuration.enableChangeCallbacks
  }

  public isHeaderSupportEnabled(): boolean {
    return this.configuration.enableHeaderSupport
  }

  public isThemeIntegrationEnabled(): boolean {
    return this.configuration.enableThemeIntegration
  }

  public validateComponentConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.commandIdentifier &&
      typeof config.commandIdentifier === 'string' &&
      config.defaultVisibleOptionCount > 0 &&
      typeof config.defaultVisibleOptionCount === 'number'
    )
  }
}

/**
 * Enhanced select option processor with advanced rendering logic
 */
export class CynerSelectOptionProcessor {
  private configurationManager: CynerSelectComponentConfigurationManager

  constructor(configurationManager: CynerSelectComponentConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process select options with enhanced rendering logic
   */
  public processSelectOptions(
    selectState: any,
    isDisabled: boolean,
    highlightText?: string
  ): Array<{
    key: string
    option: any
    isFocused: boolean
    isSelected: boolean
    smallPointer: boolean
    label: ReactNode
  }> {
    return selectState.visibleOptions.map((option: any) => {
      const key = this.generateOptionKey(option)
      const focusState = this.determineOptionFocusState(option, selectState, isDisabled)
      const selectionState = this.determineOptionSelectionState(option, selectState)
      const pointerType = this.determinePointerType(option)
      const processedLabel = this.processOptionLabel(option, highlightText)

      return {
        key,
        option,
        isFocused: focusState,
        isSelected: selectionState,
        smallPointer: pointerType,
        label: processedLabel
      }
    })
  }

  private generateOptionKey(option: any): string {
    return 'value' in option ? option.value : optionHeaderKey(option)
  }

  private determineOptionFocusState(option: any, selectState: any, isDisabled: boolean): boolean {
    if (isDisabled || !this.configurationManager.isFocusTrackingEnabled()) {
      return false
    }

    if (selectState.focusedValue === undefined) {
      return false
    }

    return 'value' in option
      ? selectState.focusedValue === option.value
      : option.optionValues.includes(selectState.focusedValue)
  }

  private determineOptionSelectionState(option: any, selectState: any): boolean {
    if (!selectState.value) {
      return false
    }

    return 'value' in option
      ? selectState.value === option.value
      : option.optionValues.includes(selectState.value)
  }

  private determinePointerType(option: any): boolean {
    return this.configurationManager.isHeaderSupportEnabled() && 'header' in option
  }

  private processOptionLabel(option: any, highlightText?: string): ReactNode {
    const labelText = 'label' in option ? option.label : option.header

    if (!this.configurationManager.isHighlightTextEnabled() || !highlightText || !labelText.includes(highlightText)) {
      return labelText
    }

    return this.generateHighlightedLabel(labelText, highlightText)
  }

  private generateHighlightedLabel(labelText: string, highlightText: string): ReactNode {
    const { styles } = useComponentTheme('Select')
    const index = labelText.indexOf(highlightText)

    return (
      <>
        {labelText.slice(0, index)}
        <Text {...styles.highlightedText()}>{highlightText}</Text>
        {labelText.slice(index + highlightText.length)}
      </>
    )
  }

  public getProcessorStatistics(): {
    highlightTextEnabled: boolean
    focusTrackingEnabled: boolean
    headerSupportEnabled: boolean
    themeIntegrationEnabled: boolean
  } {
    return {
      highlightTextEnabled: this.configurationManager.isHighlightTextEnabled(),
      focusTrackingEnabled: this.configurationManager.isFocusTrackingEnabled(),
      headerSupportEnabled: this.configurationManager.isHeaderSupportEnabled(),
      themeIntegrationEnabled: this.configurationManager.isThemeIntegrationEnabled()
    }
  }
}

/**
 * Enhanced select rendering service with comprehensive component orchestration
 */
export class CynerSelectRenderingService {
  private configurationManager: CynerSelectComponentConfigurationManager
  private optionProcessor: CynerSelectOptionProcessor

  constructor(
    configurationManager?: CynerSelectComponentConfigurationManager,
    optionProcessor?: CynerSelectOptionProcessor
  ) {
    this.configurationManager = configurationManager || new CynerSelectComponentConfigurationManager()
    this.optionProcessor = optionProcessor || new CynerSelectOptionProcessor(this.configurationManager)
  }

  /**
   * Execute comprehensive select component rendering
   */
  public executeSelectComponentRendering(props: SelectProps): ReactNode {
    try {
      // Prepare select state with enhanced configuration
      const selectState = this.prepareSelectState(props)

      // Initialize select behavior hooks
      this.initializeSelectBehavior(props, selectState)

      // Generate rendering context
      const renderingContext = this.generateRenderingContext(props, selectState)

      // Render select component
      return this.renderSelectComponent(renderingContext)
    } catch (error) {
      console.error('Select component rendering failed:', error)
      return this.renderFallbackSelectComponent(props)
    }
  }

  private prepareSelectState(props: SelectProps) {
    const visibleOptionCount = props.visibleOptionCount ?? this.configurationManager.getDefaultVisibleOptionCount()

    return useSelectState({
      visibleOptionCount,
      options: props.options,
      defaultValue: props.defaultValue,
      onChange: this.configurationManager.areChangeCallbacksEnabled() ? props.onChange : undefined,
      onFocus: this.configurationManager.isFocusTrackingEnabled() ? props.onFocus : undefined,
      focusValue: props.focusValue,
    })
  }

  private initializeSelectBehavior(props: SelectProps, selectState: any): void {
    const isDisabled = this.configurationManager.isDisabledStateEnabled() ? (props.isDisabled ?? false) : false
    
    useSelect({ 
      isDisabled, 
      state: selectState 
    })
  }

  private generateRenderingContext(props: SelectProps, selectState: any): CynerSelectRenderingContext {
    const isDisabled = props.isDisabled ?? false
    const themeStyles = this.configurationManager.isThemeIntegrationEnabled()
      ? this.getThemeStyles()
      : this.getDefaultStyles()

    const processedOptions = this.optionProcessor.processSelectOptions(
      selectState,
      isDisabled,
      props.highlightText
    )

    return {
      selectState,
      isComponentDisabled: isDisabled,
      highlightTextValue: props.highlightText,
      themeStyles,
      processedOptions
    }
  }

  private getThemeStyles(): any {
    const { styles } = useComponentTheme('Select')
    return styles
  }

  private getDefaultStyles(): any {
    return {
      container: () => ({}),
      highlightedText: () => ({})
    }
  }

  private renderSelectComponent(context: CynerSelectRenderingContext): ReactNode {
    const { themeStyles, processedOptions } = context

    return (
      <Box {...themeStyles.container()}>
        {processedOptions.map((processedOption) => {
          const { key, isFocused, isSelected, smallPointer, label } = processedOption
          const selectOptionProps = {
            isFocused,
            isSelected,
            smallPointer,
            children: label
          }
          return React.createElement(SelectOption, { key, ...selectOptionProps })
        })}
      </Box>
    )
  }

  private renderFallbackSelectComponent(props: SelectProps): ReactNode {
    // Fallback rendering in case of errors
    return (
      <Box>
        <Text>Select component error - fallback rendering</Text>
      </Box>
    )
  }

  public getRenderingStatistics(): {
    componentEnabled: boolean
    themeIntegrationEnabled: boolean
    callbacksEnabled: boolean
    fallbackAvailable: boolean
  } {
    const config = this.configurationManager.getComponentConfiguration()
    return {
      componentEnabled: true,
      themeIntegrationEnabled: config.enableThemeIntegration,
      callbacksEnabled: config.enableChangeCallbacks && config.enableFocusTracking,
      fallbackAvailable: true
    }
  }

  public getConfigurationManager(): CynerSelectComponentConfigurationManager {
    return this.configurationManager
  }

  public getOptionProcessor(): CynerSelectOptionProcessor {
    return this.optionProcessor
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerSelectComponentConfigurationManager()
const defaultOptionProcessor = new CynerSelectOptionProcessor(defaultConfigurationManager)
const defaultRenderingService = new CynerSelectRenderingService(
  defaultConfigurationManager,
  defaultOptionProcessor
)

export function Select({
  isDisabled = false,
  visibleOptionCount = 5,
  highlightText,
  options,
  defaultValue,
  onChange,
  onFocus,
  focusValue,
}: SelectProps) {
  return defaultRenderingService.executeSelectComponentRendering({
    isDisabled,
    visibleOptionCount,
    highlightText,
    options,
    defaultValue,
    onChange,
    onFocus,
    focusValue
  })
}
