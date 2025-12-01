import { useInput } from 'ink'
import * as React from 'react'
import { Tool } from '../../Tool'
import { AssistantMessage } from '../../query'
// Old tools removed: FileEditTool, FileWriteTool, FileReadTool, LSTool
import { WriteToFileTool } from '../../tools/WriteToFileTool/WriteToFileTool'
import { BashTool } from '../../tools/BashTool/BashTool'
import { FileEditPermissionRequest } from './FileEditPermissionRequest/FileEditPermissionRequest'
import { BashPermissionRequest } from './BashPermissionRequest/BashPermissionRequest'
import { FallbackPermissionRequest } from './FallbackPermissionRequest'
import { useNotifyAfterTimeout } from '../../hooks/useNotifyAfterTimeout'
import { FileWritePermissionRequest } from './FileWritePermissionRequest/FileWritePermissionRequest'
import { type CommandSubcommandPrefixResult } from '../../utils/commands'
import { FilesystemPermissionRequest } from './FilesystemPermissionRequest/FilesystemPermissionRequest'
import { NotebookEditTool } from '../../tools/NotebookEditTool/NotebookEditTool'
import { GlobTool } from '../../tools/GlobTool/GlobTool'
import { GrepTool } from '../../tools/GrepTool/GrepTool'
import { ViewFileTool } from '../../tools/ViewFileTool/ViewFileTool'
import { NotebookReadTool } from '../../tools/NotebookReadTool/NotebookReadTool'
import { PRODUCT_NAME } from '../../constants/product'
import { GradientBorder } from '../GradientBorder'
import { useFadeIn } from '../../utils/animations'
import { getTheme } from '../../utils/theme'
import { Box } from 'ink'

function permissionComponentForTool(tool: Tool) {
  switch (tool) {
    // Old tools commented out - FileEditTool, FileWriteTool
    case WriteToFileTool:
      return FileWritePermissionRequest
    case BashTool:
      return BashPermissionRequest
    case GlobTool:
    case GrepTool:
    // case LSTool: // Old tool removed
    case ViewFileTool:
    case NotebookReadTool:
    case NotebookEditTool:
      return FilesystemPermissionRequest
    default:
      return FallbackPermissionRequest
  }
}

export type PermissionRequestProps = {
  toolUseConfirm: ToolUseConfirm
  onDone(): void
  verbose: boolean
}

export function toolUseConfirmGetPrefix(
  toolUseConfirm: ToolUseConfirm,
): string | null {
  return (
    (toolUseConfirm.commandPrefix &&
      !toolUseConfirm.commandPrefix.commandInjectionDetected &&
      toolUseConfirm.commandPrefix.commandPrefix) ||
    null
  )
}

export type ToolUseConfirm = {
  assistantMessage: AssistantMessage
  tool: Tool
  description: string
  input: { [key: string]: unknown }
  commandPrefix: CommandSubcommandPrefixResult | null
  // TODO: remove riskScore from ToolUseConfirm
  riskScore: number | null
  onAbort(): void
  onAllow(type: 'permanent' | 'temporary'): void
  onReject(): void
}

// TODO: Move this to Tool.renderPermissionRequest
export function PermissionRequest({
  toolUseConfirm,
  onDone,
  verbose,
}: PermissionRequestProps): React.ReactNode {
  // Handle Ctrl+C
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onDone()
      toolUseConfirm.onReject()
    }
  })

  const toolName = toolUseConfirm.tool.userFacingName(
    toolUseConfirm.input as never,
  )
  useNotifyAfterTimeout(
    `${PRODUCT_NAME} needs your permission to use ${toolName}`,
  )

  const PermissionComponent = permissionComponentForTool(toolUseConfirm.tool)

  return (
    <PermissionComponent
      toolUseConfirm={toolUseConfirm}
      onDone={onDone}
      verbose={verbose}
    />
  )
}
