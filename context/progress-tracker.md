# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

We are building Version 1


---

## Current Status
- **Status:** **Feature 1.3 (Multi-Tenant Workspace) Implemented**. InsForge DB tables created, Server Actions built, Create Org page and OrgSwitcher integrated into Dashboard.
- **Active Sprint:** MVP organization and membership setup.
- **Target Milestones:** Implement Feature 1.4 (Membership & Role Management).

## Progress
- [x] Align project overview and description to ProjectForge (`context/project-overview.md`).
- [x] Formulate comprehensive, 700+ line engineering build-plan and blueprint (`context/build-plan.md`).
- [x] Establish isolated verification checklist and todos for Version 1 (MVP) (`context/todos.md`).
- [x] Implement Feature 1.1: Landing Page layout, styling, and session-checking logic (light mode only, isDarkMode props removed).
- [x] Implement Feature 1.2: Authentication card, form fields, validation, and secure Clerk authentication integration (useSignIn, useSignUp, proxy.ts, layout wrapping, callback handler).
- [x] Implement Feature 1.3: Multi-Tenant Workspace — InsForge DB tables (profiles, organizations, memberships), Server Actions (createOrg, checkSlug, getUserOrgs, setActiveOrg), Create Org page (`/orgs/create`), OrgSwitcher component, Dashboard integration.
- [x] Clerk ↔ InsForge Profile Sync — Webhook handler (`/api/webhooks/clerk`) for `user.created/updated/deleted` events, fallback `syncProfile` Server Action on dashboard mount, middleware updated for public webhook route (database inserts corrected to array format).

## Next Actions (Phase 1 Development)
- [ ] Implement Feature 1.4: Membership & Role Management (invite drawer, member list, role updates).

## Decisions Made During Build
- **Tech Stack Enforced:** Next.js 16 (React 19) App Router, Tailwind CSS v4, InsForge private PostgreSQL and storage client layers.
- **Authentication:** Shifted from interactive mockups to active Clerk authentication integration using custom hooks (`useSignIn`, `useSignUp`) and standard route protection middleware.
- **Browser Automation & LLM:** Selected local Playwright instead of Browserbase/Stagehand and NVIDIA GPT OSS 120B (utilizing the OpenAI-compatible client API) for the V5 AI capabilities.
- **InsForge SDK:** Uses `@insforge/sdk` with `createClient()` pattern. DB queries via `insforge.database.from()`. Server client created per-request in `lib/insforge-server.ts`.
- **Active Org Context:** Workspace switching uses `active_org_id` cookie (non-httpOnly, lax sameSite) set via Server Actions. Client reads cookie for UI, server reads for tenant-scoped queries.

## Notes
- Ensure all styling variables are derived directly from HSL tokens defined inside `app/globals.css`.
- Server Actions (`/actions`) must manage validation and database writes exclusively; Page Components (`/app`) should handle presentation shell rendering.
