#!/usr/bin/env python3

"""
VS Code Integration Tools
Enhanced VS Code tools with Rich formatting, permission management, and availability checks
"""

import json
import requests
import subprocess
import socket
from typing import Optional
from langchain_core.tools import tool
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.syntax import Syntax

from src.security.permission_manager import permission_manager, PermissionType

# Configuration
VSCODE_HTTP_URL = "http://localhost:8090"
HEADERS = {
    'User-Agent': 'Nutaan-Agent/1.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

# Initialize Rich console
console = Console()

class VSCodeAvailabilityError(Exception):
    """Exception raised when VS Code is not available."""
    pass

def check_code_command() -> bool:
    """Check if 'code' command is available."""
    try:
        result = subprocess.run(
            ['code', '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False

def check_vscode_api() -> bool:
    """Check if VS Code extension API is running on localhost:8090."""
    try:
        # Try to connect to the API endpoint
        response = requests.get(
            f'{VSCODE_HTTP_URL}/health', 
            timeout=3
        )
        return response.status_code == 200
    except:
        # Fallback: check if port is open
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('localhost', 8090))
            sock.close()
            return result == 0
        except:
            return False

def check_vscode_availability() -> tuple[bool, str]:
    """
    Check if VS Code and its extension API are available.
    
    Returns:
        tuple: (is_available, status_message)
    """
    code_available = check_code_command()
    api_available = check_vscode_api()
    
    if not code_available and not api_available:
        return False, "❌ VS Code command not found and API not accessible on localhost:8090"
    elif not code_available:
        return False, "❌ VS Code command not found (install VS Code and ensure 'code' is in PATH)"
    elif not api_available:
        return False, "❌ VS Code extension API not accessible on localhost:8090"
    else:
        return True, "✅ VS Code is available and connected"

def ensure_vscode_available():
    """Ensure VS Code is available, raise exception if not."""
    is_available, message = check_vscode_availability()
    if not is_available:
        raise VSCodeAvailabilityError(message)

def display_rich_error(error_msg: str) -> str:
    """Display error message with Rich formatting."""
    console.print(Panel(
        f"[red]{error_msg}[/red]",
        title="[red]VS Code Error[/red]",
        border_style="red"
    ))
    return error_msg

def display_rich_success(success_msg: str) -> str:
    """Display success message with Rich formatting."""
    console.print(Panel(
        f"[green]{success_msg}[/green]",
        title="[green]VS Code Success[/green]", 
        border_style="green"
    ))
    return success_msg


@tool
def vscode_get_context() -> str:
    """Get the current VS Code editor context including active file, selection, workspace, and open tabs.
    
    Note: Only works when VS Code is installed and extension API is running on localhost:8090.
    """
    try:
        ensure_vscode_available()
        
        response = requests.get(f"{VSCODE_HTTP_URL}/context", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            context = response.json()
            
            # Create rich formatted output
            context_info = f"""[bold cyan]VS Code Context:[/bold cyan]
[bold]Active File:[/bold] {context.get('activeFile', 'None')}
[bold]Language:[/bold] {context.get('language', 'Unknown')}
[bold]Workspace:[/bold] {context.get('workspace', 'None')}
[bold]Selection:[/bold] {context.get('selection', {}).get('text', 'No selection')}
[bold]Open Tabs:[/bold] {len(context.get('openTabs', []))} tabs"""
            
            console.print(Panel(context_info, title="[cyan]VS Code Context[/cyan]", border_style="cyan"))
            return context_info
        else:
            error_msg = f"Error getting VS Code context: HTTP {response.status_code}"
            return display_rich_error(error_msg)
            
    except VSCodeAvailabilityError as e:
        return display_rich_error(str(e))
    except Exception as e:
        error_msg = f"Error getting VS Code context: {str(e)}"
        return display_rich_error(error_msg)


@tool  
def vscode_get_selection() -> str:
    """Get detailed context of the current selection in VS Code, including surrounding lines with line numbers.
    
    Note: Only works when VS Code is installed and extension API is running on localhost:8090.
    """
    try:
        ensure_vscode_available()
        
        response = requests.get(f"{VSCODE_HTTP_URL}/selection-context", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            context = response.json()
            
            if not context.get('hasActiveEditor', False):
                return display_rich_error("No active editor in VS Code")
            
            selection = context.get('selection', {})
            file_info = context.get('activeFile', 'Unknown file')
            language = context.get('language', 'Unknown')
            context_info = context.get('context', {})
            
            # Rich formatted selection info
            selection_text = f"""[bold]File:[/bold] {file_info}
[bold]Language:[/bold] {language}
[bold]Total Lines:[/bold] {context_info.get('totalLines', 'Unknown')}
[bold]Selection Lines:[/bold] {selection.get('startLine', 'Unknown')} to {selection.get('endLine', 'Unknown')}
[bold]Columns:[/bold] {selection.get('startColumn', 'Unknown')} to {selection.get('endColumn', 'Unknown')}"""

            console.print(Panel(selection_text, title="[yellow]Selection Info[/yellow]", border_style="yellow"))
            
            # Show selected text with syntax highlighting
            selected_text = selection.get('text', 'No selection')
            if selected_text != 'No selection':
                try:
                    syntax = Syntax(selected_text, language.lower(), theme="monokai", line_numbers=True)
                    console.print(Panel(syntax, title="[green]Selected Code[/green]", border_style="green"))
                except:
                    console.print(Panel(selected_text, title="[green]Selected Text[/green]", border_style="green"))
            
            # Show context lines
            lines = context_info.get('lines', [])
            if lines:
                context_display = ""
                for line_info in lines:
                    line_num = line_info.get('lineNumber', 0)
                    content = line_info.get('content', '')
                    is_selected = line_info.get('isSelected', False)
                    
                    if is_selected:
                        context_display += f"[bold yellow]→ {line_num:3d}:[/bold yellow] {content}\n"
                    else:
                        context_display += f"   {line_num:3d}: {content}\n"
                
                console.print(Panel(context_display, title="[blue]Context Lines[/blue]", border_style="blue"))
            
            return "VS Code selection context displayed above"
        else:
            error_msg = f"Error getting selection context: HTTP {response.status_code}"
            return display_rich_error(error_msg)
            
    except VSCodeAvailabilityError as e:
        return display_rich_error(str(e))
    except Exception as e:
        error_msg = f"Error getting selection context: {str(e)}"
        return display_rich_error(error_msg)


@tool
def vscode_list_files(pattern: str = "**/*") -> str:
    """List files in the VS Code workspace matching a glob pattern.
    
    Args:
        pattern: Glob pattern to match files (e.g., '**/*.py' for Python files)
        
    Note: Only works when VS Code is installed and extension API is running on localhost:8090.
    """
    try:
        ensure_vscode_available()
        
        response = requests.get(
            f"{VSCODE_HTTP_URL}/workspace/files",
            params={"pattern": pattern},
            headers=HEADERS,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            files = data.get('files', [])
            total = data.get('total', 0)
            
            if total == 0:
                return display_rich_error(f"No files found matching pattern '{pattern}'")
            
            # Limit display to first 50 files
            if total > 50:
                files_display = files[:50]
                truncated_msg = f"\n[dim]... and {total - 50} more files[/dim]"
            else:
                files_display = files
                truncated_msg = ""
                
            files_list = "\n".join([f"{i+1:2d}. {file}" for i, file in enumerate(files_display)])
            
            files_info = f"[bold]Pattern:[/bold] {pattern}\n[bold]Total Found:[/bold] {total}\n\n{files_list}{truncated_msg}"
            console.print(Panel(files_info, title="[cyan]Workspace Files[/cyan]", border_style="cyan"))
            
            return f"Found {total} files matching pattern '{pattern}' (displayed in panel above)"
        else:
            error_msg = f"Error listing workspace files: HTTP {response.status_code}"
            return display_rich_error(error_msg)
            
    except VSCodeAvailabilityError as e:
        return display_rich_error(str(e))
    except Exception as e:
        error_msg = f"Error listing workspace files: {str(e)}"
        return display_rich_error(error_msg)


@tool
def vscode_read_file(file_path: str, start_line: int = 1, end_line: Optional[int] = None) -> str:
    """Read content from a file in the VS Code workspace.
    
    Args:
        file_path: Relative path to the file
        start_line: Starting line number (1-based)
        end_line: Ending line number (1-based, optional)
        
    Note: Only works when VS Code is installed and extension API is running on localhost:8090.
    """
    try:
        ensure_vscode_available()
        
        # Check permission for file read
        if not permission_manager.get_permission(
            PermissionType.FILE_OPERATIONS, 
            f"Read file: {file_path}"
        ):
            return display_rich_error("Permission denied for file read operation")
        
        params = {"path": file_path, "startLine": start_line}
        if end_line is not None:
            params["endLine"] = end_line
            
        response = requests.get(
            f"{VSCODE_HTTP_URL}/file/read",
            params=params,
            headers=HEADERS,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            content = data.get('content', 'No content')
            
            # Display with syntax highlighting
            try:
                file_ext = file_path.split('.')[-1] if '.' in file_path else 'txt'
                syntax = Syntax(content, file_ext, theme="monokai", line_numbers=True)
                console.print(Panel(syntax, title=f"[green]{file_path}[/green]", border_style="green"))
            except:
                console.print(Panel(content, title=f"[green]{file_path}[/green]", border_style="green"))
            
            return f"File content for {file_path} displayed above"
        else:
            error_msg = f"Error reading file {file_path}: HTTP {response.status_code}"
            return display_rich_error(error_msg)
            
    except VSCodeAvailabilityError as e:
        return display_rich_error(str(e))
    except Exception as e:
        error_msg = f"Error reading file {file_path}: {str(e)}"
        return display_rich_error(error_msg)


@tool
def vscode_create_file(filename: str, content: str) -> str:
    """Create a new file with the specified content in VS Code workspace.
    
    Args:
        filename: Name/path of the file to create (e.g., 'test.py' or 'folder/test.py')
        content: Content to write to the file
        
    Note: Only works when VS Code is installed and extension API is running on localhost:8090.
    """
    try:
        ensure_vscode_available()
        
        # Check permission for file creation
        if not permission_manager.get_permission(
            PermissionType.FILE_WRITE, 
            f"Create file: {filename}"
        ):
            return display_rich_error("Permission denied for file creation")
        
        # Show content preview
        try:
            file_ext = filename.split('.')[-1] if '.' in filename else 'txt'
            syntax = Syntax(content, file_ext, theme="monokai", line_numbers=True)
            console.print(Panel(
                syntax, 
                title=f"[yellow]Preview: {filename}[/yellow]",
                border_style="yellow"
            ))
        except:
            console.print(Panel(
                content,
                title=f"[yellow]Preview: {filename}[/yellow]", 
                border_style="yellow"
            ))
        
        # Try to show preview in VS Code
        try:
            preview_response = requests.get(
                f"{VSCODE_HTTP_URL}/preview",
                params={
                    "title": f"📄 New file: {filename}",
                    "filename": filename,
                    "content": content
                },
                headers=HEADERS,
                timeout=10
            )
        except:
            pass  # Preview is optional
        
        # Create the file
        response = requests.post(
            f"{VSCODE_HTTP_URL}/file/create",
            json={"path": filename, "content": content},
            headers=HEADERS,
            timeout=10
        )
        
        if response.status_code == 200:
            success_msg = f"Successfully created file: {filename}"
            return display_rich_success(success_msg)
        else:
            data = response.json()
            error_msg = f"Error creating file {filename}: {data.get('error', 'Unknown error')}"
            return display_rich_error(error_msg)
            
    except VSCodeAvailabilityError as e:
        return display_rich_error(str(e))
    except Exception as e:
        error_msg = f"Error creating file {filename}: {str(e)}"
        return display_rich_error(error_msg)


@tool
def vscode_edit_file(filename: str, old_text: str, new_text: str) -> str:
    """Edit an existing file by replacing old text with new text in VS Code workspace.
    
    Args:
        filename: Name/path of the file to edit (e.g., 'test.py' or 'folder/test.py')
        old_text: Text to replace (must match exactly)
        new_text: New text to replace with
        
    Note: Only works when VS Code is installed and extension API is running on localhost:8090.
    """
    try:
        ensure_vscode_available()
        
        # Check permission for file editing
        if not permission_manager.get_permission(
            PermissionType.FILE_WRITE,
            f"Edit file: {filename}"
        ):
            return display_rich_error("Permission denied for file edit operation")
        
        # Show diff preview in console
        console.print(Panel(
            f"[bold]File:[/bold] {filename}\n[bold red]- Old text:[/bold red]\n{old_text}\n\n[bold green]+ New text:[/bold green]\n{new_text}",
            title="[yellow]Proposed Changes[/yellow]",
            border_style="yellow"
        ))
        
        # Try to show diff in VS Code
        try:
            diff_response = requests.get(
                f"{VSCODE_HTTP_URL}/diff",
                params={
                    "left": f"{filename} (original)",
                    "right": f"{filename} (proposed)",
                    "title": f"Edit file: {filename}",
                    "leftContent": old_text,
                    "rightContent": new_text
                },
                headers=HEADERS,
                timeout=10
            )
        except:
            pass  # Diff preview is optional

        # Perform the edit
        response = requests.post(
            f"{VSCODE_HTTP_URL}/file/edit",
            json={
                "path": filename,
                "oldContent": old_text,
                "newContent": new_text
            },
            headers=HEADERS,
            timeout=10
        )
        
        if response.status_code == 200:
            success_msg = f"Successfully edited file: {filename}"
            return display_rich_success(success_msg)
        else:
            data = response.json()
            error_msg = f"Error editing file {filename}: {data.get('error', 'Unknown error')}"
            return display_rich_error(error_msg)
            
    except VSCodeAvailabilityError as e:
        return display_rich_error(str(e))
    except Exception as e:
        error_msg = f"Error editing file {filename}: {str(e)}"
        return display_rich_error(error_msg)


@tool
def vscode_health_check() -> str:
    """Check VS Code availability and connection status.
    
    Returns information about VS Code command availability and extension API status.
    """
    code_available = check_code_command()
    api_available = check_vscode_api()
    
    status_info = f"""[bold cyan]VS Code Health Check:[/bold cyan]

[bold]Code Command:[/bold] {'✅ Available' if code_available else '❌ Not found'}
[bold]Extension API (localhost:8090):[/bold] {'✅ Connected' if api_available else '❌ Not accessible'}
[bold]Overall Status:[/bold] {'✅ Ready' if (code_available and api_available) else '❌ Not ready'}"""
    
    if code_available and api_available:
        console.print(Panel(status_info, title="[green]VS Code Health[/green]", border_style="green"))
        return "VS Code is available and ready for use"
    else:
        console.print(Panel(status_info, title="[red]VS Code Health[/red]", border_style="red"))
        
        help_text = "\n[dim]To use VS Code tools:[/dim]\n"
        if not code_available:
            help_text += "- Install VS Code and ensure 'code' command is in PATH\n"
        if not api_available:
            help_text += "- Start VS Code extension API on localhost:8090\n"
            
        console.print(help_text)
        return "VS Code is not available - see requirements above"


# Export all tools
VSCODE_TOOLS = [
    vscode_health_check,
    vscode_get_context,
    vscode_get_selection, 
    vscode_list_files,
    vscode_read_file,
    vscode_create_file,
    vscode_edit_file
]
