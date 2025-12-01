import { Box, Text, useInput } from 'ink'
import * as React from 'react'
import { useMemo, useState, useEffect } from 'react'
import figures from 'figures'
import { getTheme } from '../utils/theme'
import { Message as MessageComponent } from './Message'
import { randomUUID } from 'crypto'
import { type Tool } from '../Tool'
import {
  createUserMessage,
  isEmptyMessageText,
  isNotEmptyMessage,
  normalizeMessages,
} from '../utils/messages.js'
import { logEvent } from '../services/statsig'
import type { AssistantMessage, UserMessage } from '../query'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'

type Props = {
  erroredToolUseIDs: Set<string>
  messages: (UserMessage | AssistantMessage)[]
  onSelect: (message: UserMessage) => void
  onEscape: () => void
  tools: Tool[]
  unresolvedToolUseIDs: Set<string>
}

const MAX_VISIBLE_MESSAGES = 7

// Enhanced Configuration Management Service
class MessageSelectorConfigurationManager {
  private static instance: MessageSelectorConfigurationManager
  
  static getInstance(): MessageSelectorConfigurationManager {
    if (!this.instance) {
      this.instance = new MessageSelectorConfigurationManager()
    }
    return this.instance
  }

  getMaxVisibleMessages(): number {
    return MAX_VISIBLE_MESSAGES
  }

  getThemeSettings() {
    const theme = getTheme()
    return {
      secondaryBorder: theme.secondaryBorder,
      blue: 'blue',
      dimColor: 'dimColor'
    }
  }

  validateMessageArray(messages: any[]): boolean {
    return Array.isArray(messages) && messages.length > 0
  }

  validateTools(tools: any[]): boolean {
    return Array.isArray(tools)
  }
}

// Message Processing Service
class MessageSelectorProcessorService {
  private static instance: MessageSelectorProcessorService
  
  static getInstance(): MessageSelectorProcessorService {
    if (!this.instance) {
      this.instance = new MessageSelectorProcessorService()
    }
    return this.instance
  }

  generateUUID(): string {
    try {
      return randomUUID()
    } catch (error) {
      console.error('Error generating UUID:', error)
      return Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }
  }

  filterEmptyMessages(messages: any[]): any[] {
    try {
      return normalizeMessages(messages).filter(isNotEmptyMessage)
    } catch (error) {
      console.error('Error filtering messages:', error)
      return messages
    }
  }

  normalizeMessageList(messages: any[]): any[] {
    try {
      return normalizeMessages(messages)
    } catch (error) {
      console.error('Error normalizing messages:', error)
      return messages
    }
  }

  calculateVisibleRange(selectedIndex: number, totalItems: number, maxVisible: number) {
    const firstVisibleIndex = Math.max(
      0,
      Math.min(
        selectedIndex - Math.floor(maxVisible / 2),
        totalItems - maxVisible,
      ),
    )
    return { firstVisibleIndex, lastVisibleIndex: firstVisibleIndex + maxVisible }
  }
}

// Navigation Service
class MessageSelectorNavigationService {
  private static instance: MessageSelectorNavigationService
  
  static getInstance(): MessageSelectorNavigationService {
    if (!this.instance) {
      this.instance = new MessageSelectorNavigationService()
    }
    return this.instance
  }

  handleUpNavigation(
    setSelectedIndex: (value: number | ((prev: number) => number)) => void
  ): void {
    setSelectedIndex(prev => Math.max(0, prev - 1))
  }

  handleDownNavigation(
    totalItems: number, 
    setSelectedIndex: (value: number | ((prev: number) => number)) => void
  ): void {
    setSelectedIndex(prev => Math.min(totalItems - 1, prev + 1))
  }

  handleNumberKeySelection(
    input: string, 
    totalItems: number, 
    allItems: any[], 
    handleSelect: (item: any) => void
  ): boolean {
    const num = Number(input)
    if (!isNaN(num) && num >= 1 && num <= Math.min(9, totalItems)) {
      if (allItems[num - 1]) {
        handleSelect(allItems[num - 1])
        return true
      }
    }
    return false
  }
}

// Selection Service
class MessageSelectorSelectionService {
  private static instance: MessageSelectorSelectionService
  
  static getInstance(): MessageSelectorSelectionService {
    if (!this.instance) {
      this.instance = new MessageSelectorSelectionService()
    }
    return this.instance
  }

  processSelection(item: any, onSelect: (message: UserMessage) => void): void {
    try {
      if (item && typeof item === 'object') {
        onSelect(item)
      } else {
        console.error('Invalid item selected:', item)
      }
    } catch (error) {
      console.error('Error processing selection:', error)
    }
  }

  validateSelectionCallback(onSelect: (message: UserMessage) => void): boolean {
    return typeof onSelect === 'function'
  }
}

// Rendering Service
class MessageSelectorRenderingService {
  private configManager: MessageSelectorConfigurationManager
  private processorService: MessageSelectorProcessorService

  constructor(
    configManager: MessageSelectorConfigurationManager,
    processorService: MessageSelectorProcessorService
  ) {
    this.configManager = configManager
    this.processorService = processorService
  }

  static create(): MessageSelectorRenderingService {
    return new MessageSelectorRenderingService(
      MessageSelectorConfigurationManager.getInstance(),
      MessageSelectorProcessorService.getInstance()
    )
  }

  renderMessageSelector(
    allItems: any[],
    selectedIndex: number,
    currentUUID: string,
    normalizedMessages: any[],
    tools: Tool[],
    erroredToolUseIDs: Set<string>,
    unresolvedToolUseIDs: Set<string>,
    exitState: any
  ) {
    const theme = this.configManager.getThemeSettings()
    const maxVisible = this.configManager.getMaxVisibleMessages()
    const { firstVisibleIndex } = this.processorService.calculateVisibleRange(
      selectedIndex, 
      allItems.length, 
      maxVisible
    )

    return (
      <>
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.secondaryBorder}
          height={4 + Math.min(maxVisible, allItems.length) * 2}
          paddingX={1}
          marginTop={1}
        >
          <Box flexDirection="column" minHeight={2} marginBottom={1}>
            <Text bold>Jump to a previous message</Text>
            <Text dimColor>This will fork the conversation</Text>
          </Box>
          {allItems
            .slice(firstVisibleIndex, firstVisibleIndex + maxVisible)
            .map((msg, index) => {
              const actualIndex = firstVisibleIndex + index
              const isSelected = actualIndex === selectedIndex
              const isCurrent = msg.uuid === currentUUID

              return (
                <Box key={msg.uuid} flexDirection="row" height={2} minHeight={2}>
                  <Box width={7}>
                    {isSelected ? (
                      <Text color="blue" bold>
                        {figures.pointer} {firstVisibleIndex + index + 1}{' '}
                      </Text>
                    ) : (
                      <Text>
                        {'  '}
                        {firstVisibleIndex + index + 1}{' '}
                      </Text>
                    )}
                  </Box>
                  <Box height={1} overflow="hidden" width={100}>
                    {isCurrent ? (
                      <Box width="100%">
                        <Text dimColor italic>
                          {'(current)'}
                        </Text>
                      </Box>
                    ) : Array.isArray(msg.message.content) &&
                      msg.message.content[0]?.type === 'text' &&
                      isEmptyMessageText(msg.message.content[0].text) ? (
                      <Text dimColor italic>
                        (empty message)
                      </Text>
                    ) : (
                      <MessageComponent
                        message={msg}
                        messages={normalizedMessages}
                        addMargin={false}
                        tools={tools}
                        verbose={false}
                        debug={false}
                        erroredToolUseIDs={erroredToolUseIDs}
                        inProgressToolUseIDs={new Set()}
                        unresolvedToolUseIDs={unresolvedToolUseIDs}
                        shouldAnimate={false}
                        shouldShowDot={false}
                      />
                    )}
                  </Box>
                </Box>
              )
            })}
        </Box>
        <Box marginLeft={3}>
          <Text dimColor>
            {exitState.pending ? (
              <>Press {exitState.keyName} again to exit</>
            ) : (
              <>↑/↓ to select · Enter to confirm · Tab/Esc to cancel</>
            )}
          </Text>
        </Box>
      </>
    )
  }
}

export function MessageSelector({
  erroredToolUseIDs,
  messages,
  onSelect,
  onEscape,
  tools,
  unresolvedToolUseIDs,
}: Props): React.ReactNode {
  const configManager = MessageSelectorConfigurationManager.getInstance()
  const processorService = MessageSelectorProcessorService.getInstance()
  const navigationService = MessageSelectorNavigationService.getInstance()
  const selectionService = MessageSelectorSelectionService.getInstance()
  const renderingService = MessageSelectorRenderingService.create()

  const currentUUID = useMemo(() => processorService.generateUUID(), [processorService])

  // Log when selector is opened
  useEffect(() => {
    logEvent('tengu_message_selector_opened', {})
  }, [])

  // Validation
  if (!configManager.validateMessageArray(messages)) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="red">Error: Invalid messages array</Text>
      </Box>
    )
  }

  if (!selectionService.validateSelectionCallback(onSelect)) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="red">Error: Invalid selection callback</Text>
      </Box>
    )
  }

  function handleSelect(message: UserMessage) {
    try {
      const indexFromEnd = messages.length - 1 - messages.indexOf(message)
      logEvent('tengu_message_selector_selected', {
        index_from_end: indexFromEnd.toString(),
        message_type: message.type,
        is_current_prompt: (message.uuid === currentUUID).toString(),
      })
      selectionService.processSelection(message, onSelect)
    } catch (error) {
      console.error('Error handling selection:', error)
      onSelect(message) // Fallback to direct call
    }
  }

  function handleEscape() {
    try {
      logEvent('tengu_message_selector_cancelled', {})
      onEscape()
    } catch (error) {
      console.error('Error handling escape:', error)
      onEscape() // Fallback to direct call
    }
  }

  // Add current prompt as a virtual message
  const allItems = useMemo(
    () => {
      try {
        return [
          // Filter out tool results
          ...messages
            .filter(
              _ =>
                !(
                  _.type === 'user' &&
                  Array.isArray(_.message.content) &&
                  _.message.content[0]?.type === 'tool_result'
                ),
            )
            // Filter out assistant messages, until we have a way to kick off the tool use loop from REPL
            .filter(_ => _.type !== 'assistant'),
          { ...createUserMessage(''), uuid: currentUUID } as UserMessage,
        ]
      } catch (error) {
        console.error('Error creating items list:', error)
        return [{ ...createUserMessage(''), uuid: currentUUID } as UserMessage]
      }
    },
    [messages, currentUUID],
  )

  const [selectedIndex, setSelectedIndex] = useState(allItems.length - 1)
  const exitState = useExitOnCtrlCD(() => process.exit(0))

  useInput((input, key) => {
    if (key.tab || key.escape) {
      handleEscape()
      return
    }
    if (key.return) {
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex])
      }
      return
    }
    if (key.upArrow) {
      if (key.ctrl || key.shift || key.meta) {
        // Jump to top with any modifier key
        setSelectedIndex(0)
      } else {
        navigationService.handleUpNavigation(setSelectedIndex)
      }
    }
    if (key.downArrow) {
      if (key.ctrl || key.shift || key.meta) {
        // Jump to bottom with any modifier key
        setSelectedIndex(allItems.length - 1)
      } else {
        navigationService.handleDownNavigation(allItems.length, setSelectedIndex)
      }
    }

    // Handle number keys (1-9)
    navigationService.handleNumberKeySelection(input, allItems.length, allItems, handleSelect)
  })

  const normalizedMessages = useMemo(
    () => {
      try {
        return processorService.normalizeMessageList(messages).filter(isNotEmptyMessage)
      } catch (error) {
        console.error('Error normalizing messages:', error)
        return messages.filter(isNotEmptyMessage)
      }
    },
    [messages, processorService],
  )

  return renderingService.renderMessageSelector(
    allItems,
    selectedIndex,
    currentUUID,
    normalizedMessages,
    tools,
    erroredToolUseIDs,
    unresolvedToolUseIDs,
    exitState
  )
}
