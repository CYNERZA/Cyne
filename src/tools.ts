import { Tool } from './Tool'
import { AgentTool } from './tools/AgentTool/AgentTool'
import { ArchitectTool } from './tools/ArchitectTool/ArchitectTool'
import { BashTool } from './tools/BashTool/BashTool'
import { GlobTool } from './tools/GlobTool/GlobTool'
import { GrepTool } from './tools/GrepTool/GrepTool'
import { MemoryReadTool } from './tools/MemoryReadTool/MemoryReadTool'
import { MemoryWriteTool } from './tools/MemoryWriteTool/MemoryWriteTool'
import { NotebookEditTool } from './tools/NotebookEditTool/NotebookEditTool'
import { NotebookReadTool } from './tools/NotebookReadTool/NotebookReadTool'
import { PlanningTool } from './tools/PlanningTool/PlanningTool'
import { ThinkTool } from './tools/ThinkTool/ThinkTool'
import { BraveSearchTool } from './tools/BraveSearchTool'
import { WebScrapingTool } from './tools/WebScrapingTool'
import { VSCODE_TOOLS } from './tools/VSCodeTool'
import { getMCPTools } from './services/mcpClient'
import { memoize } from 'lodash-es'

// New file operation tools
import { ViewFileTool } from './tools/ViewFileTool/ViewFileTool'
import { ViewFileOutlineTool } from './tools/ViewFileOutlineTool/ViewFileOutlineTool'
import { ViewCodeItemTool } from './tools/ViewCodeItemTool/ViewCodeItemTool'
import { WriteToFileTool } from './tools/WriteToFileTool/WriteToFileTool'
import { ReplaceFileContentTool } from './tools/ReplaceFileContentTool/ReplaceFileContentTool'
import { MultiReplaceFileContentTool } from './tools/MultiReplaceFileContentTool/MultiReplaceFileContentTool'
import { ListDirTool } from './tools/ListDirTool/ListDirTool'

// New terminal command tools
import { RunCommandTool } from './tools/RunCommandTool/RunCommandTool'
import { CommandStatusTool } from './tools/CommandStatusTool/CommandStatusTool'
import { SendCommandInputTool } from './tools/SendCommandInputTool/SendCommandInputTool'
import { ReadTerminalTool } from './tools/ReadTerminalTool/ReadTerminalTool'

// New task management tools
import { TaskBoundaryTool } from './tools/TaskBoundaryTool/TaskBoundaryTool'
import { NotifyUserTool } from './tools/NotifyUserTool/NotifyUserTool'

const ANT_ONLY_TOOLS = [MemoryReadTool, MemoryWriteTool]

// Function to avoid circular dependencies that break bun
export const getAllTools = (): Tool[] => {
  return [
    AgentTool,
    BashTool,
    GlobTool,
    GrepTool,
    NotebookReadTool,
    NotebookEditTool,
    PlanningTool,
    ThinkTool,
    BraveSearchTool,
    WebScrapingTool,
    // New file operation tools
    ViewFileTool,
    ViewFileOutlineTool,
    ViewCodeItemTool,
    WriteToFileTool,
    ReplaceFileContentTool,
    MultiReplaceFileContentTool,
    ListDirTool,
    // New terminal command tools
    RunCommandTool,
    CommandStatusTool,
    SendCommandInputTool,
    ReadTerminalTool,
    // New task management tools
    TaskBoundaryTool,
    NotifyUserTool,
    ...VSCODE_TOOLS,
    ...ANT_ONLY_TOOLS,
  ]
}

export const getTools = memoize(
  async (enableArchitect?: boolean): Promise<Tool[]> => {
    const tools = [...getAllTools(), ...(await getMCPTools())]

    // Only include Architect tool if enabled via config or CLI flag
    if (enableArchitect) {
      tools.push(ArchitectTool)
    }

    const isEnabled = await Promise.all(tools.map(tool => tool.isEnabled()))
    return tools.filter((_, i) => isEnabled[i])
  },
)

export const getReadOnlyTools = memoize(async (): Promise<Tool[]> => {
  const tools = getAllTools().filter(tool => tool.isReadOnly())
  const isEnabled = await Promise.all(tools.map(tool => tool.isEnabled()))
  return tools.filter((_, index) => isEnabled[index])
})
