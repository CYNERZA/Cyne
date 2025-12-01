#!/bin/bash

# Production wrapper script for CYNE
# Uses the reliable development mode instead of the problematic bundled version

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project directory
cd "$PROJECT_ROOT"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Use the development mode which is fully functional
exec npx tsx ./src/entrypoints/cli.tsx "$@"