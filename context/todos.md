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
- [x] **`sprints` Table:** Verify fields: `id`, `organization_id`, `name`, `goal`, `start_date`, `end_date`, `status` (PLANNED, ACTIVE, COMPLETED, CANCELLED), `created_at`. Enforce FK to `organizations.id`.
- [x] **`activities` Table:** Verify fields: `id`, `organization_id`, `project_id`, `user_id` (actor), `action_type`, `metadata` (jsonb), `created_at`. Enforce FK to `organizations.id`.
- [x] **`labels` Table:** Verify fields: `id`, `organization_id`, `name`, `color`. Enforce FK to `organizations.id` and unique constraint on `(organization_id, name)`.
- [x] **`saved_views` Table:** Verify fields: `id`, `user_id`, `organization_id`, `name`, `filters` (jsonb). Enforce FK to `profiles.id`.
- [x] **`tasks` Table (migration):** Verify new `sprint_id` (nullable FK to `sprints.id`), `board_index` (int), and `label_ids` (array or junction) columns added correctly.
- [x] **Full-Text Search Index:** Verify `to_tsvector` index on `tasks(title, description)` for search performance.

### Page Routing & Directory Scaffolding
- [x] **Sprints Page (`/sprints`):** Verify page routing and sprint list layout renders (Planned, Active, Completed groups).
- [x] **Kanban Board (`/projects/[id]/board`):** Verify dynamic board page routing and 3-column grid layout renders.
- [x] **Activity Feed (`/projects/[id]/activity`):** Verify dynamic activity page routing and timeline layout renders.
- [x] **Analytics Dashboard (`/analytics`):** Verify page routing and stats card placeholders render.
- [x] **Team Directory (`/team`):** Verify page routing and member grid layout renders.
- [x] **Global Search Modal:** Verify search modal is accessible from the header and opens correctly.
- [x] **Updated Navigation:** Verify sidebar navigation includes all new V2 links: Team, Boards, Sprints, Activity, Analytics.

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
- [x] **Board Renders:** Navigate to a project's board view. Verify 3 columns (TODO, IN_PROGRESS, DONE) render with correct task cards.
- [x] **Card Contents:** Verify each card displays: title, label badge, assignee avatar, priority indicator, and due date.
- [x] **Drag & Drop:** Drag a task card from TODO to IN_PROGRESS. Verify `status` and `board_index` update correctly in the `tasks` table.
- [x] **Drag Indicator:** Verify dashed border/drag indicator appears on the target column during an active drag.
- [x] **Header Sync Spinner:** Verify a loading spinner appears in the board header during the status update action.
- [x] **Multi-Tenant Isolation:** Verify board only displays tasks scoped to the active `organization_id`.

### Feature 2.3: Project Activity Feed Verification
- [x] **Event Logging — Task Created:** Create a task. Verify an `activities` record is inserted with `action_type = 'TASK_CREATED'`.
- [x] **Event Logging — Task Assigned:** Assign a task to a member. Verify an `activities` record with `action_type = 'TASK_ASSIGNED'` is logged.
- [x] **Event Logging — Task Completed:** Set task status to DONE. Verify `action_type = 'TASK_COMPLETED'` activity is logged.
- [x] **Event Logging — Comment Added:** Post a comment. Verify `action_type = 'COMMENT_ADDED'` activity is logged.
- [x] **Event Logging — Member Joined:** Invite and accept a member. Verify `action_type = 'MEMBER_JOINED'` is logged.
- [x] **Timeline Display:** Navigate to project Activity tab. Verify feed renders actor name, action text, and relative timestamp for each event.
- [x] **Infinite Scroll:** Verify that scrolling past 20 entries loads the next page of activity records.

### Feature 2.4: Dashboard Analytics Verification
- [x] **Stats Cards:** Verify the analytics page renders cards for: Total Projects, Active Projects, Completed Projects, Total Tasks, Completed Tasks, Overdue Tasks, Team Members.
- [x] **Overdue Count Accuracy:** Create tasks with past due dates. Verify the Overdue Tasks count increments correctly.
- [x] **Workload Breakdown:** Verify a workload chart/section renders per-member task counts.
- [x] **Trend Chart:** Verify a line or bar chart renders task completion trend over time (grouped by day).
- [x] **Data Scoping:** Verify all analytics are scoped to the active `organization_id` only — no cross-tenant data leakage.
- [x] **Performance:** Verify dashboard analytics page loads in under 2 seconds.

### Feature 2.5: Task Labels & Saved Views Verification
- [x] **Label Creation:** Create a label `"Bug"` with a red color. Verify `labels` record inserted with correct `name`, `color`, and `organization_id`.
- [x] **Label Assignment:** Assign the `"Bug"` label to a task. Verify label badge renders on the task card and task detail view.
- [x] **Label Scoping:** Verify labels available in the dropdown are scoped to the active organization only.
- [x] **Save View:** Apply a filter (e.g., Priority = HIGH) and click "Save View". Verify a `saved_views` record is inserted with the correct `filters` JSON.
- [x] **Load Saved View:** Navigate away, then return and load the saved view. Verify the filter is restored and the task list is correctly filtered.
- [x] **Delete Saved View:** Delete a saved view. Verify the `saved_views` record is removed from the DB.

### Feature 2.6: Search & Team Directory Verification
- [x] **Global Search — Projects:** Open the search modal and query a project name. Verify matching projects appear in results.
- [x] **Global Search — Tasks:** Search for a task title. Verify matching tasks appear under the Tasks category.
- [x] **Global Search — Members:** Search for a member name. Verify matching members appear under the Members category.
- [x] **Full-Text Search:** Search using a keyword from a task description. Verify results are returned using the `tsvector` index.
- [x] **Search Scoping:** Verify search results are scoped to the active `organization_id` — no cross-tenant results.
- [x] **Search Performance:** Verify search results return in under 1 second.
- [x] **Team Directory Renders:** Navigate to the Team page. Verify all organization members are listed in a grid with Name, Role, Assigned Tasks count, and Active Projects count.
- [x] **Workload Stats:** Verify assigned task counts on the team directory are accurate for each member.

### Feature 2.7: Advanced Notifications Verification
- [x] **Overdue Task Notification:** Let a task pass its due date. Verify a `task overdue` notification is triggered for the assignee.
- [x] **Sprint Started Notification:** Start a sprint. Verify a `sprint started` notification is triggered for all org members.
- [x] **Sprint Ended Notification:** Complete a sprint. Verify a `sprint ended` notification is triggered for all org members.
- [x] **Member Invited Notification:** Invite a new member. Verify a `member invited` notification is triggered.
- [x] **Project Completed Notification:** Set a project status to COMPLETED. Verify a `project completed` notification is triggered.
- [x] **Notification Preferences:** Verify notification preferences (In App, Email) can be toggled per user and are respected by the notification system.

---

# ProjectForge: Version 3 (Work OS) Verification Guidelines & Todos

This document lists the technical verification checklists and manual E2E test steps for **Version 3 (Work OS)**, organized by domain modules, database setup, page routing, and individual feature components.

---

we are building version 3 (prd_versions/v3.md)

## Phase 3 Database & Schema Setup Checklist

### New Database Tables & Schema Verification
- [ ] **`workflows` Table:** Verify fields: `id`, `organization_id`, `name`, `trigger` (string), `conditions` (jsonb), `actions` (jsonb), `enabled` (boolean), `created_at`. Enforce FK to `organizations.id`.
- [ ] **`time_entries` Table:** Verify fields: `id`, `task_id`, `user_id`, `start_time` (timestamp), `end_time` (timestamp/nullable), `duration` (integer), `created_at`. Enforce FK to `tasks.id` and `profiles.id`.
- [ ] **`audit_logs` Table:** Verify fields: `id`, `actor_id` (nullable FK to `profiles.id`), `action` (string), `entity_type` (string), `entity_id` (string), `metadata` (jsonb), `created_at` (timestamp).
- [ ] **`api_keys` Table:** Verify fields: `id`, `organization_id`, `name`, `key_hash` (string), `expires_at` (timestamp), `created_at`. Enforce FK to `organizations.id`.
- [ ] **`task_dependencies` Table:** Verify fields: `id`, `source_task_id`, `target_task_id`, `type` (string), `created_at`. Enforce FKs to `tasks.id`.
- [ ] **`project_templates` Table:** Verify fields: `id`, `name`, `description`, `tasks_schema` (jsonb), `created_at`.
- [ ] **Custom Task Workflows Schema:** Verify table or column structure supporting customizable status sequences (e.g. statuses array or custom status mapping in `projects` or `organizations`).

### Page Routing & Directory Scaffolding
- [ ] **Workflows Dashboard (`/workflows`):** Verify page routing and active/inactive workflow list view.
- [ ] **Workflow Builder (`/workflows/new` or `/workflows/[id]`):** Verify builder canvas, trigger selection, conditions editor, and actions selector.
- [ ] **Time Tracking Dashboard (`/time`):** Verify personal time logs, active timer interface, and project-wide tracking.
- [ ] **Audit Logs Viewer (`/settings/audit-logs`):** Verify query filters (actor, date range, action type) and event table renders.
- [ ] **Developer Settings (`/settings/developer`):** Verify API key generation interface, rate limit indicators, and webhook subscription settings.
- [ ] **Advanced Search Dashboard (`/search`):** Verify deep filter panels (projects, tasks, comments, files, dates) and full-text search results page.
- [ ] **Reporting & Analytics Center (`/reports`):** Verify custom reports builder, export options, and chart components (productivity, velocity, health).
- [ ] **Workload Planner (`/team/workload`):** Verify capacity planning calendar, workload distribution grid, and capacity utilization bar chart.
- [ ] **Project Template Selector (`/projects/new/templates`):** Verify layout displaying preset templates (Mobile App, Marketing, etc.).

---

## Component-by-Component Checklists

### Feature 3.1: Workflow Automation Verification
- [x] **Workflow Creation & Rule Parsing:** Create workflow with trigger `task.created` -> action `assign to team lead`. Verify JSON structure in `workflows` table.
- [x] **Automation Engine Execution:** Trigger a workflow action (e.g. create a task). Verify the rule engine evaluates conditions and automatically performs the defined actions (e.g. updates assignee).
- [x] **Loop Prevention:** Trigger dependent workflows. Verify that recursive execution cycles are detected and terminated.
- [x] **Toggle Workflow State:** Enable/disable a workflow. Verify execution blocks when state is disabled.

### Feature 3.2: Custom Task Workflows Verification
- [ ] **Status Sequence Definition:** Configure custom statuses `[Draft, Review, Approved, Published]` for a project. Verify tasks in this project are constrained to these statuses.
- [ ] **Status Transition Rules:** Set task status updates. Verify only permitted transitions are allowed and invalid moves are rejected.
- [ ] **Kanban Column Alignment:** Verify Kanban Board columns dynamically update to match the custom status configurations of the project.

### Feature 3.3: Time Tracking Verification
- [ ] **Live Timer Lifecycle:** Start timer on a task. Verify `time_entries` inserts record with null `end_time`. Stop timer. Verify `end_time` and `duration` compute and save.
- [ ] **Manual Time Log:** Enter manual log (e.g. 2 hours on yesterday's task). Verify validation rules reject negative/future dates.
- [ ] **Task Time Accumulator:** Verify task details view aggregates total hours tracked from all users on that task.
- [ ] **Reporting Exports:** Generate project time report. Verify CSV/PDF export formats correctly.

### Feature 3.4: Audit Logs Verification
- [ ] **Critical Action Logging:** Delete a project or update a member role. Verify an audit log record is created with accurate metadata and actor details.
- [ ] **Audit Logs Pagination:** Verify that log list handles filtering and pagination under high volume.
- [ ] **Immutability Check:** Attempt to modify or delete an audit log entry via API. Verify access is blocked (read-only enforcement).

### Feature 3.5: AI Assistant Verification

#### Backend / API Verification
- [ ] **AI Assistant Router / Actions:** Verify that the Server Action `actions/ai.ts` successfully connects to NVIDIA GPT OSS 120B via OpenAI client with temperature 0.7 for summaries and 0.3 for structured suggestions.
- [ ] **Project Summarization Prompt & Payload:** Verify that the project summarization action correctly compiles project name, current status, active sprint name/goal, list of tasks, and milestones before querying the model.
- [ ] **Task Breakdown Suggestions (JSON validation):** Verify that the task breakdown suggestion action requests a JSON output containing an array of subtasks, validates the structure via Zod, and successfully inserts the subtasks into the database.
- [ ] **Risk Detection Algorithm:** Verify that risk detection logic combines overdue tasks and task dependency mappings, identifies blocker loops, and prompts the LLM to summarize high-risk tasks.
- [ ] **AI Quota & Rate-Limiting:** Verify that every AI query inserts a record into the `ai_usages` table and checks if the count exceeds 10 queries/day per user/org, returning a `429 Rate Limit Exceeded` error if blocked.
- [ ] **Error Catch-Blocks & Logger:** Verify that all AI endpoints are wrapped in try/catch, log errors to Pino, capture exceptions in Sentry, and record failed/successful runs in `agent_logs`.

#### Frontend / UI Verification
- [ ] **Project Summarization Modal:** Verify that clicking "Summarize Project" in the project details header displays a sketchy loading skeleton, executes the server action, and renders the Markdown response inside a whiteboard-themed drawer.
- [ ] **Task Breakdown suggestions in Drawer:** Verify that clicking "AI Suggest Subtasks" in the `TaskDetailsSheet` displays a checklist of suggestions. Selecting items and clicking "Import" inserts them as subtasks and triggers a TanStack query refetch.
- [ ] **Risk Indicators & Panel:** Verify that the Project Details view renders an "AI Risk Analysis" tab showing high-risk tasks, overdue statuses, and unresolved blockers, with visual highlight indicators.
- [ ] **Quota Error Alerts:** Simulate a quota breach (e.g. set user's query count to 10 in DB). Verify the UI renders a whiteboard-themed warning toast: `"AI assistant quota reached for today (max 10 queries)"`.

### Feature 3.6: Advanced Search Verification
- [ ] **Multi-Entity Indexing:** Perform search. Verify results return matching instances across projects, tasks, comments, and files.
- [ ] **Saved Filters:** Save a complex query. Re-open search page and verify search criteria automatically populates.

### Feature 3.7: Reporting & Workload Management Verification
- [ ] **Workload Distribution Visuals:** Verify workload planner charts capacity utilization correctly based on assigned task weights/hours.
- [ ] **Project Health Metrics:** Calculate project health. Verify metric updates dynamically based on overdue ratios, blocked tasks, and velocity.

### Feature 3.8: Dependency & Project Templates Verification
- [ ] **Task Dependency Blocking:** Create dependency Task B blocked by Task A. Attempt to mark Task B as completed. Verify the UI blocks transition and warns of unresolved blocker.
- [ ] **Template Scaffolding:** Create project from "Website Launch" template. Verify all predefined tasks, statuses, and default assignments are instantiated in the new project.
