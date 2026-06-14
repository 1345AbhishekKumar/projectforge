# ProjectForge: Comprehensive Engineering Build Plan & Blueprint

This document defines the complete, step-by-step engineering roadmap for building **ProjectForge**, an Intelligent Work Operating System. It bridges front-end layout configurations, validation parameters, data models, and backend system logic, dividing the development lifecycle into 5 distinct phases corresponding directly to version milestones (PRD V1.0 to V5.0).

---

## Workspace Setup & Architecture Core

### Directory Structure & Layout Boundaries
To prevent architectural drift and maintain strict separation of concerns, ProjectForge is organized into distinct functional layers inside the Next.js App Router workspace:
1. **`/actions` (Server Actions)**: Contains Server-side Actions with the `"use server"` directive. This layer handles all state mutations, session verification checks, validation, and direct database write transactions.
2. **`/app` (App Router Pages)**: Routing logic and page layout compositions. Pages act as presentation shells that fetch data on the server and pass it to components. No direct database queries or raw SQL operations occur in page components.
3. **`/components` (UI Modules)**: Reusable presentation components divided into `/layout` (navbar, footer), `/ui` (primitive buttons, inputs, dialogs), and feature-specific folders (e.g. `/components/tasks`).
4. **`/lib` (Services & Clients)**: Third-party client initializations (PostgreSQL database pool connections, storage helper utilities, PostHog integrations).
5. **`/types` (TypeScript Schemas)**: Strict TypeScript type declarations mapping database tables, API payloads, and component props interfaces.

### Design Tokens & Tailwind Core
Theme configurations are declared directly under `@theme` inside `app/globals.css`. Color palettes (primary, border, status indicators) use custom HSL variables to maintain design consistency without raw hex definitions in component markups:
- `--color-brand-purple`: `hsl(255, 96%, 67%)` (Primary Interactive Brand Color)
- `--color-brand-purple-hover`: `hsl(255, 96%, 62%)`
- `--color-bg-primary`: `hsl(0, 0%, 100%)` (Page Background)
- `--color-bg-secondary`: `hsl(210, 20%, 98%)` (Card/Sidebar Background)
- `--color-border-subtle`: `hsl(220, 14%, 93%)` (Dividers and Borders)
- `--color-text-primary`: `hsl(220, 40%, 10%)` (Headings)
- `--color-text-secondary`: `hsl(220, 10%, 40%)` (Body text)
- `--color-status-success`: `hsl(150, 80%, 38%)`
- `--color-status-warning`: `hsl(35, 90%, 50%)`
- `--color-status-danger`: `hsl(0, 84%, 60%)`

---

## Phase 1: V1.0 - Core Project Management Tool (MVP)
*Objective:* Build a secure multi-tenant project and task collaboration environment with files, comments, and notifications.

### Feature 1.1: Landing Page
- **UI & Layout Design Detailed Breakdown:**
  - **Global Header / Navbar:** Sticky container (`height: 64px`), background color `#FFFFFF`, border-bottom `1px solid var(--color-border-subtle)`. Displays Logo (`font-weight: 700`, `letter-spacing: -0.025em`) on the left. Displays desktop nav links ("Dashboard", "Projects", "Settings") with `gap-x-6` horizontal flex layout. The rightmost element is the primary "Start for free" button (`background: var(--color-brand-purple)`, `color: #FFFFFF`, `border-radius: 8px`, `padding: 8px 16px`, `font-size: 14px`, `font-weight: 500`). Responsive design hides links on mobile, showing a hamburger menu.
  - **Hero Section Layout:** Responsive centered vertical flex column layout (`padding-top: 96px`, `padding-bottom: 96px`). Main headline heading `h1` (`font-size: 48px` on desktop, `32px` on mobile, `font-weight: 800`, color `var(--color-text-primary)`, line-height `56px`), secondary description paragraph (`font-size: 18px`, color `var(--color-text-secondary)`, line-height `28px`, `max-width: 680px`, centered margin). Features a dual-button CTA container (`gap-x-4` layout): a primary "Get Started" button (purple) and a secondary "Quick Tour" button (hollow outline).
  - **Dashboard Preview Component:** Centered container showcasing a high-fidelity image mockup illustrating the workspace board. Configured with a light drop shadow (`box-shadow: 0 4px 20px rgba(0,0,0,0.05)`), border-radius `12px`, and thin border `1px solid var(--color-border-subtle)` to blend with the white background.
  - **Features Grid:** Three-column responsive grid layout (`gap-8`, padding `64px` vertical). Each column houses a feature card (`background: #FFFFFF`, border `1px solid var(--color-border-subtle)`, border-radius `16px`, padding `24px`). Cards contain:
    - An HSL colored icon container (bg purple-light).
    - An `h3` subheader (`font-size: 18px`, `font-weight: 600`, color `var(--color-text-primary)`, margin-bottom `8px`).
    - A descriptive body copy paragraph (`font-size: 14px`, color `var(--color-text-secondary)`, line-height `20px`).
  - **Testimonial Section:** Centered section with section header, subheadline, and a grid layout holding customer review quotes. Cards are structured using border-radius `12px` and styled light backgrounds.
  - **Bottom CTA Section:** Centered block with banner header, subheadline description, and a primary "Sign Up Now" button repeating the visual styles of the primary navbar button.
  - **Footer:** Full-width block displaying columns for product links, legal links, and copyrights text.
  - **State Lifecycles:**
    - **Loading State:** Minimal skeleton loaders matching navbar elements and hero outlines during initial session verification to prevent layout shift.
    - **Session State:** If the user is authenticated, the "Start for free" button switches text to "Go to Dashboard" and changes redirect destination.
- **Backend Logic & Routing:**
  - **Session Check:** On page load, read session metadata via JWT token in HTTP-only cookies.
  - **Redirect Trigger:** Clicking "Get Started", "Start for free", or navbar links redirects to `/dashboard` if authenticated, or to `/login` if unauthenticated.
  - **SQL Schema/Access Pattern:**
    ```sql
    -- Check active user session
    SELECT id, email FROM profiles WHERE id = $1 LIMIT 1;
    ```

### Feature 1.2: Authentication & Onboarding
- **UI & Layout Design Detailed Breakdown:**
  - **Login Card Layout:** Centered card wrapper (`max-width: 440px`, padding `32px`, border-radius `16px`, background `#FFFFFF`, border `1px solid var(--color-border-subtle)`, shadow `0 4px 12px rgba(0,0,0,0.05)`). Tab headers switch between "Login" and "Sign Up" dynamically updating the form layout.
  - **Sign Up Form Fields:**
    - Label: `Full Name` | Placeholder: `e.g. John Doe` | Validation: Required, string, max 100 characters.
    - Label: `Email Address` | Placeholder: `e.g. john@example.com` | Validation: Required, valid email format regex.
    - Label: `Password` | Placeholder: `••••••••` | Validation: Required, minimum 8 characters.
  - **Action Button:** "Continue" primary button. Includes a loading spinner indicator during auth transactions, setting button to disabled.
  - **Social Logins:** OAuth buttons for "Sign in with Google" and "Sign in with GitHub" with responsive flex layout.
  - **State Lifecycles:**
    - **Inline Warnings:** Displays small red text (`var(--color-status-danger)`, `font-size: 12px`) directly beneath invalid inputs when blur event triggers.
    - **Global Error Banner:** Slides down from top of card displaying database connection or credential failures.
    - **Success State:** Micro-animation scale checkmark before auto-redirecting to dashboard.
- **Backend Logic & Routing:**
  - **Authentication Middleware:** Configure Clerk Middleware in `middleware.ts` to protect all routes except `/` (landing page), `/login`, `/signup`, and `/api/webhooks/clerk`.
  - **Database Sync Webhook:** Build a Clerk webhook route handler at `app/api/webhooks/clerk/route.ts` that listens for the `user.created` event payload, validates the webhook signature, and inserts a new profile record into the `profiles` table.
  - **Clerk Sync Schema/Insert Pattern:**
    ```typescript
    // In app/api/webhooks/clerk/route.ts
    // Extract user metadata from Clerk payload and write to Profiles table
    const { id, first_name, last_name, email_addresses, image_url } = payload.data;
    const email = email_addresses[0]?.email_address;
    const fullName = `${first_name || ""} ${last_name || ""}`.trim();
    
    const insforge = await createInsforgeServer();
    await insforge
      .from("profiles")
      .insert({
        id: id, // maps Clerk user ID
        full_name: fullName,
        email: email,
        avatar_url: image_url,
      });
    ```

### Feature 1.3: Multi-Tenant Workspace (Organizations)
- **UI & Layout Design Detailed Breakdown:**
  - **Create Org Form Page (`/organizations/create`):**
    - Grid layout wrapper centered on screen.
    - Label: `Organization Name` | Placeholder: `e.g. Acme Corporation` | Validation: Required, string, minimum 3, maximum 50 characters.
    - Label: `Workspace URL Slug` | Placeholder: `acme-corp` | Validation: Required, lowercase alphanumeric and hyphens only (`/^[a-z0-9-]+$/`), must be unique.
    - Helper description below slug: "This will be used in your public URL workspace selector."
    - Action button: "Create Workspace" with loading spinner and disabled state when inputs are invalid.
  - **Workspace Selector Sidebar Dropdown:** Top left dropdown container showing active organization name with down arrow icon. Displays list of other organizations user is member of, plus a bottom CTA "Create new organization" link leading to `/organizations/create`.
  - **State Lifecycles:**
    - **Validation Error State:** Check slug uniqueness live via debounced Server Action. Display green tick if available, or warning "Slug is already taken" in red if occupied.
- **Backend Logic & Routing:**
  - **Organization Insertion:** Insert workspace record into `organizations` table. Automatically insert a membership record under `public.memberships` mapping the creator to the target organization as `OWNER`.
  - **Session Sync:** Selecting an organization dropdown item updates a cookie storing `active_org_id`, triggering route revalidation to sync page data.
  - **SQL Queries:**
    ```sql
    -- Insert organization record
    INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id;
    -- Map creator membership
    INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, 'OWNER');
    ```

### Feature 1.4: Membership & Role Management
- **UI & Layout Design Detailed Breakdown:**
  - **Members Management Page (`/organizations/settings`):** Responsive flex layout. Left side lists members table; right side displays invitation drawer.
  - **Members Table Columns:** Member Name, Email Address, Role selection dropdown (`OWNER`, `ADMIN`, `MEMBER`), and a secondary "Remove Member" button (only visible to OWNER).
  - **Invite Modal / Drawer:**
    - Label: `Email Address` | Placeholder: `collaborator@example.com` | Validation: Required, valid email format.
    - Label: `Role` | Selector Dropdown: `ADMIN`, `MEMBER` | Validation: Required.
    - Primary Button: "Send Invitation".
  - **State Lifecycles:**
    - **Loading State:** Members table displays grey pulsing table row skeleton placeholders while fetching data.
    - **Success State:** Toast alert displaying "Invitation sent successfully to collaborator@example.com".
- **Backend Logic & Routing:**
  - **Membership Validation:** Verify requesting user has `OWNER` or `ADMIN` role in active organization memberships.
  - **Invitee Resolution:** Check if invitee email exists in profiles. If resolved, insert membership mapping, enforcing a unique constraint on `(organization_id, user_id)` to prevent duplicate entries.
  - **SQL Queries:**
    ```sql
    -- Authorization check query
    SELECT role FROM memberships WHERE organization_id = $1 AND user_id = $2;
    -- Check if invitee exists
    SELECT id FROM profiles WHERE email = $1;
    -- Add membership mapping
    INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, $3);
    ```

### Feature 1.5: Project Management
- **UI & Layout Design Detailed Breakdown:**
  - **Projects Directory Page (`/projects`):** List layout displaying project cards categorized by status columns. Features a "New Project" button at top.
  - **Project Form (`/projects/create`):**
    - Label: `Project Name` | Placeholder: `e.g. Website V2` | Validation: Required, max 100 characters.
    - Label: `Description` | Placeholder: `Project objectives...` | Validation: Max 500 characters.
    - Label: `Status` | Selector Dropdown: `PLANNING`, `ACTIVE`, `COMPLETED`, `ARCHIVED` | Validation: Required.
  - **Project Details (`/projects/[id]`):** Details header showing status badges, description summary, and sub-views tabs (Backlog, Members).
  - **State Lifecycles:**
    - **Empty State:** Shows icon (folder-open) in center, text "No projects in this workspace yet" and a "Create your first project" button when project count equals 0.
- **Backend Logic & Routing:**
  - **Read Isolation:** Scope project queries strictly by the user's active workspace session (`organization_id`). Verify membership permissions before processing write requests.
  - **SQL Queries:**
    ```sql
    -- Read projects query (multi-tenant)
    SELECT * FROM projects WHERE organization_id = $1 ORDER BY updated_at DESC;
    -- Insert project query
    INSERT INTO projects (name, description, status, organization_id) VALUES ($1, $2, $3, $4);
    ```

### Feature 1.6: Tasks Engine
- **UI & Layout Design Detailed Breakdown:**
  - **Task List View:** Layout rendering task rows inside project detail pages. Includes columns for Title, Assignee, Priority badge, Status badge, and Due Date.
  - **Task Form Modal:**
    - Label: `Task Title` | Placeholder: `e.g. Implement OAuth` | Validation: Required, max 150 characters.
    - Label: `Description` | Placeholder: `Task details...` | Validation: Max 1000 characters.
    - Label: `Assignee` | Select Dropdown: Lists active organization members.
    - Label: `Priority` | Select Dropdown: `LOW`, `MEDIUM`, `HIGH`, `URGENT` | Validation: Required.
    - Label: `Due Date` | Date Picker calendar.
  - **Task Details (`/tasks/[id]`):** Left column displaying description. Right column displaying metadata fields (Assignee selector, Status dropdown, Priority selector, Due Date picker).
  - **State Lifecycles:**
    - **Overdue State:** Displays due date badge in bold red (`var(--color-status-danger)`) with warning icon if current date > due date and status is not `COMPLETED`.
- **Backend Logic & Routing:**
  - **Task Mutations:** Server actions verifying parameters. Verify project and organization references. Update status and due-date states, logging changes.
  - **SQL Queries:**
    ```sql
    -- Update task status
    UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3;
    -- Create task query
    INSERT INTO tasks (title, description, assignee_id, priority, due_date, project_id, organization_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7);
    ```

### Feature 1.7: Comments & Attachments
- **UI & Layout Design Detailed Breakdown:**
  - **Comments Feed:** Vertical timeline of comment cards. Displays member avatar, name, content, creation timestamp, and a secondary "Delete" action button.
  - **Comment Form:** Input text area with a primary "Post Comment" button.
  - **Attachments Dropzone:** File input zone with dashed borders (`border: 2px dashed var(--color-border-subtle)`). Below it, list rows display upload progress bars, file name, size, upload timestamp, and direct download buttons.
  - **State Lifecycles:**
    - **File Validation Error:** Displays warning toast if file size exceeds 20MB or file type is forbidden.
    - **Upload State:** Renders progress percentage indicator (e.g. `"Uploading... 45%"`) inside a linear progress bar component.
- **Backend Logic & Routing:**
  - **Comment Mutations:** Validate comment body before inserting row. Trigger notifications to the task assignee if the comment author is different.
  - **Storage Actions:** Route payload to private InsForge storage buckets. Save references containing download URL, file name, and byte size under `attachments` table.
  - **SQL Queries:**
    ```sql
    -- Add comment record
    INSERT INTO comments (task_id, author_id, content) VALUES ($1, $2, $3);
    -- Insert attachment reference
    INSERT INTO attachments (task_id, uploader_id, file_name, file_size, storage_path)
    VALUES ($1, $2, $3, $4, $5);
    ```

### Feature 1.8: Notification Center
- **UI & Layout Design Detailed Breakdown:**
  - **Notifications Panel:** Scrollable tray showing cards grouped by date. Features type-specific icons (Comments, Task Assignments) and a "Mark all as read" button.
  - **State Lifecycles:**
    - **Indicator Badge:** Red circle overlay (`background: var(--color-status-danger)`) positioned over the top-right header bell icon representing the total count of unread entries.
    - **Empty State:** Shows centered text "You're all caught up!" with a check icon when unread count is 0.
- **Backend Logic & Routing:**
  - **Notification Actions:** Update notifications state to read. Run cleanup scripts purging notifications older than retention periods (e.g. 30 days).
  - **SQL Queries:**
    ```sql
    -- Mark notifications read
    UPDATE notifications SET read = TRUE WHERE user_id = $1 AND organization_id = $2;
    -- Fetch unread notifications
    SELECT * FROM notifications WHERE user_id = $1 AND read = FALSE ORDER BY created_at DESC;
    ```

---

## Phase 2: V2.0 - Work Management Platform
*Objective:* Extend V1.0 to include sprints management, Kanban boards, activity logs, dashboards, and search indexes.

### Feature 2.1: Sprint Management
- **UI & Layout Design Detailed Breakdown:**
  - **Sprints Dashboard View:** Rendered on `/sprints`. Main container structured as a split layout. Left side lists active, planned, and completed sprints in a vertical stacking list. Each row displays the sprint name, start and end dates formatted (e.g. `Jun 15 - Jun 29`), the goal description text, and a circular badge displaying the count of associated tasks. Right side acts as a context preview panel showing active task breakdowns, completion rates, and sprint burndown indicators.
  - **Sprint Creation Form Modal:** Pop-up modal wrapper (`max-width: 500px`).
    - Label: `Sprint Name` | Placeholder: `e.g. Q3 Sprint A` | Validation: Required, string, max 50 characters.
    - Label: `Sprint Goal` | Placeholder: `e.g. Implement user login and OAuth triggers` | Validation: Max 200 characters.
    - Label: `Start Date` | Date picker selector field | Validation: Required, must be a future date.
    - Label: `End Date` | Date picker selector field | Validation: Required, must be after start date.
    - Primary Button: "Save Sprint" (launches submitting state, loading spinner).
    - Cancel Button: Closes the modal without saving.
  - **Backlog Sprint Selector:** Interactive split-pane UI where user can drag task row elements from the project backlog column and drop them directly into active or planned sprint blocks.
  - **State Lifecycles:**
    - **Overlap Warning:** Instantly highlights start/end input fields in yellow with description text "Selected dates overlap with an existing sprint" if overlapping records exist in the database.
- **Backend Logic & Routing:**
  - **Sprints Storage:** Record sprints database records under `sprints` table, validating there are no overlapping dates for the target organization ID.
  - **Task Assignment:** Update `sprint_id` on the target task record. If the sprint status is set to `COMPLETED` or `CANCELLED`, restrict any further modifications on associated tasks to ensure audit integrity.
  - **SQL Queries:**
    ```sql
    -- Detect overlapping sprints
    SELECT id FROM sprints 
    WHERE organization_id = $1 
      AND (start_date, end_date) OVERLAPS ($2::date, $3::date);
    -- Insert sprint record
    INSERT INTO sprints (name, goal, start_date, end_date, organization_id)
    VALUES ($1, $2, $3, $4, $5);
    ```

### Feature 2.2: Kanban Board
- **UI & Layout Design Detailed Breakdown:**
  - **Board Columns Layout:** Rendered on `/projects/[id]/board`. Three-column grid layout spanning the full width of the screen. Columns are titled: `TODO` (`border-top: 3px solid #61A8FF`), `IN_PROGRESS` (`border-top: 3px solid #7C5CFC`), and `DONE` (`border-top: 3px solid #10B981`). Column headers display the status title and the task count badge.
  - **Kanban Card Component:** Task cards displaying the title (`font-size: 14px`, `font-weight: 500`, color `var(--color-text-primary)`), a small label indicator badge (color-coded category), the assignee's avatar image, a priority icon, and due-date warning indicators if overdue.
  - **Drag Interface:** Drag-and-drop mechanics. User click-drags card elements between column panels, triggering a visual slide transition animation.
  - **State Lifecycles:**
    - **Drop Indicator:** Shows dashed borders on columns when a card is dragged over, and changes background slightly.
    - **Network Sync Indicator:** A tiny sync spinner in the board header indicates the real-time websocket channel is connected.
- **Backend Logic & Routing:**
  - **Status Updates:** Dropping a card onto a column triggers the task status mutation server action, changing the status value in the database. Broadcast state update using real-time database channels to synchronize all team board views.
  - **SQL Queries:**
    ```sql
    -- Update task column status and order index
    UPDATE tasks SET status = $1, board_index = $2 WHERE id = $3 AND organization_id = $4;
    ```

### Feature 2.3: Project Activity Feed
- **UI & Layout Design Detailed Breakdown:**
  - **Timeline Feed Layout:** Vertical scrollable timeline of cards. Each card contains actor profile metadata (avatar, name), action description text (e.g. *"assigned task 'Setup DB' to User B"*), and relative time indicator (e.g. *"5 minutes ago"*).
  - **State Lifecycles:**
    - **Empty State:** Displays text "No activity recorded yet in this project."
    - **Infinite Scroll:** As the user scrolls near the bottom of the feed container, trigger a dynamic fetch requesting the next 20 entries, displaying a small inline loader.
- **Backend Logic & Routing:**
  - **Logger Trigger:** major server actions write record entries to `activities` table. Queries strictly filter records based on the user's active organization memberships to ensure security.
  - **SQL Queries:**
    ```sql
    -- Log activity record
    INSERT INTO activities (organization_id, project_id, user_id, action_type, metadata)
    VALUES ($1, $2, $3, $4, $5);
    -- Fetch activity history with pagination
    SELECT a.*, p.full_name, p.avatar_url 
    FROM activities a
    JOIN profiles p ON a.user_id = p.id
    WHERE a.project_id = $1 AND a.organization_id = $2
    ORDER BY a.created_at DESC LIMIT $3 OFFSET $4;
    ```

### Feature 2.4: Dashboard Analytics
- **UI & Layout Design Detailed Breakdown:**
  - **Analytics Grid:** Four statistics cards displaying metrics: Active Projects, Tasks Completed, Overdue Tasks Count, and Team Workload utilization rate.
  - **Charts Wrapper:** Two chart blocks displaying task completions trends (line chart) and task distributions by priority (bar chart).
  - **State Lifecycles:**
    - **Query Fetching State:** Cards render grey gradient pulsing skeletons.
    - **Empty State:** Charts render a grey grid backdrop with text overlay "No data collected for this period" when statistics yield zero logs.
- **Backend Logic & Routing:**
  - **Data Aggregation:** Aggregate metrics using SQL views grouped by status and priority filtered by organization. Trigger tracking events for dashboards.
  - **SQL Queries:**
    ```sql
    -- Task completion rate statistics
    SELECT DATE_TRUNC('day', completed_at) AS day, COUNT(id) AS count
    FROM tasks
    WHERE organization_id = $1 AND status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY day ORDER BY day;
    ```

### Feature 2.5: Task Labels & Saved Views
- **UI & Layout Design Detailed Breakdown:**
  - **Labels Settings:** Modal panel to manage category labels (create label name, choose color token).
  - **Filters Sidebar:** Panel under task views listing saved views (e.g. "My Overdue Bugs") with a "Save Current Filters" action.
  - **State Lifecycles:**
    - **Save View Modal:** Prompt input asking for "View Name" (max 30 characters). Form verifies that the name is not duplicate.
- **Backend Logic & Routing:**
  - **Label Schema & Query:** Store configurations under labels and links tables. Enforce label references scopes.
  - **Saved Views Schema:** Store parameter configurations mapped to user IDs.
  - **SQL Queries:**
    ```sql
    -- Insert label record
    INSERT INTO labels (name, color, organization_id) VALUES ($1, $2, $3);
    -- Map label to task
    INSERT INTO task_labels (task_id, label_id) VALUES ($1, $2);
    -- Save custom filter view
    INSERT INTO saved_views (user_id, organization_id, name, filters) VALUES ($1, $2, $3, $4::jsonb);
    ```

### Feature 2.6: Search & Team Directory
- **UI & Layout Design Detailed Breakdown:**
  - **Search Modal Overlay:** Input dialog displaying live search results grouped by category (Projects, Tasks, Members).
  - **Team Directory Page:** Member grid displaying details, roles, and current task loading stats.
  - **State Lifecycles:**
    - **Loading Results:** Shows text "Searching..." inside search modal during key input debounces.
    - **No Results State:** Renders text "No projects, tasks, or members found matching 'abc'."
- **Backend Logic & Routing:**
  - **Full-Text Indexing:** Execute database queries searching full-text indices. Verify RLS tenant memberships constraints.
  - **SQL Queries:**
    ```sql
    -- Full-text task search query
    SELECT id, title, description, ts_rank_cd(to_tsvector('english', title || ' ' || description), query) AS rank
    FROM tasks, plainto_tsquery('english', $1) query
    WHERE organization_id = $2 AND to_tsvector('english', title || ' ' || description) @@ query
    ORDER BY rank DESC LIMIT 10;
    ```

---

## Phase 3: V3.0 - Execution Platform
*Objective:* Introduce automation rules, custom pipelines, timesheets, AI assistance, integrations, and webhooks.

### Feature 3.1: Workflow Automation
- **UI & Layout Design Detailed Breakdown:**
  - **Workflow Dashboard View:** Rendered on `/workflows`. Displays a list of card items containing the workflow name, description, active toggle switch, and a secondary "Edit" button.
  - **Workflow Builder Canvas:** Interactive drag-builder UI.
    - **Trigger Nodes Card:** Select triggers (e.g. "On Task Status Change", "On Task Creation", "On Due Date Approaching").
    - **Condition Nodes Card:** Select condition criteria (e.g. "Priority is set to URGENT", "Assignee equals User A", "Project equals Project X").
    - **Action Nodes Card:** Select action parameters (e.g. "Notify Assignee", "Reassign Task to User B", "Create task 'QA Review'").
  - **State Lifecycles:**
    - **Validation Error:** Highlights canvas elements in red if nodes are unconnected or loops are formed. Shows toast warning.
- **Backend Logic & Routing:**
  - **Rule Processing Engine:** Database triggers run checks when writes occur. Evaluates active workflow triggers, validates condition checks, and executes actions sequentially. Keeps execution logs in `workflow_history` tables.
  - **SQL Queries:**
    ```sql
    -- Save workflow definition
    INSERT INTO workflows (name, trigger_event, conditions, actions, is_active, organization_id)
    VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6);
    -- Log automation execution
    INSERT INTO workflow_history (workflow_id, task_id, status, error_message)
    VALUES ($1, $2, $3, $4);
    ```

### Feature 3.2: Custom Task Workflows
- **UI & Layout Design Detailed Breakdown:**
  - **Status Pipelines Designer:** Admin panel displaying current task statuses in a list. Includes drag handles to reorder transitions, color pickers to assign color badges, and form inputs:
    - Label: `Status Name` | Placeholder: `e.g. In Review` | Validation: Required, max 20 characters.
    - Label: `Category` | Selector: `TODO`, `IN_PROGRESS`, `DONE` | Validation: Required.
  - **State Lifecycles:**
    - **Transition Error:** In task details page, if a user tries to change state to a prohibited status, display cross symbol and hover tooltip "Transition not allowed by organization pipeline rules."
- **Backend Logic & Routing:**
  - **Pipeline Schemas:** Store pipeline configurations per organization under `custom_statuses` table. Check transitions rules before performing updates on database tasks status columns.
  - **SQL Queries:**
    ```sql
    -- Insert custom status
    INSERT INTO custom_statuses (name, category, organization_id, sort_order)
    VALUES ($1, $2, $3, $4);
    -- Check transition permission query
    SELECT allowed FROM transition_rules 
    WHERE organization_id = $1 AND from_status = $2 AND to_status = $3;
    ```

### Feature 3.3: Time Tracking & Audit Logs
- **UI & Layout Design Detailed Breakdown:**
  - **Time Tracking Widget:** Top bar floating stopwatch widget showing active timer running, a task selection dropdown, pause/stop CTA buttons, and manual entry logs form fields (Hours, Description, Date).
  - **Audit Log Panel:** Non-editable table rendering historical changes, showing actor, action event, changed entity, before/after states parameters, and timestamps.
  - **State Lifecycles:**
    - **Timer Running State:** Text pulses orange (`var(--color-status-warning)`) incrementing seconds.
- **Backend Logic & Routing:**
  - **Time Log Mutations:** Record logs under `time_entries` table. Validate start/end times parameters before committing transactions.
  - **Audit Logging System:** Auto-insert rows to a read-only logging table on major database events (permission modifications, projects deletions).
  - **SQL Queries:**
    ```sql
    -- Record timer entry
    INSERT INTO time_entries (user_id, task_id, duration_seconds, description, recorded_date)
    VALUES ($1, $2, $3, $4, $5);
    -- Read-only trigger for audit logging
    CREATE OR REPLACE FUNCTION log_task_audit() RETURNS trigger AS $$
    BEGIN
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before_state, after_state)
      VALUES (auth.uid(), TG_OP, 'task', new.id, row_to_json(old), row_to_json(new));
      RETURN new;
    END;
    $$ LANGUAGE plpgsql;
    ```

### Feature 3.4: AI Assistant & Integrations
- **UI & Layout Design Detailed Breakdown:**
  - **AI Panel:** Chat sidebar drawer context panel displaying task summarizations, checklist suggestion boxes, and risk analysis summaries.
  - **Integrations Hub:** Panel displaying integration cards for Slack, GitHub, Google Drive, and Google Calendar. Cards display link status badges and "Configure" primary buttons.
  - **State Lifecycles:**
    - **AI Generating State:** Shows text "AI is thinking..." with anim-pulsing dots overlay.
- **Backend Logic & Routing:**
  - **LLM Integrations:** Send sanitized task content payloads to the AI model. Handle webhooks from external services (e.g. closing a GitHub PR updates task status to Completed).
  - **SQL Queries:**
    ```sql
    -- Save external integration token credentials
    INSERT INTO integration_credentials (organization_id, provider, credentials_encrypted)
    VALUES ($1, $2, pgp_sym_encrypt($3, $4));
    ```

### Feature 3.5: API Platform & Webhooks
- **UI & Layout Design Detailed Breakdown:**
  - **Developer Settings Page:** Displays developer tools. Left tab displays public API Keys lists, scopes, key names, and expiration dates. Right tab displays registered webhooks callback URLs list with status check badges.
  - **State Lifecycles:**
    - **Reveal Key Dialog:** Modal pops up showing newly created key string. Warning text: "Make sure to copy this key now, as you won't be able to see it again."
- **Backend Logic & Routing:**
  - **Key Authentication:** Implement middleware verifying API token authorization headers. Limit API requests using rate-limiting stores (e.g., Redis). Trigger outbound payloads to registered webhooks on matching database actions.
  - **SQL Queries:**
    ```sql
    -- Validate API key query
    SELECT organization_id, scopes FROM api_keys 
    WHERE key_hash = sha256($1::bytea) AND expires_at > NOW();
    -- Register Webhook URL
    INSERT INTO webhooks (organization_id, target_url, subscribed_events)
    VALUES ($1, $2, $3);
    ```

---

## Phase 4: V4.0 - Enterprise Operating System
*Objective:* Implement enterprise-grade portfolio management, custom schemas, capacity planning, and compliance structures.

### Feature 4.1: Portfolio & Program Management
- **UI & Layout Design Detailed Breakdown:**
  - **Portfolio Dashboard:** Executive view displaying program cards, aggregate budget statuses, and program health trackers.
  - **Hierarchy Nav:** Multi-level navigation panel mapping programs to parent portfolios. Shows drill-down folders mapping from Portfolio level to project cards list.
  - **State Lifecycles:**
    - **Drill Down Transition:** Expanding a portfolio category animates children elements sliding downwards.
- **Backend Logic & Routing:**
  - **Hierarchy Schema:** Model parent-child relations for portfolios, programs, and projects. Enforce permission hierarchies, propagating roles down the tree.
  - **SQL Queries:**
    ```sql
    -- Create portfolio entry
    INSERT INTO portfolios (name, description, organization_id) VALUES ($1, $2, $3);
    -- Select rollup progress for portfolio projects
    SELECT p.id, COALESCE(AVG(CASE WHEN t.status = 'COMPLETED' THEN 100 ELSE 0 END), 0) AS completion_percentage
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.portfolio_id = $1
    GROUP BY p.id;
    ```

### Feature 4.2: Advanced RBAC & Custom Fields
- **UI & Layout Design Detailed Breakdown:**
  - **Roles Permission Grid:** Table displaying custom roles against permissions checkboxes (e.g. "Approve workflows", "Delete projects", "Manage billings").
  - **Custom Fields Builder:** Task settings page to create fields (e.g. Cost Center, Story Points), select data types (Text, Number, Date, Select), and enforce validation rules.
  - **State Lifecycles:**
    - **Dynamic Fields Injection:** Automatically inserts custom field inputs inside task creation modals based on project field definitions.
- **Backend Logic & Routing:**
  - **Authorization Verification:** Check custom permissions records on Server Action calls. Validate dynamic field payloads against metadata configurations before updates.
  - **SQL Queries:**
    ```sql
    -- Validate RBAC permission
    SELECT EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1 AND ur.organization_id = $2 AND rp.permission = $3
    );
    -- Insert dynamic field definition
    INSERT INTO custom_field_definitions (name, field_type, validation_rules, project_id)
    VALUES ($1, $2, $3::jsonb, $4);
    ```

### Feature 4.3: Advanced Workflows
- **UI & Layout Design Detailed Breakdown:**
  - **Approval Flow Designer:** Visual timeline charting approval states requiring reviewer signatures.
  - **State Lifecycles:**
    - **Escalation Notification:** Displays urgent banner on task if SLA timeline is breached, highlighting background in red.
- **Backend Logic & Routing:**
  - **Escalation Rules:** Set up background cron jobs checking overdue tasks against SLA limits. Automatically escalate assignments or notify supervisors on breaches.
  - **SQL Queries:**
    ```sql
    -- Escalate overdue SLA tasks
    UPDATE tasks 
    SET assignee_id = escalation_user_id, updated_at = NOW()
    FROM sla_policies
    WHERE tasks.project_id = sla_policies.project_id
      AND tasks.status != 'COMPLETED'
      AND tasks.created_at + sla_policies.limit_duration < NOW()
      AND tasks.sla_escalated = FALSE;
    ```

### Feature 4.4: Resource & Risk Management
- **UI & Layout Design Detailed Breakdown:**
  - **Resource Grid:** Grid showing team members, project assignments, and allocation percentages.
  - **Risk Register:** Form to add risks, set impact levels, and write mitigation descriptions.
  - **State Lifecycles:**
    - **Over-allocation Indicator:** Highlights cell in red and outputs tooltip warning "User allocation exceeds 100% capacity" if aggregate loads exceed thresholds.
- **Backend Logic & Routing:**
  - **Capacity Checks:** Calculate allocation averages. Enforce warning triggers if workloads exceed thresholds.
  - **SQL Queries:**
    ```sql
    -- Calculate resource workload hours
    SELECT user_id, SUM(allocation_percentage) AS total_allocation
    FROM resource_assignments
    WHERE organization_id = $1 AND start_date <= $2 AND end_date >= $3
    GROUP BY user_id;
    ```

### Feature 4.5: SSO & Org Hierarchies
- **UI & Layout Design Detailed Breakdown:**
  - **SSO Settings Card:** Configuration inputs for SAML metadata URLs, client IDs, and certificate mappings.
  - **State Lifecycles:**
    - **SSO Active Info:** Displays checkmark next to "SSO Enabled" indicating authentication requests redirect to Identity Provider.
- **Backend Logic & Routing:**
  - **SAML Integrations:** Implement OAuth/SAML redirect handlers. Map identity provider attributes to profile parameters.
  - **SQL Queries:**
    ```sql
    -- Get SSO configurations for domain
    SELECT * FROM sso_configs WHERE email_domain = $1 LIMIT 1;
    ```

---

## Phase 5: V5.0 - Intelligent Organizational OS
*Objective:* Embed autonomous AI workers, semantic organizational knowledge graphs, digital twin simulations, and a partner marketplace.

### Feature 5.1: AI Agent Platform
- **UI & Layout Design Detailed Breakdown:**
  - **Agents Manager:** Directory listing virtual AI workers. Includes settings forms to define system prompts, select models, and set access permissions.
  - **State Lifecycles:**
    - **Agent Log Streaming:** Text panel outputting running logs of agent executions via SSE connections.
- **Backend Logic & Routing:**
  - **Agent Runtime:** Run agent routines in isolated sandboxes. Monitor token budgets.
  - **SQL Queries:**
    ```sql
    -- Insert AI Agent Definition
    INSERT INTO ai_agents (name, system_prompt, allowed_scopes, organization_id)
    VALUES ($1, $2, $3, $4);
    -- Log token usage
    INSERT INTO token_usage_logs (agent_id, tokens_spent, operation)
    VALUES ($1, $2, $3);
    ```

### Feature 5.2: Knowledge Graph & Memory
- **UI & Layout Design Detailed Breakdown:**
  - **Graph Visualizer:** Interactive node connection visualization charting relation paths between projects, users, and tasks.
  - **State Lifecycles:**
    - **Node Highlight:** Selecting a node details related tasks and dependencies in a sliding sidebar.
- **Backend Logic & Routing:**
  - **Vector Indices:** Store vectorized meeting logs and decisions. Query vector stores to provide semantic search contexts.
  - **SQL Queries:**
    ```sql
    -- Search semantic documents using pgvector
    SELECT id, content, cosine_distance(embedding, $1) AS distance
    FROM knowledge_embeddings
    WHERE organization_id = $2 AND cosine_distance(embedding, $1) < 0.3
    ORDER BY distance ASC LIMIT 5;
    ```

### Feature 5.3: Strategic Goal Management (OKRs)
- **UI & Layout Design Detailed Breakdown:**
  - **Goal Trees:** Hierarchy views showing company objectives and key result progress bars linked to task completion states.
  - **State Lifecycles:**
    - **Real-time Progress:** Completing a task animates progress bar moving forward.
- **Backend Logic & Routing:**
  - **Progress Automation:** Recalculate key result metrics dynamically when linked tasks are completed.
  - **SQL Queries:**
    ```sql
    -- Recalculate Objective key result completion percentage
    UPDATE key_results kr
    SET progress = (
      SELECT COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') * 100.0 / COUNT(t.id)
      FROM tasks t
      WHERE t.key_result_id = kr.id
    )
    WHERE kr.id = $1;
    ```

### Feature 5.4: Semantic Search & Digital Twin
- **UI & Layout Design Detailed Breakdown:**
  - **Natural Language Search Input:** Search bar executing conversational queries.
  - **Simulation Panel:** Input panel to run "what-if" planning scenarios (e.g., losing team members).
  - **State Lifecycles:**
    - **Simulation Graph:** Displays comparative projections representing timelines before and after running simulation variables.
- **Backend Logic & Routing:**
  - **Query Processing:** Parse conversational queries into semantic searches. Model resource allocations to run execution simulations.
  - **SQL Queries:**
    ```sql
    -- Fetch historic task completion statistics to calibrate simulation parameters
    SELECT project_id, AVG(completed_at - created_at) AS average_velocity
    FROM tasks
    WHERE organization_id = $1 AND status = 'COMPLETED'
    GROUP BY project_id;
    ```

### Feature 5.5: Developer Marketplace
- **UI & Layout Design Detailed Breakdown:**
  - **Marketplace Store:** Browse view to install integration plugins. Displays available category collections with primary install triggers.
  - **State Lifecycles:**
    - **Permission Grant Prompt:** Modal detailing app credentials scope requests before installation completes.
- **Backend Logic & Routing:**
  - **SDK Boundary Checks:** Run third-party plugins in secure, sandboxed APIs.
  - **SQL Queries:**
    ```sql
    -- Record installed marketplace app in organization
    INSERT INTO installed_apps (app_id, organization_id, installed_by, permissions_granted)
    VALUES ($1, $2, $3, $4::jsonb);
    ```

---

## Detailed E-2-E QA Verification Script

Use this manual verification script before releasing ProjectForge V1.0 to staging/production.

### Step 1: Organization Creation Flow
1. **Action:** Register **User A** via the registration UI page (`/signup`).
   - Input Full Name: `"Alice Founder"`
   - Input Email: `"alice@devops.com"`
   - Input Password: `"DevOps@2026!"`
   - Click "Register".
2. **Assertion:** Verify route transitions from `/signup` to `/dashboard`.
3. **Assertion:** Check that dashboard screen renders empty state UI message: "No active workspace. Please create or join an organization to get started."
4. **Action:** Navigate manually to `/organizations/create`.
5. **Action:** Enter Organization Name: `"DevOps Pioneers"` and URL Slug: `"devops-pioneers"`.
6. **Action:** Click the "Create Workspace" button.
7. **Assertion:** Confirm redirect back to `/dashboard` and verify dropdown selector at top left shows `"DevOps Pioneers"`.
8. **Verification Query:** Execute direct database inspection command:
   ```sql
   SELECT m.role, o.name FROM memberships m 
   JOIN organizations o ON m.organization_id = o.id 
   WHERE m.user_id = (SELECT id FROM profiles WHERE email = 'alice@devops.com');
   ```
   *Expected Outcome:* Role equals `OWNER` and Organization Name equals `"DevOps Pioneers"`.

### Step 2: Tenant Collaboration & Invites
1. **Action:** Register **User B** via separate browser session.
   - Input Full Name: `"Bob Engineer"`
   - Input Email: `"bob@devops.com"`
   - Input Password: `"Engine@2026!"`
   - Click "Register".
2. **Action:** On User A's browser session, navigate to the organization settings view at `/organizations/settings`.
3. **Action:** In the Invite Member Drawer, input Email: `"bob@devops.com"`, and select Role: `"MEMBER"`. Click "Send Invitation".
4. **Assertion:** Confirm a toast message popups: "Invitation sent successfully".
5. **Action:** Log in as User B (`bob@devops.com`). Open workspace switcher dropdown.
6. **Assertion:** Verify `"DevOps Pioneers"` is selectable. Select it.
7. **Verification Query:** Execute direct database check:
   ```sql
   SELECT role FROM memberships 
   WHERE user_id = (SELECT id FROM profiles WHERE email = 'bob@devops.com')
     AND organization_id = (SELECT id FROM organizations WHERE slug = 'devops-pioneers');
   ```
   *Expected Outcome:* Query returns exactly 1 row with role equal to `MEMBER`.

### Step 3: Projects & Task Assigning
1. **Action:** On User A's session, click "New Project" button.
2. **Action:** Enter Name: `"Frontend Redesign"`, Description: `"Revamp core landing pages"`. Set status drop-down selection to `PLANNING`. Click "Save Project".
3. **Assertion:** Confirm view shifts to `/projects/[id]` and displays "Empty Backlog" placeholder graphics.
4. **Action:** Click "Create Task" inside project backlog panel.
5. **Action:** Complete form parameters:
   - Task Title: `"Implement Navbar Component"`
   - Description: `"Create sticky header component with HSL variables"`
   - Assignee: Select `"Bob Engineer"`
   - Priority: `HIGH`
   - Due Date: Select 3 days in the future from current calendar day.
6. **Action:** Click "Create Task".
7. **Assertion:** Confirm card appears under `TODO` column on kanban board and lists assignee name `"Bob Engineer"`.

### Step 4: Multi-User Collaboration Check
1. **Action:** On User B's browser session, click the bell icon in header layout to open notifications center.
2. **Assertion:** Verify list contains item: *"Alice Founder assigned you task: Implement Navbar Component"*.
3. **Action:** Click notification card.
4. **Assertion:** Confirm view redirects to `/tasks/[taskId]`.
5. **Action:** Select Status Dropdown and switch value from `TODO` to `IN_PROGRESS`.
6. **Action:** Click Comment text box, write: *"Beginning implementation. Importing CSS tokens."* Click "Post Comment".
7. **Action:** On User A's browser session, click header notifications tray.
8. **Assertion:** Verify list contains item: *"Bob Engineer commented on 'Implement Navbar Component'"*.
9. **Action:** Click comment notification. Confirm comment text matches exactly and lists Bob's avatar image.

### Step 5: Storage Upload Verification
1. **Action:** On User B's session, click "Upload File" in attachments drawer container. Select file `navbar_draft.png` (250KB).
2. **Assertion:** Verify upload progress indicator rises from `0%` to `100%`, and the file row displays under files index showing file size label `250 KB`.
3. **Action:** Right-click download button and copy target URL.
4. **Assertion:** Verify copied URL links contain valid tokens mapping to target private storage buckets.
5. **Verification Query:** Execute database command:
   ```sql
   SELECT storage_path FROM attachments 
   WHERE task_id = (SELECT id FROM tasks WHERE title = 'Implement Navbar Component');
   ```
   *Expected Outcome:* Path is returned containing correct storage references matching upload payload parameters.
6. **Action:** On User A's session, refresh project details and open the attachments drawer.
7. **Assertion:** Verify `navbar_draft.png` file row is present. Click download button, confirming file opens successfully without permissions error.

### Step 6: Task Completion
1. **Action:** On User B's session, switch Task Status dropdown selection to `DONE`.
2. **Assertion:** Verify card moves automatically to `DONE` column on Kanban view.
3. **Action:** Open Dashboard Analytics dashboard page.
4. **Assertion:** Confirm stats card "Completed Tasks Count" increments by 1.

---

