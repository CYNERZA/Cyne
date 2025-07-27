import React, { useState, useMemo, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { type Message } from '../query'
import { getSlowAndCapableModel } from '../utils/model'
import { useTerminalSize } from '../hooks/useTerminalSize'
import { processUserInput } from '../utils/messages'
import { getTheme } from '../utils/theme'
import { useSlashCommandTypeahead } from '../hooks/useSlashCommandTypeahead'
import { useArrowKeyHistory } from '../hooks/useArrowKeyHistory'
import { TextInput } from './TextInput'
import { countTokens, countCachedTokens } from '../utils/tokens'
import { WARNING_THRESHOLD } from '../constants'
import { exit } from 'process'

// Content processing utilities
class ContentProcessor {
  static generatePastedContentIndicator(text: string): string {
    const lineCount = (text.match(/\r\n|\r|\n/g) || []).length
    return `[Content: ${lineCount} lines] `
  }

  static preprocessPastedText(rawText: string): string {
    return rawText.replace(/\r/g, '\n')
  }

  static isExitCommand(input: string): boolean {
    return ['exit', 'quit', ':q', ':q!', ':wq', ':wq!'].includes(input.trim())
  }
}

// State management for prompt input
interface PromptInputState {
  isAutoUpdating: boolean
  exitMessage: { show: boolean; key?: string }
  message: { show: boolean; text?: string }
  pastedImage: string | null
  placeholder: string
  cursorOffset: number
  pastedText: string | null
}

class PromptInputStateManager {
  private setState: React.Dispatch<React.SetStateAction<PromptInputState>>
  
  constructor(setState: React.Dispatch<React.SetStateAction<PromptInputState>>) {
    this.setState = setState
  }

  updatePastedImage(image: string | null): void {
    this.setState(prev => ({ ...prev, pastedImage: image }))
  }

  updatePastedText(text: string | null): void {
    this.setState(prev => ({ ...prev, pastedText: text }))
  }

  updateCursorOffset(offset: number): void {
    this.setState(prev => ({ ...prev, cursorOffset: offset }))
  }

  resetForSubmission(): void {
    this.setState(prev => ({
      ...prev,
      pastedImage: null,
      pastedText: null
    }))
  }
}

// Core prompt input interface properties
interface PromptInputProps {
  commands: any[]
  forkNumber: number
  messageLogName: string
  isDisabled: boolean
  isLoading: boolean
  onQuery: (messages: Message[], controller: AbortController) => void
  debug: boolean
  verbose: boolean
  messages: Message[]
  setToolJSX: (jsx: any) => void
  onAutoUpdaterResult: (result: any) => void
  autoUpdaterResult: any
  tools: any[]
  input: string
  onInputChange: (input: string) => void
  mode: 'bash' | 'prompt'
  onModeChange: (mode: 'bash' | 'prompt') => void
  submitCount: number
  onSubmitCountChange: (updater: (prev: number) => number) => void
  setIsLoading: (loading: boolean) => void
  setAbortController: (controller: AbortController) => void
  onShowMessageSelector: () => void
  setForkConvoWithMessagesOnTheNextRender: (messages: Message[]) => void
  readFileTimestamps: Record<string, number>
}

export function PromptInput(props: PromptInputProps): React.ReactNode {
  const {
    commands, input, onInputChange, mode, onModeChange, messages,
    isDisabled, isLoading, onQuery, setIsLoading, setAbortController,
    onShowMessageSelector, setForkConvoWithMessagesOnTheNextRender,
    readFileTimestamps, tools, verbose, debug, submitCount, onSubmitCountChange
  } = props

  // Component state initialization
  const [state, setState] = useState<PromptInputState>({
    isAutoUpdating: false,
    exitMessage: { show: false },
    message: { show: false },
    pastedImage: null,
    placeholder: '',
    cursorOffset: input.length,
    pastedText: null
  })

  const stateManager = new PromptInputStateManager(setState)
  const { columns } = useTerminalSize()
  const theme = getTheme()

  // Command suggestions and typeahead
  const commandWidth = useMemo(
    () => Math.max(...commands.map(cmd => cmd.userFacingName().length)) + 5,
    [commands]
  )

  const { suggestions, selectedSuggestion, updateSuggestions, clearSuggestions } = 
    useSlashCommandTypeahead({
      commands,
      onInputChange,
      onSubmit: handleSubmission,
      setCursorOffset: stateManager.updateCursorOffset.bind(stateManager)
    })

  // Input handling
  const handleInputChange = useCallback((value: string) => {
    if (value.startsWith('!')) {
      onModeChange('bash')
      return
    }
    updateSuggestions(value)
    onInputChange(value)
  }, [onModeChange, onInputChange, updateSuggestions])

  // History management
  const { resetHistory, onHistoryUp, onHistoryDown } = useArrowKeyHistory(
    (value: string, mode: 'bash' | 'prompt') => {
      handleInputChange(value)
      onModeChange(mode)
    },
    input
  )

  const handleHistoryNavigation = (direction: 'up' | 'down') => {
    if (suggestions.length <= 1) {
      direction === 'up' ? onHistoryUp() : onHistoryDown()
    }
  }

  // Submission handling
  async function handleSubmission(input: string, isSubmittingSlashCommand = false) {
    if (!input || isDisabled || isLoading || (suggestions.length > 0 && !isSubmittingSlashCommand)) {
      return
    }

    if (ContentProcessor.isExitCommand(input)) {
      exit()
    }

    const processedInput = await processInputForSubmission(input)
    await executeSubmission(processedInput)
  }

  async function processInputForSubmission(input: string): Promise<string> {
    let finalInput = input
    
    if (state.pastedText) {
      const pastedPrompt = ContentProcessor.generatePastedContentIndicator(state.pastedText)
      if (finalInput.includes(pastedPrompt)) {
        finalInput = finalInput.replace(pastedPrompt, state.pastedText)
      }
    }
    
    return finalInput
  }

  async function executeSubmission(finalInput: string): Promise<void> {
    onInputChange('')
    onModeChange('prompt')
    clearSuggestions()
    stateManager.resetForSubmission()
    onSubmitCountChange(prev => prev + 1)
    setIsLoading(true)

    const abortController = new AbortController()
    setAbortController(abortController)
    
    const model = await getSlowAndCapableModel()
    const processedMessages = await processUserInput(
      finalInput,
      mode,
      props.setToolJSX,
      {
        options: {
          commands,
          forkNumber: props.forkNumber,
          messageLogName: props.messageLogName,
          tools,
          verbose,
          slowAndCapableModel: model,
          maxThinkingTokens: 0,
          dangerouslySkipPermissions: false,
        },
        messageId: undefined,
        abortController,
        readFileTimestamps,
        setForkConvoWithMessagesOnTheNextRender,
      },
      state.pastedImage
    )

    if (processedMessages.length) {
      onQuery(processedMessages, abortController)
    } else {
      resetHistory()
    }
  }

  // Paste handling
  const handleImagePaste = (image: string) => {
    onModeChange('prompt')
    stateManager.updatePastedImage(image)
  }

  const handleTextPaste = (rawText: string) => {
    const text = ContentProcessor.preprocessPastedText(rawText)
    const pastedPrompt = ContentProcessor.generatePastedContentIndicator(text)
    
    const newInput = input.slice(0, state.cursorOffset) + pastedPrompt + input.slice(state.cursorOffset)
    onInputChange(newInput)
    stateManager.updateCursorOffset(state.cursorOffset + pastedPrompt.length)
    stateManager.updatePastedText(text)
  }

  // Keyboard input handling
  useInput((_, key) => {
    if (input === '' && (key.escape || key.backspace || key.delete)) {
      onModeChange('prompt')
    }
    if (key.escape && messages.length > 0 && !input && !isLoading) {
      onShowMessageSelector()
    }
  })

  const textInputColumns = columns - 6
  const tokenUsage = useMemo(() => countTokens(messages), [messages])

  return (
    <Box flexDirection="column">
      <Box
        alignItems="flex-start"
        justifyContent="flex-start"
        borderColor={mode === 'bash' ? theme.bashBorder : theme.secondaryBorder}
        borderDimColor
        borderStyle="round"
        marginTop={1}
        width="100%"
      >
        <Box
          alignItems="flex-start"
          alignSelf="flex-start"
          flexWrap="nowrap"
          justifyContent="flex-start"
          width={3}
        >
          {mode === 'bash' ? (
            <Text color={theme.bashBorder}>&nbsp;!&nbsp;</Text>
          ) : (
            <Text color={isLoading ? theme.secondaryText : undefined}>
              &nbsp;&gt;&nbsp;
            </Text>
          )}
        </Box>
        <Box paddingRight={1}>
          <TextInput
            multiline
            onSubmit={handleSubmission}
            onChange={handleInputChange}
            value={input}
            onHistoryUp={() => handleHistoryNavigation('up')}
            onHistoryDown={() => handleHistoryNavigation('down')}
            onHistoryReset={resetHistory}
            placeholder={submitCount > 0 ? undefined : state.placeholder}
            onExit={() => process.exit(0)}
            onExitMessage={(show, key) => setState(prev => ({ ...prev, exitMessage: { show, key } }))}
            onMessage={(show, text) => setState(prev => ({ ...prev, message: { show, text } }))}
            onImagePaste={handleImagePaste}
            columns={textInputColumns}
            isDimmed={isDisabled || isLoading}
            disableCursorMovementForUpDownKeys={suggestions.length > 0}
            cursorOffset={state.cursorOffset}
            onChangeCursorOffset={stateManager.updateCursorOffset.bind(stateManager)}
            onPaste={handleTextPaste}
          />
        </Box>
      </Box>
      
      {suggestions.length === 0 && (
        <Box flexDirection="row" justifyContent="space-between" paddingX={2} paddingY={0}>
          <Box justifyContent="flex-start" gap={1}>
            {state.exitMessage.show ? (
              <Text dimColor>Press {state.exitMessage.key} again to exit</Text>
            ) : state.message.show ? (
              <Text dimColor>{state.message.text}</Text>
            ) : (
              <>
                <Text
                  color={mode === 'bash' ? theme.bashBorder : undefined}
                  dimColor={mode !== 'bash'}
                >
                  ! for terminal mode
                </Text>
                <Text dimColor>· / for commands · esc for options</Text>
              </>
            )}
          </Box>
          
          <Box justifyContent="flex-end" gap={1}>
            {debug && (
              <Text dimColor>
                {`${countTokens(messages)} tokens (${
                  Math.round((10000 * (countCachedTokens(messages) || 1)) / (countTokens(messages) || 1)) / 100
                }% cached)`}
              </Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
