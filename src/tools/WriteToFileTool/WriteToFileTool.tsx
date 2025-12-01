import {writeFileSync, mkdirSync, existsSync } from 'fs'
import { Box, Text } from 'ink'
import { dirname, relative } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { getCwd } from '../../utils/state'
import { normalizeFilePath } from '../../utils/file'
import { hasWritePermission } from '../../utils/permissions/filesystem'

const inputSchema = z.strictObject({
  TargetFile: z.string().describe('The target file to create and write code to.'),
  Overwrite: z.boolean().describe('Set this to true to overwrite an existing file. WARNING: This will replace the entire file contents. Only use when you explicitly intend to overwrite.'),
  CodeContent: z.string().describe('The code contents to write to the file.'),
  EmptyFile: z.boolean().describe('Set this to true to create an empty file.'),
  Description: z.string().describe('Brief, user-facing explanation of what this change did.'),
  Complexity: z.number().describe('A 1-10 rating of how important it is for the user to review this change.'),
  IsArtifact: z.boolean().describe('Set this to true when creating an artifact file.'),
})

export const WriteToFileTool = {
  name: 'write_to_file',
  async description() {
    return 'Use this tool to create new files. The file and any parent directories will be created for you if they do not already exist. By default this tool will error if TargetFile already exists. To overwrite an existing file, set Overwrite to true.'
  },
  async prompt() {
    return `# write_to_file Tool

Use this tool to create new files with code content.

**Features:**
- Creates parent directories automatically if needed
- Set Overwrite to true to replace existing files
- Specify TargetFile as the FIRST argument
- Provide full file path before code contents

**IMPORTANT:** 
- Use absolute file paths
- You MUST specify TargetFile as the FIRST argument`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName(input) {
    if (input?.TargetFile) {
      return `Write ${relative(getCwd(), input.TargetFile)}`
    }
    return 'Write File'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ TargetFile }) {
    return !hasWritePermission(dirname(TargetFile) || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { TargetFile, Overwrite, EmptyFile } = input
    const parts = [
      `TargetFile: ${verbose ? TargetFile : relative(getCwd(), TargetFile)}`,
      `Overwrite: ${Overwrite}`,
    ]
    if (EmptyFile) parts.push('EmptyFile: true')
    return parts.join(', ')
  },
  renderToolResultMessage(output, { verbose }) {
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ {output.created ? 'Created' : 'Updated'} file: {verbose ? output.filePath : relative(getCwd(), output.filePath)}</Text>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ TargetFile, Overwrite, CodeContent, EmptyFile }) {
    const fullPath = normalizeFilePath(TargetFile)

    if (existsSync(fullPath) && !Overwrite) {
      return {
        result: false,
        message: 'File already exists. Set Overwrite to true to replace it.',
      }
    }

    if (!EmptyFile && (!CodeContent || CodeContent.trim() === '')) {
      return {
        result: false,
        message: 'CodeContent cannot be empty unless EmptyFile is true.',
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ TargetFile, CodeContent, EmptyFile }) {
    const fullPath = normalizeFilePath(TargetFile)
    const created = !existsSync(fullPath)
    
    const dir = dirname(fullPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const content = EmptyFile ? '' : CodeContent
    writeFileSync(fullPath, content, 'utf-8')

    const data = {
      filePath: TargetFile,
      created,
      bytesWritten: Buffer.byteLength(content, 'utf-8'),
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `${data.created ? 'Created' : 'Updated'} file: ${data.filePath} (${data.bytesWritten} bytes)`
  },
} satisfies Tool
