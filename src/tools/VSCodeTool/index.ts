// Existing tools
export { VSCodeHealthTool } from './VSCodeHealthTool'
export { VSCodeContextTool } from './VSCodeContextTool'
export { VSCodeReadFileTool } from './VSCodeReadFileTool'
export { VSCodeCreateFileTool } from './VSCodeCreateFileTool'
export { VSCodeEditFileTool } from './VSCodeEditFileTool'
export { VSCodeListFilesTool } from './VSCodeListFilesTool'

// New tools
export { VSCodeOpenFileTool } from './VSCodeOpenFileTool'
export { VSCodeGoToLineTool } from './VSCodeGoToLineTool'
export { VSCodeSearchTool } from './VSCodeSearchTool'
export { VSCodeDiagnosticsTool } from './VSCodeDiagnosticsTool'
export { VSCodeFormatTool } from './VSCodeFormatTool'
export { VSCodeTerminalTool } from './VSCodeTerminalTool'
export { VSCodeSymbolTool } from './VSCodeSymbolTool'

export * from './utils'

// Import all tools for the array
import { VSCodeHealthTool } from './VSCodeHealthTool'
import { VSCodeContextTool } from './VSCodeContextTool'
import { VSCodeReadFileTool } from './VSCodeReadFileTool'
import { VSCodeCreateFileTool } from './VSCodeCreateFileTool'
import { VSCodeEditFileTool } from './VSCodeEditFileTool'
import { VSCodeListFilesTool } from './VSCodeListFilesTool'
import { VSCodeOpenFileTool } from './VSCodeOpenFileTool'
import { VSCodeGoToLineTool } from './VSCodeGoToLineTool'
import { VSCodeSearchTool } from './VSCodeSearchTool'
import { VSCodeDiagnosticsTool } from './VSCodeDiagnosticsTool'
import { VSCodeFormatTool } from './VSCodeFormatTool'
import { VSCodeTerminalTool } from './VSCodeTerminalTool'
import { VSCodeSymbolTool } from './VSCodeSymbolTool'

// Export all VS Code tools as an array for easy registration
export const VSCODE_TOOLS = [
  // Health and context (always enabled for status checking)
  VSCodeHealthTool,
  VSCodeContextTool,
  // File operations
  VSCodeListFilesTool,
  VSCodeReadFileTool,
  VSCodeCreateFileTool,
  VSCodeEditFileTool,
  VSCodeOpenFileTool,
  // Editor operations
  VSCodeGoToLineTool,
  VSCodeFormatTool,
  // Workspace operations
  VSCodeSearchTool,
  VSCodeDiagnosticsTool,
  // Symbol operations
  VSCodeSymbolTool,
  // Terminal
  VSCodeTerminalTool,
]
