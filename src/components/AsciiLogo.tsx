import { Box, Text } from 'ink'
import React from 'react'
import { getTheme } from '../utils/theme'
import { ASCII_LOGO } from '../constants/product'

export function AsciiLogo(): React.ReactNode {
  const theme = getTheme()
  
  // Split the ASCII logo into lines and filter out empty lines
  const logoLines = ASCII_LOGO.split('\n').filter(line => line.trim().length > 0)
  
  return (
    <Box flexDirection="column" alignItems="center">
      {logoLines.map((line, index) => (
        <React.Fragment key={index}>
          <Text color={theme.cynerza} bold>
            {line}
          </Text>
        </React.Fragment>
      ))}
    </Box>
  )
}
