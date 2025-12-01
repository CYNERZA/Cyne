import { existsSync, readFileSync, statSync } from 'fs'
import { Box, Text } from 'ink'
import * as path from 'path'
import { extname, relative } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import { HighlightedCode } from '../../components/HighlightedCode'
import type { Tool } from '../../Tool'
import { getCwd } from '../../utils/state'
import {
  addLineNumbers,
  findSimilarFile,
  normalizeFilePath,
  readTextContent,
} from '../../utils/file.js'
import { getTheme } from '../../utils/theme'
import { hasReadPermission } from '../../utils/permissions/filesystem'

const MAX_LINES_TO_RENDER = 3
const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
])

const MAX_WIDTH = 2000
const MAX_HEIGHT = 2000
const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024

const inputSchema = z.strictObject({
  AbsolutePath: z.string().describe('Path to file to view. Must be an absolute path.'),
  StartLine: z
    .number()
    .optional()
    .describe('Optional. Startline to view, 1-indexed as usual, inclusive. This value must be less than or equal to EndLine.'),
  EndLine: z
    .number()
    .optional()
    .describe('Optional. Endline to view, 1-indexed as usual, inclusive. This value must be greater than or equal to StartLine.'),
})

export const ViewFileTool = {
  name: 'view_file',
  async description() {
    return 'View the contents of a file from the local filesystem. This tool supports some binary files such as images and videos. Text file usage: The lines of the file are 1-indexed. The first time you read a new file the tool will enforce reading 800 lines to understand as much about the file as possible. The output of this tool call will be the file contents from StartLine to EndLine (inclusive). You can view at most 800 lines at a time. To view the whole file do not pass StartLine or EndLine arguments. Binary file usage: Do not provide StartLine or EndLine arguments, this tool always returns the entire file.'
  },
  async prompt() {
    return `# view_file Tool

Use this tool to view the contents of a file. 

**Text Files:**
- Lines are 1-indexed
- Can specify StartLine and EndLine to view specific ranges
- Maximum 800 lines per request
- To view entire file, omit StartLine and EndLine

**Binary Files (images, videos):**
- Do not provide StartLine or EndLine
- Returns entire file content

**IMPORTANT:** Always use absolute file paths.`
  },
  inputSchema,
  isReadOnly() {
    return true
  },
  userFacingName() {
    return 'View File'
  },
  async isEnabled() {
    return true
  },
  needsPermissions({ AbsolutePath }) {
    return !hasReadPermission(AbsolutePath || getCwd())
  },
  renderToolUseMessage(input, { verbose }) {
    const { AbsolutePath, StartLine, EndLine } = input
    const parts = [`AbsolutePath: ${verbose ? AbsolutePath : relative(getCwd(), AbsolutePath)}`]
    if (StartLine !== undefined) parts.push(`StartLine: ${StartLine}`)
    if (EndLine !== undefined) parts.push(`EndLine: ${EndLine}`)
    return parts.join(', ')
  },
  renderToolResultMessage(output, { verbose }) {
    switch (output.type) {
      case 'image':
        return (
          <Box justifyContent="space-between" overflowX="hidden" width="100%">
            <Box flexDirection="row">
              <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
              <Text>Read image</Text>
            </Box>
          </Box>
        )
      case 'text': {
        const { filePath, content, numLines } = output.file
        const contentWithFallback = content || '(No content)'
        return (
          <Box justifyContent="space-between" overflowX="hidden" width="100%">
            <Box flexDirection="row">
              <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
              <Box flexDirection="column">
                <HighlightedCode
                  code={
                    verbose
                      ? contentWithFallback
                      : contentWithFallback
                          .split('\n')
                          .slice(0, MAX_LINES_TO_RENDER)
                          .filter(_ => _.trim() !== '')
                          .join('\n')
                  }
                  language={extname(filePath).slice(1)}
                />
                {!verbose && numLines > MAX_LINES_TO_RENDER && (
                  <Text color={getTheme().secondaryText}>
                    ... (+{numLines - MAX_LINES_TO_RENDER} lines)
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        )
      }
    }
  },
  renderToolUseRejectedMessage() {
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput({ AbsolutePath, StartLine, EndLine }) {
    const fullFilePath = normalizeFilePath(AbsolutePath)

    if (!existsSync(fullFilePath)) {
      const similarFilename = findSimilarFile(fullFilePath)
      let message = 'File does not exist.'

      if (similarFilename) {
        message += ` Did you mean ${similarFilename}?`
      }

      return {
        result: false,
        message,
      }
    }

    if (StartLine !== undefined && EndLine !== undefined && StartLine > EndLine) {
      return {
        result: false,
        message: 'StartLine must be less than or equal to EndLine.',
      }
    }

    const stats = statSync(fullFilePath)
    const fileSize = stats.size
    const ext = path.extname(fullFilePath).toLowerCase()

    if (!IMAGE_EXTENSIONS.has(ext)) {
      if (fileSize > MAX_OUTPUT_SIZE && !StartLine && !EndLine) {
        return {
          result: false,
          message: `File content (${Math.round(fileSize / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_OUTPUT_SIZE / 1024)}KB). Please use StartLine and EndLine parameters to read specific portions of the file.`,
          meta: { fileSize },
        }
      }
    }

    return { result: true, message: 'Valid input' }
  },
  async *call(
    { AbsolutePath, StartLine, EndLine },
    { readFileTimestamps },
  ) {
    const ext = path.extname(AbsolutePath).toLowerCase()
    const fullFilePath = normalizeFilePath(AbsolutePath)

    readFileTimestamps[fullFilePath] = Date.now()

    if (IMAGE_EXTENSIONS.has(ext)) {
      const buffer = readFileSync(fullFilePath)
      const data = {
        type: 'image' as const,
        file: {
          base64: buffer.toString('base64'),
          type: `image/${ext.slice(1)}` as any,
        },
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return
    }

    const lineOffset = StartLine ? StartLine - 1 : 0
    const limit = EndLine && StartLine ? EndLine - StartLine + 1 : undefined
    const { content, lineCount, totalLines } = readTextContent(
      fullFilePath,
      lineOffset,
      limit,
    )

    if (content.length > MAX_OUTPUT_SIZE) {
      throw new Error(`File content too large. Please use StartLine and EndLine parameters.`)
    }

    const data = {
      type: 'text' as const,
      file: {
        filePath: AbsolutePath,
        content: content,
        numLines: lineCount,
        startLine: StartLine || 1,
        totalLines,
      },
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant(data) {
    switch (data.type) {
      case 'image':
        return [
          {
            type: 'image',
            source: {
              type: 'base64',
              data: data.file.base64,
              media_type: data.file.type,
            },
          },
        ]
      case 'text':
        return addLineNumbers(data.file)
    }
  },
} satisfies Tool
