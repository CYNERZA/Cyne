/**
 * JSON-RPC 2.0 Protocol Types
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: any
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: any
  error?: JsonRpcError
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

export interface JsonRpcError {
  code: number
  message: string
  data?: any
}

// Standard JSON-RPC error codes
export const ErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  // Custom codes
  FileNotFound: -32001,
  PermissionDenied: -32002,
  EditorNotOpen: -32003,
} as const

export type RpcHandler = (params: any) => Promise<any>

export function createResponse(id: number | string, result: any): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  }
}

export function createErrorResponse(
  id: number | string,
  code: number,
  message: string,
  data?: any
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, data },
  }
}

export function parseRequest(data: string): JsonRpcRequest | null {
  try {
    const parsed = JSON.parse(data)
    if (
      parsed.jsonrpc === '2.0' &&
      typeof parsed.method === 'string' &&
      (parsed.id !== undefined || parsed.id === null)
    ) {
      return parsed as JsonRpcRequest
    }
    return null
  } catch {
    return null
  }
}
