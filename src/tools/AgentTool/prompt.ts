import { type Tool } from '../../Tool'
import { getTools, getReadOnlyTools } from '../../tools'
import { AgentTool } from '../AgentTool/AgentTool'
import { BashTool } from '../BashTool/BashTool'
import { FileWriteTool } from '../FileTool/FileWriteTool/FileWriteTool'
import { FileEditTool } from '../FileEditTool/FileEditTool'
import { NotebookEditTool } from '../NotebookEditTool/NotebookEditTool'
import { GlobTool } from '../GlobTool/GlobTool'
import { FileReadTool } from '../FileTool/FileReadTool/FileReadTool'

export async function getAgentTools(
  dangerouslySkipPermissions: boolean,
): Promise<Tool[]> {
  // No recursive agents, yet..
  return (
    await (dangerouslySkipPermissions ? getTools() : getReadOnlyTools())
  ).filter(_ => _.name !== AgentTool.name)
}

export async function getPrompt(
  dangerouslySkipPermissions: boolean,
): Promise<string> {
  const tools = await getAgentTools(dangerouslySkipPermissions)
  const toolNames = tools.map(_ => _.name).join(', ')
  return `Deploy a specialized agent with access to these tools: ${toolNames}. Use this agent when broad searches or exploratory analysis would be more efficient than direct tool usage.

Optimal agent usage patterns:
- Searching for concepts, keywords, or patterns where initial attempts might need refinement
- Exploratory analysis of unfamiliar codebases or documentation
- Research tasks that benefit from iterative discovery

Direct tool usage alternatives:
- Known file paths: use ${FileReadTool.name} or ${GlobTool.name} directly for faster results
- Specific class/function definitions: ${GlobTool.name} provides immediate pattern matching

Agent capabilities:
1. Deploy multiple agents simultaneously for parallel processing - include multiple tool invocations in single message blocks for maximum efficiency
2. Agent responses return to you directly (not visible to users) - summarize findings in your user response  
3. Agents operate independently per session - provide comprehensive task descriptions with specific output requirements for autonomous execution
4. Agent results should generally be trusted${
    dangerouslySkipPermissions
      ? ''
      : `
5. LIMITATION: This agent cannot access ${BashTool.name}, ${FileWriteTool.name}, ${FileEditTool.name}, ${NotebookEditTool.name} - use these tools directly when file modification is required.`
  }`
}
