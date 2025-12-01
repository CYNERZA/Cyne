import { Command } from '../commands'
import { Help } from '../components/Help'
import * as React from 'react'

// Help command implementation with refactored structure
class HelpCommandHandler {
  private static readonly CONFIG = {
    type: 'local-jsx' as const,
    name: 'help',
    description: 'Display available commands and usage guidance',
    isEnabled: true,
    isHidden: false,
  }

  static createCommand(): Command {
    return {
      ...this.CONFIG,
      call: this.executeCommand,
      userFacingName: this.getDisplayName,
    }
  }

  private static async executeCommand(onDone: (result?: string) => void, { options: { commands } }: any) {
    return <Help commands={commands} onClose={onDone} />
  }

  private static getDisplayName(): string {
    return 'help'
  }
}

export default HelpCommandHandler.createCommand()
