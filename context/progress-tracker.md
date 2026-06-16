# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

We are building Version 1


---

## Current Status
- **Status:** **TanStack Query (React Query) Integration Implemented**. Installed `@tanstack/react-query@5.101.0`, wrapped layout in `QueryProvider`, and migrated client-side data fetching and mutations in `NotificationBell` and `projects/[id]/page.tsx` from manual React state/hooks to TanStack Query queries and mutations, resolving all lints and compiling a successful Next.js production build.
- **Active Sprint:** Version 2 Work Management Platform features.
- **Target Milestones:** Version 2 complete.

## Progress
- [x] Integrate `@tanstack/react-query` v5 for client-side server state management, refactoring `NotificationBell` and `projects/[id]/page.tsx` with queries/mutations and optimistic updates.
- [x] Align project overview and description to ProjectForge (`context/project-overview.md`).
- [x] Formulate comprehensive, 700+ line engineering build-plan and blueprint (`context/build-plan.md`).
- [x] Establish isolated verification checklist and todos for Version 1 (MVP) (`context/todos.md`).
- [x] Implement Feature 1.1: Landing Page layout, styling, and session-checking logic (light mode only, isDarkMode props removed).
- [x] Implement Feature 1.2: Authentication card, form fields, validation, and secure Clerk authentication integration (useSignIn, useSignUp, proxy.ts, layout wrapping, callback handler).
- [x] Implement Feature 1.3: Multi-Tenant Workspace — InsForge DB tables (profiles, organizations, memberships), Server Actions (createOrg, checkSlug, getUserOrgs, setActiveOrg), Create Org page (`/orgs/create`), OrgSwitcher component, Dashboard integration.
- [x] Clerk ↔ InsForge Profile Sync — Webhook handler (`/api/webhooks/clerk`) migrated to use manual `svix` signature verification, fallback `syncProfile` Server Action on dashboard mount, middleware updated for public webhook route.
- [x] Implement Feature 1.4: Membership & Role Management — Server Actions (getOrganizationMembers, inviteMember, updateMemberRole, removeMember), Settings Page (`/organizations/settings`), MemberList component, InviteModal card.
- [x] Implement Feature 1.5: Project Management — database table (`projects`), Server Actions (`createProject`, `getUserProjects`, `getProjectDetails`, `updateProject`, `archiveProject`), Projects Directory (`/projects`), Project Details dynamic route (`/projects/[id]`), ProjectCard and CreateProjectModal components.
- [x] Implement Feature 1.6: Tasks Engine — database table (`tasks`), Server Actions (`createTask`, `getProjectTasks`, `updateTask`, `deleteTask`), backlog columns, `TaskRow`, `TaskList`, `CreateTaskModal`, and `TaskDetailsSheet` components with overdue warnings and member scoping.
- [x] Implement Feature 1.7: Comments & Attachments — database tables (`comments`, `attachments`), storage bucket (`attachments`), Server Actions (`createComment`, `getTaskComments`, `createAttachment`, `getTaskAttachments`, `deleteAttachment`), chronological timeline feed, sketchy file dropzone, size checking (<20MB), file blocklist, progress bar simulation, download/delete controls in `TaskDetailsSheet`.
- [x] Implement Feature 1.8: Notification Center — `NotificationBell` component (bell icon + unread badge + date-grouped dropdown tray + mark-read per item + mark-all-read + 30-day cleanup + empty state), fixed `await` bug in notification actions, integrated into all 4 authenticated page navbars.
- [x] Implement Feature 2.1: Sprint Management — database table (`sprints`), `sprint_id` on `tasks` table, Server Actions (`createSprint`, `getSprints`, `updateSprint`, `updateSprintStatus`, `getOrganizationTasks`), reusable `Sidebar` layout navigation component, top-level `/sprints` planner page with planned/active/completed sections, backlog quick-assign dropdowns, and completed sprint lock guards.
- [x] Implement Feature 2.2: Kanban Board — Altered `tasks` table with `board_index` column, modified task actions to support reordering and board-index queries, implemented Client-side tabs routing on `/projects/[id]` and created `/projects/[id]/board` Kanban Board page using HTML5 native drag-and-drop. Designed task cards as physical sticky notes with priority-based colors and deterministic rotation offsets.
- [x] Implement Feature 2.3: Project Activity Feed — Created database table (activities), implemented activity logging helper server action (logActivity) and fetching server action (getProjectActivities) with pagination support. Added logActivity triggers to existing mutative actions for projects, tasks, comments, and memberships. Created an Activity tab in the project details and Kanban board views. Designed a vertical hand-drawn timeline feed component (ActivityFeed.tsx) with custom icon mappings and relative timestamps.
- [x] Implement Feature 2.4: Dashboard Analytics — Created server action `getAnalyticsData` compiling metrics, workload distributions, and 7-day completion trends. Developed custom sketchy UI components (`components/analytics`) including `StatsGrid`, `WorkloadBreakdown` (with progress segments), and `CompletionTrend` (with a custom interactive SVG bar chart). Scaffolded the `/analytics` route with real-time org switcher context checking.
- [x] Implement Feature 2.5: Task Labels & Saved Views — Created PostgreSQL tables `labels`, `task_label_mappings`, and `saved_views` with necessary indexes. Implemented Server Actions for Label CRUD (`actions/label.ts`) and Saved Views CRUD (`actions/savedView.ts`), and updated `actions/task.ts` to manage label relations. Developed a reusable `<TaskFilters>` component with custom dropdown selectors and view persistence. Modified backlog columns, Kanban board sticky notes, create task modals, and details drawer to support multi-label assignment and visual pastel color badge rendering.
- [x] Implement Feature 2.6: Search & Team Directory — Applied PostgreSQL `tsvector` GIN index on `tasks(title, description)` via InsForge MCP. Created `actions/search.ts` running parallel queries (ILIKE for projects, full-text for tasks, in-process filter for members) all scoped to `organization_id`. Created `actions/team.ts` fetching member workloads (assigned task count, active project count) sorted by role. Built `store/searchStore.ts` (Zustand modal open/close). Built `components/search/GlobalSearchModal.tsx` with 300ms debounce, ↑↓/Enter/Esc keyboard navigation, Cmd+K shortcut, and categorized result sections. Built `components/search/SearchTrigger.tsx` sidebar button. Built `components/team/TeamDirectory.tsx` responsive member grid. Created `app/team/page.tsx`. Updated `Sidebar.tsx` with search trigger and Team Directory nav link.
- [x] Implement Feature 2.7: Advanced Notifications — Added `type TEXT DEFAULT 'GENERAL'` column + index to `notifications` table. Created `notification_preferences` table (user_id, type, in_app, email, UNIQUE constraint). Rewrote `actions/notification.ts`: added preference-aware `createNotification` helper (fire-and-forget, checks `in_app` pref before inserting), `checkOverdueTasks` (24h dedup via content substring match), `getNotificationPreferences` (fills defaults for all 6 types), `upsertNotificationPreference` (insert-or-update). Injected `SPRINT_STARTED`/`SPRINT_ENDED` fan-outs in `actions/sprint.ts:updateSprintStatus`. Injected `MEMBER_INVITED` notification in `actions/membership.ts:inviteMember`. Injected `PROJECT_COMPLETED` fan-out in `actions/project.ts:updateProject`. Built `components/notifications/NotificationPreferences.tsx` with custom pill toggles, optimistic updates, and 2s saved flash. Added preferences panel to `/organizations/settings`. Updated `NotificationBell.tsx` with type-specific color badges (pink=overdue, blue=sprint, yellow=project) and Check Overdue Tasks trigger button.
- [x] Implement Feature 2.8: Zustand State Management — Centralized active organization, task drawer selection/modal toggles, project/sprint modal actions, and notifications state into 6 dedicated Zustand stores. Migrated 11 key components and pages from local state and cookie readers. Removed all cookie-polling intervals. Resolved type-narrowing closures and deferred React state rendering updates.


## Decisions Made During Build
- **Tech Stack Enforced:** Next.js 16 (React 19) App Router, Tailwind CSS v4, InsForge private PostgreSQL and storage client layers.
- **Authentication:** Shifted from interactive mockups to active Clerk authentication integration using custom hooks (`useSignIn`, `useSignUp`) and standard route protection middleware.
- **Browser Automation & LLM:** Selected local Playwright instead of Browserbase/Stagehand and NVIDIA GPT OSS 120B (utilizing the OpenAI-compatible client API) for the V5 AI capabilities.
- **InsForge SDK:** Uses `@insforge/sdk` with `createClient()` pattern. DB queries via `insforge.database.from()`. Server client created per-request in `lib/insforge-server.ts`.
- **Active Org Context:** Workspace switching uses `active_org_id` cookie (non-httpOnly, lax sameSite) set via Server Actions. Client reads cookie for UI, server reads for tenant-scoped queries.

## Notes
- Ensure all styling variables are derived directly from HSL tokens defined inside `app/globals.css`.
- Server Actions (`/actions`) must manage validation and database writes exclusively; Page Components (`/app`) should handle presentation shell rendering.
