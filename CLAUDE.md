# Claude Code Configuration

## Codebase Orientation

- **What**: Expense tracking app with shared wallets (Next.js 16, TypeScript, Drizzle ORM, PostgreSQL 16)
- **Schema**: `lib/schema.ts` — canonical data model (Drizzle ORM)
- **API routes**: `app/api/` — organized by resource
- **Shared logic**: `lib/` — database, rules engine, i18n, wallet utilities
- **Components**: `components/` — React components (sidebar, modals, managers, forms)
- **Tests**: `tests/unit/` and `tests/components/` (Vitest)
- **Full docs map**: `docs/INDEX.md` — start here for detailed documentation

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

### 7. Testing Requirements - MANDATORY

**Every new feature MUST include tests. No feature is complete without tests.**

#### Rules:
- **Write tests alongside the feature**, not as a separate follow-up task
- **Every new function, API endpoint, or component** must have at least one test
- **Run `npm test` before every commit** — all tests must pass
- **A feature PR/commit without tests is incomplete** — treat it the same as code that doesn't compile

#### What to test:
- **Unit tests** (`tests/unit/`): validation schemas, utility functions, business logic, rule evaluation
- **Component tests** (`tests/components/`): React components render correctly, handle user interaction, display errors
- **API route tests** (`tests/api/`): route handlers return correct status codes, validate input, enforce auth/membership

#### Test tooling:
- Runner: Vitest (`npm test`, `npm run test:watch`, `npm run test:coverage`)
- Components: @testing-library/react + user-event
- Mocking: `vi.mock()` for external dependencies (Drizzle, auth, etc.)

#### Test granularity per feature type:
| Feature type | Minimum tests |
|---|---|
| New API endpoint | Input validation, success case, auth/permission check, error case |
| New component | Renders correctly, user interactions, error states |
| New utility/lib function | Happy path, edge cases, invalid input |
| Bug fix | Regression test that reproduces the bug |

### 8. Documentation Updates

When you change any of the following, update the corresponding doc:

| Change | Update |
|---|---|
| Add/modify Drizzle schema (`lib/schema.ts`) | `docs/architecture/data-model.md` |
| Add/modify API endpoint | `docs/architecture/api.md` |
| Change tech stack (add/remove dependency) | `docs/architecture/tech-stack.md` |
| Ship a planned feature from `docs/plans/` | Remove from `docs/plans/roadmap.md`, update `docs/INDEX.md` |
| Discover a deployment/operational lesson | Add to `docs/learnings/` |
| Change Dockerfile or deployment config | `docs/architecture/deployment.md` |

**Source of truth rule:** documentation explains *why* and provides context the code can't carry. If a doc restates *what* the code does, the code should be improved instead. When a doc conflicts with the code, the code wins — update the doc.

### 9. Quality Checks Before Each Commit

- [ ] Code runs without errors
- [ ] **All tests pass (`npm test`)**
- [ ] **New code has corresponding tests**
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