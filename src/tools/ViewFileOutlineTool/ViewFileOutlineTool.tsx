import { readFileSync } from 'fs'
import { Box, Text } from 'ink'
import { extname, relative } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { getCwd } from '../../utils/state'
import { normalizeFilePath } from '../../utils/file'
import { hasReadPermission } from '../../utils/permissions/filesystem'

const inputSchema = z.strictObject({
  AbsolutePath: z.string().describe('Path to file to view. Must  be an absolute path.'),
  ItemOffset: z.number().optional().describe('Offset of items to show. This is used for pagination. The first request to a file should have an offset of 0.'),
})

export const ViewFileOutlineTool = {
  name: 'view_file_outline',
  async description() {
    return 'View the outline of the input file. This is the preferred first-step tool for exploring the contents of files. IMPORTANT: This tool ONLY works on files, never directories. The outline will contain a breakdown of functions and classes in the file with node path, signature, and line range.'
  },
  async prompt() {
    return `# view_file_outline Tool

Use this tool to view the structural outline of a file showing functions, classes, and their signatures.

**Features:**
- Shows node path, signature, and line range for each code item
- Supports pagination with ItemOffset
- Best first step for exploring file contents
- Returns total number of items and lines in file

**IMPORTANT:** 
- Use absolute file paths
- Only works on files, not directories
- Use ItemOffset for pagination of large files`
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'View File Outline'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ AbsolutePath }) {
    return !hasReadPermission(AbsolutePath || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { AbsolutePath, ItemOffset } = input
    const parts = [`AbsolutePath: ${verbose ? AbsolutePath : relative(getCwd(), AbsolutePath)}`]
    if (ItemOffset !== undefined && ItemOffset > 0) parts.push(`ItemOffset: ${ItemOffset}`)
    return parts.join(', ')
  },
  renderToolResultMessage(output, { verbose }) {
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ Outline: {output.totalItems} items, {output.totalLines} lines</Text>
        {output.items.slice(0, 5).map((item, i) => (
          <Text key={i}>&nbsp;&nbsp;&nbsp;&nbsp;- {item.name} (L{item.startLine}-{item.endLine})</Text>
        ))}
        {output.items.length > 5 && (
          <Text>&nbsp;&nbsp;&nbsp;&nbsp;... (+{output.items.length - 5} more items)</Text>
        )}
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ AbsolutePath }) {
    const fullPath = normalizeFilePath(AbsolutePath)
    
    try {
      const stats = require('fs').statSync(fullPath)
      if (stats.isDirectory()) {
        return {
          result: false,
          message: 'Path is a directory. This tool only works on files.',
        }
      }
    } catch (error) {
      return {
        result: false,
        message: 'File does not exist.',
      }
    }

    return { result: true, message: 'Valid file' }
  },
  async *call({ AbsolutePath, ItemOffset = 0 }) {
    const fullPath = normalizeFilePath(AbsolutePath)
    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')
    
    const items = parseFileOutline(content, extname(fullPath))
    
    const ITEMS_PER_PAGE = 50
    const paginatedItems = items.slice(ItemOffset, ItemOffset + ITEMS_PER_PAGE)

    const data = {
      filePath: AbsolutePath,
      totalLines: lines.length,
      totalItems: items.length,
      itemOffset: ItemOffset,
      items: paginatedItems,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    const header = `File path: \`${data.filePath}\`\nTotal Lines: ${data.totalLines}\nTotal Bytes: (calculated)\nTotal Outline Items: ${data.totalItems}\nShowing items ${data.itemOffset + 1} to ${Math.min(data.itemOffset + data.items.length, data.totalItems)} of ${data.totalItems}.\n\nThe outline items are as follows:`
    
    const itemsList = data.items.map(item => {
      return `{"NodePath":"${item.name}","ContextType":"${item.type}","Content":"${item.signature}","ContentType":"signature","StartLine":${item.startLine},"EndLine":${item.endLine}}`
    }).join('\n')
    
    return `${header}\n${itemsList}`
  },
} satisfies Tool

function parseFileOutline(content: string, ext: string): Array<{
  name: string
  type: string
  signature: string
  startLine: number
  endLine: number
}> {
  const lines = content.split('\n')
  const items: Array<{ name: string; type: string; signature: string; startLine: number; endLine: number }> = []
  
  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
    const functionRegex = /^\s*(export\s+)?(async\s+)?function\s+(\w+)/
    const classRegex = /^\s*(export\s+)?class\s+(\w+)/
    const constFunctionRegex = /^\s*(export\s+)?const\s+(\w+)\s*=\s*(\(.*?\)|async)/
    const interfaceRegex = /^\s*(export\s+)?interface\s+(\w+)/
    
    lines.forEach((line, idx) => {
      let match
      if ((match = line.match(functionRegex))) {
        items.push({
          name: match[3]!,
          type: 'Function',
          signature: line.trim(),
          startLine: idx + 1,
          endLine: idx + 1,
        })
      } else if ((match = line.match(classRegex))) {
        items.push({
          name: match[2]!,
          type: 'Class or Interface',
          signature: line.trim(),
          startLine: idx + 1,
          endLine: idx + 1,
        })
      } else if ((match = line.match(constFunctionRegex))) {
        items.push({
          name: match[2]!,
          type: 'Function',
          signature: line.trim(),
          startLine: idx + 1,
          endLine: idx + 1,
        })
      } else if ((match = line.match(interfaceRegex))) {
        items.push({
          name: match[2]!,
          type: 'Class or Interface',
          signature: line.trim(),
          startLine: idx + 1,
          endLine: idx + 1,
        })
      }
    })
  } else if (ext === '.py') {
    const functionRegex = /^\s*(async\s+)?def\s+(\w+)/
    const classRegex = /^\s*class\s+(\w+)/
    
    lines.forEach((line, idx) => {
      let match
      if ((match = line.match(functionRegex))) {
        items.push({
          name: match[2]!,
          type: 'Function',
          signature: line.trim(),
          startLine: idx + 1,
          endLine: idx + 1,
        })
      } else if ((match = line.match(classRegex))) {
        items.push({
          name: match[1]!,
          type: 'Class',
          signature: line.trim(),
          startLine: idx + 1,
          endLine: idx + 1,
        })
      }
    })
  }
  
  return items
}
