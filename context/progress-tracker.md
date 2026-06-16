# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

We are building Version 1


---

## Current Status
- **Status:** **Feature 2.1 (Sprint Management) Implemented**. Created database schemas for sprints and updated tasks. Created `actions/sprint.ts` and updated `actions/task.ts` for lifecycle (planned, active, completed, cancelled), date-overlap verification, completed sprint locking, and role permission checks. Created reusable `components/layout/Sidebar.tsx` navigation sidebar. Created top-level `app/sprints/page.tsx` sprint planning page with backlog assignment drawer. Integrated Sidebar into all 4 authenticated views.
- **Active Sprint:** Version 2 Work Management Platform features.
- **Target Milestones:** Version 2 complete.

## Progress
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

## Decisions Made During Build
- **Tech Stack Enforced:** Next.js 16 (React 19) App Router, Tailwind CSS v4, InsForge private PostgreSQL and storage client layers.
- **Authentication:** Shifted from interactive mockups to active Clerk authentication integration using custom hooks (`useSignIn`, `useSignUp`) and standard route protection middleware.
- **Browser Automation & LLM:** Selected local Playwright instead of Browserbase/Stagehand and NVIDIA GPT OSS 120B (utilizing the OpenAI-compatible client API) for the V5 AI capabilities.
- **InsForge SDK:** Uses `@insforge/sdk` with `createClient()` pattern. DB queries via `insforge.database.from()`. Server client created per-request in `lib/insforge-server.ts`.
- **Active Org Context:** Workspace switching uses `active_org_id` cookie (non-httpOnly, lax sameSite) set via Server Actions. Client reads cookie for UI, server reads for tenant-scoped queries.

## Notes
- Ensure all styling variables are derived directly from HSL tokens defined inside `app/globals.css`.
- Server Actions (`/actions`) must manage validation and database writes exclusively; Page Components (`/app`) should handle presentation shell rendering.
