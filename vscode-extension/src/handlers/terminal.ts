/**
 * Terminal operation handlers
 */

import * as vscode from 'vscode'

const terminals: Map<string, vscode.Terminal> = new Map()

/**
 * Execute a command in the integrated terminal
 */
export async function handleTerminalExecute(params: {
  command: string
  terminalName?: string
  focus?: boolean
}): Promise<{ success: boolean; terminalName: string }> {
  const terminalName = params.terminalName || 'Cyne'
  
  let terminal = terminals.get(terminalName)
  
  // Check if terminal still exists
  if (terminal && vscode.window.terminals.indexOf(terminal) === -1) {
    terminals.delete(terminalName)
    terminal = undefined
  }
  
  if (!terminal) {
    terminal = vscode.window.createTerminal(terminalName)
    terminals.set(terminalName, terminal)
  }
  
  if (params.focus) {
    terminal.show()
  }
  
  terminal.sendText(params.command)
  
  return { success: true, terminalName }
}

/**
 * List active terminals
 */
export async function handleTerminalList(): Promise<{
  terminals: Array<{ name: string; active: boolean }>
}> {
  const activeTerminal = vscode.window.activeTerminal
  
  return {
    terminals: vscode.window.terminals.map((t) => ({
      name: t.name,
      active: t === activeTerminal,
    })),
  }
}
