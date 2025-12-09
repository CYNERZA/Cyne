/**
 * Diagnostics operation handlers
 */

import * as vscode from 'vscode'

/**
 * Get diagnostics (errors, warnings, etc.)
 */
export async function handleDiagnosticsGet(params: {
  path?: string
  severity?: 'error' | 'warning' | 'info' | 'hint'
}): Promise<{
  diagnostics: Array<{
    file: string
    line: number
    column: number
    endLine: number
    endColumn: number
    severity: string
    message: string
    source?: string
    code?: string
  }>
}> {
  const result: Array<{
    file: string
    line: number
    column: number
    endLine: number
    endColumn: number
    severity: string
    message: string
    source?: string
    code?: string
  }> = []

  const severityMap: Record<string, vscode.DiagnosticSeverity> = {
    error: vscode.DiagnosticSeverity.Error,
    warning: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information,
    hint: vscode.DiagnosticSeverity.Hint,
  }

  const severityNames: Record<vscode.DiagnosticSeverity, string> = {
    [vscode.DiagnosticSeverity.Error]: 'error',
    [vscode.DiagnosticSeverity.Warning]: 'warning',
    [vscode.DiagnosticSeverity.Information]: 'info',
    [vscode.DiagnosticSeverity.Hint]: 'hint',
  }

  const targetSeverity = params.severity
    ? severityMap[params.severity]
    : undefined

  let diagnosticEntries: [vscode.Uri, readonly vscode.Diagnostic[]][]

  if (params.path) {
    const uri = vscode.Uri.file(params.path)
    const diags = vscode.languages.getDiagnostics(uri)
    diagnosticEntries = [[uri, diags]]
  } else {
    diagnosticEntries = vscode.languages.getDiagnostics()
  }

  for (const [uri, diagnostics] of diagnosticEntries) {
    for (const diag of diagnostics) {
      if (targetSeverity !== undefined && diag.severity !== targetSeverity) {
        continue
      }

      result.push({
        file: vscode.workspace.asRelativePath(uri),
        line: diag.range.start.line + 1,
        column: diag.range.start.character + 1,
        endLine: diag.range.end.line + 1,
        endColumn: diag.range.end.character + 1,
        severity: severityNames[diag.severity],
        message: diag.message,
        source: diag.source,
        code: diag.code
          ? typeof diag.code === 'object'
            ? String(diag.code.value)
            : String(diag.code)
          : undefined,
      })
    }
  }

  return { diagnostics: result }
}
