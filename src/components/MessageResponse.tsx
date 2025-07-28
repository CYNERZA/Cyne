import { Box, Text } from 'ink'
import * as React from 'react'

type Props = {
  children: React.ReactNode
}

// Enhanced Configuration Management Service
class MessageResponseConfigurationManager {
  private static instance: MessageResponseConfigurationManager
  
  static getInstance(): MessageResponseConfigurationManager {
    if (!this.instance) {
      this.instance = new MessageResponseConfigurationManager()
    }
    return this.instance
  }

  validateChildren(children: React.ReactNode): boolean {
    return children !== undefined && children !== null
  }

  getLayoutConfiguration() {
    return {
      flexDirection: 'row' as const,
      height: 1,
      overflow: 'hidden' as const
    }
  }

  getPrefixConfiguration() {
    return {
      text: '  ⎿ &nbsp;'
    }
  }
}

// Response Processing Service
class MessageResponseProcessorService {
  private static instance: MessageResponseProcessorService
  
  static getInstance(): MessageResponseProcessorService {
    if (!this.instance) {
      this.instance = new MessageResponseProcessorService()
    }
    return this.instance
  }

  processChildren(children: React.ReactNode): React.ReactNode {
    try {
      return children || null
    } catch (error) {
      console.error('Error processing children:', error)
      return null
    }
  }

  validateAndProcessChildren(children: React.ReactNode): React.ReactNode {
    if (React.isValidElement(children) || typeof children === 'string' || typeof children === 'number') {
      return this.processChildren(children)
    }
    return children
  }
}

// Response Rendering Service
class MessageResponseRenderingService {
  private configManager: MessageResponseConfigurationManager
  private processorService: MessageResponseProcessorService

  constructor(
    configManager: MessageResponseConfigurationManager,
    processorService: MessageResponseProcessorService
  ) {
    this.configManager = configManager
    this.processorService = processorService
  }

  static create(): MessageResponseRenderingService {
    return new MessageResponseRenderingService(
      MessageResponseConfigurationManager.getInstance(),
      MessageResponseProcessorService.getInstance()
    )
  }

  renderResponse(children: React.ReactNode): React.ReactNode {
    const layoutConfig = this.configManager.getLayoutConfiguration()
    const prefixConfig = this.configManager.getPrefixConfiguration()

    if (!this.configManager.validateChildren(children)) {
      return (
        <Box flexDirection="row" height={1}>
          <Text color="red">Error: Invalid children</Text>
        </Box>
      )
    }

    const processedChildren = this.processorService.validateAndProcessChildren(children)

    return (
      <Box {...layoutConfig}>
        <Text>{prefixConfig.text}</Text>
        {processedChildren}
      </Box>
    )
  }
}

export function MessageResponse({ children }: Props): React.ReactNode {
  const renderingService = MessageResponseRenderingService.create()
  return renderingService.renderResponse(children)
}
