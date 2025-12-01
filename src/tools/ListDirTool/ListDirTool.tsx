import { readdirSync, statSync } from 'fs'
import { Box, Text } from 'ink'
import { relative } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { getCwd } from '../../utils/state'
import { normalizeFilePath } from '../../utils/file'
import { hasReadPermission } from '../../utils/permissions/filesystem'

const inputSchema = z.strictObject({
  DirectoryPath: z.string().describe('Path to list contents of, should be absolute path to a directory'),
})

export const ListDirTool = {
  name: 'list_dir',
  async description() {
    return 'List the contents of a directory, i.e. all files and subdirectories that are children of the directory. Returns relative path, type (file/directory), size in bytes if file, and number of children if directory.'
  },
  async prompt() {
    return `# list_dir Tool

Use this tool to list the contents of a directory.

**Returns for each item:**
- Relative path to the directory
- Whether it is a directory or file
- Size in bytes (if file)
- Number of children (if directory)

**IMPORTANT:** Use absolute directory paths.`
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'List Directory'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ DirectoryPath }) {
    return !hasReadPermission(DirectoryPath || getCwd())
  },
  renderToolUseMessage({ DirectoryPath }, { verbose }) {
    return `DirectoryPath: ${verbose ? DirectoryPath : relative(getCwd(), DirectoryPath)}`
  },
  renderToolResultMessage(output, { verbose }) {
    const items = verbose ? output.items : output.items.slice(0, 10)
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ Listed {output.items.length} items</Text>
        {!verbose && output.items.length > 10 && (
          <Text>&nbsp;&nbsp;&nbsp;&nbsp;... (+{output.items.length - 10} more items)</Text>
        )}
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ DirectoryPath }) {
    const fullPath = normalizeFilePath(DirectoryPath)
    
    try {
      const stats = statSync(fullPath)
      if (!stats.isDirectory()) {
        return {
          result: false,
          message: 'Path exists but is not a directory.',
        }
      }
    } catch (error) {
      return {
        result: false,
        message: 'Directory does not exist.',
      }
    }

    return { result: true, message: 'Valid directory' }
  },
  async *call({ DirectoryPath }) {
    const fullPath = normalizeFilePath(DirectoryPath)
    const items = readdirSync(fullPath)

    const result = items.map(item => {
      const itemPath = `${fullPath}/${item}`
      const stats = statSync(itemPath)
      
      if (stats.isDirectory()) {
        let numChildren: number | undefined
        try {
          numChildren = readdirSync(itemPath).length
        } catch {
          numChildren = undefined
        }
        
        return {
          name: item,
          isDir: true,
          numChildren,
        }
      } else {
        return {
          name: item,
          sizeBytes: stats.size.toString(),
        }
      }
    })

    const data = {
      directoryPath: DirectoryPath,
      items: result,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    const lines = data.items.map(item => {
      if ('isDir' in item) {
        const childInfo = item.numChildren !== undefined ? `, numChildren: ${item.numChildren}` : ''
        return `{"name":"${item.name}","isDir":true${childInfo}}`
      } else {
        return `{"name":"${item.name}","sizeBytes":"${item.sizeBytes}"}`
      }
    })
    
    return lines.join('\n') + `\n\nSummary: This directory contains ${data.items.filter(i => 'isDir' in i).length} subdirectories and ${data.items.filter(i => 'sizeBytes' in i).length} files.`
  },
} satisfies Tool
