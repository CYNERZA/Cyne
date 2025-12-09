# CYNE - Project Overview

> **A terminal-based AI coding assistant by Cynerza**

## 📋 Project Summary

**CYNE** (pronounced "sign") is an AI-powered CLI coding assistant that helps developers write, understand, and improve code directly from the terminal. It provides a REPL-like interactive environment with access to various AI models and powerful code manipulation tools.

- **Package Name:** `cyne-cli`
- **Current Version:** `0.0.20-beta`
- **Author:** Cynerza (`hello@cynerza.com`)
- **Repository:** [github.com/CYNERZA/cyne](https://github.com/CYNERZA/cyne)
- **License:** MIT

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|--------------|
| **Runtime** | Node.js (≥18.0.0) |
| **Language** | TypeScript/TSX |
| **Build Tool** | Bun (for bundling) |
| **Package Manager** | pnpm |
| **UI Framework** | [Ink](https://github.com/vadimdemedes/ink) (React for CLI) + React 18 |
| **CLI Framework** | Commander.js |
| **AI SDKs** | OpenAI, Anthropic |
| **Validation** | Zod |
| **Error Tracking** | Sentry |
| **Analytics** | Statsig |

---

## 📁 Project Structure

```
cyne/
├── src/
│   ├── entrypoints/         # CLI entry points
│   │   └── cli.tsx          # Main CLI entry (alternative implementation)
│   │   └── mcp.ts           # MCP server entry
│   ├── commands/            # Slash commands (22 commands)
│   │   ├── model.tsx        # Model selection
│   │   ├── config.tsx       # Configuration management
│   │   ├── mcp.ts           # MCP server management
│   │   ├── login.tsx        # Authentication
│   │   ├── init.ts          # Project initialization
│   │   └── ...
│   ├── components/          # React/Ink UI components (78 components)
│   │   ├── Onboarding.tsx   # First-run setup
│   │   ├── REPL.tsx         # Main interactive loop
│   │   ├── Login.tsx        # Authentication UI
│   │   └── ...
│   ├── tools/               # AI Tools (30 tool directories)
│   │   ├── BashTool/        # Shell command execution
│   │   ├── ViewFileTool/    # File viewing
│   │   ├── WriteToFileTool/ # File writing
│   │   ├── GrepTool/        # Pattern searching
│   │   ├── MCPTool/         # MCP integration
│   │   └── ...
│   ├── services/            # Core services (13 services)
│   │   ├── openai.ts        # OpenAI API integration
│   │   ├── auth.ts          # Authentication service
│   │   ├── backend.ts       # Backend API client
│   │   ├── mcpClient.ts     # MCP client implementation
│   │   └── ...
│   ├── utils/               # Utilities (43 files)
│   │   ├── config.ts        # Configuration management
│   │   ├── model.ts         # Model utilities
│   │   └── ...
│   ├── constants/           # Constants (8 files)
│   ├── hooks/               # React hooks (14 hooks)
│   └── screens/             # Full-screen components (5 screens)
├── scripts/                 # Build & utility scripts
│   ├── obfuscate.js         # Code obfuscation
│   ├── install-windows.ps1  # Windows installer
│   └── ...
├── package.json
├── tsconfig.json
├── Dockerfile
└── yoga.wasm                # Layout engine (used by Ink)
```

---

## 🚀 Key Features

### 1. **Interactive REPL Interface**
- Conversational AI interaction in the terminal
- Rich terminal UI powered by Ink (React for CLI)
- Syntax-highlighted code output
- Auto-completion and history

### 2. **AI Model Support**
- **Multi-provider support:** OpenAI, Anthropic, Mistral, DeepSeek, xAI, Groq, Gemini, Ollama, Azure, LiteLLM
- Backend-synced model configuration
- Round-robin API key rotation for load balancing

### 3. **Code Tools (30+ built-in tools)**
| Tool | Description |
|------|-------------|
| `BashTool` | Execute shell commands |
| `ViewFileTool` | Read file contents |
| `WriteToFileTool` | Create/overwrite files |
| `ReplaceFileContentTool` | Edit files with targeted replacements |
| `MultiReplaceFileContentTool` | Multi-chunk file edits |
| `GrepTool` | Search files with regex |
| `GlobTool` | Find files by pattern |
| `ListDirTool` | Directory listing |
| `ViewCodeItemTool` | View specific code items |
| `ViewFileOutlineTool` | File structure outline |
| `BraveSearchTool` | Web search integration |
| `WebScrapingTool` | Scrape web content |
| `NotebookEditTool` | Jupyter notebook editing |
| `MemoryReadTool` / `MemoryWriteTool` | Persistent memory |
| `ArchitectTool` | High-level code architecture |
| `ThinkTool` | Extended reasoning |
| `MCPTool` | Model Context Protocol tools |

### 4. **MCP (Model Context Protocol) Support**
- Connect to external MCP servers
- Both STDIO and SSE transport support
- Server approval workflow for security

### 5. **Authentication & Backend Integration**
- User authentication with token-based auth
- Backend sync for model configuration
- Telemetry and analytics

---

## ⚙️ Configuration

### Global Configuration (`~/.cynerza/config.json`)
- Theme (dark mode default)
- API keys (multiple key support with rotation)
- Model settings (large/small model configuration)
- Auto-updater preferences
- MCP server configurations

### Project Configuration (per-directory)
- Allowed tools list
- Trust dialog acceptance
- Custom context files
- MCP servers specific to project

---

## 📜 Available Commands

### CLI Arguments
```bash
cyne [prompt]                    # Start with optional prompt
cyne -p "prompt"                 # Print mode (non-interactive)
cyne --login                     # Force login
cyne --logout                    # Logout
cyne --setup                     # Configure models
cyne --think                     # Enable Think tool
cyne -e, --enable-architect      # Enable Architect tool
cyne -d, --debug                 # Debug mode
cyne --verbose                   # Verbose output
cyne -c, --cwd <path>            # Set working directory
```

### Slash Commands (Interactive Mode)
| Command | Description |
|---------|-------------|
| `/model` | Select AI model |
| `/config` | Configure settings |
| `/bug` | Report a bug |
| `/help` | Show help |
| `/clear` | Clear conversation |
| `/compact` | Compact context |
| `/cost` | Show session cost |
| `/doctor` | Run diagnostics |
| `/init` | Initialize project |
| `/mcp` | Manage MCP servers |
| `/resume` | Resume previous session |
| `/review` | Code review |

---

## 🔧 Development Scripts

```bash
# Development
npm run dev                      # Run with tsx (hot reload)

# Build
npm run build                    # Build with Bun
npm run build:obfuscated         # Build with obfuscation
npm run build:obfuscated-light   # Light obfuscation
npm run build:obfuscated-heavy   # Heavy obfuscation

# Windows
npm run build:windows            # Windows-specific build
npm run install-windows          # Windows installation

# Formatting
npm run format                   # Format with Prettier
npm run format:check             # Check formatting
```

---

## 🔐 Security Features

- **Trust Dialog:** Per-directory trust acceptance before file operations
- **MCP Server Approval:** Explicit approval for external servers
- **Permission System:** Tool-level permission checks
- **API Key Security:** In-memory storage for backend credentials (never persisted to disk)
- **Docker Safety:** `--dangerously-skip-permissions` only works in isolated containers

---

## 📦 Distribution

- **NPM Package:** Published as `cyne-cli`
- **Entry Point:** `cli.mjs` (bundled and optionally obfuscated)
- **Windows Support:** `cyne.cmd` wrapper + PowerShell installers
- **Docker Support:** Dockerfile included

---

## 🏗️ Architecture Notes

1. **Ink-based UI:** The entire CLI is built using React components rendered via Ink, allowing for dynamic terminal UIs.

2. **Tool System:** Each tool is encapsulated in its own directory with a standardized interface (`Tool.ts`).

3. **Service Layer:** Core services handle external integrations (OpenAI, Anthropic, MCP, Backend).

4. **Configuration Layering:** Global config < Project config < Environment variables < Runtime flags.

5. **Session State:** Transient state (failed API keys, current indices) is managed through session storage separate from persistent config.

---

## 📝 Notes

- This is a **beta release** (`0.0.20-beta`)
- The codebase uses an "alternative implementation" pattern in `cli.tsx` (refactored with `cyner` prefix naming)
- MCP integration allows extending functionality with external tools
- Multi-key rotation provides resilience against rate limiting

---

*Last updated: December 2024*
