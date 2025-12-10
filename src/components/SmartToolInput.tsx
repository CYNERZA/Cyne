import { Box, Text, useInput } from 'ink'
import * as React from 'react'
import { useState } from 'react'
import { getTheme } from '../utils/theme'

// Thresholds for when to show expandable box
const INPUT_CHARS_THRESHOLD = 100  // Show box if input is longer than this

interface SmartToolInputProps {
    input: Record<string, unknown>
    toolName: string
    color?: string
    verbose?: boolean
}

/**
 * Smart tool input display that shows a collapsible formatted view
 * for long or complex tool inputs.
 */
export function SmartToolInput({
    input,
    toolName,
    color,
    verbose = false,
}: SmartToolInputProps): React.ReactNode {
    const [expanded, setExpanded] = useState(false)
    const theme = getTheme()

    // Handle Ctrl+Shift+I to toggle expanded state
    useInput((inputKey, key) => {
        if (key.ctrl && key.shift && inputKey.toLowerCase() === 'i') {
            setExpanded(prev => !prev)
        }
    })

    const entries = Object.entries(input)
    if (entries.length === 0) return null

    // Calculate total input size
    const inputStr = JSON.stringify(input)
    const isLong = inputStr.length > INPUT_CHARS_THRESHOLD || entries.length > 3

    // Short inputs - show inline (no box)
    if (!isLong && !verbose) {
        return (
            <Box paddingLeft={2} marginTop={0}>
                {entries.map(([key, value], i) => (
                    <React.Fragment key={key}>
                        <Text color={theme.secondaryText}>{truncateKey(key)}</Text>
                        <Text>: </Text>
                        <Text>{formatValue(value)}</Text>
                        {i < entries.length - 1 && <Text>  </Text>}
                    </React.Fragment>
                ))}
            </Box>
        )
    }

    // Long inputs - show in bordered box
    const displayEntries = expanded ? entries : entries.slice(0, 3)
    const hiddenCount = entries.length - displayEntries.length

    return (
        <Box
            flexDirection="column"
            marginTop={1}
            borderStyle="round"
            borderColor={theme.secondaryBorder || theme.secondaryText}
            paddingX={1}
            paddingY={0}
        >
            {/* Input params header */}
            <Text color={theme.secondaryText} dimColor>Parameters:</Text>

            {displayEntries.map(([key, value]) => (
                <Box key={key} gap={1} paddingLeft={1}>
                    <Text color={theme.accent?.primary || theme.secondaryText} bold>
                        {key}:
                    </Text>
                    <Text>{formatValueExpanded(value, expanded)}</Text>
                </Box>
            ))}

            {hiddenCount > 0 && (
                <Box paddingLeft={1}>
                    <Text color={theme.secondaryText} dimColor>
                        ... (+{hiddenCount} more)
                    </Text>
                </Box>
            )}

            <Text color={theme.secondaryText} dimColor>
                [Ctrl+Shift+I to {expanded ? 'collapse' : 'expand'}]
            </Text>
        </Box>
    )
}

// Helper functions
function truncateKey(key: string): string {
    return key.length > 15 ? key.slice(0, 12) + '...' : key
}

function formatValue(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'boolean') return value ? '✓' : '✗'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') {
        if (value.length > 30) return `"${value.slice(0, 27)}..."`
        return `"${value}"`
    }
    if (Array.isArray(value)) return `[${value.length} items]`
    if (typeof value === 'object') return `{...}`
    return String(value)
}

function formatValueExpanded(value: unknown, expanded: boolean): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') {
        if (!expanded && value.length > 60) return `"${value.slice(0, 57)}..."`
        if (value.length > 200) return `"${value.slice(0, 197)}..."`
        return `"${value}"`
    }
    if (Array.isArray(value)) {
        if (expanded) return JSON.stringify(value, null, 2).slice(0, 200)
        return `[${value.length} items]`
    }
    if (typeof value === 'object') {
        if (expanded) return JSON.stringify(value, null, 2).slice(0, 200)
        return `{${Object.keys(value).length} fields}`
    }
    return String(value)
}
