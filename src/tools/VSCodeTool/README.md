# VS Code Integration Tools

This directory contains VS Code integration tools that allow Cyne to interact with VS Code when it's available and properly configured.

## 🔧 Requirements

The VS Code tools only work when both conditions are met:
1. **VS Code Command**: `code` command is available in your PATH
2. **Extension API**: VS Code extension API is running on `localhost:8090`

## 🛠️ Available Tools

### 🩺 VSCodeHealthTool
- **Purpose**: Check VS Code availability and connection status
- **Read-only**: Yes
- **Permissions**: None required
- **Usage**: Verify if VS Code integration is working properly

### 📋 VSCodeContextTool  
- **Purpose**: Get current VS Code editor context
- **Read-only**: Yes
- **Permissions**: None required
- **Returns**: Active file, language, workspace, selection, and open tabs

### 📁 VSCodeListFilesTool
- **Purpose**: List files in the VS Code workspace matching a glob pattern
- **Read-only**: Yes
- **Permissions**: None required
- **Parameters**:
  - `pattern`: Glob pattern (e.g., "**/*.py", "src/**")

### 📖 VSCodeReadFileTool
- **Purpose**: Read content from files in the VS Code workspace
- **Read-only**: Yes
- **Permissions**: Required (file reading)
- **Parameters**:
  - `file_path`: Relative path to the file
  - `start_line`: Optional starting line number
  - `end_line`: Optional ending line number

### 📝 VSCodeCreateFileTool
- **Purpose**: Create new files with content in VS Code workspace
- **Read-only**: No
- **Permissions**: Required (file creation)
- **Parameters**:
  - `filename`: Name/path of the file to create
  - `content`: Content to write to the file

### ✏️ VSCodeEditFileTool
- **Purpose**: Edit existing files by replacing text in VS Code workspace
- **Read-only**: No
- **Permissions**: Required (file editing)
- **Parameters**:
  - `filename`: Name/path of the file to edit
  - `old_text`: Text to replace (must match exactly)
  - `new_text`: New text to replace with

## 🔒 Security Features

- **Availability Checks**: All tools check VS Code availability before execution
- **Permission Management**: Write operations require explicit user permission
- **Error Handling**: Graceful error handling with clear error messages
- **Path Validation**: Basic validation to prevent directory traversal

## 📡 API Integration

The tools communicate with VS Code through a REST API running on `localhost:8090`:

- `GET /health` - Health check endpoint
- `GET /context` - Get current editor context
- `GET /workspace/files?pattern=...` - List workspace files
- `GET /file/read?path=...&startLine=...&endLine=...` - Read file content
- `POST /file/create` - Create new file
- `POST /file/edit` - Edit existing file

## 🚀 Usage Examples

### Check VS Code Status
```typescript
// The health tool is always available to check connectivity
const healthResult = await VSCodeHealthTool.call({})
```

### Get Current Context
```typescript 
// Only works when VS Code is available
const context = await VSCodeContextTool.call({})
// Returns: { activeFile, language, workspace, selection, openTabs }
```

### List Files in Workspace
```typescript
const fileList = await VSCodeListFilesTool.call({
  pattern: "**/*.ts" // List all TypeScript files
})
```

### Read File Content
```typescript
const fileContent = await VSCodeReadFileTool.call({
  file_path: "src/main.ts",
  start_line: 1,
  end_line: 50
})
```

### Create New File
```typescript
await VSCodeCreateFileTool.call({
  filename: "new-feature.ts",
  content: "export const newFeature = () => {\n  // Implementation\n}"
})
```

### Edit Existing File
```typescript
await VSCodeEditFileTool.call({
  filename: "src/config.ts",
  old_text: "const API_URL = 'http://localhost:3000'",
  new_text: "const API_URL = 'https://api.production.com'"
})
```

## 🎯 Integration Strategy

The VS Code tools are designed to:

1. **Gracefully degrade**: If VS Code isn't available, tools are disabled
2. **Complement existing tools**: Work alongside regular file system tools
3. **Respect permissions**: Require user consent for file operations
4. **Provide rich context**: Include file language, workspace info, and syntax highlighting

## 🔍 Troubleshooting

### Tool Not Available
- Ensure VS Code is installed and `code` command works
- Verify VS Code extension API is running on port 8090
- Use `VSCodeHealthTool` to diagnose connectivity issues

### Permission Errors
- VS Code file operations require explicit user permission
- Check if files/directories are accessible from VS Code workspace

### API Connection Issues  
- Confirm VS Code extension is properly configured
- Check if port 8090 is available and not blocked by firewall
- Verify VS Code workspace is open and active
