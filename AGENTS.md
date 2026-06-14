## Read Before Anything Else

Read in this exact order before any implementation:

1. context/project-overview.md
2. context/architecture.md
3. context/ui-tokens.md
4. context/ui-rules.md
5. context/ui-registry.md
6. context/code-standards.md
7. context/library-docs.md
8. context/build-plan.md
9. context/progress-tracker.md

## Rules That Never Change

- Never use hardcoded hex values or raw Tailwind color classes
- Update `progress-tracker.md` and `ui-registry.md` after every feature
- Before any third party library — load its installed skill first,
  then read `context/library-docs.md` for project-specific rules
- If the same problem persists after one corrective prompt —
  stop immediately and run /recover

## Invariants — Never Violate These

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in agent/ never imports from components/ or actions/
- Server Actions never call agent functions — only API routes call agent functions
- All InsForge DB writes from the agent go through lib/insforge-server.ts only
- Easy Apply is never touched — external apply URLs only
- Every Stagehand act() call is wrapped in try/catch
- Match threshold always comes from MATCH_THRESHOLD in `lib/utils.ts`
- AgentSpan step IDs always use format apply-{job_id}

## Available Skills

- `/architect` — before any complex feature. Think before building.
- `/imprint` — after any new UI component. Capture patterns.
- `/review` — before demo or when something feels off.
- `/recover` — when something breaks after one failed correction.
- `/remember save` — when a feature spans multiple sessions.
- `/remember restore` — when returning after a multi-session feature.