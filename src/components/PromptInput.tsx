import { Box, Text, useInput } from 'ink'
import { sample } from 'lodash-es'
import { getExampleCommands } from '../utils/exampleCommands'
import * as React from 'react'
import { type Message } from '../query'
import { processUserInput } from '../utils/messages'
import { useArrowKeyHistory } from '../hooks/useArrowKeyHistory'
import { useSlashCommandTypeahead } from '../hooks/useSlashCommandTypeahead'
import { addToHistory } from '../history'
import TextInput from './TextInput'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { countCachedTokens, countTokens } from '../utils/tokens'
import { SentryErrorBoundary } from './SentryErrorBoundary'
import { AutoUpdater } from './AutoUpdater'
import type { AutoUpdaterResult } from '../utils/autoUpdater'
import type { Command } from '../commands'
import type { SetToolJSXFn, Tool } from '../Tool'
import { TokenWarning, WARNING_THRESHOLD } from './TokenWarning'
import { useTerminalSize } from '../hooks/useTerminalSize'
import { getTheme } from '../utils/theme'
import { getSlowAndCapableModel } from '../utils/model'
import { setTerminalTitle } from '../utils/terminal'
import terminalSetup, {
  isShiftEnterKeyBindingInstalled,
} from '../commands/terminalSetup.js'

type Props = {
  commands: Command[]
  forkNumber: number
  messageLogName: string
  isDisabled: boolean
  isLoading: boolean
  onQuery: (
    newMessages: Message[],
    abortController: AbortController,
  ) => Promise<void>
  debug: boolean
  verbose: boolean
  messages: Message[]
  setToolJSX: SetToolJSXFn
  onAutoUpdaterResult: (result: AutoUpdaterResult) => void
  autoUpdaterResult: AutoUpdaterResult | null
  tools: Tool[]
  input: string
  onInputChange: (value: string) => void
  mode: 'bash' | 'prompt'
  onModeChange: (mode: 'bash' | 'prompt') => void
  submitCount: number
  onSubmitCountChange: (updater: (prev: number) => number) => void
  setIsLoading: (isLoading: boolean) => void
  setAbortController: (abortController: AbortController) => void
  onShowMessageSelector: () => void
  setForkConvoWithMessagesOnTheNextRender: (
    forkConvoWithMessages: Message[],
  ) => void
  readFileTimestamps: { [filename: string]: number }
}

function createPastedContentIndicator(text: string): string {
  const lineCount = (text.match(/\r\n|\r|\n/g) || []).length
  return `[Content: ${lineCount} lines] `
}
function PromptInput({
  commands,
  forkNumber,
  messageLogName,
  isDisabled,
  isLoading,
  onQuery,
  debug,
  verbose,
  messages,
  setToolJSX,
  onAutoUpdaterResult,
  autoUpdaterResult,
  tools,
  input,
  onInputChange,
  mode,
  onModeChange,
  submitCount,
  onSubmitCountChange,
  setIsLoading,
  setAbortController,
  onShowMessageSelector,
  setForkConvoWithMessagesOnTheNextRender,
  readFileTimestamps,
}: Props): React.ReactNode {
  const [isAutoUpdating, setIsAutoUpdating] = useState(false)
  const [exitMessage, setExitMessage] = useState<{
    show: boolean
    key?: string
  }>({ show: false })
  const [message, setMessage] = useState<{
    show: boolean
    text?: string
  }>({ show: false })
  const [pastedImage, setPastedImage] = useState<string | null>(null)
  const [placeholder, setPlaceholder] = useState('')
  const [cursorOffset, setCursorOffset] = useState<number>(input.length)
  const [pastedText, setPastedText] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    getExampleCommands().then(commands => {
      const cmd = sample(commands)
      setPlaceholder(`Try "${cmd}"`)
    })
  }, [])
  const { columns } = useTerminalSize()

  const commandWidth = useMemo(
    () => Math.max(...commands.map(cmd => cmd.userFacingName().length)) + 5,
    [commands],
  )

  const {
    suggestions,
    selectedSuggestion,
    updateSuggestions,
    clearSuggestions,
  } = useSlashCommandTypeahead({
    commands,
    onInputChange,
    onSubmit,
    setCursorOffset,
  })

  const onChange = useCallback(
    (value: string) => {
      // Toggle shortcuts panel when ? is typed alone
      if (value === '?') {
        setShowShortcuts(s => !s)
        onInputChange('')
        return
      }
      setShowShortcuts(false)
      if (value.startsWith('!')) {
        onModeChange('bash')
        return
      }
      updateSuggestions(value)
      onInputChange(value)
    },
    [onModeChange, onInputChange, updateSuggestions],
  )

  const { resetHistory, onHistoryUp, onHistoryDown } = useArrowKeyHistory(
    (value: string, mode: 'bash' | 'prompt') => {
      onChange(value)
      onModeChange(mode)
    },
    input,
  )

  // Only use history navigation when there are 0 or 1 slash command suggestions
  const handleHistoryUp = () => {
    if (suggestions.length <= 1) {
      onHistoryUp()
    }
  }

  const handleHistoryDown = () => {
    if (suggestions.length <= 1) {
      onHistoryDown()
    }
  }

  async function onSubmit(input: string, isSubmittingSlashCommand = false) {
    if (input === '') {
      return
    }
    if (isDisabled) {
      return
    }
    if (isLoading) {
      return
    }
    if (suggestions.length > 0 && !isSubmittingSlashCommand) {
      return
    }

    // Handle exit commands
    if (['exit', 'quit', ':q', ':q!', ':wq', ':wq!'].includes(input.trim())) {
      exit()
    }

    let finalInput = input
    if (pastedText) {
      // Create the prompt pattern that would have been used for this pasted text
              const pastedPrompt = createPastedContentIndicator(pastedText)
      if (finalInput.includes(pastedPrompt)) {
        finalInput = finalInput.replace(pastedPrompt, pastedText)
      } // otherwise, ignore the pastedText if the user has modified the prompt
    }
    onInputChange('')
    onModeChange('prompt')
    clearSuggestions()
    setPastedImage(null)
    setPastedText(null)
    onSubmitCountChange(_ => _ + 1)
    setIsLoading(true)

    const abortController = new AbortController()
    setAbortController(abortController)
    const model = await getSlowAndCapableModel()
    const messages = await processUserInput(
      finalInput,
      mode,
      setToolJSX,
      {
        options: {
          commands,
          forkNumber,
          messageLogName,
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
      pastedImage ?? null,
    )

    if (messages.length) {
      onQuery(messages, abortController)
    } else {
      // Local JSX commands
      addToHistory(input)
      resetHistory()
      return
    }

    for (const message of messages) {
      if (message.type === 'user') {
        const inputToAdd = mode === 'bash' ? `!${input}` : input
        addToHistory(inputToAdd)
        resetHistory()
      }
    }
  }

  function onImagePaste(image: string) {
    onModeChange('prompt')
    setPastedImage(image)
  }

  function onTextPaste(rawText: string) {
    // Replace any \r with \n first to match useTextInput's conversion behavior
    const text = rawText.replace(/\r/g, '\n')

    // Get prompt with newline count
    const pastedPrompt = createPastedContentIndicator(text)

    // Update the input with a visual indicator that text has been pasted
    const newInput =
      input.slice(0, cursorOffset) + pastedPrompt + input.slice(cursorOffset)
    onInputChange(newInput)

    // Update cursor position to be after the inserted indicator
    setCursorOffset(cursorOffset + pastedPrompt.length)

    // Still set the pastedText state for actual submission
    setPastedText(text)
  }

  useInput((_, key) => {
    if (input === '' && (key.escape || key.backspace || key.delete)) {
      onModeChange('prompt')
    }
    // esc is a little overloaded:
    // - when we're loading a response, it's used to cancel the request
    // - otherwise, it's used to show the message selector
    // - when double pressed, it's used to clear the input
    if (key.escape && messages.length > 0 && !input && !isLoading) {
      onShowMessageSelector()
    }
  })

  const textInputColumns = useTerminalSize().columns - 6
  const tokenUsage = useMemo(() => countTokens(messages), [messages])
  const theme = getTheme()
  
  const [borderColorIndex, setBorderColorIndex] = useState(0)
  
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setBorderColorIndex(prev => (prev + 1) % theme.gradients.primary.length)
      }, 300)
      return () => clearInterval(interval)
    }
  }, [isLoading, theme.gradients.primary.length])
  
  const getBorderColor = () => {
    if (mode === 'bash') return theme.bashBorder
    if (isLoading) return theme.gradients.primary[borderColorIndex]
    return theme.accent.primary
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Top horizontal line separator - responsive to window width */}
      <Box>
        <Text color={theme.secondaryText}>{'─'.repeat(columns - 2)}</Text>
      </Box>
      
      {/* Claude Code style input with > prompt */}
      <Box flexDirection="row" alignItems="flex-start" marginY={0}>
        {/* Prompt symbol */}
        <Box width={2}>
          {mode === 'bash' ? (
            <Text color={theme.bashBorder} bold>$</Text>
          ) : isLoading ? (
            <Text color={theme.gradients.primary[borderColorIndex]} bold>◈</Text>
          ) : (
            <Text color={theme.text} bold>›</Text>
          )}
        </Box>
        
        {/* Input area */}
        <Box flexGrow={1}>
          <TextInput
            multiline
            onSubmit={onSubmit}
            onChange={onChange}
            value={input}
            onHistoryUp={handleHistoryUp}
            onHistoryDown={handleHistoryDown}
            onHistoryReset={() => resetHistory()}
            placeholder={submitCount > 0 ? undefined : placeholder}
            onExit={() => process.exit(0)}
            onExitMessage={(show, key) => setExitMessage({ show, key })}
            onMessage={(show, text) => setMessage({ show, text })}
            onImagePaste={onImagePaste}
            columns={textInputColumns}
            isDimmed={isDisabled || isLoading}
            disableCursorMovementForUpDownKeys={suggestions.length > 0}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            onPaste={onTextPaste}
          />
        </Box>
      </Box>

      {/* Bottom horizontal line separator - responsive to window width */}
      <Box>
        <Text color={theme.secondaryText}>{'─'.repeat(columns - 2)}</Text>
      </Box>
      
      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && suggestions.length === 0 && (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text color={theme.cynerza} bold>⌨ Keyboard Shortcuts</Text>
          <Box marginTop={1} flexDirection="column" gap={0}>
            <Box gap={4}>
              <Box width={30}><Text color={theme.accent.secondary}>↑/↓</Text><Text color={theme.text}> History navigation</Text></Box>
              <Box width={30}><Text color={theme.accent.secondary}>Ctrl+C</Text><Text color={theme.text}> Cancel/Exit</Text></Box>
            </Box>
            <Box gap={4}>
              <Box width={30}><Text color={theme.accent.secondary}>Esc</Text><Text color={theme.text}> Options/Cancel</Text></Box>
              <Box width={30}><Text color={theme.accent.secondary}>Tab</Text><Text color={theme.text}> Autocomplete</Text></Box>
            </Box>
            <Box gap={4}>
              <Box width={30}><Text color={theme.accent.secondary}>!</Text><Text color={theme.text}> Bash mode</Text></Box>
              <Box width={30}><Text color={theme.accent.secondary}>/</Text><Text color={theme.text}> Commands</Text></Box>
            </Box>
            <Box gap={4}>
              <Box width={30}><Text color={theme.accent.secondary}>Ctrl+Shift+I</Text><Text color={theme.text}> Expand inputs</Text></Box>
              <Box width={30}><Text color={theme.accent.secondary}>Ctrl+Shift+R</Text><Text color={theme.text}> Expand outputs</Text></Box>
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.secondaryText}>Press ? again to close</Text>
          </Box>
        </Box>
      )}

      {/* Shortcuts hint below input */}
      {!showShortcuts && suggestions.length === 0 && (
        <Box paddingLeft={2} marginTop={0}>
          {exitMessage.show ? (
            <Text dimColor>Press {exitMessage.key} again to exit</Text>
          ) : message.show ? (
            <Text dimColor>{message.text}</Text>
          ) : (
            <Text color={theme.secondaryText}>? for shortcuts</Text>
          )}
        </Box>
      )}
      {suggestions.length > 0 && (
        <Box
          flexDirection="row"
          justifyContent="space-between"
          paddingX={2}
          paddingY={0}
        >
          <Box flexDirection="column">
            {suggestions.map((suggestion, index) => {
              const command = commands.find(
                cmd => cmd.userFacingName() === suggestion.replace('/', ''),
              )
              return (
                <Box
                  key={suggestion}
                  flexDirection={columns < 80 ? 'column' : 'row'}
                >
                  <Box width={columns < 80 ? undefined : commandWidth}>
                    <Text
                      color={
                        index === selectedSuggestion
                          ? theme.suggestion
                          : undefined
                      }
                      dimColor={index !== selectedSuggestion}
                    >
                      /{suggestion}
                      {command?.aliases && command.aliases.length > 0 && (
                        <Text dimColor> ({command.aliases.join(', ')})</Text>
                      )}
                    </Text>
                  </Box>
                  {command && (
                    <Box
                      width={columns - (columns < 80 ? 4 : commandWidth + 4)}
                      paddingLeft={columns < 80 ? 4 : 0}
                    >
                      <Text
                        color={
                          index === selectedSuggestion
                            ? theme.suggestion
                            : undefined
                        }
                        dimColor={index !== selectedSuggestion}
                        wrap="wrap"
                      >
                        <Text dimColor={index !== selectedSuggestion}>
                          {command.description}
                          {command.type === 'prompt' && command.argNames?.length
                            ? ` (arguments: ${command.argNames.join(', ')})`
                            : null}
                        </Text>
                      </Text>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
          <SentryErrorBoundary>
            <Box justifyContent="flex-end" gap={1}>
              <TokenWarning tokenUsage={countTokens(messages)} />
              <AutoUpdater
                debug={debug}
                onAutoUpdaterResult={onAutoUpdaterResult}
                autoUpdaterResult={autoUpdaterResult}
                isUpdating={isAutoUpdating}
                onChangeIsUpdating={setIsAutoUpdating}
              />
            </Box>
          </SentryErrorBoundary>
        </Box>
      )}
    </Box>
  )
}

export default memo(PromptInput)

function exit(): never {
  setTerminalTitle('')
  process.exit(0)
}
