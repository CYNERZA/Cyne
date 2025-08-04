// Re-export all file system related tools for easier organization
export { FileReadTool } from './FileReadTool/FileReadTool'
export { FileWriteTool } from './FileWriteTool/FileWriteTool'
export { LSTool } from './lsTool/lsTool'

// A unified export for all file tools
export const FileTools = {
  Read: () => import('./FileReadTool/FileReadTool').then(m => m.FileReadTool),
  Write: () => import('./FileWriteTool/FileWriteTool').then(m => m.FileWriteTool),
  List: () => import('./lsTool/lsTool').then(m => m.LSTool),
}

// Helper to get all file tools
export const getAllFileTools = async () => {
  const [ReadTool, WriteTool, ListTool] = await Promise.all([
    FileTools.Read(),
    FileTools.Write(),
    FileTools.List(),
  ])
  
  return [ReadTool, WriteTool, ListTool]
}
