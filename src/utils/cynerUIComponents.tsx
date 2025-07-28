import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import type { Message } from '../query'

/**
 * Alternative implementation of UI components
 * Maintains same logic but with enhanced patterns and organization
 */

export interface CynerUITheme {
  primary: string
  secondary: string
  accent: string
  error: string
  warning: string
  success: string
  background: string
  text: string
  border: string
}

export interface CynerComponentProps {
  theme?: Partial<CynerUITheme>
  className?: string
  testId?: string
  children?: React.ReactNode
}

export interface CynerInteractiveState {
  isActive: boolean
  isFocused: boolean
  isDisabled: boolean
  isLoading: boolean
}

/**
 * Enhanced theme system with dark/light mode support
 */
export class CynerThemeManager {
  private static instance: CynerThemeManager
  private currentTheme: CynerUITheme
  private listeners: Set<(theme: CynerUITheme) => void> = new Set()

  private constructor() {
    this.currentTheme = this.getDefaultTheme()
  }

  public static getInstance(): CynerThemeManager {
    if (!CynerThemeManager.instance) {
      CynerThemeManager.instance = new CynerThemeManager()
    }
    return CynerThemeManager.instance
  }

  private getDefaultTheme(): CynerUITheme {
    return {
      primary: '#0066cc',
      secondary: '#6c757d',
      accent: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      success: '#28a745',
      background: '#ffffff',
      text: '#212529',
      border: '#dee2e6'
    }
  }

  private getDarkTheme(): CynerUITheme {
    return {
      primary: '#4dabf7',
      secondary: '#868e96',
      accent: '#51cf66',
      error: '#ff6b6b',
      warning: '#ffd43b',
      success: '#51cf66',
      background: '#1a1a1a',
      text: '#ffffff',
      border: '#495057'
    }
  }

  public getTheme(): CynerUITheme {
    return { ...this.currentTheme }
  }

  public setTheme(theme: Partial<CynerUITheme>): void {
    this.currentTheme = { ...this.currentTheme, ...theme }
    this.notifyListeners()
  }

  public setDarkMode(enabled: boolean): void {
    this.currentTheme = enabled ? this.getDarkTheme() : this.getDefaultTheme()
    this.notifyListeners()
  }

  public addListener(listener: (theme: CynerUITheme) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme))
  }
}

/**
 * Enhanced hook for interactive component state
 */
export function useCynerInteractiveState(
  initialState: Partial<CynerInteractiveState> = {}
): [CynerInteractiveState, {
  activate: () => void
  deactivate: () => void
  focus: () => void
  blur: () => void
  enable: () => void
  disable: () => void
  startLoading: () => void
  stopLoading: () => void
  toggle: (key: keyof CynerInteractiveState) => void
}] {
  const [state, setState] = useState<CynerInteractiveState>({
    isActive: false,
    isFocused: false,
    isDisabled: false,
    isLoading: false,
    ...initialState
  })

  const actions = useMemo(() => ({
    activate: () => setState(prev => ({ ...prev, isActive: true })),
    deactivate: () => setState(prev => ({ ...prev, isActive: false })),
    focus: () => setState(prev => ({ ...prev, isFocused: true })),
    blur: () => setState(prev => ({ ...prev, isFocused: false })),
    enable: () => setState(prev => ({ ...prev, isDisabled: false })),
    disable: () => setState(prev => ({ ...prev, isDisabled: true })),
    startLoading: () => setState(prev => ({ ...prev, isLoading: true })),
    stopLoading: () => setState(prev => ({ ...prev, isLoading: false })),
    toggle: (key: keyof CynerInteractiveState) => setState(prev => ({ 
      ...prev, 
      [key]: !prev[key] 
    }))
  }), [])

  return [state, actions]
}

/**
 * Enhanced hook for theme management
 */
export function useCynerTheme(): [CynerUITheme, {
  setTheme: (theme: Partial<CynerUITheme>) => void
  setDarkMode: (enabled: boolean) => void
  toggleDarkMode: () => void
}] {
  const themeManager = CynerThemeManager.getInstance()
  const [theme, setThemeState] = useState(themeManager.getTheme())

  useEffect(() => {
    const unsubscribe = themeManager.addListener(setThemeState)
    return unsubscribe
  }, [themeManager])

  const actions = useMemo(() => ({
    setTheme: (newTheme: Partial<CynerUITheme>) => themeManager.setTheme(newTheme),
    setDarkMode: (enabled: boolean) => themeManager.setDarkMode(enabled),
    toggleDarkMode: () => {
      const isDark = theme.background === '#1a1a1a'
      themeManager.setDarkMode(!isDark)
    }
  }), [themeManager, theme.background])

  return [theme, actions]
}

/**
 * Enhanced animated spinner component
 */
export interface CynerSpinnerProps extends CynerComponentProps {
  type?: 'dots' | 'line' | 'arc' | 'bounce'
  speed?: 'slow' | 'normal' | 'fast'
  color?: string
  size?: 'small' | 'medium' | 'large'
}

export const CynerSpinner: React.FC<CynerSpinnerProps> = ({
  type = 'dots',
  speed = 'normal',
  color,
  size = 'medium',
  theme,
  testId = 'cyner-spinner'
}) => {
  const [currentTheme] = useCynerTheme()
  const [frame, setFrame] = useState(0)
  
  const speedMap = { slow: 200, normal: 100, fast: 50 }
  const sizeMap = { small: 1, medium: 2, large: 3 }
  
  const spinnerColor = color || theme?.primary || currentTheme.primary
  const frameCount = type === 'dots' ? 4 : type === 'line' ? 8 : type === 'arc' ? 4 : 3

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % frameCount)
    }, speedMap[speed])

    return () => clearInterval(interval)
  }, [speed, frameCount])

  const getSpinnerChar = useCallback(() => {
    switch (type) {
      case 'dots':
        return ['⠋', '⠙', '⠹', '⠸'][frame]
      case 'line':
        return ['|', '/', '—', '\\'][frame % 4]
      case 'arc':
        return ['◐', '◓', '◑', '◒'][frame]
      case 'bounce':
        return frame % 2 === 0 ? '●' : '○'
      default:
        return '⠋'
    }
  }, [type, frame])

  const padding = ' '.repeat(sizeMap[size])

  return (
    <Box data-testid={testId}>
      <Text color={spinnerColor}>
        {padding}{getSpinnerChar()}{padding}
      </Text>
    </Box>
  )
}

/**
 * Enhanced progress bar component
 */
export interface CynerProgressBarProps extends CynerComponentProps {
  progress: number // 0-100
  width?: number
  showPercentage?: boolean
  animated?: boolean
  color?: string
  backgroundColor?: string
}

export const CynerProgressBar: React.FC<CynerProgressBarProps> = ({
  progress,
  width = 20,
  showPercentage = true,
  animated = false,
  color,
  backgroundColor,
  theme,
  testId = 'cyner-progress-bar'
}) => {
  const [currentTheme] = useCynerTheme()
  const [animFrame, setAnimFrame] = useState(0)

  const progressColor = color || theme?.primary || currentTheme.primary
  const bgColor = backgroundColor || theme?.secondary || currentTheme.secondary

  useEffect(() => {
    if (animated) {
      const interval = setInterval(() => {
        setAnimFrame(prev => (prev + 1) % 4)
      }, 150)
      return () => clearInterval(interval)
    }
  }, [animated])

  const clampedProgress = Math.max(0, Math.min(100, progress))
  const filledWidth = Math.round((clampedProgress / 100) * width)
  const emptyWidth = width - filledWidth

  const getProgressChar = () => {
    if (!animated) return '█'
    return ['▏', '▎', '▍', '▌'][animFrame]
  }

  return (
    <Box data-testid={testId}>
      <Text color={progressColor}>
        {'█'.repeat(filledWidth)}
        {animated && filledWidth < width ? getProgressChar() : ''}
      </Text>
      <Text color={bgColor}>
        {'░'.repeat(Math.max(0, emptyWidth - (animated ? 1 : 0)))}
      </Text>
      {showPercentage && (
        <Text color={currentTheme.text}> {clampedProgress.toFixed(1)}%</Text>
      )}
    </Box>
  )
}

/**
 * Enhanced status indicator component
 */
export interface CynerStatusIndicatorProps extends CynerComponentProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message?: string
  icon?: string
  pulse?: boolean
}

export const CynerStatusIndicator: React.FC<CynerStatusIndicatorProps> = ({
  status,
  message,
  icon,
  pulse = false,
  theme,
  testId = 'cyner-status-indicator'
}) => {
  const [currentTheme] = useCynerTheme()
  const [pulseFrame, setPulseFrame] = useState(0)

  useEffect(() => {
    if (pulse) {
      const interval = setInterval(() => {
        setPulseFrame(prev => (prev + 1) % 2)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [pulse])

  const getStatusConfig = () => {
    const configs = {
      success: { 
        color: theme?.success || currentTheme.success, 
        icon: icon || '✓',
        defaultMessage: 'Success'
      },
      error: { 
        color: theme?.error || currentTheme.error, 
        icon: icon || '✗',
        defaultMessage: 'Error'
      },
      warning: { 
        color: theme?.warning || currentTheme.warning, 
        icon: icon || '⚠',
        defaultMessage: 'Warning'
      },
      info: { 
        color: theme?.primary || currentTheme.primary, 
        icon: icon || 'ℹ',
        defaultMessage: 'Info'
      },
      loading: { 
        color: theme?.secondary || currentTheme.secondary, 
        icon: icon || '⟳',
        defaultMessage: 'Loading...'
      }
    }
    return configs[status]
  }

  const config = getStatusConfig()
  const opacity = pulse && pulseFrame === 1 ? 0.5 : 1

  return (
    <Box data-testid={testId}>
      <Text color={config.color} dimColor={opacity < 1}>
        {config.icon} {message || config.defaultMessage}
      </Text>
    </Box>
  )
}

/**
 * Enhanced input field component with validation
 */
export interface CynerInputFieldProps extends CynerComponentProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  password?: boolean
  multiline?: boolean
  maxLength?: number
  validator?: (value: string) => string | null
  onSubmit?: (value: string) => void
  disabled?: boolean
}

export const CynerInputField: React.FC<CynerInputFieldProps> = ({
  value,
  onChange,
  placeholder = '',
  password = false,
  multiline = false,
  maxLength,
  validator,
  onSubmit,
  disabled = false,
  theme,
  testId = 'cyner-input-field'
}) => {
  const [currentTheme] = useCynerTheme()
  const [isFocused, setIsFocused] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { exit } = useApp()

  const displayValue = password ? '•'.repeat(value.length) : value
  const truncatedValue = maxLength ? displayValue.slice(0, maxLength) : displayValue

  useInput((input, key) => {
    if (disabled) return

    if (key.return && !multiline) {
      if (onSubmit && !validationError) {
        onSubmit(value)
      }
      return
    }

    if (key.return && key.ctrl && multiline) {
      if (onSubmit && !validationError) {
        onSubmit(value)
      }
      return
    }

    if (key.backspace || key.delete) {
      const newValue = value.slice(0, -1)
      onChange(newValue)
      
      if (validator) {
        const error = validator(newValue)
        setValidationError(error)
      }
      return
    }

    if (input && (!maxLength || value.length < maxLength)) {
      const newValue = value + input
      onChange(newValue)
      
      if (validator) {
        const error = validator(newValue)
        setValidationError(error)
      }
    }
  }, { isActive: !disabled })

  const borderColor = validationError 
    ? theme?.error || currentTheme.error
    : isFocused 
      ? theme?.primary || currentTheme.primary
      : theme?.border || currentTheme.border

  return (
    <Box flexDirection="column" data-testid={testId}>
      <Box 
        borderStyle="single" 
        borderColor={borderColor}
        paddingX={1}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <Text color={disabled ? currentTheme.secondary : currentTheme.text}>
          {truncatedValue || (isFocused ? '' : placeholder)}
          {isFocused && !disabled && '│'}
        </Text>
      </Box>
      
      {validationError && (
        <Box marginTop={1}>
          <Text color={currentTheme.error}>⚠ {validationError}</Text>
        </Box>
      )}
      
      {maxLength && (
        <Box justifyContent="flex-end">
          <Text color={currentTheme.secondary} dimColor>
            {value.length}/{maxLength}
          </Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Enhanced message display component
 */
export interface CynerMessageDisplayProps extends CynerComponentProps {
  messages: Message[]
  maxVisible?: number
  showTimestamps?: boolean
  showTypes?: boolean
  autoScroll?: boolean
}

export const CynerMessageDisplay: React.FC<CynerMessageDisplayProps> = ({
  messages,
  maxVisible = 10,
  showTimestamps = false,
  showTypes = false,
  autoScroll = true,
  theme,
  testId = 'cyner-message-display'
}) => {
  const [currentTheme] = useCynerTheme()
  const scrollRef = useRef<HTMLDivElement>(null)

  const visibleMessages = messages.slice(-maxVisible)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const getMessageColor = (message: Message) => {
    switch (message.type) {
      case 'user':
        return theme?.primary || currentTheme.primary
      case 'assistant':
        return theme?.secondary || currentTheme.secondary
      case 'progress':
        return theme?.accent || currentTheme.accent
      default:
        return currentTheme.text
    }
  }

  const getMessagePrefix = (message: Message) => {
    if (!showTypes) return ''
    
    const prefixes = {
      user: '👤',
      assistant: '🤖',
      progress: '⚙️'
    }
    
    return prefixes[message.type] || '💬'
  }

  const formatTimestamp = (message: Message) => {
    if (!showTimestamps) return ''
    
    // This would need to be implemented based on the actual Message structure
    // For now, using current time as placeholder
    const now = new Date()
    return `[${now.toLocaleTimeString()}] `
  }

  return (
    <Box flexDirection="column" data-testid={testId} ref={scrollRef}>
      {visibleMessages.map((message, index) => (
        <Box key={index} marginBottom={1}>
          <Text color={getMessageColor(message)}>
            {formatTimestamp(message)}
            {getMessagePrefix(message)}
            {' '}
            {typeof message.content === 'string' 
              ? message.content 
              : '[Complex Content]'
            }
          </Text>
        </Box>
      ))}
    </Box>
  )
}

/**
 * Enhanced layout container component
 */
export interface CynerLayoutContainerProps extends CynerComponentProps {
  direction?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  padding?: number
  margin?: number
  border?: boolean
  borderStyle?: 'single' | 'double' | 'round' | 'classic'
  borderColor?: string
  backgroundColor?: string
  minHeight?: number
  minWidth?: number
}

export const CynerLayoutContainer: React.FC<CynerLayoutContainerProps> = ({
  direction = 'column',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  padding = 0,
  margin = 0,
  border = false,
  borderStyle = 'single',
  borderColor,
  backgroundColor,
  minHeight,
  minWidth,
  theme,
  children,
  testId = 'cyner-layout-container'
}) => {
  const [currentTheme] = useCynerTheme()

  const boxProps: any = {
    flexDirection: direction,
    justifyContent,
    alignItems,
    paddingX: padding,
    paddingY: padding,
    marginX: margin,
    marginY: margin,
    minHeight,
    minWidth,
    'data-testid': testId
  }

  if (border) {
    boxProps.borderStyle = borderStyle
    boxProps.borderColor = borderColor || theme?.border || currentTheme.border
  }

  if (backgroundColor) {
    boxProps.backgroundColor = backgroundColor
  }

  return <Box {...boxProps}>{children}</Box>
}

/**
 * Enhanced application wrapper with global state
 */
export interface CynerApplicationWrapperProps extends CynerComponentProps {
  title?: string
  version?: string
  debug?: boolean
  onError?: (error: Error) => void
}

export const CynerApplicationWrapper: React.FC<CynerApplicationWrapperProps> = ({
  title = 'Cyne Application',
  version,
  debug = false,
  onError,
  theme,
  children,
  testId = 'cyner-application-wrapper'
}) => {
  const [currentTheme, themeActions] = useCynerTheme()
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (theme) {
      themeActions.setTheme(theme)
    }
  }, [theme, themeActions])

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = new Error(event.message)
      setError(error)
      if (onError) {
        onError(error)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError)
      return () => window.removeEventListener('error', handleError)
    }
  }, [onError])

  if (error) {
    return (
      <Box flexDirection="column" data-testid={`${testId}-error`}>
        <Text color={currentTheme.error}>
          ⚠ Application Error: {error.message}
        </Text>
        {debug && (
          <Text color={currentTheme.secondary}>
            {error.stack}
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" data-testid={testId}>
      {(title || version) && (
        <Box borderStyle="single" borderColor={currentTheme.border} marginBottom={1}>
          <Text color={currentTheme.primary} bold>
            {title} {version && `v${version}`}
          </Text>
        </Box>
      )}
      {children}
    </Box>
  )
}
