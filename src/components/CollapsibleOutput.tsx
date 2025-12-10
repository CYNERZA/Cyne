import { Box, Text, useInput } from 'ink'
import * as React from 'react'
import { useState } from 'react'
import { getTheme } from '../utils/theme'
import { SmartJsonOutput } from './SmartJsonOutput'

// Configuration constants
const COLLAPSIBLE_THRESHOLD_LINES = 5    // Lines threshold to trigger collapsible
const COLLAPSIBLE_THRESHOLD_CHARS = 500  // Character threshold for long single-line outputs

interface CollapsibleOutputProps {
    content: string
    lines: number
    isError?: boolean
    toolName?: string
}

/**
 * A collapsible output component for long tool results.
 * Shows a compact preview with toggle capability using Ctrl+Shift+R.
 * Uses SmartJsonOutput to format JSON data nicely.
 */
export function CollapsibleOutput({
    content,
    lines,
    isError = false,
    toolName,
}: CollapsibleOutputProps): React.ReactNode {
    const [expanded, setExpanded] = useState(false)
    const theme = getTheme()

    // Handle Ctrl+Shift+R to toggle expanded state
    useInput((input, key) => {
        if (key.ctrl && key.shift && input.toLowerCase() === 'r') {
            setExpanded(prev => !prev)
        }
    })

    // Determine if content should be collapsible
    const shouldCollapse = lines > COLLAPSIBLE_THRESHOLD_LINES || content.length > COLLAPSIBLE_THRESHOLD_CHARS

    // If content is short, render normally without collapsible wrapper
    if (!shouldCollapse) {
        return (
            <Box flexDirection="row" width="100%">
                <Text>&nbsp;&nbsp;⎿ &nbsp;</Text>
                <Box flexDirection="column">
                    <Text color={isError ? theme.error : undefined}>
                        {content.trim()}
                    </Text>
                </Box>
            </Box>
        )
    }

    // Check if content is JSON and try to render it smartly
    const isLikelyJson = content.trim().startsWith('[') || content.trim().startsWith('{')

    return (
        <Box flexDirection="column" width="100%">
            {/* Header with tool name and stats */}
            <Box flexDirection="row" gap={2}>
                <Text color={theme.secondaryText}>⎿</Text>
                <Text color={theme.success} bold>
                    {toolName || 'Output'}
                </Text>
                <Text color={theme.secondaryText} dimColor>
                    ({lines} lines, {Math.round(content.length / 1000)}k chars)
                </Text>
            </Box>

            {/* Content - use SmartJsonOutput for JSON, raw text otherwise */}
            <Box paddingLeft={3} flexDirection="column">
                {isLikelyJson ? (
                    <SmartJsonOutput
                        content={content}
                        expanded={expanded}
                        toolName={toolName}
                    />
                ) : (
                    <Text color={isError ? theme.error : undefined}>
                        {expanded ? content.trim() : content.trim().slice(0, 200) + '...'}
                    </Text>
                )}

                {/* Show raw fallback if SmartJsonOutput returns null */}
                {isLikelyJson && !expanded && (
                    <Text color={theme.secondaryText} dimColor>
                        [Ctrl+Shift+R to show raw JSON]
                    </Text>
                )}
            </Box>

            {/* Toggle hint for non-JSON */}
            {!isLikelyJson && (
                <Box paddingLeft={3}>
                    <Text color={theme.secondaryText} dimColor>
                        [Ctrl+Shift+R to {expanded ? 'collapse' : 'expand'}]
                    </Text>
                </Box>
            )}
        </Box>
    )
}

export { COLLAPSIBLE_THRESHOLD_LINES, COLLAPSIBLE_THRESHOLD_CHARS }

