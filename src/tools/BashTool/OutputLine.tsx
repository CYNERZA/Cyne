import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../../utils/theme'
import { MAX_RENDERED_LINES } from './prompt'
import { CollapsibleOutput, COLLAPSIBLE_THRESHOLD_LINES, COLLAPSIBLE_THRESHOLD_CHARS } from '../../components/CollapsibleOutput'
import chalk from 'chalk'

function renderTruncatedContent(content: string, totalLines: number): string {
  const allLines = content.split('\n')
  if (allLines.length <= MAX_RENDERED_LINES) {
    return allLines.join('\n')
  }
  const firstHalf = Math.floor(MAX_RENDERED_LINES / 2)
  const secondHalf = MAX_RENDERED_LINES - firstHalf
  return [
    ...allLines.slice(0, firstHalf),
    chalk.grey(`... (+${totalLines - MAX_RENDERED_LINES} lines)`),
    ...allLines.slice(-secondHalf),
  ].join('\n')
}

export function OutputLine({
  content,
  lines,
  verbose,
  isError,
  toolName,
}: {
  content: string
  lines: number
  verbose: boolean
  isError?: boolean
  toolName?: string
}) {
  // Use CollapsibleOutput for long outputs (unless in verbose mode)
  // Check both line count AND character count (for long JSON blobs with few newlines)
  const shouldCollapse = lines > COLLAPSIBLE_THRESHOLD_LINES || content.length > COLLAPSIBLE_THRESHOLD_CHARS
  if (!verbose && shouldCollapse) {
    return (
      <CollapsibleOutput
        content={content}
        lines={lines}
        isError={isError}
        toolName={toolName}
      />
    )
  }

  // Standard rendering for short outputs or verbose mode
  return (
    <Box justifyContent="space-between" width="100%">
      <Box flexDirection="row">
        <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
        <Box flexDirection="column">
          <Text color={isError ? getTheme().error : undefined}>
            {verbose
              ? content.trim()
              : renderTruncatedContent(content.trim(), lines)}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

