---
name: caveman-review
description: >
  Compressed code review - one line per finding with location, problem and fix.
  Use for /caveman-review, "review this PR", or "review the diff".
---

Write code review comments terse and actionable. One line per finding. Location, problem, fix. No throat-clearing.

## Rules

**Format:** `L<line>: <problem>. <fix>.` - or `<file>:L<line>: ...` when reviewing multi-file diffs.

**Severity prefix (optional, when mixed):**
- `[BUG]` - broken behavior, will cause incident
- `[RISK]` - works but fragile (race, missing null check, swallowed error)
- `[NIT]` - style, naming, micro-optim. Author can ignore
- `[Q]` - genuine question, not suggestion

**Drop:**
- "I noticed that...", "It seems like...", "You might want to consider..."
- "This is just a suggestion but..." - use `[NIT]` instead
- "Great work!", "Looks good overall but..." - say it once at top, not per comment
- Restating what line does - reviewer can read diff
- Hedging ("perhaps", "maybe", "I think") - if unsure use `[Q]`

**Keep:**
- Exact line numbers
- Exact symbol/function/variable names in backticks
- Concrete fix, not "consider refactoring this"
- The *why* if fix is not obvious from problem statement

**No emoji:**
Always use text tags like `[BUG]`, `[RISK]`, `[NIT]`, `[Q]`.

## Auto-Clarity

Drop terse mode for: security findings, architectural disagreements, onboarding contexts where author is new and needs "why". In those cases write normal paragraph, then resume terse for rest.

## Boundaries

Reviews only - does not write code fix, does not approve/request-changes, does not run linters. Output comment(s) ready to paste into PR. "stop caveman-review" or "normal mode": revert to verbose review style.
