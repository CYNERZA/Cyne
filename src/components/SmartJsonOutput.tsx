import { Box, Text } from 'ink'
import * as React from 'react'
import { getTheme } from '../utils/theme'

// Maximum items to show in preview mode
const MAX_PREVIEW_ITEMS = 5
const MAX_KEY_LENGTH = 15

interface SmartJsonOutputProps {
    content: string
    expanded?: boolean
    toolName?: string
}

/**
 * Smart JSON output formatter that renders JSON data in a readable UI format.
 * Detects arrays and objects and formats them appropriately.
 */
export function SmartJsonOutput({
    content,
    expanded = false,
    toolName,
}: SmartJsonOutputProps): React.ReactNode {
    const theme = getTheme()

    // Try to parse as JSON
    let parsed: unknown
    try {
        parsed = JSON.parse(content.trim())
    } catch {
        // Not JSON, return null to fallback to raw display
        return null
    }

    // Handle arrays
    if (Array.isArray(parsed)) {
        return (
            <ArrayOutput
                data={parsed}
                expanded={expanded}
                theme={theme}
                toolName={toolName}
            />
        )
    }

    // Handle objects
    if (typeof parsed === 'object' && parsed !== null) {
        return (
            <ObjectOutput
                data={parsed as Record<string, unknown>}
                expanded={expanded}
                theme={theme}
            />
        )
    }

    // Primitive - just show it
    return <Text>{String(parsed)}</Text>
}

/**
 * Renders an array of items in a formatted list
 */
function ArrayOutput({
    data,
    expanded,
    theme,
    toolName,
}: {
    data: unknown[]
    expanded: boolean
    theme: ReturnType<typeof getTheme>
    toolName?: string
}): React.ReactNode {
    const displayItems = expanded ? data : data.slice(0, MAX_PREVIEW_ITEMS)
    const hiddenCount = data.length - displayItems.length

    // Try to detect email-like structure
    const isEmailLike = data.length > 0 &&
        typeof data[0] === 'object' &&
        data[0] !== null &&
        ('Subject' in data[0] || 'subject' in data[0] || 'snippet' in data[0])

    return (
        <Box flexDirection="column">
            {/* Header */}
            <Box gap={1}>
                <Text color={theme.success} bold>
                    {isEmailLike ? '📧' : '📋'} {data.length} items
                </Text>
                {toolName && (
                    <Text color={theme.secondaryText} dimColor>
                        from {toolName}
                    </Text>
                )}
            </Box>

            {/* Items */}
            <Box flexDirection="column" paddingLeft={2} marginTop={1}>
                {displayItems.map((item, index) => (
                    <Box key={index} marginBottom={1}>
                        <Text color={theme.secondaryText}>{index + 1}. </Text>
                        <ItemSummary item={item} theme={theme} isEmailLike={isEmailLike} />
                    </Box>
                ))}
            </Box>

            {/* Hidden items indicator */}
            {hiddenCount > 0 && (
                <Box paddingLeft={2}>
                    <Text color={theme.secondaryText} dimColor>
                        ... (+{hiddenCount} more items)
                    </Text>
                </Box>
            )}
        </Box>
    )
}

/**
 * Renders a smart summary of an array item
 */
function ItemSummary({
    item,
    theme,
    isEmailLike,
}: {
    item: unknown
    theme: ReturnType<typeof getTheme>
    isEmailLike: boolean
}): React.ReactNode {
    if (typeof item !== 'object' || item === null) {
        return <Text>{truncate(String(item), 60)}</Text>
    }

    const obj = item as Record<string, unknown>

    // Email-like formatting
    if (isEmailLike) {
        const subject = obj.Subject || obj.subject || obj.snippet || 'No subject'
        const from = obj.From || obj.from || obj.sender || ''
        const fromStr = typeof from === 'string' ? from.split('<')[0].trim() : ''

        return (
            <Box flexDirection="column">
                <Text bold>{truncate(String(subject), 50)}</Text>
                {fromStr && (
                    <Text color={theme.secondaryText} dimColor>
                        {truncate(fromStr, 30)}
                    </Text>
                )}
            </Box>
        )
    }

    // Generic object - show key fields
    const keyFields = getKeyFields(obj)
    return (
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {keyFields.map(([key, value], i) => (
                <Box key={key}>
                    <Text color={theme.secondaryText}>{truncateKey(key)}: </Text>
                    <Text>{truncate(String(value), 30)}</Text>
                    {i < keyFields.length - 1 && <Text color={theme.secondaryText}> · </Text>}
                </Box>
            ))}
        </Box>
    )
}

/**
 * Renders an object with formatted key-value pairs
 */
function ObjectOutput({
    data,
    expanded,
    theme,
}: {
    data: Record<string, unknown>
    expanded: boolean
    theme: ReturnType<typeof getTheme>
}): React.ReactNode {
    const entries = Object.entries(data)
    const displayEntries = expanded ? entries : entries.slice(0, 8)
    const hiddenCount = entries.length - displayEntries.length

    return (
        <Box flexDirection="column">
            {displayEntries.map(([key, value]) => (
                <Box key={key} gap={1}>
                    <Text color={theme.accent?.primary || theme.secondaryText} bold>
                        {truncateKey(key)}:
                    </Text>
                    <Text>{formatValue(value)}</Text>
                </Box>
            ))}
            {hiddenCount > 0 && (
                <Text color={theme.secondaryText} dimColor>
                    ... (+{hiddenCount} more fields)
                </Text>
            )}
        </Box>
    )
}

// Helper functions
function truncate(str: string, max: number): string {
    if (str.length <= max) return str
    return str.slice(0, max - 3) + '...'
}

function truncateKey(key: string): string {
    return key.length > MAX_KEY_LENGTH ? key.slice(0, MAX_KEY_LENGTH) : key
}

function formatValue(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'boolean') return value ? '✓' : '✗'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'string') return truncate(value, 50)
    if (Array.isArray(value)) return `[${value.length} items]`
    if (typeof value === 'object') return `{${Object.keys(value).length} fields}`
    return String(value)
}

function getKeyFields(obj: Record<string, unknown>): [string, unknown][] {
    // Priority fields to show
    const priorityKeys = ['id', 'name', 'title', 'type', 'status', 'date', 'email', 'url']
    const found: [string, unknown][] = []

    for (const key of priorityKeys) {
        if (key in obj && obj[key] !== null && obj[key] !== undefined) {
            found.push([key, obj[key]])
            if (found.length >= 3) break
        }
    }

    // If not enough, add first few non-priority fields
    if (found.length < 3) {
        for (const [key, value] of Object.entries(obj)) {
            if (!priorityKeys.includes(key) && value !== null && value !== undefined) {
                if (typeof value !== 'object') {
                    found.push([key, value])
                    if (found.length >= 3) break
                }
            }
        }
    }

    return found
}
