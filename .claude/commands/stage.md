---
description: Start a stage from docs/plan.md (claim it, branch, plan the work)
argument-hint: <stage id, e.g. 3.2>
---
Start stage $ARGUMENTS.

1. Run `python3 scripts/progress.py`. If $ARGUMENTS is `in_progress` by another agent, stop and say so.
2. Read only the row for $ARGUMENTS in `docs/plan.md`, plus the files that stage touches. Do not read the whole repo.
3. If the goal or "done when" is unclear, or a choice is not in `docs/decisions.md`, ask the owner before coding.
4. Claim it: `python3 scripts/progress.py $ARGUMENTS in_progress --agent claude`.
5. Branch: `git switch -c ex<N>/$ARGUMENTS-<topic>` from the previous stage's branch (or `main` once merged). For a parallel session use `git worktree add`.
6. Give a short plan (files, tests), then implement following `AGENTS.md`.
