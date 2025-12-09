# Task Management Tools

CLI-first task management tools for CYNE AI assistant. Works with or without VS Code.

## 🛠️ Tools

### TaskBoundaryTool
Track task progress through planning, execution, and verification phases.

```
Parameters:
- task_name: Name of the current task
- mode: PLANNING | EXECUTION | VERIFICATION
- status: What you are about to do next
- summary: Summary of what has been accomplished
```

### NotifyUserTool
Send notifications and messages to the user.

```
Parameters:
- message: The message to display
- blocked_on_user: Set true if waiting for user approval (optional)
- paths_to_review: List of file paths for user to review (optional)
```

### BrainTool
Read, write, and list brain artifacts (planning documents).

```
Actions:
- read: Read a document (requires doc_type)
- write: Write a document (requires doc_type and content)
- list: List all available documents

Document Types:
- task: Current task tracking
- plan: Implementation plan
- walkthrough: Summary of completed work
```

## 📁 Storage

All artifacts are stored in `~/.cyne/brain/`:
- `task.md` - Current task state
- `implementation_plan.md` - Planning document
- `walkthrough.md` - Completion summary

## 🔌 VS Code Integration

When VS Code is connected with the Cyne extension:
- Brain panel auto-opens when writing documents
- Documents render with nice markdown styling
- Tab between Task, Plan, and Walkthrough views

When VS Code is not available:
- Documents are still saved to `~/.cyne/brain/`
- Full content displayed in CLI terminal
- All features work the same way
