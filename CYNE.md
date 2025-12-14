# CYNE Project Configuration

Note: npm/yarn build system detected.
Note: jest testing framework detected.

## Quick Commands

```bash
# Development (hot reload with tsx)
npm run dev

# Build (uses Bun bundler)
npm run build

# Build with obfuscation
npm run build:obfuscated-light   # For releases

# Format code
npm run format
npm run format:check
```

## Architecture Overview

### Tech Stack
- **Runtime:** Node.js ≥18, built with Bun bundler
- **UI Framework:** Ink (React for CLI) + React 18
- **CLI Framework:** Commander.js
- **AI SDKs:** OpenAI, Anthropic (dual-provider support)
- **Validation:** Zod

### Core Architecture

**Entry Point Flow:**
`src/entrypoints/cli.tsx` → `REPL` screen → `query.ts` (message processing) → AI services

**Key Services (`src/services/`):**
- `cynerza.ts` - Main AI client manager, message formatting, query orchestration
- `openai.ts` - OpenAI/compatible API integration with streaming support
- `mcpClient.ts` - Model Context Protocol client for external tools

**Tool System (`src/tools/`):**
Each tool is a directory implementing the `Tool` interface from `src/Tool.ts`:
- `isReadOnly()` - Whether tool modifies system state
- `needsPermissions()` - Permission check for destructive operations
- `call()` - AsyncGenerator for streaming execution
- `renderResultForAssistant()` - Format output for AI context

**Permission System (`src/permissions.ts`):**
- Per-directory trust dialogs before file operations
- Tool-level permission configuration
- MCP server approval workflow

**Configuration Layering:**
Global (`~/.cynerza/config.json`) < Project (per-directory) < Environment < Runtime flags

### UI Component Patterns
Components in `src/components/` use Ink's React-based rendering:
- `REPL.tsx` - Main interactive loop in `src/screens/`
- `PermissionRequest` components handle tool approval UI
- Message components in `components/messages/` render conversation

### Multi-Provider AI Support
The `AIClientManager` class in `cynerza.ts` handles:
- Provider detection (OpenAI, Anthropic, Ollama, etc.)
- API key rotation for rate limit resilience
- Model-specific transformations
