---
name: debug-protocol
description: House protocol for handling any bug, error, or unexpected behavior in Axis. Use when Shaafi reports an issue, a test fails, CI breaks, or runtime errors appear. Root cause first — never patch symptoms.
---

# Debug Protocol — Root Cause or Nothing

Core rule: **never ship a fix you can't explain.** If you can't state the root cause in one sentence, you're not done investigating.

## The loop

1. **Reproduce.** Get the exact failure in front of you — run the test, hit the endpoint, load the page. Capture the exact error string. If you can't reproduce, that IS the investigation (environment diff, data diff, race).
2. **Gather evidence.** Exact error text, stack trace, logs, the commit where it last worked (`git log`, `git bisect` when useful). Quote errors exactly — never paraphrase an error message.
3. **Research before guessing.** Two directions, do both when nontrivial:
   - **Online**: search the exact error string, library GitHub issues, official docs for the versions we run (check package.json — don't debug against docs for a different major version).
   - **Code**: read the full call path, not just the line that threw. Follow data from entry (resolver/controller) to exit (DB/response). The bug is often upstream of the symptom.
4. **State the root cause.** One sentence: "X happens because Y." If there are two plausible causes, prove which one with a log/test before fixing.
5. **Clarify if it's a product decision.** Technical root cause = fix it. Ambiguous intended behavior (e.g., "should TAs see draft grades?") = ask Shaafi, short question, options ranked.
6. **Fix the cause, smallest correct change.** No band-aids that mask the symptom (no try/catch-and-ignore, no `?? fallback` hiding a null that shouldn't exist, no retry loop over a logic error).
7. **Test.** Write a regression test that fails before the fix and passes after. Run the affected flow end-to-end, not just the unit test. Run `pnpm typecheck` + relevant test suite.
8. **Ship per branch strategy.** Meaningful fix → branch → PR using the `pr-description` skill (PR body includes root cause). Trivial reviewed fix → direct to main per CLAUDE.md.
9. **Update docs.** If the bug came from a wrong assumption a doc encouraged (CLAUDE.md, ARCHITECTURE.md, DATA-MODEL.md), fix the doc in the same PR. If it's a lesson worth keeping, note it in `.claude/session-log.md`.

## Anti-patterns (hard no)

- Changing code "to see if it helps" without a hypothesis
- Fixing the test instead of the code (unless the test is provably wrong — then say so in the PR)
- Suppressing TypeScript/lint errors to make the symptom disappear
- Declaring fixed without re-running the original reproduction
