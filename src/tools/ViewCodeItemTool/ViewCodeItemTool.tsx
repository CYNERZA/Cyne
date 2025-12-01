import { readFileSync } from 'fs'
import { Box, Text } from 'ink'
import { relative } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import { HighlightedCode } from '../../components/HighlightedCode'
import type { Tool } from '../../Tool'
import { getCwd } from '../../utils/state'
import { normalizeFilePath } from '../../utils/file'
import { hasReadPermission } from '../../utils/permissions/filesystem'

const inputSchema = z.strictObject({
  File: z.string().describe('Absolute path to the node to view, e.g /path/to/file'),
  NodePaths: z.array(z.string()).describe('Path of the nodes within the file, e.g package.class.FunctionName'),
})

export const ViewCodeItemTool = {
  name: 'view_code_item',
  async description() {
    return 'View the content of up to 5 code item nodes in a file, each as a class or a function. You must use fully qualified code item names. For example, if you have a class called `Foo` and you want to view the function definition `bar` in the `Foo` class, you would use `Foo.bar` as the NodeName.'
  },
  async prompt() {
    return `# view_code_item Tool

Use this tool to view specific code items (classes or functions) in a file.

**Features:**
- View up to 5 code items per call
- Use fully qualified names (e.g., Foo.bar for method bar in class Foo)
- Returns the complete code for each requested item

**IMPORTANT:** 
- Use absolute file paths
- Use fully qualified node paths (Class.method format)
- Do not request items already shown by codebase_search`
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'View Code Item'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ File }) {
    return !hasReadPermission(File || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { File, NodePaths } = input
    return `File: ${verbose ? File : relative(getCwd(), File)}, NodePaths: [${NodePaths.join(', ')}]`
  },
  renderToolResultMessage(output, { verbose }) {
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ Viewed {output.items.length} code item{output.items.length !== 1 ? 's' : ''}</Text>
        {output.items.map((item, i) => (
          <Box key={i} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
            <Text>&nbsp;&nbsp;&nbsp;&nbsp;{item.nodePath} (L{item.startLine}-{item.endLine})</Text>
            {verbose && (
              <HighlightedCode
                code={item.content}
                language={output.language}
              />
            )}
          </Box>
        ))}
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ File, NodePaths }) {
    if (NodePaths.length > 5) {
      return {
        result: false,
        message: 'Can view at most 5 code items per request.',
      }
    }

    const fullPath = normalizeFilePath(File)
    
    try {
      require('fs').statSync(fullPath)
    } catch (error) {
      return {
        result: false,
        message: 'File does not exist.',
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ File, NodePaths }) {
    const fullPath = normalizeFilePath(File)
    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')
    
    const ext = require('path').extname(fullPath)
    const language = ext.slice(1)
    
    const items = NodePaths.map(nodePath => {
      const codeItem = extractCodeItem(content, nodePath)
      return {
        nodePath,
        content: codeItem.content,
        startLine: codeItem.startLine,
        endLine: codeItem.endLine,
      }
    }).filter(item => item.content !== '')

    const data = {
      filePath: File,
      language,
      items,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    if (data.items.length === 0) {
      return 'No code items found matching the specified node paths.'
    }
    
    return data.items.map(item => {
      return `{"NodePath":"${item.nodePath}","StartLine":${item.startLine},"EndLine":${item.endLine}}\n\`\`\`\n${item.content}\n\`\`\``
    }).join('\n\n')
  },
} satisfies Tool

function extractCodeItem(content: string, nodePath: string): {
  content: string
  startLine: number
  endLine: number
} {
  const lines = content.split('\n')
  const parts = nodePath.split('.')
  const targetName = parts[parts.length - 1]
  
  const functionRegex = new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${targetName}\\b`)
  const classRegex = new RegExp(`^\\s*(export\\s+)?class\\s+${targetName}\\b`)
  const constRegex = new RegExp(`^\\s*(export\\s+)?const\\s+${targetName}\\s*=`)
  const methodRegex = new RegExp(`^\\s*(async\\s+)?${targetName}\\s*\\(`)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (functionRegex.test(line) || classRegex.test(line) || constRegex.test(line) || methodRegex.test(line)) {
      const startLine = i + 1
      let endLine = i + 1
      let braceCount = 0
      let started = false
      
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j]!
        for (const char of currentLine) {
          if (char === '{') {
            braceCount++
            started = true
          } else if (char === '}') {
            braceCount--
          }
        }
        
        if (started && braceCount === 0) {
          endLine = j + 1
          break
        }
      }
      
      const codeContent = lines.slice(i, endLine).join('\n')
      return {
        content: codeContent,
        startLine,
        endLine,
      }
    }
  }
  
  return { content: '', startLine: 0, endLine: 0 }
}
