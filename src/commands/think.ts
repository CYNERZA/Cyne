import { Command } from '../commands'
import { clearToolsCache } from '../tools'
import type { Message } from '../query'
import type { Tool } from '../Tool'

/**
 * Think mode toggle command
 * Enables/disables extended thinking mode for deeper reasoning
 */

let thinkModeEnabled = false

export function isThinkModeEnabled(): boolean {
  return thinkModeEnabled || Boolean(process.env.THINK_TOOL)
}

export function setThinkMode(enabled: boolean): void {
  thinkModeEnabled = enabled
  if (enabled) {
    process.env.THINK_TOOL = '1'
  } else {
    delete process.env.THINK_TOOL
  }
  
  // Clear the memoized tools cache so ThinkTool gets included/excluded
  clearToolsCache()
}

const thinkCommand = {
  type: 'local' as const,
  name: 'think',
  description: 'Toggle think mode for extended reasoning on complex tasks',
  isEnabled: true,
  isHidden: false,
  
  async call(args: string, context: { 
    options: {
      commands: Command[]
      tools: Tool[]
      slowAndCapableModel: string
    }
    abortController: AbortController
    setForkConvoWithMessagesOnTheNextRender: (forkConvoWithMessages: Message[]) => void
  }): Promise<string> {
    const arg = args.trim().toLowerCase()
    
    if (arg === 'on' || arg === 'enable' || arg === '1') {
      setThinkMode(true)
      // Auto-clear conversation to start fresh with think mode and trigger tool reload
      context.setForkConvoWithMessagesOnTheNextRender([])
      return '🧠 Think mode ENABLED. Conversation cleared and tools reloaded. Deep reasoning is now active!'
    } else if (arg === 'off' || arg === 'disable' || arg === '0') {
      setThinkMode(false)
      // Auto-clear conversation when disabling too
      context.setForkConvoWithMessagesOnTheNextRender([])
      return '⚡ Think mode DISABLED. Conversation cleared. Returning to normal mode.'
    } else if (arg === 'status' || arg === '') {
      const status = isThinkModeEnabled()
      return status 
        ? '🧠 Think mode is currently ENABLED. Use /think off to disable.'
        : '⚡ Think mode is currently DISABLED. Use /think on to enable.'
    } else {
      return `Usage: /think [on|off|status]
  on     - Enable think mode (deep reasoning before every action)
  off    - Disable think mode (normal responses)
  status - Show current think mode status`
    }
  },
  
  userFacingName(): string {
    return 'think'
  },
} satisfies Command

export default thinkCommand
