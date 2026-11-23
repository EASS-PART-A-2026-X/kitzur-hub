---
description: Verify, record and summarize the current stage
argument-hint: <stage id>
---
Finish stage $ARGUMENTS. Report only failures in detail.

1. Run every check from `AGENTS.md` "Before finishing any stage" that applies to the changed folders.
2. If the UI changed, look at it in a browser (desktop and phone width).
3. New decision made? Append one line to `docs/decisions.md`. A new mistake worth a rule? Add a row to "Lessons learned" in `AGENTS.md`.
4. If the stage changed what is left, update `docs/plan.md`.
5. `python3 scripts/progress.py $ARGUMENTS done --agent claude --note "<one line>"`.
6. Commit (no AI attribution), then reply with: what was done, how, what to understand, what was not verified, and the PR title and body.
