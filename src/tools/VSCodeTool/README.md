# VS Code Integration Tools

Socket-based VS Code integration for AI-powered code editing with Cyne CLI.

## 🔧 Requirements

1. **VS Code** with the Cyne extension installed
2. Extension automatically starts a socket server when VS Code opens

## 🏗️ Architecture

The integration uses Unix domain sockets for efficient, workspace-aware communication:

```
~/.cynerza/sockets/
├── registry.json          # Maps workspaces to sockets
├── vscode-abc123.sock     # Socket for workspace 1
└── vscode-def456.sock     # Socket for workspace 2
```

When you run `cyne` in a directory, it automatically finds the correct VS Code instance.

## 🛠️ Available Tools (13 Total)

### Health & Context
| Tool | Description |
|------|-------------|
| `VSCodeHealth` | Check VS Code connection status |
| `VSCodeContext` | Get active editor state, selection, open tabs |

### File Operations
| Tool | Description |
|------|-------------|
| `VSCodeListFiles` | List files matching a glob pattern |
| `VSCodeReadFile` | Read file content (with line range support) |
| `VSCodeCreateFile` | Create new files |
| `VSCodeEditFile` | Edit files (search/replace) |
| `VSCodeOpenFile` | Open file at specific line/column |

### Editor Operations
| Tool | Description |
|------|-------------|
| `VSCodeGoToLine` | Navigate to line/column in active editor |
| `VSCodeFormat` | Format document using VS Code formatters |

### Workspace Operations
| Tool | Description |
|------|-------------|
| `VSCodeSearch` | Search text across workspace |
| `VSCodeDiagnostics` | Get lint errors, warnings, hints |

### Symbol Operations
| Tool | Description |
|------|-------------|
| `VSCodeSymbol` | Go to definition, find references, rename |

### Terminal
| Tool | Description |
|------|-------------|
| `VSCodeTerminal` | Execute commands in VS Code terminal |

## 🔒 Security Features

- **Socket permissions**: Sockets are user-only readable (0600)
- **Workspace isolation**: Each VS Code window has its own socket
- **Permission management**: Write operations require user consent
- **Path validation**: Prevents directory traversal attacks

## 🚀 Installation

### Install the VS Code Extension

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to run in development mode

# Or build and install:
npm run package
code --install-extension cyne-vscode-0.1.0.vsix
```

### Verify Installation

```bash
# The tool should show "Connected" status
cyne "check vs code health"
```

## 🔍 Troubleshooting

### Tool Not Available
- Ensure VS Code is open in a workspace folder
- Check if the Cyne extension is active (status bar shows "Cyne")
- Run `cyne.reconnect` command in VS Code

### Connection Issues
- Check `~/.cynerza/sockets/` for socket files
- Verify registry.json contains your workspace
- Look at VS Code's "Cyne" output channel for logs
