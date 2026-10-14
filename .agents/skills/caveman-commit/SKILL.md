---
name: caveman-commit
description: >
  Write a Conventional Commits message compressed to intent only. Use for
  "write a commit", "commit message", /commit or /caveman-commit.
---

Write commit messages terse and exact. Conventional Commits format. No fluff. Why over what.

## Rules

**Subject line:**
- `<type>(<scope>): <imperative summary>` - `<scope>` optional
- Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- Imperative mood: "add", "fix", "remove" - not "added", "adds", "adding"
- <=50 chars when possible, hard cap 72
- No trailing period
- Match project convention for capitalization after the colon

**Body (only if needed):**
- Skip entirely when subject is self-explanatory
- Add body only for: non-obvious *why*, breaking changes, migration notes, linked issues
- Wrap at 72 chars
- Bullets `-` not `*`
- Reference issues/PRs at end: `Closes #42`, `Refs #17`

**What NEVER goes in:**
- "This commit does X", "I", "we", "now", "currently" - the diff says what
- "As requested by..." - use Co-authored-by trailer
- "Generated with Claude Code" or any AI attribution - unless user's own rule requires an `Assisted-by`/AI-attribution trailer, then add it as a trailer
- Emoji
- Restating file name when scope already says it

## Auto-Clarity

Always include body for: breaking changes, security fixes, data migrations, anything reverting a prior commit. Never compress these into subject-only - future debuggers need context.

## Boundaries

Only generates commit message. Does not run `git commit`, does not stage files, does not amend. Output message as code block ready to paste. "stop caveman-commit" or "normal mode": revert to verbose commit style.
