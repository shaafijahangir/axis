---
name: pr-description
description: House standard for writing pull request titles and descriptions. Use whenever creating a PR (gh pr create), editing a PR body, or reviewing whether a PR is ready. Every Axis PR follows this format.
---

# PR Description Standard

The title tells the reviewer **what** changed. The description tells them **why** and **how**. Write for a reviewer who has NOT seen the conversation that led to this PR — they only have the diff and this description.

## Title

- Conventional commit style with scope: `feat(backend): office-hours booking (FEAT-018)`
- Imperative, specific, ≤ 70 chars. It's the email subject line of the diff.
- Include the backlog ID when one exists.

## Body template

```markdown
## Summary
2-4 sentences: what this PR does and why it was needed. Lead with the user-visible outcome, not the code.

## Context
- Problem or backlog item this solves (link BACKLOG.md ID, issue, or conversation decision)
- Anything the reviewer must know before reading the diff (design decision, constraint, rejected alternative)

## Changes
Grouped by area, not file-by-file:
- **Backend**: entities/services/resolvers added or changed
- **Frontend**: pages/components added or changed
- **Infra/config**: migrations, env vars, dependencies

## Testing
- What was run: unit tests (count), E2E, manual flows walked
- What was NOT tested and why (be honest — reviewers trust honest gaps more than silence)
- Steps for the reviewer to verify locally

## Impact / Risks
- Migrations? Breaking API changes? New env vars? Security-relevant surface?
- "None" is a valid answer — say it explicitly rather than omitting the section.

## Backlog
Closes FEAT-xxx / Refs SEC-xxx
```

## Rules

1. **Description must match the diff.** No aspirational claims. If a checkbox isn't done, leave it unchecked or delete it.
2. **Honest testing section.** "Typecheck only, not run locally" is acceptable; claiming tested when not is never acceptable.
3. **Non-obvious decisions get a WHY line.** If you chose pessimistic locking, a JSONB field, or a denormalized column — one sentence on why.
4. **Small PRs preferred.** If the description needs more than ~6 Changes bullets, consider splitting.
5. **Screenshots for UI changes.** Before/after when modifying existing UI.
6. Keep `.github/pull_request_template.md` in sync with this skill if the format evolves.

Sources this standard is distilled from: Graphite PR description guide, HackerOne "Writing a Great Pull Request Description", Azure DevOps PR template docs.
