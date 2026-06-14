# ProjectForge: Engineering Build Plan & Blueprint

Engineering roadmap for ProjectForge. Bridges front-end, validation, data models, backend logic. Lifecycle: 5 phases (V1.0 - V5.0).

---

## Workspace Setup & Architecture Core

### Directory Structure & Layout Boundaries
ProjectForge layers in Next.js App Router:
1. **`/actions` (Server Actions)**: State mutations, session checks, validation, DB writes.
2. **`/app` (App Router Pages)**: Routing + layouts. Fetch data server-side. No direct DB/SQL.
3. **`/components` (UI Modules)**: Reusable components: `/layout`, `/ui`, feature folders.
4. **`/lib` (Services & Clients)**: DB pool, storage utils, PostHog init.
5. **`/types` (TypeScript Schemas)**: TS types for DB tables, APIs, props.

### Design Tokens & Tailwind Core
Theme in `app/globals.css`. HSL vars for consistency:
- `--color-brand-purple`: `hsl(255, 96%, 67%)` (Primary)
- `--color-brand-purple-hover`: `hsl(255, 96%, 62%)`
- `--color-bg-primary`: `hsl(0, 0%, 100%)` (Page)
- `--color-bg-secondary`: `hsl(210, 20%, 98%)` (Sidebar/Card)
- `--color-border-subtle`: `hsl(220, 14%, 93%)` (Dividers)
- `--color-text-primary`: `hsl(220, 40%, 10%)` (Headings)
- `--color-text-secondary`: `hsl(220, 10%, 40%)` (Body)
- `--color-status-success`: `hsl(150, 80%, 38%)`
- `--color-status-warning`: `hsl(35, 90%, 50%)`
- `--color-status-danger`: `hsl(0, 84%, 60%)`

---

## Phase 1: V1.0 - Core Project Management Tool (MVP)
*Goal:* Secure multi-tenant project/task environment. Files, comments, notifications.

### Feature 1.1: Landing Page
- **UI & Layout:**
  - **Header/Navbar:** Sticky (`64px`), white, border-bottom. Logo (left), nav links (Dashboard, Projects, Settings), primary "Start for free" button (purple). Mobile hamburger menu.
  - **Hero:** Responsive vertical flex. Headline (H1), description, CTA buttons (Get Started, Quick Tour).
  - **Dashboard Preview:** Centered mockup image. Shadow, rounded, border.
  - **Features Grid:** 3-column grid. Cards: icon, H3 header, body copy.
  - **Testimonials:** Centered quotes grid.
  - **Bottom CTA:** Banner, primary "Sign Up Now" button.
  - **Footer:** Links, legal, copyright.
- **States:** Skeletons during auth check. Switch button to "Go to Dashboard" if auth.
- **Backend:**
  - JWT session check in cookies.
  - Redirect to `/dashboard` if auth, else `/login`.
  - SQL: `SELECT id, email FROM profiles WHERE id = $1 LIMIT 1;`

### Feature 1.2: Authentication & Onboarding
- **UI & Layout:**
  - **Login Card:** Centered (`440px`), white, border, shadow. Tab switch: Login/Sign Up.
  - **Fields:** Name, Email (regex val), Password (min 8).
  - **Actions:** "Continue" button (loading spinner), Social OAuth (Google, GitHub).
- **States:** Inline red warnings below inputs. Error banner on card top. Redirect on success.
- **Backend:**
  - Clerk Middleware protects routes except `/`, `/login`, `/signup`, `/api/webhooks/clerk`.
  - Webhook `app/api/webhooks/clerk/route.ts` syncs Clerk user to `profiles` table.
  ```typescript
  // Clerk Sync logic
  const { id, first_name, last_name, email_addresses, image_url } = payload.data;
  const email = email_addresses[0]?.email_address;
  const fullName = `${first_name || ""} ${last_name || ""}`.trim();
  const insforge = await createInsforgeServer();
  await insforge.from("profiles").insert({ id, full_name: fullName, email, avatar_url: image_url });
  ```

### Feature 1.3: Multi-Tenant Workspace (Organizations)
- **UI & Layout:**
  - **Create Org:** Name (3-50 chars), URL Slug (alphanumeric/hyphen, unique).
  - **Selector:** Sidebar dropdown. Lists member orgs + "Create new" link.
- **States:** Live slug uniqueness check via debounced Action.
- **Backend:**
  - Insert to `organizations`. Auto-map creator as `OWNER` in `memberships`.
  - Sync session: update `active_org_id` cookie on select.
  ```sql
  INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id;
  INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, 'OWNER');
  ```

### Feature 1.4: Membership & Role Management
- **UI & Layout:**
  - **Management:** Member list (table) + Invite drawer.
  - **Table:** Name, Email, Role (OWNER, ADMIN, MEMBER), Remove button.
  - **Invite Drawer:** Email + Role selector.
- **States:** Row skeletons while fetching. Success toast on invite.
- **Backend:**
  - Validate requester is `OWNER`/`ADMIN`.
  - Check if invitee exists in `profiles`. Map membership (unique constraint).
  ```sql
  SELECT role FROM memberships WHERE organization_id = $1 AND user_id = $2;
  INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, $3);
  ```

### Feature 1.5: Project Management
- **UI & Layout:**
  - **Directory:** Project cards by status. "New Project" button.
  - **Form:** Name, Description, Status (PLANNING, ACTIVE, COMPLETED, ARCHIVED).
  - **Details:** Header, status badges, Backlog/Members tabs.
- **States:** Empty state illustration if count = 0.
- **Backend:**
  - Queries filtered by `organization_id`.
  ```sql
  SELECT * FROM projects WHERE organization_id = $1 ORDER BY updated_at DESC;
  INSERT INTO projects (name, description, status, organization_id) VALUES ($1, $2, $3, $4);
  ```

### Feature 1.6: Tasks Engine
- **UI & Layout:**
  - **List:** Title, Assignee, Priority, Status, Due Date.
  - **Form:** Title, Description, Assignee (org members), Priority (LOW, MEDIUM, HIGH, URGENT), Due Date.
- **States:** Red overdue badge if date passed + not done.
- **Backend:**
  - Action validates project/org. Update status/date, log changes.
  ```sql
  UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3;
  INSERT INTO tasks (title, description, assignee_id, priority, due_date, project_id, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7);
  ```

### Feature 1.7: Comments & Attachments
- **UI & Layout:**
  - **Comments:** Timeline feed, author avatar, timestamp, Delete button.
  - **Attachments:** Dashed dropzone. List with progress bars, size, download buttons.
- **States:** Toast on >20MB or forbidden type. Progress % in bar.
- **Backend:**
  - Validate comment. Notify assignee if author different.
  - Upload to InsForge Storage. Save URL/meta to `attachments`.
  ```sql
  INSERT INTO comments (task_id, author_id, content) VALUES ($1, $2, $3);
  INSERT INTO attachments (task_id, uploader_id, file_name, file_size, storage_path) VALUES ($1, $2, $3, $4, $5);
  ```

### Feature 1.8: Notification Center
- **UI & Layout:**
  - **Panel:** Tray grouped by date. Icons for types. "Mark all as read" button.
- **States:** Red indicator badge on bell icon with unread count. "Caught up!" if empty.
- **Backend:**
  - Mark read. Cleanup older than 30 days.
  ```sql
  UPDATE notifications SET read = TRUE WHERE user_id = $1 AND organization_id = $2;
  SELECT * FROM notifications WHERE user_id = $1 AND read = FALSE ORDER BY created_at DESC;
  ```

---

## Phase 2: V2.0 - Work Management Platform
*Goal:* Sprints, Kanban, activity logs, dashboards, search.

### Feature 2.1: Sprint Management
- **UI:** Sprints view. Active/Planned/Completed lists. Context preview (burndown, completion).
- **Form:** Name, Goal, Start/End dates.
- **Backlog:** Drag-drop tasks to sprints.
- **States:** Overlap warning highlight.
- **Backend:** No overlapping sprints per org. Update `sprint_id` on tasks. Lock if done.
  ```sql
  SELECT id FROM sprints WHERE organization_id = $1 AND (start_date, end_date) OVERLAPS ($2, $3);
  INSERT INTO sprints (name, goal, start_date, end_date, organization_id) VALUES ($1, $2, $3, $4, $5);
  ```

### Feature 2.2: Kanban Board
- **UI:** 3-column grid (TODO, IN_PROGRESS, DONE). Card: title, label, avatar, priority, due date.
- **States:** Drag indicator/dashed border. Header sync spinner.
- **Backend:** Trigger Action on drop. Broadcast via realtime DB.
  ```sql
  UPDATE tasks SET status = $1, board_index = $2 WHERE id = $3 AND organization_id = $4;
  ```

### Feature 2.3: Project Activity Feed
- **UI:** Timeline of logs. Actor, action text, relative time.
- **States:** Infinite scroll (20 entries).
- **Backend:** Log actions to `activities`. Filter by org.
  ```sql
  INSERT INTO activities (organization_id, project_id, user_id, action_type, metadata) VALUES ($1, $2, $3, $4, $5);
  ```

### Feature 2.4: Dashboard Analytics
- **UI:** Stats cards (Active, Done, Overdue, Workload). Trend charts (Line/Bar).
- **Backend:** SQL aggregation grouped by status/priority.
  ```sql
  SELECT DATE_TRUNC('day', completed_at) AS day, COUNT(id) FROM tasks WHERE organization_id = $1 AND status = 'DONE' GROUP BY day;
  ```

### Feature 2.5: Task Labels & Saved Views
- **UI:** Label manager (name, color). Filters sidebar with "Save View".
- **Backend:** Store `labels` and `saved_views` per user/org.

### Feature 2.6: Search & Team Directory
- **UI:** Global search modal. Results by category. Team grid with workload stats.
- **Backend:** Full-text indexing + RLS.
  ```sql
  SELECT id, title FROM tasks WHERE organization_id = $2 AND to_tsvector(title || ' ' || description) @@ plainto_tsquery($1);
  ```

---

## Phase 3: V3.0 - Execution Platform
*Goal:* Automations, pipelines, timesheets, AI assistant, integrations, webhooks.

### Feature 3.1: Workflow Automation
- **UI:** Builder canvas. Trigger/Condition/Action nodes.
- **Backend:** DB triggers run automation engine. Log to `workflow_history`.

### Feature 3.2: Custom Task Workflows
- **UI:** Status pipeline designer. Transition rules, category mapping (TODO/DONE).
- **Backend:** Store `custom_statuses`. Enforce `transition_rules` in updates.

### Feature 3.3: Time Tracking & Audit Logs
- **UI:** Stopwatch widget. Manual logs. Read-only Audit panel.
- **Backend:** `time_entries` table. DB triggers for `audit_logs`.

### Feature 3.4: AI Assistant & Integrations
- **UI:** Chat sidebar. Integrations hub (Slack, GitHub, GDrive, GCal).
- **Backend:** LLM API calls. External service webhooks.

### Feature 3.5: API Platform & Webhooks
- **UI:** Dev settings. API Keys (scopes, expiry). Webhook registration.
- **Backend:** API key middleware + rate-limiting. Outbound webhooks.

---

## Phase 4: V4.0 - Enterprise Operating System
*Goal:* Portfolios, custom schemas, capacity planning, compliance, SSO.

### Feature 4.1: Portfolio & Program Management
- **UI:** Exec dashboard. Program health. Hierarchy nav (Portfolio → Program → Project).
- **Backend:** Parent-child modeling. Rollup progress metrics.

### Feature 4.2: Advanced RBAC & Custom Fields
- **UI:** Permission grid. Field builder (Story Points, Cost Center).
- **Backend:** Check custom permissions. Validate dynamic field payloads.

### Feature 4.3: Advanced Workflows
- **UI:** Approval timeline. SLA breach banners.
- **Backend:** Cron jobs for SLA checks. Auto-escalations.

### Feature 4.4: Resource & Risk Management
- **UI:** Allocation grid. Risk register (impact, mitigation).
- **Backend:** Capacity check triggers. Risk score calculations.

### Feature 4.5: SSO & Org Hierarchies
- **UI:** SAML/SSO config cards.
- **Backend:** Redirect handlers. Map IDP attributes to profiles.

---

## Phase 5: V5.0 - Intelligent Organizational OS
*Goal:* AI workers, Knowledge Graph, OKRs, Digital Twin, Marketplace.

### Feature 5.1: AI Agent Platform
- **UI:** Agent manager (prompts, models). Realtime log streaming.
- **Backend:** Isolated sandboxes. Token budget monitoring.

### Feature 5.2: Knowledge Graph & Memory
- **UI:** Node-link visualizer.
- **Backend:** Vector indices (pgvector). Semantic context extraction.

### Feature 5.3: Strategic Goal Management (OKRs)
- **UI:** Goal trees. Key result progress linked to tasks.
- **Backend:** Auto-recalculate metrics on task completion.

### Feature 5.4: Semantic Search & Digital Twin
- **UI:** NL search bar. "What-if" simulation panel.
- **Backend:** Conversational query parser. Resource allocation simulation.

### Feature 5.5: Developer Marketplace
- **UI:** Storefront. Permission grant prompts.
- **Backend:** SDK sandboxing. App installation tracking.

---

## Detailed E-2-E QA Script (V1.0)

1. **Org Setup:** Register User A → Create org "DevOps Pioneers" → Check OWNER role in DB.
2. **Invites:** Register User B → Alice invites Bob as MEMBER → Bob joins → Check role.
3. **Projects:** Alice creates "Frontend Redesign" → Empty backlog shows.
4. **Tasks:** Alice assigns "Implement Navbar" to Bob (High Priority, date+3).
5. **Collaboration:** Bob notified → status to IN_PROGRESS → comments → Alice notified.
6. **Files:** Bob uploads `navbar_draft.png` → Alice downloads successfully.
7. **Completion:** Bob sets task DONE → Analytics counter increments.
