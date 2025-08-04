// Image block type for OpenAI
type ImageBlockParam = {
  type: 'image'
  source: {
    type: 'base64'
    data: string
    media_type: string
  }
}

import { Hunk } from 'diff'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs'
import { Box, Text } from 'ink'
import { EOL } from 'os'
import * as path from 'path'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FallbackToolUseRejectedMessage } from '../../components/FallbackToolUseRejectedMessage'
import { FileEditToolUpdatedMessage } from '../../components/FileEditToolUpdatedMessage'
import { HighlightedCode } from '../../components/HighlightedCode'
import { StructuredDiff } from '../../components/StructuredDiff'
import { logEvent } from '../../services/statsig'
import type { Tool, ToolUseContext, ValidationResult } from '../../Tool'
import { intersperse } from '../../utils/array'
import {
  addLineNumbers,
  detectFileEncoding,
  detectLineEndings,
  detectRepoLineEndings,
  findSimilarFile,
  normalizeFilePath,
  readTextContent,
  writeTextContent,
} from '../../utils/file.js'
import { logError } from '../../utils/log'
import { getCwd } from '../../utils/state'
import { getTheme } from '../../utils/theme'
import { DESCRIPTION, PROMPT } from './prompt'
import { hasReadPermission, hasWritePermission } from '../../utils/permissions/filesystem'
import { getPatch } from '../../utils/diff'
import { PROJECT_FILE } from '../../constants/product'

const MAX_LINES_TO_RENDER = 10
const MAX_LINES_TO_RENDER_FOR_ASSISTANT = 16000
const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024 // 0.25MB in bytes
const MAX_FILES = 1000
const MAX_LINES = 4
const TRUNCATED_MESSAGE =
  '<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with Grep in order to find the line numbers of what you are looking for.</NOTE>'
const TRUNCATED_LIST_MESSAGE = `There are more than ${MAX_FILES} files in the repository. Use the LS tool (passing a specific path), Bash tool, and other tools to explore nested directories. The first ${MAX_FILES} files and directories are included below:\n\n`

// Common image extensions
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
])

// Maximum dimensions for images
const MAX_WIDTH = 2000
const MAX_HEIGHT = 2000
const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024 // 5MB in bytes, with base64 encoding

const inputSchema = z.strictObject({
  operation: z.enum(['read', 'write', 'list']).describe('The filesystem operation to perform'),
  file_path: z.string().optional().describe('The absolute path to the file (required for read/write operations)'),
  path: z.string().optional().describe('The absolute path to the directory (required for list operation)'),
  content: z.string().optional().describe('The content to write to the file (required for write operation)'),
  offset: z
    .number()
    .optional()
    .describe(
      'The line number to start reading from (only for read operation). Only provide if the file is too large to read at once',
    ),
  limit: z
    .number()
    .optional()
    .describe(
      'The number of lines to read (only for read operation). Only provide if the file is too large to read at once.',
    ),
})

type FileSystemInput = z.infer<typeof inputSchema>

type TreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

type FileSystemOutput = 
  | {
      operation: 'read'
      type: 'text'
      file: {
        filePath: string
        content: string
        numLines: number
        startLine: number
        totalLines: number
      }
    }
  | {
      operation: 'read'
      type: 'image'
      file: { base64: string; type: string }
    }
  | {
      operation: 'write'
      type: 'create' | 'update'
      filePath: string
      content: string
      structuredPatch: Hunk[]
    }
  | {
      operation: 'list'
      data: string
    }

export const FileSystemTool: Tool<FileSystemInput, FileSystemOutput> = {
  name: 'FileSystem',
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  isReadOnly() {
    // FileSystem tool can do both read and write operations, so it's not read-only
    return false
  },
  userFacingName() {
    return 'FileSystem'
  },
  async isEnabled() {
    return true
  },
  needsPermissions(input: FileSystemInput) {
    switch (input.operation) {
      case 'read':
        return !hasReadPermission(input.file_path || getCwd())
      case 'write':
        return !hasWritePermission(input.file_path!)
      case 'list':
        return !hasReadPermission(input.path!)
      default:
        return false
    }
  },
  renderToolUseMessage(input: FileSystemInput, { verbose }) {
    const { operation, file_path, path, content, ...rest } = input
    switch (operation) {
      case 'read':
        const entries = [
          ['operation', operation],
          ['file_path', verbose ? file_path : relative(getCwd(), file_path!)],
          ...Object.entries(rest).filter(([_, value]) => value !== undefined),
        ]
        return entries
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ')
      case 'write':
        return `operation: "write", file_path: ${verbose ? file_path : relative(getCwd(), file_path!)}`
      case 'list':
        const absolutePath = path
          ? isAbsolute(path)
            ? path
            : resolve(getCwd(), path)
          : undefined
        const relativePath = absolutePath ? relative(getCwd(), absolutePath) : '.'
        return `operation: "list", path: "${verbose ? path : relativePath}"`
    }
  },
  renderToolResultMessage(output, { verbose }) {
    switch (output.operation) {
      case 'read':
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
                              .slice(0, 3)
                              .filter(_ => _.trim() !== '')
                              .join('\n')
                      }
                      language={extname(filePath).slice(1)}
                    />
                    {!verbose && numLines > 3 && (
                      <Text color={getTheme().secondaryText}>
                        ... (+{numLines - 3} lines)
                      </Text>
                    )}
                  </Box>
                </Box>
              </Box>
            )
          }
        }
        break
      case 'write':
        switch (output.type) {
          case 'create': {
            const contentWithFallback = output.content || '(No content)'
            const numLines = output.content.split(EOL).length

            return (
              <Box flexDirection="column">
                <Text>
                  {'  '}⎿ Wrote {numLines} lines to{' '}
                  <Text bold>
                    {verbose ? output.filePath : relative(getCwd(), output.filePath)}
                  </Text>
                </Text>
                <Box flexDirection="column" paddingLeft={5}>
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
                    language={extname(output.filePath).slice(1)}
                  />
                  {!verbose && numLines > MAX_LINES_TO_RENDER && (
                    <Text color={getTheme().secondaryText}>
                      ... (+{numLines - MAX_LINES_TO_RENDER} lines)
                    </Text>
                  )}
                </Box>
              </Box>
            )
          }
          case 'update':
            return (
              <FileEditToolUpdatedMessage
                filePath={output.filePath}
                structuredPatch={output.structuredPatch}
                verbose={verbose}
              />
            )
        }
        break
      case 'list':
        if (typeof output.data !== 'string') {
          return null
        }
        const result = output.data.replace(TRUNCATED_LIST_MESSAGE, '')
        if (!result) {
          return null
        }
        return (
          <Box justifyContent="space-between" width="100%">
            <Box>
              <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
              <Box flexDirection="column" paddingLeft={0}>
                {result
                  .split('\n')
                  .filter(_ => _.trim() !== '')
                  .slice(0, verbose ? undefined : MAX_LINES)
                  .map((_, i) => (
                    <Text key={i}>{_}</Text>
                  ))}
                {!verbose && result.split('\n').length > MAX_LINES && (
                  <Text color={getTheme().secondaryText}>
                    ... (+{result.split('\n').length - MAX_LINES} items)
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        )
    }
  },
  renderToolUseRejectedMessage(input: FileSystemInput, { columns, verbose }) {
    if (input.operation === 'write') {
      try {
        const fullFilePath = isAbsolute(input.file_path!)
          ? input.file_path!
          : resolve(getCwd(), input.file_path!)
        const oldFileExists = existsSync(fullFilePath)
        const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8'
        const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null
        const type = oldContent ? 'update' : 'create'
        const patch = getPatch({
          filePath: input.file_path!,
          fileContents: oldContent ?? '',
          oldStr: oldContent ?? '',
          newStr: input.content!,
        })

        return (
          <Box flexDirection="column">
            <Text>
              {'  '}⎿{' '}
              <Text color={getTheme().error}>
                User rejected {type === 'update' ? 'update' : 'write'} to{' '}
              </Text>
              <Text bold>
                {verbose ? input.file_path : relative(getCwd(), input.file_path!)}
              </Text>
            </Text>
            {intersperse(
              patch.map(_ => (
                <Box flexDirection="column" paddingLeft={5} key={_.newStart}>
                  <StructuredDiff patch={_} dim={true} width={columns - 12} />
                </Box>
              )),
              i => (
                <Box paddingLeft={5} key={`ellipsis-${i}`}>
                  <Text color={getTheme().secondaryText}>...</Text>
                </Box>
              ),
            )}
          </Box>
        )
      } catch (e) {
        logError(e)
        return (
          <Box flexDirection="column">
            <Text>{'  '}⎿ (No changes)</Text>
          </Box>
        )
      }
    }
    return <FallbackToolUseRejectedMessage />
  },
  async validateInput(input: FileSystemInput) {
    switch (input.operation) {
      case 'read':
        if (!input.file_path) {
          return {
            result: false,
            message: 'file_path is required for read operation.',
          }
        }
        
        const fullFilePath = normalizeFilePath(input.file_path)

        if (!existsSync(fullFilePath)) {
          // Try to find a similar file with a different extension
          const similarFilename = findSimilarFile(fullFilePath)
          let message = 'File does not exist.'

          // If we found a similar file, suggest it to the assistant
          if (similarFilename) {
            message += ` Did you mean ${similarFilename}?`
          }

          return {
            result: false,
            message,
          }
        }

        // Get file stats to check size
        const stats = statSync(fullFilePath)
        const fileSize = stats.size
        const ext = path.extname(fullFilePath).toLowerCase()

        // Skip size check for image files - they have their own size limits
        if (!IMAGE_EXTENSIONS.has(ext)) {
          // If file is too large and no offset/limit provided
          if (fileSize > MAX_OUTPUT_SIZE && !input.offset && !input.limit) {
            return {
              result: false,
              message: formatFileSizeError(fileSize),
              meta: { fileSize },
            }
          }
        }

        return { result: true }

      case 'write':
        if (!input.file_path) {
          return {
            result: false,
            message: 'file_path is required for write operation.',
          }
        }
        
        if (!input.content) {
          return {
            result: false,
            message: 'content is required for write operation.',
          }
        }
        
        // Basic validation - file path should be absolute
        if (!isAbsolute(input.file_path)) {
          return {
            result: false,
            message: 'File path must be absolute, not relative.',
          }
        }

        return { result: true, message: 'Valid file path' }

      case 'list':
        if (!input.path) {
          return {
            result: false,
            message: 'path is required for list operation.',
          }
        }
        
        if (!isAbsolute(input.path)) {
          return {
            result: false,
            message: 'Path must be absolute, not relative.',
          }
        }

        return { result: true }

      default:
        return {
          result: false,
          message: 'Invalid operation. Must be "read", "write", or "list".',
        }
    }
  },
  async *call(input: FileSystemInput, context: ToolUseContext) {
    switch (input.operation) {
      case 'read':
        yield* this.handleRead(input, context)
        break
      case 'write':
        yield* this.handleWrite(input, context)
        break
      case 'list':
        yield* this.handleList(input, context)
        break
    }
  },
  
  async *handleRead(input: FileSystemInput, { readFileTimestamps }): AsyncGenerator<any, void, unknown> {
    const { file_path, offset = 1, limit = undefined } = input
    const ext = path.extname(file_path!).toLowerCase()
    const fullFilePath = normalizeFilePath(file_path!)

    // Update read timestamp, to invalidate stale writes
    readFileTimestamps[fullFilePath] = Date.now()

    // If it's an image file, process and return base64 encoded contents
    if (IMAGE_EXTENSIONS.has(ext)) {
      const data = await readImage(fullFilePath, ext)
      yield {
        type: 'result',
        data: { operation: 'read', ...data },
        resultForAssistant: renderResultForAssistant({ operation: 'read', ...data } as any),
      }
      return
    }

    // Handle offset properly - if offset is 0, don't subtract 1
    const lineOffset = offset === 0 ? 0 : offset - 1
    const { content, lineCount, totalLines } = readTextContent(
      fullFilePath,
      lineOffset,
      limit,
    )

    // Add size validation after reading for non-image files
    if (!IMAGE_EXTENSIONS.has(ext) && content.length > MAX_OUTPUT_SIZE) {
      throw new Error(formatFileSizeError(content.length))
    }

    const data = {
      operation: 'read' as const,
      type: 'text' as const,
      file: {
        filePath: file_path!,
        content: content,
        numLines: lineCount,
        startLine: offset,
        totalLines,
      },
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: renderResultForAssistant(data as any),
    }
  },

  async *handleWrite(input: FileSystemInput, { readFileTimestamps }: ToolUseContext): AsyncGenerator<any, any, unknown> {
    const { file_path, offset = 1, limit = undefined } = input
    const ext = path.extname(file_path!).toLowerCase()
    const fullFilePath = normalizeFilePath(file_path!)

    // Update read timestamp, to invalidate stale writes
    readFileTimestamps[fullFilePath] = Date.now()

    // If it's an image file, process and return base64 encoded contents
    if (IMAGE_EXTENSIONS.has(ext)) {
      const data = await readImage(fullFilePath, ext)
      yield {
        type: 'result',
        data: { operation: 'read', ...data },
        resultForAssistant: this.renderResultForAssistant({ operation: 'read', ...data }),
      }
      return
    }

    // Handle offset properly - if offset is 0, don't subtract 1
    const lineOffset = offset === 0 ? 0 : offset - 1
    const { content, lineCount, totalLines } = readTextContent(
      fullFilePath,
      lineOffset,
      limit,
    )

    // Add size validation after reading for non-image files
    if (!IMAGE_EXTENSIONS.has(ext) && content.length > MAX_OUTPUT_SIZE) {
      throw new Error(formatFileSizeError(content.length))
    }

    const data = {
      operation: 'read' as const,
      type: 'text' as const,
      file: {
        filePath: file_path!,
        content: content,
        numLines: lineCount,
        startLine: offset,
        totalLines,
      },
    }

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },

  async *handleWrite(input: FileSystemInput, { readFileTimestamps }: ToolUseContext) {
    const { file_path, content } = input
    const fullFilePath = isAbsolute(file_path!)
      ? file_path!
      : resolve(getCwd(), file_path!)
    const dir = dirname(fullFilePath)
    const oldFileExists = existsSync(fullFilePath)
    
    // Check file timestamps if file exists
    if (oldFileExists) {
      const readTimestamp = readFileTimestamps[fullFilePath]
      if (!readTimestamp) {
        throw new Error('File has not been read yet. Read it first before writing to it.')
      }

      // Check if file exists and get its last modified time
      const stats = statSync(fullFilePath)
      const lastWriteTime = stats.mtimeMs
      if (lastWriteTime > readTimestamp) {
        throw new Error('File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.')
      }
    }
    
    const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8'
    const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null

    const endings = oldFileExists
      ? detectLineEndings(fullFilePath)
      : await detectRepoLineEndings(getCwd())

    mkdirSync(dir, { recursive: true })
    writeTextContent(fullFilePath, content!, enc, endings!)

    // Update read timestamp, to invalidate stale writes
    readFileTimestamps[fullFilePath] = statSync(fullFilePath).mtimeMs

    // Log when writing to CYNE.md
    if (fullFilePath.endsWith(`${sep}${PROJECT_FILE}`)) {
      logEvent('tengu_write_cyne', {})
    }

    if (oldContent) {
      const patch = getPatch({
        filePath: file_path!,
        fileContents: oldContent,
        oldStr: oldContent,
        newStr: content!,
      })

      const data = {
        operation: 'write' as const,
        type: 'update' as const,
        filePath: file_path!,
        content: content!,
        structuredPatch: patch,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return data
    }

    const data = {
      operation: 'write' as const,
      type: 'create' as const,
      filePath: file_path!,
      content: content!,
      structuredPatch: [],
    }
    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
    return data
  },

  async *handleList(input: FileSystemInput, { abortController }) {
    const { path } = input
    const fullFilePath = isAbsolute(path!) ? path! : resolve(getCwd(), path!)
    const result = listDirectory(
      fullFilePath,
      getCwd(),
      abortController.signal,
    ).sort()

    // Plain tree for user display without warning
    const userTree = printTree(createFileTree(result))

    // Tree with safety warning for assistant only
    const assistantTree = userTree

    if (result.length < MAX_FILES) {
      const data = {
        operation: 'list' as const,
        data: userTree,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return userTree
    } else {
      const userData = `${TRUNCATED_LIST_MESSAGE}${userTree}`
      const assistantData = `${TRUNCATED_LIST_MESSAGE}${assistantTree}`
      const data = {
        operation: 'list' as const,
        data: userData,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant({ operation: 'list', data: assistantData }),
      }
      return userData
    }
  },

  renderResultForAssistant(data) {
    switch (data.operation) {
      case 'read':
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
        break
      case 'write':
        switch (data.type) {
          case 'create':
            return `File created successfully at: ${data.filePath}`
          case 'update':
            return `The file ${data.filePath} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:
${addLineNumbers({
  content:
    data.content.split(/\r?\n/).length > MAX_LINES_TO_RENDER_FOR_ASSISTANT
      ? data.content
          .split(/\r?\n/)
          .slice(0, MAX_LINES_TO_RENDER_FOR_ASSISTANT)
          .join('\n') + TRUNCATED_MESSAGE
      : data.content,
  startLine: 1,
})}`
        }
        break
      case 'list':
        return data.data
    }
  },
} satisfies Tool<typeof inputSchema, any>

const formatFileSizeError = (sizeInBytes: number) =>
  `File content (${Math.round(sizeInBytes / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_OUTPUT_SIZE / 1024)}KB). Please use offset and limit parameters to read specific portions of the file, or use the GrepTool to search for specific content.`

function createImageResponse(
  buffer: Buffer,
  ext: string,
): {
  type: 'image'
  file: { base64: string; type: ImageBlockParam.Source['media_type'] }
} {
  return {
    type: 'image',
    file: {
      base64: buffer.toString('base64'),
      type: `image/${ext.slice(1)}` as ImageBlockParam.Source['media_type'],
    },
  }
}

async function readImage(
  filePath: string,
  ext: string,
): Promise<{
  type: 'image'
  file: { base64: string; type: ImageBlockParam.Source['media_type'] }
}> {
  try {
    const stats = statSync(filePath)
    const sharp = (
      (await import('sharp')) as unknown as { default: typeof import('sharp') }
    ).default
    const image = sharp(readFileSync(filePath))
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      if (stats.size > MAX_IMAGE_SIZE) {
        const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer()
        return createImageResponse(compressedBuffer, 'jpeg')
      }
    }

    // Calculate dimensions while maintaining aspect ratio
    let width = metadata.width || 0
    let height = metadata.height || 0

    // Check if the original file just works
    if (
      stats.size <= MAX_IMAGE_SIZE &&
      width <= MAX_WIDTH &&
      height <= MAX_HEIGHT
    ) {
      return createImageResponse(readFileSync(filePath), ext)
    }

    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width)
      width = MAX_WIDTH
    }

    if (height > MAX_HEIGHT) {
      width = Math.round((width * MAX_HEIGHT) / height)
      height = MAX_HEIGHT
    }

    // Resize image and convert to buffer
    const resizedImageBuffer = await image
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    // If still too large after resize, compress quality
    if (resizedImageBuffer.length > MAX_IMAGE_SIZE) {
      const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer()
      return createImageResponse(compressedBuffer, 'jpeg')
    }

    return createImageResponse(resizedImageBuffer, ext)
  } catch (e) {
    logError(e)
    // If any error occurs during processing, return original image
    return createImageResponse(readFileSync(filePath), ext)
  }
}

function listDirectory(
  initialPath: string,
  cwd: string,
  abortSignal: AbortSignal,
): string[] {
  const results: string[] = []

  const queue = [initialPath]
  while (queue.length > 0) {
    if (results.length > MAX_FILES) {
      return results
    }

    if (abortSignal.aborted) {
      return results
    }

    const path = queue.shift()!
    if (skip(path)) {
      continue
    }

    if (path !== initialPath) {
      results.push(relative(cwd, path) + sep)
    }

    let children
    try {
      children = readdirSync(path, { withFileTypes: true })
    } catch (e) {
      // eg. EPERM, EACCES, ENOENT, etc.
      logError(e)
      continue
    }

    for (const child of children) {
      if (child.isDirectory()) {
        queue.push(join(path, child.name) + sep)
      } else {
        const fileName = join(path, child.name)
        if (skip(fileName)) {
          continue
        }
        results.push(relative(cwd, fileName))
        if (results.length > MAX_FILES) {
          return results
        }
      }
    }
  }

  return results
}

function createFileTree(sortedPaths: string[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const path of sortedPaths) {
    const parts = path.split(sep)
    let currentLevel = root
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      if (!part) {
        // directories have trailing slashes
        continue
      }
      currentPath = currentPath ? `${currentPath}${sep}${part}` : part
      const isLastPart = i === parts.length - 1

      const existingNode = currentLevel.find(node => node.name === part)

      if (existingNode) {
        currentLevel = existingNode.children || []
      } else {
        const newNode: TreeNode = {
          name: part,
          path: currentPath,
          type: isLastPart ? 'file' : 'directory',
        }

        if (!isLastPart) {
          newNode.children = []
        }

        currentLevel.push(newNode)
        currentLevel = newNode.children || []
      }
    }
  }

  return root
}

/**
 * eg.
 * - src/
 *   - index.ts
 *   - utils/
 *     - file.ts
 */
function printTree(tree: TreeNode[], level = 0, prefix = ''): string {
  let result = ''

  // Add absolute path at root level
  if (level === 0) {
    result += `- ${getCwd()}${sep}\n`
    prefix = '  '
  }

  for (const node of tree) {
    // Add the current node to the result
    result += `${prefix}${'-'} ${node.name}${node.type === 'directory' ? sep : ''}\n`

    // Recursively print children if they exist
    if (node.children && node.children.length > 0) {
      result += printTree(node.children, level + 1, `${prefix}  `)
    }
  }

  return result
}

// TODO: Add windows support
function skip(path: string): boolean {
  if (path !== '.' && basename(path).startsWith('.')) {
    return true
  }
  if (path.includes(`__pycache__${sep}`)) {
    return true
  }
  return false
}
