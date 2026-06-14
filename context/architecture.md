# Architecture

## Stack

### Core Stack & Frameworks
| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Authentication                 | Clerk                    | User authentication and session management       |
| Database                       | InsForge                 | Multi-tenant database (PostgreSQL RLS backend)   |
| Storage                        | InsForge Storage         | Document and task attachment storage             |
| Styling                        | Tailwind CSS v4          | Custom utility-first visual system               |
| UI Components & Design System  | React 19 + custom CSS    | Sketchy hand-drawn border + dot-grid componentry |
| Language                       | TypeScript strict        | Type-safe development throughout                 |
| AI Capability (V5)             | NVIDIA GPT OSS 120B      | Multi-agent execution & semantic search          |

### State & Forms
| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Client UI State                | Zustand                  | Global client-side UI states                     |
| Server State & Caching         | TanStack Query (v5)      | Client asynchronous data fetching & caching      |
| Form Management                | React Hook Form          | Client-side form management and submission       |
| Form Validation                | Zod                      | Schema validation on both client and server      |

### Realtime, Caching & Email
| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Realtime Communication         | Socket.IO                | Live updates, notification center, collaborations|
| Cache Layer                    | Upstash Redis            | Global rate-limiting, short-lived cache store    |
| Email Delivery                 | Resend                   | System notifications and transactional emails    |

### Testing, Monitoring & Observability
| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Unit/Integration Testing       | Vitest + Testing Library | Logic verification & component testing           |
| E2E Testing                    | Playwright               | Full E2E user flow browser verification          |
| Logging                        | Pino                     | Structured JSON logger                           |
| Error & Exception Tracking     | Sentry                   | Production crash reporting                       |
| Monitoring & Instrumentation   | OpenTelemetry (OTel)     | Distributed tracing and telemetry collection     |

### DevOps & Infrastructure
| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Containerization               | Docker                   | Standardized environment packaging               |
| CI/CD Pipeline                 | GitHub Actions           | Automated build, test, and deploy workflows      |
| Web Server / Reverse Proxy     | Nginx                    | Traffic routing, SSL completion, and load balance|

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── app/
│   ├── layout.tsx                          → Root layout, PostHog provider
│   ├── page.tsx                            → Homepage
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                   → Login page
│   │   └── callback/
│   │       └── page.tsx                   → OAuth callback handler
│   ├── dashboard/
│   │   └── page.tsx                       → Main dashboard / personal hub
│   ├── orgs/
│   │   ├── page.tsx                       → Organization list & switcher
│   │   └── create/
│   │       └── page.tsx                   → Create new organization page
│   ├── projects/
│   │   ├── page.tsx                       → Projects list/overview page
│   │   ├── [id]/
│   │   │   ├── page.tsx                   → Individual project details page (V1)
│   │   │   ├── board/
│   │   │   │   └── page.tsx               → Kanban Board view (V2)
│   │   │   └── sprints/
│   │   │       └── page.tsx               → Sprint planner page (V2)
│   │   └── create/
│   │       └── page.tsx                   → Create new project page
│   │   └── profile/
│   │       └── page.tsx                   → Profile form & settings
│   └── api/
│       ├── agent/
│       │   ├── find/route.ts              → Trigger Adzuna job discovery
│       │   └── research/route.ts          → Trigger company research agent
│       └── resume/
│           ├── generate/route.ts          → Generate base resume PDF from profile
│           └── extract/route.ts           → Extract profile data from uploaded resume PDF
├── agent/
│   ├── planning.ts                        → V5: Task breakdown agent
│   ├── risk.ts                            → V5: Risk detection and mitigation planner
│   ├── runtime.ts                         → V5: Event-driven agent runtime orchestrator
│   └── types.ts                           → Agent-specific TypeScript types
├── actions/
│   ├── profile.ts                         → Profile save + update
│   ├── org.ts                             → Organization CRUD actions
│   ├── project.ts                         → Project CRUD actions
│   ├── task.ts                            → Task CRUD & status transitions
│   ├── comment.ts                         → Comments CRUD actions
│   └── notification.ts                    → In-app notifications read/unread
├── components/
│   ├── ui/                                → shadcn/ui components only (with hand-drawn styles)
│   ├── layout/
│   │   ├── Navbar.tsx                     → Global navigation bar with org switcher
│   │   ├── Footer.tsx                     → Global footer
│   │   └── Sidebar.tsx                    → Dashboard sidebar links and workspace context
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AnalyticsCharts.tsx
│   ├── orgs/
│   │   ├── OrgSwitcher.tsx                → Dropdown to change workspace context
│   │   ├── MemberList.tsx                 → Member list and invite forms
│   │   └── InviteModal.tsx                → Invitation dialog
│   ├── projects/
│   │   ├── ProjectList.tsx                → Project list view
│   │   ├── ProjectCard.tsx                → Individual sketchy card representation
│   │   └── ProjectHeader.tsx              → Project actions bar
│   ├── tasks/
│   │   ├── TaskList.tsx                   → Tasks list table
│   │   ├── TaskRow.tsx                    → Compact task row
│   │   ├── TaskDetailsSheet.tsx           → Drawer showing detail updates and comments
│   │   └── CreateTaskForm.tsx             → Task creation form
│   ├── comments/
│   │   ├── CommentSection.tsx             → Interactive comments listing
│   │   └── CommentInput.tsx               → Sketchy comment editor
│   └── profile/
│       └── ProfileForm.tsx
├── lib/
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client
│   ├── posthog-client.ts                  → PostHog browser client
│   ├── posthog-server.ts                  → PostHog server client
│   └── utils.ts                           → Shared utility functions
└── types/
    └── index.ts                           → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`        | Pages and API routes only. Direct data loading only. No business/write logic.                          |
| `agent/`      | All AI agent logic (task planning, risk analysis, V5 runtime). Nothing here touches React/UI.          |
| `actions/`    | Server Actions for UI-triggered mutations. Validates parameters (using Zod) and operates writes.      |
| `components/` | Visual layouts and interactive components. Does not fetch or write to database directly.                |
| `lib/`        | Client/server sdk initializations and shared utilities.                                                |
| `hooks/`      | React state hooks, real-time subscriptions, and context accessors.                                     |
| `types/`      | Strict TypeScript interfaces, schema enums, and database return models.                                |

---

## Data Flow

### UI Queries (Server Side Rendering)

```
User accesses /projects/[projectId]
        ↓
Next.js page fetches project info & tasks using createInsforgeServer()
        ↓
Server verifies organization membership & roles
        ↓
Page renders initial data into Components
```

### UI Mutations (Server Actions)

```
User updates task status in task-details-sheet
        ↓
Triggers client-side action handler
        ↓
Invokes updateTaskStatus action in actions/task.ts
        ↓
Action validates fields (Zod) and verifies user credentials
        ↓
InsForge database update executed
        ↓
Revalidate path causes page data to reload
```

---

## InsForge Database Schema

The database follows a relational structure in PostgreSQL on InsForge. As the application grows from V1 to V5, the schema expands systematically to support portfolios, custom fields, automations, OKRs, and AI capabilities.

### V1.0 Core Collaboration Tables

#### `organizations`
| Column      | Type        | Notes                        |
| ----------- | ----------- | ---------------------------- |
| id          | uuid        | Primary Key                  |
| name        | text        |                              |
| created_at  | timestamptz |                              |
| updated_at  | timestamptz |                              |

#### `memberships`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| user_id         | text        | Clerk User ID                                  |
| organization_id | uuid        | References organizations                       |
| role            | text        | OWNER / ADMIN / MEMBER (V4 extends roles)      |
| created_at      | timestamptz |                                                |

#### `projects`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        |                                                |
| description     | text        |                                                |
| status          | text        | PLANNING / ACTIVE / COMPLETED / ARCHIVED       |
| created_at      | timestamptz |                                                |
| updated_at      | timestamptz |                                                |

#### `tasks`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| project_id      | uuid        | References projects                            |
| organization_id | uuid        | References organizations                       |
| title           | text        |                                                |
| description     | text        |                                                |
| status          | text        | TODO / IN_PROGRESS / DONE                      |
| priority        | text        | LOW / MEDIUM / HIGH / URGENT                   |
| assignee_id     | text        | References Clerk User ID (nullable)            |
| due_date        | timestamptz |                                                |
| sprint_id       | uuid        | References sprints (nullable, V2 feature)      |
| created_at      | timestamptz |                                                |
| updated_at      | timestamptz |                                                |

#### `comments`
| Column      | Type        | Notes                                          |
| ----------- | ----------- | ---------------------------------------------- |
| id          | uuid        | Primary Key                                    |
| task_id     | uuid        | References tasks                               |
| user_id     | text        | References Clerk User ID                       |
| content     | text        | Markdown content                               |
| created_at  | timestamptz |                                                |
| updated_at  | timestamptz |                                                |

#### `attachments`
| Column      | Type        | Notes                                          |
| ----------- | ----------- | ---------------------------------------------- |
| id          | uuid        | Primary Key                                    |
| task_id     | uuid        | References tasks                               |
| user_id     | text        | References Clerk User ID                       |
| file_name   | text        |                                                |
| file_url    | text        | InsForge Storage path                          |
| created_at  | timestamptz |                                                |

#### `notifications`
| Column      | Type        | Notes                                          |
| ----------- | ----------- | ---------------------------------------------- |
| id          | uuid        | Primary Key                                    |
| user_id     | text        | References Clerk User ID                       |
| content     | text        | Notification text                              |
| is_read     | boolean     | default false                                  |
| created_at  | timestamptz |                                                |

---

### V2.0 Work Management Tables

#### `sprints`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        |                                                |
| goal            | text        |                                                |
| start_date      | timestamptz |                                                |
| end_date        | timestamptz |                                                |
| status          | text        | PLANNED / ACTIVE / COMPLETED / CANCELLED       |
| created_at      | timestamptz |                                                |

#### `activity_feed`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| project_id      | uuid        | References projects (nullable)                 |
| user_id         | text        | References Clerk User ID                       |
| action_type     | text        | e.g., task.created, task.completed             |
| details         | jsonb       | Audit payload (diffs, titles)                  |
| created_at      | timestamptz |                                                |

#### `task_labels`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        | e.g., Bug, Feature, Frontend                   |
| color           | text        | Hex or HSL token string                        |
| created_at      | timestamptz |                                                |

#### `task_label_mappings`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| task_id         | uuid        | References tasks (Composite PK)                |
| label_id        | uuid        | References task_labels (Composite PK)          |

---

### V3.0 Execution Platform Tables

#### `workflows`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        |                                                |
| trigger         | text        | trigger event name                             |
| conditions      | jsonb       | Filter criteria for triggers                   |
| actions         | jsonb       | List of mutations to execute                   |
| enabled         | boolean     | Default true                                   |
| created_at      | timestamptz |                                                |

#### `time_entries`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| task_id         | uuid        | References tasks                               |
| user_id         | text        | References Clerk User ID                       |
| start_time      | timestamptz |                                                |
| end_time        | timestamptz | Nullable if actively running                   |
| duration        | integer     | In seconds                                     |
| created_at      | timestamptz |                                                |

#### `integrations`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| provider        | text        | github / slack / gcal / etc.                   |
| config          | jsonb       | API tokens, target channels, repositories      |
| status          | text        | ACTIVE / ERROR / DISCONNECTED                  |
| created_at      | timestamptz |                                                |

---

### V4.0 Enterprise Operating System Tables

#### `portfolios`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        |                                                |
| description     | text        |                                                |
| owner_id        | text        | References Clerk User ID                       |
| status          | text        | ACTIVE / INACTIVE                              |
| created_at      | timestamptz |                                                |

#### `programs`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| portfolio_id    | uuid        | References portfolios                          |
| name            | text        |                                                |
| manager_id      | text        | References Clerk User ID                       |
| status          | text        | ACTIVE / ARCHIVED                              |
| created_at      | timestamptz |                                                |

#### `program_projects`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| program_id      | uuid        | References programs (Composite PK)             |
| project_id      | uuid        | References projects (Composite PK)             |

#### `custom_roles`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        | Custom role identifier                         |
| permissions     | text[]      | List of allowed actions                        |
| created_at      | timestamptz |                                                |

#### `custom_fields`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| entity_type     | text        | e.g., task, project                            |
| name            | text        | Label (e.g., Story Points, Cost Center)        |
| field_type      | text        | number / text / select / date                  |
| created_at      | timestamptz |                                                |

#### `custom_field_values`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| entity_id       | uuid        | ID of the task/project                         |
| field_id        | uuid        | References custom_fields                       |
| value           | text        | Field payload stored as text                   |
| created_at      | timestamptz |                                                |

---

### V5.0 Intelligent Organizational OS Tables

#### `agents`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| name            | text        |                                                |
| role            | text        | e.g., QA Agent, PM Agent                       |
| instructions    | text        | Custom prompts / agent system directions       |
| permissions     | jsonb       | Permissions mapped to DB tables                |
| model           | text        | e.g., gemini-1.5-pro, gpt-4o                   |
| created_at      | timestamptz |                                                |

#### `agent_runs`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| agent_id        | uuid        | References agents                              |
| status          | text        | RUNNING / COMPLETED / FAILED                   |
| started_at      | timestamptz |                                                |
| completed_at    | timestamptz |                                                |

#### `agent_logs`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| run_id          | uuid        | References agent_runs                          |
| level           | text        | INFO / WARNING / ERROR                         |
| message         | text        | Human-readable details                         |
| metadata        | jsonb       | Context payload                                |
| created_at      | timestamptz |                                                |

#### `objectives`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| title           | text        | Goal Objective (e.g., Improve quality)         |
| owner_id        | text        | References Clerk User ID                       |
| created_at      | timestamptz |                                                |

#### `key_results`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| objective_id    | uuid        | References objectives                          |
| metric          | text        | Description of measurable target               |
| target          | numeric     | Goal number                                    |
| current         | numeric     | Current progress                               |
| created_at      | timestamptz |                                                |

#### `knowledge_documents`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| organization_id | uuid        | References organizations                       |
| title           | text        | Document heading                               |
| content         | text        | Full Markdown body                             |
| type            | text        | policy / retro / decision / notes              |
| created_at      | timestamptz |                                                |

#### `embeddings`
| Column          | Type        | Notes                                          |
| --------------- | ----------- | ---------------------------------------------- |
| id              | uuid        | Primary Key                                    |
| entity_type     | text        | e.g., task, knowledge_documents                |
| entity_id       | uuid        | References source record                       |
| embedding       | vector(1536)| 1536-dim vectors for pgvector semantic search  |
| created_at      | timestamptz |                                                |

---

## InsForge Storage

| Bucket      | Path                                                     | Contents                 |
| ----------- | -------------------------------------------------------- | ------------------------ |
| attachments | attachments/{org_id}/{project_id}/{task_id}/{file_name}  | Task attachments         |

Access: Authenticated organization members with read access to the project only.

---

## Vector Database & Row Level Security (RLS)

- **Vector Storage:** Handled in-engine within PostgreSQL using the `pgvector` extension. Text embeddings (such as OpenAI/Gemini 1536-dimension vectors) are stored directly in columns with type `vector(1536)`.
- **Row Level Security (RLS) Integration:** Since vectors are stored in standard PostgreSQL tables, RLS applies directly and automatically.
- **Query Flow:** When performing a similarity search (using operators like `<=>` for cosine distance), PostgreSQL evaluates RLS policies first (filtering by the user's `organization_id` and role permissions) before executing the vector distance calculation. This guarantees complete multi-tenant isolation for all semantic searches.

---

## Authentication

- Provider: Clerk
- Methods: Email/Password, Google OAuth, GitHub OAuth
- Protected routes: `/dashboard`, `/orgs/**`, `/projects/**`, `/profile` (protected via Clerk middleware)
- Public routes: `/`, `/login`, `/register`
- Middleware (`middleware.ts` using Clerk's `clerkMiddleware`) intercepts requests to verify user auth sessions.

---

## InsForge Client Pattern

```typescript
// lib/insforge-client.ts
// Browser-side client instance — used in Client Components for auth state checking
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);

// lib/insforge-server.ts
// Server-side client instance — used in API routes, Server Actions, and SSR pages
import { createServerClient } from "@insforge/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
};
```

---

## Invariants

Rules the implementation must never violate:

- **No DB writes on Browser:** All write operations (insert, update, delete) must go through Server Actions (`/actions/`) or API routes (`/app/api/`) using `createInsforgeServer()`.
- **Zod Validations:** Every Server Action must validate inputs against a Zod schema before executing database writes.
- **Tenant Isolation:** All database reads and writes must be filtered by the active `organization_id` of the user. Never query tasks, projects, or sprints without organizing filters to prevent cross-tenant data leaks.
- **Style Consistency:** No hardcoded hex values or raw Tailwind color classes in components. Always use HSL/CSS variables mapped from `DESIGN.md` and `ui-tokens.md` inside `components/ui/` to ensure hand-drawn consistency.
- **Role Permissions:** Validate that the active user's role (`OWNER`, `ADMIN`, `MEMBER`) allows the target action using a membership lookup before executing projects or memberships management changes.
- **Separation of Concerns:** API routes contain no UI logic. Components contain no DB logic.
- **Agent Imports:** Agent code in `/agent` never imports from `/components` or `/actions`.
- **Server Actions & Agents:** Server Actions never call agent functions. Agent functions are only called from API routes.
- **Agent Error Handling:** Every agent action is wrapped in try/catch. Failures are logged to `agent_logs`, never thrown to crash the execution.
- **Resource Management:** All agent execution resources and API client instances are cleaned up when done — never leak resources.
