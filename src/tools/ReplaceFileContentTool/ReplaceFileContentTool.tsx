import { readFileSync, writeFileSync } from 'fs'
import { Box, Text } from 'ink'
import { relative } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import type { Tool } from '../../Tool'
import { getCwd } from '../../utils/state'
import { normalizeFilePath } from '../../utils/file'
import { hasWritePermission } from '../../utils/permissions/filesystem'

const inputSchema = z.strictObject({
  TargetFile: z.string().describe('The target file to modify. Always specify the target file as the very first argument.'),
  CodeMarkdownLanguage: z.string().describe('Markdown language for the code block, e.g python or javascript'),
  Instruction: z.string().describe('A description of the changes that you are making to the file.'),
  Description: z.string().describe('Brief, user-facing explanation of what this change did.'),
  Complexity: z.number().describe('A 1-10 rating of how important it is for the user to review this change.'),
  AllowMultiple: z.boolean().describe('If true, multiple occurrences of targetContent will be replaced by replacementContent if they are found.'),
  TargetContent: z.string().describe('The exact string to be replaced. This must be the exact character-sequence to be replaced, including whitespace.'),
  ReplacementContent: z.string().describe('The content to replace the target content with.'),
  StartLine: z.number().describe('The starting line number of the chunk (1-indexed). Should be at or before the first line containing the target content.'),
  EndLine: z.number().describe('The ending line number of the chunk (1-indexed). Should be at or after the last line containing the target content.'),
})

export const ReplaceFileContentTool = {
  name: 'replace_file_content',
  async description() {
    return 'Use this tool to edit an existing file by replacing a SINGLE CONTIGUOUS block of text. Do NOT use for multiple non-contiguous edits - use multi_replace_file_content instead.'
  },
  async prompt() {
    return `# replace_file_content Tool

Use this tool when making a SINGLE CONTIGUOUS block of edits to a file.

**Rules:**
1. Use ONLY for single contiguous block edits
2. For multiple non-adjacent edits, use multi_replace_file_content
3. TargetContent MUST EXACTLY MATCH the text in the file (including whitespace)
4. StartLine and EndLine should contain the TargetContent
5. Specify TargetFile as the FIRST argument

**IMPORTANT:** Use absolute file paths.`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName(input) {
    if (input?.TargetFile) {
      return `Edit ${relative(getCwd(), input.TargetFile)}`
    }
    return 'Replace File Content'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ TargetFile }) {
    return !hasWritePermission(TargetFile || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { TargetFile } = input
    return `TargetFile: ${verbose ? TargetFile : relative(getCwd(), TargetFile)}`
  },
  renderToolResultMessage(output, { verbose }) {
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ Updated {verbose ? output.filePath : relative(getCwd(), output.filePath)} ({output.replacements} replacement{output.replacements !== 1 ? 's' : ''})</Text>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ TargetFile, TargetContent, StartLine, EndLine, AllowMultiple }) {
    const fullPath = normalizeFilePath(TargetFile)
    
    try {
      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      
      if (StartLine < 1 || EndLine > lines.length) {
        return {
          result: false,
          message: `Line range ${StartLine}-${EndLine} is outside file bounds (1-${lines.length})`,
        }
      }
      
      if (StartLine > EndLine) {
        return {
          result: false,
          message: 'StartLine must be less than or equal to EndLine',
        }
      }
      
      const searchRange = lines.slice(StartLine - 1, EndLine).join('\n')
      const occurrences = (searchRange.match(new RegExp(TargetContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      
      if (occurrences === 0) {
        return {
          result: false,
          message: 'TargetContent not found in specified line range',
        }
      }
      
      if (occurrences > 1 && !AllowMultiple) {
        return {
          result: false,
          message: `Found ${occurrences} occurrences of TargetContent. Set AllowMultiple to true to replace all.`,
        }
      }
    } catch (error) {
      return {
        result: false,
        message: `Error reading file: ${error}`,
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call({ TargetFile, TargetContent, ReplacementContent, StartLine, EndLine, AllowMultiple }) {
    const fullPath = normalizeFilePath(TargetFile)
    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')
    
    const before = lines.slice(0, StartLine - 1).join('\n')
    const searchRange = lines.slice(StartLine - 1, EndLine).join('\n')
    const after = lines.slice(EndLine).join('\n')
    
    let replacements = 0
    let newSearchRange = searchRange
    
    if (AllowMultiple) {
      const regex = new RegExp(TargetContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      newSearchRange = searchRange.replace(regex, () => {
        replacements++
        return ReplacementContent
      })
    } else {
      if (searchRange.includes(TargetContent)) {
        newSearchRange = searchRange.replace(TargetContent, ReplacementContent)
        replacements = 1
      }
    }
    
    const newContent = [
      before,
      newSearchRange,
      after,
    ].filter((part, i) => i === 0 ? part.length > 0 : i === 2 ? part.length > 0 : true).join('\n')
    
    writeFileSync(fullPath, newContent, 'utf-8')

    const data = {
      filePath: TargetFile,
      replacements,
      linesModified: EndLine - StartLine + 1,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `Successfully updated ${data.filePath} (${data.replacements} replacement${data.replacements !== 1 ? 's' : ''}, ${data.linesModified} lines modified)`
  },
} satisfies Tool
