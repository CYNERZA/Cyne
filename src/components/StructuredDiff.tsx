import { Box, Text } from 'ink'
import * as React from 'react'
import { Hunk } from 'diff'
import { getTheme, ThemeNames } from '../utils/theme'
import { useMemo } from 'react'
import { wrapText } from '../utils/format'

interface StructuredDiffProps {
  patch: Hunk
  dim: boolean
  width: number
  overrideTheme?: ThemeNames // custom theme for previews
}

export function StructuredDiff({
  patch,
  dim,
  width,
  overrideTheme,
}: StructuredDiffProps): React.ReactNode {
  const formattedDiff = useMemo(
    () => createFormattedDiff(patch.lines, patch.oldStart, width, dim, overrideTheme),
    [patch.lines, patch.oldStart, width, dim, overrideTheme],
  )

  return formattedDiff.map((diffElement, index) => <Box key={index}>{diffElement}</Box>)
}

function createFormattedDiff(
  codeLines: string[],
  initialLineNumber: number,
  containerWidth: number,
  isDimmed: boolean,
  themeOverride?: ThemeNames,
): React.ReactNode[] {
  const currentTheme = getTheme(themeOverride)

  const processedLines = assignLineNumbers(
    codeLines.map(codeLine => {
      if (codeLine.startsWith('+')) {
        return {
          code: ' ' + codeLine.slice(1),
          i: 0,
          type: 'add',
        }
      }
      if (codeLine.startsWith('-')) {
        return {
          code: ' ' + codeLine.slice(1),
          i: 0,
          type: 'remove',
        }
      }
      return { code: codeLine, i: 0, type: 'nochange' }
    }),
    initialLineNumber,
  )

  const maxLineNumber = Math.max(...processedLines.map(({ i }) => i))
  const lineNumberWidth = maxLineNumber.toString().length

  return processedLines.flatMap(({ type, code, i }) => {
    const textLines = wrapText(code, containerWidth - lineNumberWidth)
    return textLines.map((textLine, lineIndex) => {
      const elementKey = `${type}-${i}-${lineIndex}`
      switch (type) {
        case 'add':
          return (
            <Text key={elementKey}>
              <LineNumberDisplay
                i={lineIndex === 0 ? i : undefined}
                width={lineNumberWidth}
              />
              <Text
                color={themeOverride ? currentTheme.text : undefined}
                backgroundColor={
                  isDimmed ? currentTheme.diff.addedDimmed : currentTheme.diff.added
                }
                dimColor={isDimmed}
              >
                {textLine}
              </Text>
            </Text>
          )
        case 'remove':
          return (
            <Text key={elementKey}>
              <LineNumberDisplay
                i={lineIndex === 0 ? i : undefined}
                width={lineNumberWidth}
              />
              <Text
                color={themeOverride ? currentTheme.text : undefined}
                backgroundColor={
                  isDimmed ? currentTheme.diff.removedDimmed : currentTheme.diff.removed
                }
                dimColor={isDimmed}
              >
                {textLine}
              </Text>
            </Text>
          )
        case 'nochange':
          return (
            <Text key={elementKey}>
              <LineNumberDisplay
                i={lineIndex === 0 ? i : undefined}
                width={lineNumberWidth}
              />
              <Text
                color={themeOverride ? currentTheme.text : undefined}
                dimColor={isDimmed}
              >
                {textLine}
              </Text>
            </Text>
          )
      }
    })
  })
}

function LineNumberDisplay({
  i,
  width,
}: {
  i: number | undefined
  width: number
}): React.ReactNode {
  const theme = getTheme()
  const displayText = i !== undefined ? i.toString().padStart(width) : ' '.repeat(width)
  
  return (
    <Text color={theme.secondaryText}>
      {displayText}{' '}
    </Text>
  )
}

function assignLineNumbers(
  diffEntries: { code: string; type: string }[],
  startingLine: number,
): { code: string; type: string; i: number }[] {
  let currentLine = startingLine
  const processedResult: { code: string; type: string; i: number }[] = []
  const entryQueue = [...diffEntries]

  while (entryQueue.length > 0) {
    const { code, type } = entryQueue.shift()!
    const lineEntry = {
      code: code,
      type,
      i: currentLine,
    }

    // Update line counters based on change type
    switch (type) {
      case 'nochange':
        currentLine++
        processedResult.push(lineEntry)
        break
      case 'add':
        currentLine++
        processedResult.push(lineEntry)
        break
      case 'remove': {
        processedResult.push(lineEntry)
        let removedCount = 0
        while (entryQueue[0]?.type === 'remove') {
          currentLine++
          const { code, type } = entryQueue.shift()!
          const removeEntry = {
            code: code,
            type,
            i: currentLine,
          }
          processedResult.push(removeEntry)
          removedCount++
        }
        currentLine -= removedCount
        break
      }
    }
  }

  return processedResult
}
