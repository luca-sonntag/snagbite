---
name: atomic-commits
description: Use in every coding session to ensure work is committed incrementally in small, logically cohesive atomic commits. Trigger automatically at the start of every session and after completing each logical change unit.
---

# Atomic Commits

Commit early, commit often. Every change you make must be bundled into small, logically self-contained commits that each represent exactly one coherent idea.

## Core Rules

1. **One commit per logical change.** Each commit must be reviewable in isolation and leave the project in a working state. Do not batch unrelated changes together.
2. **Commit after every completed task.** As soon as you finish a discrete unit of work (a feature, a fix, a refactor, a file addition), stage and commit it immediately — before moving on to the next task.
3. **Write meaningful commit messages.** Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` — new feature
   - `fix:` — bug fix
   - `refactor:` — code restructuring without behavior change
   - `style:` — formatting, whitespace, semicolons (no logic change)
   - `docs:` — documentation only
   - `chore:` — build, tooling, dependencies
   - `test:` — adding or updating tests
   - Message in English, lowercase, imperative mood. No period at the end.
   - Use the form `feat(scope): description` when a scope is relevant.

4. **Stage selectively.** Use `git add <specific files>` — never `git add -A` or `git add .` blindly. Only stage files directly related to the current logical change.
5. **Verify before committing.** Run `git diff --cached --stat` to review what's about to be committed. If the diff spans unrelated topics, split it into multiple commits.
6. **No unauthorized push / remote actions.** Never push commits or perform actions on `origin` / remotes unless the user explicitly requests or allows it. Commit locally and leave remote actions to the user unless instructed otherwise.

## Workflow Example

```
feat: add user authentication middleware
feat: create login route with JWT verification
feat: add database schema for user accounts
docs: document auth API endpoints
fix: handle expired token edge case
refactor: extract token validation into helper
```

## Atomic Boundaries

Good atomic commit boundaries include:
- Adding a single file
- Completing a single function or component
- Fixing one bug
- Updating one section of documentation
- Running `npm install` after adding a dependency (separate commit for lockfile changes)
- Updating types/interfaces only (no implementation)

**Anti-patterns — never do this:**
- One giant commit with 20 changed files across 5 unrelated features
- Committing halfway through a feature (broken state)
- Mixing whitespace/formatting changes with logic changes
- Mixing auto-generated files with hand-written code in the same commit

## Checklist Before Each Commit

- [ ] Does this commit represent exactly one logical idea?
- [ ] Will `git show` tell a coherent story?
- [ ] Does the project still build / work after this commit?
- [ ] Are all related files included (types, tests, docs)?
- [ ] Are unrelated files excluded from staging?

## Keep AGENTS.md in Sync

After every relevant code change (new feature, new concept, new technology, architecture change, refactoring, new component, new hook, new convention), check whether `AGENTS.md` needs to be updated to reflect the change. This file is the project's central knowledge document and must always present a complete, up-to-date picture of:

- All important features and their implementation details
- Technologies and libraries in use
- Architecture decisions and patterns
- Key concepts and conventions
- Component and module inventory

When updating `AGENTS.md`, follow the existing structure and level of detail. If a topic area is missing, create a new section. Commit documentation updates as a separate atomic commit (`docs:`) — never mix doc changes with code changes in the same commit.
