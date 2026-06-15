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

## E-2-E Smoke Test Verification Flow
- [ ] **Step 1: Org Setup:** Register User A (`alice@devops.com`) -> Create organization `"DevOps Pioneers"` (slug `"devops-pioneers"`) -> Verify OWNER role in database.
- [ ] **Step 2: Team Invites:** Register User B (`bob@devops.com`) -> Alice invites Bob as `MEMBER` -> Bob switches to workspace -> Verify role in DB.
- [ ] **Step 3: Project & Tasks:** Alice creates project `"Frontend Redesign"` -> Creates high-priority task `"Implement Navbar Component"` assigned to Bob.
- [ ] **Step 4: Real-time Collaboration:** Bob receives notification -> Changes task status to `IN_PROGRESS` -> Comments: *"Beginning implementation"* -> Alice receives notifications.
- [ ] **Step 5: File Upload:** Bob uploads `navbar_draft.png` (250KB) -> Alice reviews and downloads from task details successfully.
- [ ] **Step 6: Completion:** Bob sets task to `DONE` -> Verify dashboard completion counter increments.
