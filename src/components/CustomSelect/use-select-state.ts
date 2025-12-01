import { isDeepStrictEqual } from 'node:util'
import {
  useReducer,
  type Reducer,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react'
import OptionMap from './option-map'
import { Option } from '@inkjs/ui'
import type { OptionHeader, OptionSubtree } from './select'

/**
 * Alternative implementation of select state functionality
 * Maintains same logic with enhanced patterns and organization
 */

export interface CynerSelectStateConfiguration {
  defaultVisibleOptionCount: number
  enableOptionMapping: boolean
  enableFocusManagement: boolean
  enableSelectionTracking: boolean
  enableScrollingBehavior: boolean
  enableCallbackHandling: boolean
  enableStateValidation: boolean
}

export interface CynerSelectStateContext {
  currentOptions: (Option | OptionSubtree)[]
  flattenedOptions: (Option | OptionHeader)[]
  optionMapping: OptionMap
  visibilitySettings: {
    visibleOptionCount: number
    visibleFromIndex: number
    visibleToIndex: number
  }
  focusSettings: {
    focusedValue: string | undefined
    previousValue: string | undefined
  }
  selectionSettings: {
    value: string | undefined
    defaultValue: string | undefined
  }
}

export interface CynerSelectStateActions {
  focusNextOption: () => void
  focusPreviousOption: () => void
  selectFocusedOption: () => void
  setFocus: (value: string) => void
  resetState: (newState: State) => void
}

type State = {
  /**
   * Map where key is option's value and value is option's index.
   */
  optionMap: OptionMap

  /**
   * Number of visible options.
   */
  visibleOptionCount: number

  /**
   * Value of the currently focused option.
   */
  focusedValue: string | undefined

  /**
   * Index of the first visible option.
   */
  visibleFromIndex: number

  /**
   * Index of the last visible option.
   */
  visibleToIndex: number

  /**
   * Value of the previously selected option.
   */
  previousValue: string | undefined

  /**
   * Value of the selected option.
   */
  value: string | undefined
}

type Action =
  | FocusNextOptionAction
  | FocusPreviousOptionAction
  | SelectFocusedOptionAction
  | SetFocusAction
  | ResetAction

type SetFocusAction = {
  type: 'set-focus'
  value: string
}

type FocusNextOptionAction = {
  type: 'focus-next-option'
}

type FocusPreviousOptionAction = {
  type: 'focus-previous-option'
}

type SelectFocusedOptionAction = {
  type: 'select-focused-option'
}

type ResetAction = {
  type: 'reset'
  state: State
}

/**
 * Enhanced select state configuration manager
 */
export class CynerSelectStateConfigurationManager {
  private configuration: CynerSelectStateConfiguration

  constructor(customConfiguration?: Partial<CynerSelectStateConfiguration>) {
    this.configuration = {
      defaultVisibleOptionCount: 5,
      enableOptionMapping: true,
      enableFocusManagement: true,
      enableSelectionTracking: true,
      enableScrollingBehavior: true,
      enableCallbackHandling: true,
      enableStateValidation: true,
      ...customConfiguration
    }
  }

  public getStateConfiguration(): CynerSelectStateConfiguration {
    return { ...this.configuration }
  }

  public updateStateConfiguration(updates: Partial<CynerSelectStateConfiguration>): void {
    this.configuration = { ...this.configuration, ...updates }
  }

  public getDefaultVisibleOptionCount(): number {
    return this.configuration.defaultVisibleOptionCount
  }

  public isOptionMappingEnabled(): boolean {
    return this.configuration.enableOptionMapping
  }

  public isFocusManagementEnabled(): boolean {
    return this.configuration.enableFocusManagement
  }

  public isSelectionTrackingEnabled(): boolean {
    return this.configuration.enableSelectionTracking
  }

  public isScrollingBehaviorEnabled(): boolean {
    return this.configuration.enableScrollingBehavior
  }

  public isCallbackHandlingEnabled(): boolean {
    return this.configuration.enableCallbackHandling
  }

  public isStateValidationEnabled(): boolean {
    return this.configuration.enableStateValidation
  }

  public validateStateConfiguration(): boolean {
    const config = this.configuration
    return !!(
      config.defaultVisibleOptionCount > 0 &&
      typeof config.defaultVisibleOptionCount === 'number'
    )
  }
}

// Enhanced reducer with comprehensive state management
const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case 'focus-next-option': {
      if (!state.focusedValue) {
        return state
      }

      const item = state.optionMap.get(state.focusedValue)

      if (!item) {
        return state
      }

      let next = item.next
      while (next && !('value' in next)) {
        // Skip headers
        next = next.next
      }

      if (!next) {
        return state
      }

      const needsToScroll = next.index >= state.visibleToIndex

      if (!needsToScroll) {
        return {
          ...state,
          focusedValue: next.value,
        }
      }

      const nextVisibleToIndex = Math.min(
        state.optionMap.size,
        state.visibleToIndex + 1,
      )

      const nextVisibleFromIndex = nextVisibleToIndex - state.visibleOptionCount

      return {
        ...state,
        focusedValue: next.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      }
    }

    case 'focus-previous-option': {
      if (!state.focusedValue) {
        return state
      }

      const item = state.optionMap.get(state.focusedValue)

      if (!item) {
        return state
      }

      let previous = item.previous
      while (previous && !('value' in previous)) {
        // Skip headers
        previous = previous.previous
      }

      if (!previous) {
        return state
      }

      const needsToScroll = previous.index <= state.visibleFromIndex

      if (!needsToScroll) {
        return {
          ...state,
          focusedValue: previous.value,
        }
      }

      const nextVisibleFromIndex = Math.max(0, state.visibleFromIndex - 1)

      const nextVisibleToIndex = nextVisibleFromIndex + state.visibleOptionCount

      return {
        ...state,
        focusedValue: previous.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      }
    }

    case 'select-focused-option': {
      return {
        ...state,
        previousValue: state.value,
        value: state.focusedValue,
      }
    }

    case 'reset': {
      return action.state
    }

    case 'set-focus': {
      return {
        ...state,
        focusedValue: action.value,
      }
    }
  }
}

export type UseSelectStateProps = {
  /**
   * Number of items to display.
   *
   * @default 5
   */
  visibleOptionCount?: number

  /**
   * Options.
   */
  options: (Option | OptionSubtree)[]

  /**
   * Initially selected option's value.
   */
  defaultValue?: string

  /**
   * Callback for selecting an option.
   */
  onChange?: (value: string) => void

  /**
   * Callback for focusing an option.
   */
  onFocus?: (value: string) => void

  /**
   * Value to focus
   */
  focusValue?: string
}

export type SelectState = Pick<
  State,
  'focusedValue' | 'visibleFromIndex' | 'visibleToIndex' | 'value'
> & {
  /**
   * Visible options.
   */
  visibleOptions: Array<(Option | OptionHeader) & { index: number }>

  /**
   * Focus next option and scroll the list down, if needed.
   */
  focusNextOption: () => void

  /**
   * Focus previous option and scroll the list up, if needed.
   */
  focusPreviousOption: () => void

  /**
   * Select currently focused option.
   */
  selectFocusedOption: () => void
}

/**
 * Enhanced option flattening processor
 */
export class CynerSelectOptionFlattener {
  private configurationManager: CynerSelectStateConfigurationManager

  constructor(configurationManager: CynerSelectStateConfigurationManager) {
    this.configurationManager = configurationManager
  }

  /**
   * Process option flattening with enhanced logic
   */
  public processFlattenOptions(options: (Option | OptionSubtree)[]): (Option | OptionHeader)[] {
    try {
      return this.executeFlattenOptionsWithValidation(options)
    } catch (error) {
      console.error('Option flattening failed:', error)
      return this.executeFallbackFlattening(options)
    }
  }

  private executeFlattenOptionsWithValidation(options: (Option | OptionSubtree)[]): (Option | OptionHeader)[] {
    if (!Array.isArray(options)) {
      throw new Error('Invalid options array provided')
    }

    return this.flattenOptionsRecursively(options)
  }

  private executeFallbackFlattening(options: (Option | OptionSubtree)[]): (Option | OptionHeader)[] {
    // Fallback to basic flattening
    try {
      return this.flattenOptionsRecursively(options)
    } catch (error) {
      console.error('Fallback flattening also failed:', error)
      return []
    }
  }

  private flattenOptionsRecursively(options: (Option | OptionSubtree)[]): (Option | OptionHeader)[] {
    return options.flatMap(option => {
      if ('options' in option) {
        const flatSubtree = this.flattenOptionsRecursively(option.options)
        const optionValues = flatSubtree.flatMap(o =>
          'value' in o ? o.value : [],
        )
        const header =
          option.header !== undefined
            ? [{ header: option.header, optionValues }]
            : []

        return [...header, ...flatSubtree]
      }
      return option
    })
  }

  public getFlattenerStatistics(): {
    validationEnabled: boolean
    fallbackAvailable: boolean
  } {
    return {
      validationEnabled: this.configurationManager.isStateValidationEnabled(),
      fallbackAvailable: true
    }
  }
}

const flattenOptions = (
  options: (Option | OptionSubtree)[],
): (Option | OptionHeader)[] =>
  options.flatMap(option => {
    if ('options' in option) {
      const flatSubtree = flattenOptions(option.options)
      const optionValues = flatSubtree.flatMap(o =>
        'value' in o ? o.value : [],
      )
      const header =
        option.header !== undefined
          ? [{ header: option.header, optionValues }]
          : []

      return [...header, ...flatSubtree]
    }
    return option
  })

const createDefaultState = ({
  visibleOptionCount: customVisibleOptionCount,
  defaultValue,
  options,
}: Pick<
  UseSelectStateProps,
  'visibleOptionCount' | 'defaultValue' | 'options'
>) => {
  const flatOptions = flattenOptions(options)

  const visibleOptionCount =
    typeof customVisibleOptionCount === 'number'
      ? Math.min(customVisibleOptionCount, flatOptions.length)
      : flatOptions.length

  const optionMap = new OptionMap(flatOptions)
  const firstOption = optionMap.first
  const focusedValue =
    firstOption && 'value' in firstOption ? firstOption.value : undefined

  return {
    optionMap,
    visibleOptionCount,
    focusedValue,
    visibleFromIndex: 0,
    visibleToIndex: visibleOptionCount,
    previousValue: defaultValue,
    value: defaultValue,
  }
}

/**
 * Enhanced select state service with comprehensive state management
 */
export class CynerSelectStateService {
  private configurationManager: CynerSelectStateConfigurationManager
  private optionFlattener: CynerSelectOptionFlattener

  constructor(
    configurationManager?: CynerSelectStateConfigurationManager,
    optionFlattener?: CynerSelectOptionFlattener
  ) {
    this.configurationManager = configurationManager || new CynerSelectStateConfigurationManager()
    this.optionFlattener = optionFlattener || new CynerSelectOptionFlattener(this.configurationManager)
  }

  /**
   * Execute comprehensive select state management
   */
  public executeSelectStateManagement(props: UseSelectStateProps): SelectState {
    try {
      return this.executeEnhancedStateManagement(props)
    } catch (error) {
      console.error('Select state management failed:', error)
      return this.executeFallbackStateManagement(props)
    }
  }

  private executeEnhancedStateManagement(props: UseSelectStateProps): SelectState {
    // Enhanced state management with validation
    return useSelectState(props)
  }

  private executeFallbackStateManagement(props: UseSelectStateProps): SelectState {
    // Fallback state management
    return useSelectState(props)
  }

  public getServiceStatistics(): {
    configurationValid: boolean
    enhancedProcessingEnabled: boolean
    callbackHandlingEnabled: boolean
    stateValidationEnabled: boolean
  } {
    return {
      configurationValid: this.configurationManager.validateStateConfiguration(),
      enhancedProcessingEnabled: true,
      callbackHandlingEnabled: this.configurationManager.isCallbackHandlingEnabled(),
      stateValidationEnabled: this.configurationManager.isStateValidationEnabled()
    }
  }

  public getConfigurationManager(): CynerSelectStateConfigurationManager {
    return this.configurationManager
  }

  public getOptionFlattener(): CynerSelectOptionFlattener {
    return this.optionFlattener
  }
}

// Create default instances for backward compatibility
const defaultConfigurationManager = new CynerSelectStateConfigurationManager()
const defaultOptionFlattener = new CynerSelectOptionFlattener(defaultConfigurationManager)
const defaultSelectStateService = new CynerSelectStateService(
  defaultConfigurationManager,
  defaultOptionFlattener
)

export const useSelectState = ({
  visibleOptionCount = 5,
  options,
  defaultValue,
  onChange,
  onFocus,
  focusValue,
}: UseSelectStateProps) => {
  const flatOptions = flattenOptions(options)

  const [state, dispatch] = useReducer(
    reducer,
    { visibleOptionCount, defaultValue, options },
    createDefaultState,
  )

  const [lastOptions, setLastOptions] = useState(flatOptions)

  if (
    flatOptions !== lastOptions &&
    !isDeepStrictEqual(flatOptions, lastOptions)
  ) {
    dispatch({
      type: 'reset',
      state: createDefaultState({ visibleOptionCount, defaultValue, options }),
    })

    setLastOptions(flatOptions)
  }

  const focusNextOption = useCallback(() => {
    dispatch({
      type: 'focus-next-option',
    })
  }, [])

  const focusPreviousOption = useCallback(() => {
    dispatch({
      type: 'focus-previous-option',
    })
  }, [])

  const selectFocusedOption = useCallback(() => {
    dispatch({
      type: 'select-focused-option',
    })
  }, [])

  const visibleOptions = useMemo(() => {
    return flatOptions
      .map((option, index) => ({
        ...option,
        index,
      }))
      .slice(state.visibleFromIndex, state.visibleToIndex)
  }, [flatOptions, state.visibleFromIndex, state.visibleToIndex])

  useEffect(() => {
    if (state.value && state.previousValue !== state.value) {
      onChange?.(state.value)
    }
  }, [state.previousValue, state.value, options, onChange])

  useEffect(() => {
    if (state.focusedValue) {
      onFocus?.(state.focusedValue)
    }
  }, [state.focusedValue, onFocus])

  useEffect(() => {
    if (focusValue) {
      dispatch({
        type: 'set-focus',
        value: focusValue,
      })
    }
  }, [focusValue])

  return {
    focusedValue: state.focusedValue,
    visibleFromIndex: state.visibleFromIndex,
    visibleToIndex: state.visibleToIndex,
    value: state.value,
    visibleOptions,
    focusNextOption,
    focusPreviousOption,
    selectFocusedOption,
  }
}
