/**
 * Brain Panel - Webview for displaying CYNE planning artifacts
 * Shows task.md, implementation_plan.md, walkthrough.md in a nice rendered view
 */

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Brain directory location
const CYNE_BASE_DIR = process.env.CYNE_CONFIG_DIR || path.join(os.homedir(), '.cyne')
const BRAIN_DIR = path.join(CYNE_BASE_DIR, 'brain')

let currentPanel: vscode.WebviewPanel | undefined = undefined
let fileWatcher: fs.FSWatcher | undefined = undefined

/**
 * Ensure brain directory exists
 */
function ensureBrainDir(): void {
  if (!fs.existsSync(BRAIN_DIR)) {
    fs.mkdirSync(BRAIN_DIR, { recursive: true })
  }
}

/**
 * Get the brain directory path
 */
export function getBrainDir(): string {
  ensureBrainDir()
  return BRAIN_DIR
}

/**
 * Open or focus the brain panel
 */
export async function openBrainPanel(
  context: vscode.ExtensionContext,
  docType?: 'task' | 'plan' | 'walkthrough'
): Promise<void> {
  const column = vscode.ViewColumn.Beside

  if (currentPanel) {
    // If panel exists, reveal it and update content
    currentPanel.reveal(column)
    await updateBrainContent(docType)
    return
  }

  // Create a new panel
  currentPanel = vscode.window.createWebviewPanel(
    'cyneBrain',
    'Cyne Brain',
    column,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(BRAIN_DIR)],
    }
  )

  // Set initial content
  await updateBrainContent(docType)

  // Start watching for file changes
  startFileWatcher()

  // Handle panel disposal
  currentPanel.onDidDispose(() => {
    currentPanel = undefined
    stopFileWatcher()
  })
}

/**
 * Update the brain panel content
 */
async function updateBrainContent(docType?: 'task' | 'plan' | 'walkthrough'): Promise<void> {
  if (!currentPanel) return

  ensureBrainDir()

  // Read available documents
  const taskPath = path.join(BRAIN_DIR, 'task.md')
  const planPath = path.join(BRAIN_DIR, 'implementation_plan.md')
  const walkthroughPath = path.join(BRAIN_DIR, 'walkthrough.md')

  const taskContent = readFileIfExists(taskPath)
  const planContent = readFileIfExists(planPath)
  const walkthroughContent = readFileIfExists(walkthroughPath)

  // Determine which tab to show
  let activeTab = docType || 'task'
  if (!taskContent && planContent) activeTab = 'plan'
  if (!taskContent && !planContent && walkthroughContent) activeTab = 'walkthrough'

  // Update panel title based on active tab
  const titles: Record<string, string> = {
    task: 'Cyne Task',
    plan: 'Cyne Plan',
    walkthrough: 'Cyne Walkthrough',
  }
  currentPanel.title = titles[activeTab] || 'Cyne Brain'

  // Generate HTML
  currentPanel.webview.html = generateHtml(
    taskContent,
    planContent,
    walkthroughContent,
    activeTab
  )
}

/**
 * Read file content if it exists
 */
function readFileIfExists(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8')
    }
  } catch {
    // Ignore read errors
  }
  return null
}

/**
 * Start watching for file changes in brain directory
 */
function startFileWatcher(): void {
  ensureBrainDir()
  
  try {
    fileWatcher = fs.watch(BRAIN_DIR, (eventType, filename) => {
      if (filename?.endsWith('.md')) {
        // Debounce updates
        setTimeout(() => updateBrainContent(), 100)
      }
    })
  } catch {
    // Ignore watch errors
  }
}

/**
 * Stop file watcher
 */
function stopFileWatcher(): void {
  if (fileWatcher) {
    fileWatcher.close()
    fileWatcher = undefined
  }
}

/**
 * Write a brain document
 */
export function writeBrainDoc(
  type: 'task' | 'plan' | 'walkthrough',
  content: string
): string {
  ensureBrainDir()
  
  const filenames: Record<string, string> = {
    task: 'task.md',
    plan: 'implementation_plan.md',
    walkthrough: 'walkthrough.md',
  }
  
  const filePath = path.join(BRAIN_DIR, filenames[type])
  fs.writeFileSync(filePath, content, 'utf8')
  
  return filePath
}

/**
 * Generate the webview HTML
 */
function generateHtml(
  taskContent: string | null,
  planContent: string | null,
  walkthroughContent: string | null,
  activeTab: string
): string {
  const timestamp = new Date().toLocaleString()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cyne Brain</title>
  <style>
    :root {
      --bg-color: #1e1e1e;
      --text-color: #d4d4d4;
      --border-color: #3c3c3c;
      --tab-bg: #252526;
      --tab-active-bg: #1e1e1e;
      --accent-color: #0078d4;
      --header-bg: #252526;
      --code-bg: #2d2d2d;
      --table-border: #404040;
      --link-color: #4fc3f7;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-color);
    }
    
    .header-title {
      font-weight: 600;
      font-size: 14px;
    }
    
    .header-time {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .tabs {
      display: flex;
      background: var(--tab-bg);
      border-bottom: 1px solid var(--border-color);
    }
    
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--text-color);
      font-size: 13px;
      opacity: 0.7;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    
    .tab:hover {
      opacity: 1;
      background: rgba(255,255,255,0.05);
    }
    
    .tab.active {
      opacity: 1;
      border-bottom-color: var(--accent-color);
      background: var(--tab-active-bg);
    }
    
    .tab.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .content {
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      opacity: 0.5;
    }
    
    .empty-state h3 {
      margin-bottom: 10px;
    }
    
    /* Markdown styles */
    h1, h2, h3, h4, h5, h6 {
      color: #fff;
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    h1 { font-size: 28px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    h2 { font-size: 22px; }
    h3 { font-size: 18px; }
    
    p { margin: 16px 0; }
    
    ul, ol {
      padding-left: 24px;
      margin: 16px 0;
    }
    
    li { margin: 8px 0; }
    
    code {
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
    }
    
    pre {
      background: var(--code-bg);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 16px 0;
    }
    
    pre code {
      background: none;
      padding: 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    th, td {
      padding: 12px;
      border: 1px solid var(--table-border);
      text-align: left;
    }
    
    th {
      background: var(--code-bg);
      font-weight: 600;
    }
    
    a {
      color: var(--link-color);
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    blockquote {
      border-left: 4px solid var(--accent-color);
      margin: 16px 0;
      padding: 0 16px;
      opacity: 0.9;
    }
    
    hr {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 24px 0;
    }
    
    /* Checkbox styles */
    .checkbox {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 1px solid var(--border-color);
      border-radius: 3px;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    .checkbox.checked {
      background: var(--accent-color);
      border-color: var(--accent-color);
    }
    
    .checkbox.checked::after {
      content: '✓';
      color: white;
      font-size: 12px;
      display: block;
      text-align: center;
      line-height: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="header-title">Cyne Brain</span>
    <span class="header-time">${timestamp}</span>
  </div>
  
  <div class="tabs">
    <button class="tab ${activeTab === 'task' ? 'active' : ''} ${!taskContent ? 'disabled' : ''}" 
            onclick="showTab('task')" ${!taskContent ? 'disabled' : ''}>
      📋 Task
    </button>
    <button class="tab ${activeTab === 'plan' ? 'active' : ''} ${!planContent ? 'disabled' : ''}" 
            onclick="showTab('plan')" ${!planContent ? 'disabled' : ''}>
      📝 Plan
    </button>
    <button class="tab ${activeTab === 'walkthrough' ? 'active' : ''} ${!walkthroughContent ? 'disabled' : ''}" 
            onclick="showTab('walkthrough')" ${!walkthroughContent ? 'disabled' : ''}>
      📖 Walkthrough
    </button>
  </div>
  
  <div class="content">
    <div id="task-content" class="tab-content ${activeTab === 'task' ? 'active' : ''}">
      ${taskContent ? renderMarkdown(taskContent) : emptyState('No task defined')}
    </div>
    <div id="plan-content" class="tab-content ${activeTab === 'plan' ? 'active' : ''}">
      ${planContent ? renderMarkdown(planContent) : emptyState('No implementation plan')}
    </div>
    <div id="walkthrough-content" class="tab-content ${activeTab === 'walkthrough' ? 'active' : ''}">
      ${walkthroughContent ? renderMarkdown(walkthroughContent) : emptyState('No walkthrough yet')}
    </div>
  </div>
  
  <script>
    function showTab(tabName) {
      // Update tab buttons
      document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      event.target.classList.add('active');
      
      // Update content
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(tabName + '-content').classList.add('active');
    }
  </script>
</body>
</html>`
}

/**
 * Simple markdown to HTML conversion
 */
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Checkboxes
    .replace(/- \[x\]/g, '<li><span class="checkbox checked"></span>')
    .replace(/- \[\/\]/g, '<li><span class="checkbox" style="background:#fd0;">~</span>')
    .replace(/- \[\s?\]/g, '<li><span class="checkbox"></span>')
    // Regular list items
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((c: string) => c.trim())
      if (cells.every((c: string) => c.match(/^-+$/))) {
        return '' // Skip separator rows
      }
      const cellTag = match.includes('---') ? 'th' : 'td'
      return '<tr>' + cells.map((c: string) => `<${cellTag}>${c}</${cellTag}>`).join('') + '</tr>'
    })
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>')

  // Wrap in paragraph tags
  html = '<p>' + html + '</p>'
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p><br>/g, '<p>')
  html = html.replace(/<br><\/p>/g, '</p>')
  
  // Wrap tables
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table>$1</table>')
  
  // Fix nested tables
  html = html.replace(/<\/table><br><table>/g, '')

  return html
}

/**
 * Empty state HTML
 */
function emptyState(message: string): string {
  return `
    <div class="empty-state">
      <h3>🧠</h3>
      <p>${message}</p>
      <p>CYNE will create planning documents as needed.</p>
    </div>
  `
}

/**
 * Dispose resources
 */
export function dispose(): void {
  stopFileWatcher()
  if (currentPanel) {
    currentPanel.dispose()
    currentPanel = undefined
  }
}
