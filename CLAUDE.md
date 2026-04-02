# Claude Code Configuration

## Core Requirements

### 1. Commit Strategy - CRITICAL
**You MUST make frequent, granular commits throughout each session.**

- **Commit after EVERY completed todo item** - Each task completion warrants its own commit
- **Never batch multiple changes** into a single commit
- **Commit even small changes** like fixing a typo, adding a comment, or renaming a variable
- **Use descriptive commit messages** that match the granularity of the change

#### Commit Triggers (commit immediately after):
- Completing any item from your todo list
- Adding a new function or method
- Modifying existing functionality
- Adding or updating tests
- Fixing a bug
- Refactoring code
- Updating documentation
- Adding or modifying configuration
- Creating new files
- Deleting files

#### Commit Message Format:
```
<type>(<scope>): <description>

[optional body]

Todo: <completed todo item>
```

Types: feat, fix, refactor, test, docs, style, chore, config

### 2. Comprehensive Logging System - MANDATORY

**You MUST maintain two separate log files in the `.claude/` directory:**

#### A. Development Log: `.claude/development-log.md`
Update this log IMMEDIATELY after every code change or commit.

```markdown
# Development Log

## Session: [DATE TIME]

### Todo List:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Changes:

#### [TIME] - <Todo Item or Change Description>
**Commit**: `<commit hash>` - `<commit message>`
**Files Modified**: 
- `path/to/file1.js` - Description of changes
- `path/to/file2.js` - Description of changes

**Details**:
- What was implemented/changed
- Why this approach was chosen
- Any architectural decisions made
- Dependencies added/removed

**Code Snippet** (if significant):
```<language>
// Key code changes
```

---
```

#### B. Debugging Log: `.claude/debugging-log.md`
Update this log whenever debugging or investigating issues.

```markdown
# Debugging Log

## Session: [DATE TIME]

### Issue: [Brief description]

#### [TIME] - Investigation Started
**Symptoms**: 
- What is happening
- Error messages
- Unexpected behavior

**Hypothesis**: Initial thoughts on the cause

#### [TIME] - Debugging Steps
1. **Action**: What you tried
   **Result**: What happened
   **Learning**: What this tells us

2. **Action**: Next debugging step
   **Result**: Outcome
   **Learning**: New insights

#### [TIME] - Root Cause Identified
**Cause**: Detailed explanation of the issue
**File(s)**: `path/to/problematic/file.js`
**Line(s)**: Lines 45-52

#### [TIME] - Fix Applied
**Solution**: How the issue was fixed
**Commit**: `<commit hash>` - `fix(<scope>): <description>`
**Verification**: How you confirmed the fix works

#### [TIME] - Post-Mortem
**Lessons Learned**: 
- What could prevent this in the future
- Any systemic improvements needed

---
```

### 3. Log Management Rules

1. **Create logs if they don't exist** - Check for `.claude/` directory and create it if needed
2. **Append, don't overwrite** - Always add new entries to the bottom
3. **Use timestamps** - Include time for each entry (HH:MM format)
4. **Be detailed but concise** - Capture enough context for future reference
5. **Include code snippets** for significant changes
6. **Cross-reference** - Include commit hashes in logs, reference log entries in commits

### 4. Example Workflow

```bash
# 1. Start session - Create/update todo list in development log
# 2. Work on first todo item
# 3. Complete todo item
# 4. IMMEDIATELY: 
   - Make a commit
   - Update development log with changes
# 5. Move to next todo item
# 6. If bug encountered:
   - Switch to debugging log
   - Document investigation process
   - Once fixed, commit and update both logs
```

### 5. Commit Examples Following Todo Granularity

If your todo list looks like:
- [ ] Add user authentication middleware
- [ ] Create login endpoint
- [ ] Add input validation for login
- [ ] Write tests for login endpoint
- [ ] Update API documentation

You should have 5 separate commits:
1. `feat(auth): add user authentication middleware`
2. `feat(auth): create login endpoint`
3. `feat(auth): add input validation for login`
4. `test(auth): add tests for login endpoint`
5. `docs(api): update documentation for login endpoint`

### 6. Emergency Debugging Protocol

When encountering a critical bug:
1. **DON'T PANIC** - Open debugging log immediately
2. **Document the symptom** before investigating
3. **Make hypothesis** before making changes
4. **Test incrementally** - Commit working states even during debugging
5. **Log every attempt** - Failed attempts are valuable information

### 7. Quality Checks Before Each Commit

- [ ] Code runs without errors
- [ ] Tests pass (if applicable)
- [ ] Log entry prepared
- [ ] Commit message matches the granularity of change
- [ ] No debugging code left in (console.logs, etc.)

## Remember:
- **Commits are cheap, lost work is expensive**
- **Future you will thank current you for detailed logs**
- **Each commit should represent one logical change**
- **Logs are your safety net and knowledge base**

## Log File Templates

### Initial Development Log Template
```markdown
# Development Log

Project: [Project Name]
Started: [Date]

## Session Guidelines
- Each session starts with a todo list
- Each completed todo gets a commit
- Each commit gets a log entry
- No exceptions to the above rules

---

## Session: [DATE TIME]

### Todo List:
- [ ] 
- [ ] 
- [ ] 

### Changes:

---
```

### Initial Debugging Log Template
```markdown
# Debugging Log

Project: [Project Name]
Purpose: Track all debugging sessions and their resolutions

## Debugging Protocol
1. Document symptoms first
2. Form hypothesis before acting
3. Log every debugging action
4. Document the fix and verification
5. Include lessons learned

---

## Session: [DATE TIME]

---
```