# ProjectForge: Version 1 (MVP) Verification Guidelines & Todos

This document lists the technical verification checklists and manual E2E test steps for **Version 1 (MVP)**, organized by scaffolding, database setups, and individual feature components.

---

we are building version 1(prd_versions/v1.md)

## Phase 1 Scaffolding & Database Setup Checklist

### Database Tables & Schema Verification
- [x] **`profiles` Table:** Verify schema matches user meta-data. Test sync trigger on successful authentication signup.
- [x] **`organizations` Table:** Verify name and unique URL slug fields. Enforce indexes on slug for fast lookups.
- [x] **`memberships` Table:** Verify composite unique key `(organization_id, user_id)` and role enum constraint (`OWNER`, `ADMIN`, `MEMBER`).
- [x] **`projects` Table:** Verify foreign key constraint linking to `organizations.id` and name/status fields.
- [x] **`tasks` Table:** Verify foreign key constraints linking to `projects.id` and `profiles.id` (assignee). Check priority/status constraints.
- [x] **`comments` Table:** Verify foreign key constraints linking to `tasks.id` and `profiles.id` (author).
- [x] **`attachments` Table:** Verify storage URL paths and size mappings are stored correctly.
- [x] **`notifications` Table:** Verify read/unread states, recipient links, and event type categories.

### Page Routing & Directory Scaffolding
- [x] **Landing Page (`/`):** Verify public page routing and metadata settings.
- [x] **Auth Pages (`/login`, `/signup`):** Verify public page routing.
- [x] **Middleware Interceptor (`proxy.ts`):** Check authentication redirects correctly protect private routing boundaries.
- [x] **Dashboard (`/dashboard`):** Verify core layout shell and workspace switcher location.
- [x] **Organization Creator (`/organizations/create`):** Verify page routing and workspace slug uniqueness API.
- [x] **Members Settings (`/organizations/settings`):** Verify page routing and member invitation interface placement.
- [x] **Projects Directory (`/projects`):** Verify page layout and project creation modal triggers.
- [x] **Project Details (`/projects/[id]`):** Verify dynamic project page layout and tabs routing.
- [x] **Task Details View (`/tasks/[id]` or drawer):** Verify overlay task details component.
- [x] **Clerk Webhook Endpoint (`/api/webhooks/clerk`):** Verify that the Clerk webhook handler successfully receives and validates Clerk user.created event payloads.

---

## Component-by-Component Checklists

### Feature 1.1: Landing Page Verification
- [x] **Navbar Layout & Menu:** Verify logo, desktop navigation links ("Dashboard", "Projects", "Settings"), and "Start for free" button are aligned and responsive.
- [x] **Responsive Breakpoints:** Verify mobile hamburger menu replaces desktop nav link structure on viewports < 768px.
- [x] **Auth Navigation Rules:** 
  - [x] Click CTA buttons while logged out. Verify redirect to `/login`.
  - [x] Click CTA buttons while logged in. Verify redirect to `/dashboard` (mocked).

### Feature 1.2: Authentication & Onboarding Verification
- [x] **Clerk Middleware Check:** Verify redirects to `/login` are handled (mocked).
- [x] **Clerk Profile Sync (Webhook):** Verify user creation syncs profile (mocked).
- [x] **Form Validations:**
  - [x] Verify form validation (e.g. invalid email format, short password) works correctly.
- [x] **Clerk OAuth Integration:** Verify Google and GitHub buttons trigger OAuth flow simulation and redirect to workspace.

### Feature 1.3: Multi-Tenant Workspace (Organizations) Verification
- [x] **Organization Creation:** Create a workspace named `"DevOps Pioneers"`. Verify matching record is inserted in `organizations`.
- [x] **Membership Association:** Verify organization creator is automatically mapped with `OWNER` role in `memberships`.
- [x] **Slug Uniqueness:** Attempt to register a duplicate URL slug `"devops-pioneers"`. Verify the UI blocks submit and debounced warning displays.
- [x] **Active Context Switcher:** Switch active organizations in the sidebar selector. Verify the `active_org_id` cookie updates and triggers route revalidation.

### Feature 1.4: Membership & Role Management Verification
- [x] **Invitation Security checks:** Login as a `MEMBER` user. Verify that invitation drawers are hidden and endpoint rejects requests.
- [x] **Duplicate Invite Guard:** Attempt to invite a member who is already invited or joined. Verify unique constraint checks block duplicates.
- [x] **Role Updates:** Change a member's role from dropdown. Verify membership record is updated in the database.

### Feature 1.5: Project Management Verification
- [x] **Multi-Tenant Data Isolation:** Verify that a user cannot query projects outside of their active `organization_id`.
- [x] **Project CRUD Lifecycle:** Test project creation, reading, status updates, and archiving. Verify database updates match input fields.
- [x] **Empty State Renders:** Navigate to a newly created project. Verify empty state illustration and "No projects found" caption render when count is 0.

### Feature 1.6: Tasks Engine Verification
- [x] **Task CRUD Lifecycle:** Verify task creation modal properly inputs title, description, priority status, and due date.
- [x] **Overdue Warnings:** Create a task with due date set in the past. Verify due date badge appears in red on list and details views.
- [x] **Assignee Validation:** Verify assignee list dropdown is scoped to members of the active organization only.

### Feature 1.7: Comments & Attachments Verification
- [x] **Upload Size Limits:** Try to upload file larger than 20MB. Verify upload fails validation checks.
- [x] **Upload Progress:** Verify linear progress bar displays matching upload percentage during transmission.
- [x] **Security Sanitization:** Attempt to upload script `malicious.sh`. Verify file type constraints block execution and upload.
- [x] **Comment Notification Trigger:** Post comment on task. Verify a notification triggers for the task assignee.

### Feature 1.8: Notification Center Verification
- [x] **Header Alert Indicator:** Trigger notification. Verify red badge displays next to header bell icon.
- [x] **Notifications Read Mutator:** Click "Mark all as read". Verify notification records in DB update `read` to `true` and the header count clears.

---

# ProjectForge: Version 2 (Work Management Platform) Verification Guidelines & Todos

This document lists the technical verification checklists and manual E2E test steps for **Version 2**, organized by database setup, page routing, and individual feature components.

---

we are building version 2 (prd_versions/v2.md)

## Phase 2 Database & Schema Setup Checklist

### New Database Tables & Schema Verification
- [ ] **`sprints` Table:** Verify fields: `id`, `organization_id`, `name`, `goal`, `start_date`, `end_date`, `status` (PLANNED, ACTIVE, COMPLETED, CANCELLED), `created_at`. Enforce FK to `organizations.id`.
- [ ] **`activities` Table:** Verify fields: `id`, `organization_id`, `project_id`, `user_id` (actor), `action_type`, `metadata` (jsonb), `created_at`. Enforce FK to `organizations.id`.
- [ ] **`labels` Table:** Verify fields: `id`, `organization_id`, `name`, `color`. Enforce FK to `organizations.id` and unique constraint on `(organization_id, name)`.
- [ ] **`saved_views` Table:** Verify fields: `id`, `user_id`, `organization_id`, `name`, `filters` (jsonb). Enforce FK to `profiles.id`.
- [ ] **`tasks` Table (migration):** Verify new `sprint_id` (nullable FK to `sprints.id`), `board_index` (int), and `label_ids` (array or junction) columns added correctly.
- [ ] **Full-Text Search Index:** Verify `to_tsvector` index on `tasks(title, description)` for search performance.

### Page Routing & Directory Scaffolding
- [ ] **Sprints Page (`/sprints`):** Verify page routing and sprint list layout renders (Planned, Active, Completed groups).
- [ ] **Kanban Board (`/projects/[id]/board`):** Verify dynamic board page routing and 3-column grid layout renders.
- [ ] **Activity Feed (`/projects/[id]/activity`):** Verify dynamic activity page routing and timeline layout renders.
- [ ] **Analytics Dashboard (`/analytics`):** Verify page routing and stats card placeholders render.
- [ ] **Team Directory (`/team`):** Verify page routing and member grid layout renders.
- [ ] **Global Search Modal:** Verify search modal is accessible from the header and opens correctly.
- [ ] **Updated Navigation:** Verify sidebar navigation includes all new V2 links: Team, Boards, Sprints, Activity, Analytics.

---

## Component-by-Component Checklists

### Feature 2.1: Sprint Management Verification
- [x] **Sprint Creation:** Create a sprint named `"Q3 Sprint 1"` with goal, start date, and end date. Verify matching record inserted in `sprints` with status `PLANNED`.
- [x] **Sprint Activation:** Start the sprint. Verify status updates to `ACTIVE` in DB and sprint card moves to the Active section.
- [x] **Sprint Completion:** Complete the sprint. Verify status updates to `COMPLETED` and sprint is locked (no further edits allowed).
- [x] **Task Assignment to Sprint:** Drag or assign a task to an active sprint. Verify `sprint_id` FK is updated on the `tasks` record.
- [x] **Sprint Overlap Guard:** Attempt to create a sprint whose date range overlaps an existing sprint. Verify the overlap warning highlights and submission is blocked.
- [x] **Role Permissions:** Login as `MEMBER`. Verify sprint creation/management controls are hidden. Login as `ADMIN`/`OWNER`. Verify full sprint management controls are visible.

### Feature 2.2: Kanban Board Verification
- [ ] **Board Renders:** Navigate to a project's board view. Verify 3 columns (TODO, IN_PROGRESS, DONE) render with correct task cards.
- [ ] **Card Contents:** Verify each card displays: title, label badge, assignee avatar, priority indicator, and due date.
- [ ] **Drag & Drop:** Drag a task card from TODO to IN_PROGRESS. Verify `status` and `board_index` update correctly in the `tasks` table.
- [ ] **Drag Indicator:** Verify dashed border/drag indicator appears on the target column during an active drag.
- [ ] **Header Sync Spinner:** Verify a loading spinner appears in the board header during the status update action.
- [ ] **Multi-Tenant Isolation:** Verify board only displays tasks scoped to the active `organization_id`.

### Feature 2.3: Project Activity Feed Verification
- [ ] **Event Logging — Task Created:** Create a task. Verify an `activities` record is inserted with `action_type = 'TASK_CREATED'`.
- [ ] **Event Logging — Task Assigned:** Assign a task to a member. Verify an `activities` record with `action_type = 'TASK_ASSIGNED'` is logged.
- [ ] **Event Logging — Task Completed:** Set task status to DONE. Verify `action_type = 'TASK_COMPLETED'` activity is logged.
- [ ] **Event Logging — Comment Added:** Post a comment. Verify `action_type = 'COMMENT_ADDED'` activity is logged.
- [ ] **Event Logging — Member Joined:** Invite and accept a member. Verify `action_type = 'MEMBER_JOINED'` is logged.
- [ ] **Timeline Display:** Navigate to project Activity tab. Verify feed renders actor name, action text, and relative timestamp for each event.
- [ ] **Infinite Scroll:** Verify that scrolling past 20 entries loads the next page of activity records.

### Feature 2.4: Dashboard Analytics Verification
- [ ] **Stats Cards:** Verify the analytics page renders cards for: Total Projects, Active Projects, Completed Projects, Total Tasks, Completed Tasks, Overdue Tasks, Team Members.
- [ ] **Overdue Count Accuracy:** Create tasks with past due dates. Verify the Overdue Tasks count increments correctly.
- [ ] **Workload Breakdown:** Verify a workload chart/section renders per-member task counts.
- [ ] **Trend Chart:** Verify a line or bar chart renders task completion trend over time (grouped by day).
- [ ] **Data Scoping:** Verify all analytics are scoped to the active `organization_id` only — no cross-tenant data leakage.
- [ ] **Performance:** Verify dashboard analytics page loads in under 2 seconds.

### Feature 2.5: Task Labels & Saved Views Verification
- [ ] **Label Creation:** Create a label `"Bug"` with a red color. Verify `labels` record inserted with correct `name`, `color`, and `organization_id`.
- [ ] **Label Assignment:** Assign the `"Bug"` label to a task. Verify label badge renders on the task card and task detail view.
- [ ] **Label Scoping:** Verify labels available in the dropdown are scoped to the active organization only.
- [ ] **Save View:** Apply a filter (e.g., Priority = HIGH) and click "Save View". Verify a `saved_views` record is inserted with the correct `filters` JSON.
- [ ] **Load Saved View:** Navigate away, then return and load the saved view. Verify the filter is restored and the task list is correctly filtered.
- [ ] **Delete Saved View:** Delete a saved view. Verify the `saved_views` record is removed from the DB.

### Feature 2.6: Search & Team Directory Verification
- [ ] **Global Search — Projects:** Open the search modal and query a project name. Verify matching projects appear in results.
- [ ] **Global Search — Tasks:** Search for a task title. Verify matching tasks appear under the Tasks category.
- [ ] **Global Search — Members:** Search for a member name. Verify matching members appear under the Members category.
- [ ] **Full-Text Search:** Search using a keyword from a task description. Verify results are returned using the `tsvector` index.
- [ ] **Search Scoping:** Verify search results are scoped to the active `organization_id` — no cross-tenant results.
- [ ] **Search Performance:** Verify search results return in under 1 second.
- [ ] **Team Directory Renders:** Navigate to the Team page. Verify all organization members are listed in a grid with Name, Role, Assigned Tasks count, and Active Projects count.
- [ ] **Workload Stats:** Verify assigned task counts on the team directory are accurate for each member.

### Feature 2.7: Advanced Notifications Verification
- [ ] **Overdue Task Notification:** Let a task pass its due date. Verify a `task overdue` notification is triggered for the assignee.
- [ ] **Sprint Started Notification:** Start a sprint. Verify a `sprint started` notification is triggered for all org members.
- [ ] **Sprint Ended Notification:** Complete a sprint. Verify a `sprint ended` notification is triggered for all org members.
- [ ] **Member Invited Notification:** Invite a new member. Verify a `member invited` notification is triggered.
- [ ] **Project Completed Notification:** Set a project status to COMPLETED. Verify a `project completed` notification is triggered.
- [ ] **Notification Preferences:** Verify notification preferences (In App, Email) can be toggled per user and are respected by the notification system.


