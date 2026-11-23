---
description: Review the current branch against the project rules
---
Review `git diff main...HEAD` (only the diff, not the whole repo). Check, and list findings with file:line:

1. Bugs and missed error states (loading, empty, error, lost reply).
2. Hard rules in `AGENTS.md`: docstrings/JSDoc, no em dashes, no hard-coded UI text, no `any`, no AI attribution.
3. Layering: HTTP only in `frontend/src/api`, data access only in hooks, only the backend touches the database.
4. Tests: does each new guard have a test that fails without it?
5. Dead code, unused exports, magic values that belong in `config/constants.ts`.

Fix what is clearly wrong; ask before anything that changes behavior or a decision.
