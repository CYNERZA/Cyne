# File System Tools - Fused Organization

## Overview

The FileReadTool, FileWriteTool, and lsTool have been **logically fused** together into a unified file system operations suite. While they remain as separate tools for maintainability and clear separation of concerns, they are now organized together in the `/src/tools/FileTool/` directory and work as a cohesive unit.

## Tools Organization

```
src/tools/FileTool/
├── README.md                    # This documentation
├── index.ts                     # Unified exports and helpers
├── FileReadTool/               # Read files and display content
│   ├── FileReadTool.tsx
│   └── prompt.ts
├── FileWriteTool/              # Create and write files
│   ├── FileWriteTool.tsx
│   └── prompt.ts
└── lsTool/                     # List directory contents
    ├── lsTool.tsx
    └── prompt.ts
```

## Unified Workflow

These tools work together to provide comprehensive file system operations:

### 1. **Discover** (lsTool)
- List directories and files
- Explore project structure
- Identify files of interest

### 2. **Read** (FileReadTool)
- Examine file contents
- Support for text files with line offset/limit
- Display images directly
- Handle various encodings

### 3. **Write** (FileWriteTool)
- Create new files
- Replace file contents entirely
- Automatic directory creation
- Conflict detection

## Key Benefits of Fusion

1. **Logical Grouping**: All file system operations in one place
2. **Clear Workflow**: Natural progression from list → read → write
3. **Unified Documentation**: Single place to understand file operations
4. **Easy Import**: Import all tools from one location
5. **Maintainable**: Each tool remains focused on its specific task

## Usage Examples

```typescript
// Import individual tools
import { FileReadTool, FileWriteTool, LSTool } from './tools/FileTool'

// Or import all at once
import { getAllFileTools } from './tools/FileTool'
const [readTool, writeTool, listTool] = await getAllFileTools()
```

## Implementation Notes

- **Type Safety**: Each tool maintains its own TypeScript definitions
- **Error Handling**: Tool-specific error handling and validation
- **Permissions**: Individual permission checks per operation
- **Performance**: Each tool optimized for its specific use case

## Migration Path

The tools have been moved from:
- `src/tools/FileReadTool/` → `src/tools/FileTool/FileReadTool/`
- `src/tools/FileWriteTool/` → `src/tools/FileTool/FileWriteTool/`
- `src/tools/lsTool/` → `src/tools/FileTool/lsTool/`

All import statements have been updated accordingly.

---

*This fusion approach provides the benefits of unified file system operations while maintaining the modularity and focused responsibility of each individual tool.*
