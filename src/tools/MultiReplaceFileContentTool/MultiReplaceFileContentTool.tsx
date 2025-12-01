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

const replacementChunkSchema = z.object({
  AllowMultiple: z.boolean(),
  TargetContent: z.string(),
  ReplacementContent: z.string(),
  StartLine: z.number(),
  EndLine: z.number(),
})

const inputSchema = z.strictObject({
  TargetFile: z.string().describe('The target file to modify. Always specify the target file as the very first argument.'),
  CodeMarkdownLanguage: z.string().describe('Markdown language for the code block, e.g python or javascript'),
  Instruction: z.string().describe('A description of the changes that you are making to the file.'),
  Description: z.string().describe('Brief, user-facing explanation of what this change did.'),
  Complexity: z.number().describe('A 1-10 rating of how important it is for the user to review this change.'),
  ReplacementChunks: z.array(replacementChunkSchema).describe('A list of chunks to replace. This must be a JSON array.'),
})

export const MultiReplaceFileContentTool = {
  name: 'multi_replace_file_content',
  async description() {
    return 'Use this tool to edit multiple NON-CONTIGUOUS blocks in the same file. For single block edits, use replace_file_content instead.'
  },
  async prompt() {
    return `# multi_replace_file_content Tool

Use this tool when making MULTIPLE NON-CONTIGUOUS edits to the same file.

**Rules:**
1. Use ONLY for multiple non-adjacent edits
2. For single block edits, use replace_file_content
3. Each ReplacementChunk must have: AllowMultiple, TargetContent, ReplacementContent, StartLine, EndLine
4. TargetContent MUST EXACTLY MATCH the text in the file (including whitespace)
5. Do NOT make multiple parallel calls to edit the same file

**IMPORTANT:** Use absolute file paths. Specify TargetFile as FIRST argument.`
  },
  inputSchema,
  isReadOnly() {
    return false
  },
  userFacingName(input) {
    if (input?.TargetFile) {
      return `Edit ${relative(getCwd(), input.TargetFile)}`
    }
    return 'Multi Replace File Content'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ TargetFile }) {
    return !hasWritePermission(TargetFile || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { TargetFile, ReplacementChunks } = input
    return `TargetFile: ${verbose ? TargetFile : relative(getCwd(), TargetFile)}, ${ReplacementChunks.length} chunk${ReplacementChunks.length !== 1 ? 's' : ''}`
  },
  renderToolResultMessage(output, { verbose }) {
    return (
      <Box flexDirection="column">
        <Text>&nbsp;&nbsp;⎿ Updated {verbose ? output.filePath : relative(getCwd(), output.filePath)} ({output.totalReplacements} replacements in {output.chunksProcessed} chunks)</Text>
      </Box>
    )
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ TargetFile, ReplacementChunks }) {
    const fullPath = normalizeFilePath(TargetFile)
    
    try {
      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      
      for (let i = 0; i < ReplacementChunks.length; i++) {
        const chunk = ReplacementChunks[i]!
        
        if (chunk.StartLine < 1 || chunk.EndLine > lines.length) {
          return {
            result: false,
            message: `Chunk ${i + 1}: Line range ${chunk.StartLine}-${chunk.EndLine} is outside file bounds (1-${lines.length})`,
          }
        }
        
        if (chunk.StartLine > chunk.EndLine) {
          return {
            result: false,
            message: `Chunk ${i + 1}: StartLine must be less than or equal to EndLine`,
          }
        }
        
        const searchRange = lines.slice(chunk.StartLine - 1, chunk.EndLine).join('\n')
        const occurrences = (searchRange.match(new RegExp(chunk.TargetContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        
        if (occurrences === 0) {
          return {
            result: false,
            message: `Chunk ${i + 1}: TargetContent not found in specified line range`,
          }
        }
        
        if (occurrences > 1 && !chunk.AllowMultiple) {
          return {
            result: false,
            message: `Chunk ${i + 1}: Found ${occurrences} occurrences. Set AllowMultiple to true.`,
          }
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
  async *call({ TargetFile, ReplacementChunks }) {
    const fullPath = normalizeFilePath(TargetFile)
    let content = readFileSync(fullPath, 'utf-8')
    
    let totalReplacements = 0
    let chunksProcessed = 0
    
    const sortedChunks = [...ReplacementChunks].sort((a, b) => b.StartLine - a.StartLine)
    
    for (const chunk of sortedChunks) {
      const lines = content.split('\n')
      const before = lines.slice(0, chunk.StartLine - 1).join('\n')
      const searchRange = lines.slice(chunk.StartLine - 1, chunk.EndLine).join('\n')
      const after = lines.slice(chunk.EndLine).join('\n')
      
      let newSearchRange = searchRange
      let replacements = 0
      
      if (chunk.AllowMultiple) {
        const regex = new RegExp(chunk.TargetContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        newSearchRange = searchRange.replace(regex, () => {
          replacements++
          return chunk.ReplacementContent
        })
      } else {
        if (searchRange.includes(chunk.TargetContent)) {
          newSearchRange = searchRange.replace(chunk.TargetContent, chunk.ReplacementContent)
          replacements = 1
        }
      }
      
      content = [
        before,
        newSearchRange,
        after,
      ].filter((part, i) => i === 0 ? part.length > 0 : i === 2 ? part.length > 0 : true).join('\n')
      
      totalReplacements += replacements
      chunksProcessed++
    }
    
    writeFileSync(fullPath, content, 'utf-8')

    const data = {
      filePath: TargetFile,
      totalReplacements,
      chunksProcessed,
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    return `Successfully updated ${data.filePath} (${data.totalReplacements} total replacements across ${data.chunksProcessed} chunks)`
  },
} satisfies Tool
