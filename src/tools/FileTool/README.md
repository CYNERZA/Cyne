# File Tools Collection

This directory contains a unified collection of file system tools that work together to provide comprehensive file operations.

## Tools Included

### FileReadTool
- **Purpose**: Read files from the local filesystem
- **Capabilities**:
  - Read text files with optional line offset and limit
  - Display images in supported formats (PNG, JPG, JPEG, GIF, BMP, WEBP)
  - Handle large files with size validation
  - Support for various file encodings

### FileWriteTool
- **Purpose**: Create or overwrite files in the local filesystem
- **Capabilities**:
  - Create new files with complete content
  - Replace existing file content entirely
  - Automatic directory creation
  - File timestamp validation to prevent conflicts
  - Support for different line endings and encodings

### LSTool (List Directory)
- **Purpose**: List files and directories in a given path
- **Capabilities**:
  - Recursive directory listing
  - Tree-style output format
  - Safety checks for malicious files
  - Truncation for large directories
  - Hidden file filtering

## Usage

These tools are designed to work together for comprehensive file system operations:

1. **Explore**: Use `LSTool` to discover file structure
2. **Read**: Use `FileReadTool` to examine file contents
3. **Write**: Use `FileWriteTool` to create or update files

## Integration

The tools are organized together in this collection but remain as separate, focused tools to maintain:
- Clear separation of concerns
- Individual tool optimization
- Specific error handling per operation
- Proper permission management per action

Import all tools:
```typescript
import { FileReadTool, FileWriteTool, LSTool } from './FileTool'
```

Or use the helper:
```typescript
import { getAllFileTools } from './FileTool'
const fileTools = await getAllFileTools()
```
