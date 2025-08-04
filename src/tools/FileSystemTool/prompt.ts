import { NotebookReadTool } from '../NotebookReadTool/NotebookReadTool'

const MAX_LINES_TO_READ = 2000
const MAX_LINE_LENGTH = 2000

export const DESCRIPTION = 'Unified filesystem operations: read files, write files, and list directories.'

export const PROMPT = `Performs filesystem operations including reading files, writing files, and listing directories.

**Read Operation:**
Reads a file from the local filesystem. The file_path parameter must be an absolute path, not a relative path. By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated. For image files, the tool will display the image for you. For Jupyter notebooks (.ipynb files), use the ${NotebookReadTool.name} instead.

**Write Operation:**
Create or overwrite a file in the local filesystem. This operation will replace any existing file at the specified path with the new content.

Essential considerations:

1. Content Analysis: Use the read operation to understand existing file structure and context before modifications

2. Directory Structure (for new files):
   - Verify parent directory location using list operation to ensure proper file placement

The file_path parameter must be an absolute path. Parent directories are created automatically as needed.

Use cases:
- Creating new files from scratch
- Complete file content replacement  
- Configuration file generation
- Template or boilerplate creation

For partial edits, consider file modification tools to preserve existing content.

**List Operation:**
Lists files and directories in a given path. The path parameter must be an absolute path, not a relative path. You should generally prefer the Glob and Grep tools, if you know which directories to search.`
