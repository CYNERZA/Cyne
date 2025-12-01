export { VSCodeHealthTool } from './VSCodeHealthTool'
export { VSCodeContextTool } from './VSCodeContextTool'
export { VSCodeReadFileTool } from './VSCodeReadFileTool'
export { VSCodeCreateFileTool } from './VSCodeCreateFileTool'
export { VSCodeEditFileTool } from './VSCodeEditFileTool'
export { VSCodeListFilesTool } from './VSCodeListFilesTool'
export * from './utils'

// Export all VS Code tools as an array for easy registration
import { VSCodeHealthTool } from './VSCodeHealthTool'
import { VSCodeContextTool } from './VSCodeContextTool'
import { VSCodeReadFileTool } from './VSCodeReadFileTool'
import { VSCodeCreateFileTool } from './VSCodeCreateFileTool'
import { VSCodeEditFileTool } from './VSCodeEditFileTool'
import { VSCodeListFilesTool } from './VSCodeListFilesTool'

export const VSCODE_TOOLS = [
  VSCodeHealthTool,
  VSCodeContextTool,
  VSCodeListFilesTool,
  VSCodeReadFileTool,
  VSCodeCreateFileTool,
  VSCodeEditFileTool
]
