export const PROMPT = `Create or overwrite a file in the local filesystem. This operation will replace any existing file at the specified path with the new content.

Essential considerations:

1. Content Analysis: Use ReadFile tool to understand existing file structure and context before modifications

2. Directory Structure (for new files):
   - Verify parent directory location using LS tool to ensure proper file placement

The file_path parameter must be an absolute path. Parent directories are created automatically as needed.

Use cases:
- Creating new files from scratch
- Complete file content replacement  
- Configuration file generation
- Template or boilerplate creation

For partial edits, consider file modification tools to preserve existing content.`

export const DESCRIPTION = 'Write a file to the local filesystem.'
