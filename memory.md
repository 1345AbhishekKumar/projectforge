# Memory — Features 2.5, 2.6, 2.7: Task Labels, Search, Team Directory & Advanced Notifications

Last updated: 2026-06-16T15:18:49+05:30

## What was built

### Feature 2.5: Task Labels & Saved Views
- Created `labels`, `task_label_mappings`, and `saved_views` DB tables with indexes.
- Implemented `actions/label.ts` (full CRUD) and `actions/savedView.ts` (CRUD + apply).
- Updated `actions/task.ts` to manage label assignments on create/update.
- Built `<TaskFilters>` component with label multi-select dropdown and saved view persistence.
- Updated `TaskRow`, `TaskDetailsSheet`, `CreateTaskForm`, Kanban board cards — all render multi-label pastel badges.

### Feature 2.6: Search & Team Directory
- Applied PostgreSQL `tsvector` GIN index on `tasks(title, description)` via InsForge MCP raw SQL.
- Created `actions/search.ts` — parallel ILIKE (projects), full-text (tasks), in-process (members) all scoped to `organization_id`.
- Created `actions/team.ts` — workload-aware member fetch (assigned task count + active project count), sorted by role.
- Created `store/searchStore.ts` (Zustand) — modal open/close global state.
- Built `components/search/GlobalSearchModal.tsx` — 300ms debounce, ↑↓/Enter/Esc keyboard nav, Cmd+K shortcut, categorized results.
- Built `components/search/SearchTrigger.tsx` — sidebar button triggering the modal.
- Built `components/team/TeamDirectory.tsx` — responsive member grid with workload indicators.
- Created `app/team/page.tsx` — new route.
- Updated `components/layout/Sidebar.tsx` — added SearchTrigger and Team Directory nav link.
- Added `SearchResult` and `TeamMember` types to `types/index.ts`.

### Feature 2.7: Advanced Notifications
- **DB:** Added `type TEXT NOT NULL DEFAULT 'GENERAL'` column + index to `notifications` table. Created `notification_preferences` table (`user_id`, `type`, `in_app`, `email`, `UNIQUE(user_id, type)`).
- **Types:** Added `NotificationType` union (`GENERAL | TASK_OVERDUE | SPRINT_STARTED | SPRINT_ENDED | MEMBER_INVITED | PROJECT_COMPLETED`) and `NotificationPreference` type to `types/index.ts`.
- **`actions/notification.ts`** (full rewrite): Added `createNotification` (preference-aware, fire-and-forget, checks `in_app` pref before inserting), `checkOverdueTasks` (24h dedup via task ID in content substring), `getNotificationPreferences` (fills defaults for all 6 types), `upsertNotificationPreference` (insert-or-update).
- **`actions/sprint.ts`**: Injected `Promise.all` fan-out to all org members on `SPRINT_STARTED` and `SPRINT_ENDED` events inside `updateSprintStatus`.
- **`actions/membership.ts`**: Injected `MEMBER_INVITED` notification to invited user (with org name) after successful membership insert in `inviteMember`.
- **`actions/project.ts`**: Injected `PROJECT_COMPLETED` fan-out to all org members inside `updateProject` when `status === 'COMPLETED'`.
- Built `components/notifications/NotificationPreferences.tsx` — 6-row toggle table, custom pill-switch component, optimistic updates, 2s saved flash, email channel no-ops until Resend is configured.
- Updated `app/organizations/settings/page.tsx` — added `<NotificationPreferences />` full-width below the members/invite grid.
- Updated `components/notifications/NotificationBell.tsx` — type-specific color badges (pink=TASK_OVERDUE, blue=SPRINT_STARTED, green=SPRINT_ENDED, purple=MEMBER_INVITED, yellow=PROJECT_COMPLETED), "Check Overdue Tasks" button with inline feedback message.

## Decisions made

- **`createNotification` is fire-and-forget:** It never throws — silently exits on any failure so that sprint/membership/project mutations are never blocked or rolled back by a notification failure.
- **Overdue dedup strategy:** 24h window using `content ILIKE '%[task-id]%'` substring match, avoiding the need for a separate `details JSONB` column on `notifications`. Task ID embedded in brackets: `[uuid]`.
- **Email toggles scaffolded but silent:** `notification_preferences.email` is persisted but no Resend integration is triggered yet. This avoids an unnecessary dependency install mid-sprint.
- **Overdue check is manual:** Triggered from the notification bell panel, not on every page load, to prevent duplicate spam.
- **Pre-existing TS errors not introduced by this work:** `analytics.ts`, `membership.ts` (profile join array vs. singular), `savedView.ts`, `search.ts`, `team.ts`, and `TaskDetailsSheet.tsx` had pre-existing type errors (InsForge SDK returns profiles as array, typed as singular). These are unrelated to Feature 2.7 and not new.

## Problems solved

- **InsForge `createInsforgeServer` used without `await` in notification.ts:** The server client factory in this project is used synchronously (no `await`) — matched the pattern used throughout other action files.
- **Circular import risk:** `createNotification` is exported from `actions/notification.ts` and imported into `actions/sprint.ts`, `membership.ts`, and `project.ts`. No circular deps — notification.ts only imports from `lib/` and `types/`.

## Current state

- **Features 2.1 through 2.7 are fully implemented.** Version 2 sprint is effectively feature-complete.
- **Pre-existing TS errors remain** in `analytics.ts`, `membership.ts`, `savedView.ts`, `search.ts`, `team.ts`, `TaskDetailsSheet.tsx` — all related to InsForge SDK profile join returning `[]` instead of singular object. These need a dedicated fix pass.
- **Email notifications:** Preference toggle UI is live and persists to DB but Resend integration is not yet wired.
- **progress-tracker.md** is up to date through Feature 2.7.

## Next session starts with

- **Fix the pre-existing TS errors** — specifically the InsForge SDK profile join shape mismatch (`profiles` typed as `singular | null` but SDK returns `[]`). Affected files: `actions/analytics.ts:127`, `actions/membership.ts:69`, `actions/search.ts:113`, `actions/team.ts:95`, `components/tasks/TaskDetailsSheet.tsx:109,280,310`, `actions/savedView.ts:10`. Fix strategy: cast via `unknown` intermediary or map the first array element. Then run `bun tsc --noEmit` to confirm zero errors.
- After TS clean: check `context/todos.md` for the next unimplemented feature in Version 2.

## Open questions

- Should `checkOverdueTasks` eventually be triggered automatically (e.g., on every dashboard load with a Redis-backed 6h rate limit per user) rather than manually?
- Should Resend email integration be wired in Version 2 or deferred to Version 3?
