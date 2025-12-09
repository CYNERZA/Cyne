# Cyne VS Code Extension

Enables AI-powered code editing with Cyne CLI through Unix socket communication.

## Installation

### From Source
```bash
cd vscode-extension
npm install
npm run compile
```

Then press F5 in VS Code to run the extension in development mode.

### Build VSIX Package
```bash
npm run package
code --install-extension cyne-vscode-0.1.0.vsix
```

## How It Works

1. When VS Code opens a workspace, the extension starts a Unix socket server
2. The socket is registered at `~/.cynerza/sockets/{workspace-hash}.sock`
3. Cyne CLI discovers the socket based on your current working directory
4. Commands are sent via JSON-RPC 2.0 protocol

## Supported Operations

| Method | Description |
|--------|-------------|
| `health/ping` | Check connection status |
| `file/read` | Read file content |
| `file/create` | Create new file |
| `file/edit` | Edit file (search/replace) |
| `file/open` | Open file in editor |
| `editor/context` | Get active editor state |
| `editor/goto` | Navigate to line/column |
| `editor/format` | Format document |
| `workspace/files` | List workspace files |
| `workspace/search` | Search in workspace |
| `terminal/execute` | Run terminal command |
| `diagnostics/get` | Get lint errors |
| `symbols/definition` | Go to definition |
| `symbols/references` | Find references |
| `symbols/rename` | Rename symbol |

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `cyne.autoStart` | Auto-start socket server | `true` |
| `cyne.showStatusBarItem` | Show status in status bar | `true` |

## Commands

- **Cyne: Show Connection Status** - View current connection state
- **Cyne: Reconnect Socket** - Restart the socket server
