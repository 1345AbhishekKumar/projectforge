# Architecture

## Stack

### Core Stack & Frameworks
| Layer | Tool | Purpose |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Full stack framework |
| Auth | Clerk | User auth + session management |
| DB | InsForge | Multi-tenant DB (PostgreSQL RLS backend) |
| Storage | InsForge Storage | Doc + task attachment storage |
| Styling | Tailwind CSS v4 | Custom utility-first visual system |
| UI Components | React 19 + custom CSS | Sketchy hand-drawn border + dot-grid componentry |
| Language | TypeScript strict | Type-safe development |
| AI Capacity (V5) | NVIDIA GPT OSS 120B | Multi-agent execution + semantic search |

### State & Forms
| Layer | Tool | Purpose |
| --- | --- | --- |
| Client UI State | Zustand | Global client-side UI states |
| Server State | TanStack Query (v5) | Client async data fetching + caching |
| Form Management | React Hook Form | Client-side form management |
| Form Validation | Zod | Schema validation client + server |

### Realtime, Caching & Email
| Layer | Tool | Purpose |
| --- | --- | --- |
| Realtime | Socket.IO | Live updates, notification center, collaborations |
| Cache Layer | Upstash Redis | Global rate-limiting, short-lived cache store |
| Email Delivery | Resend | System notifications + transactional emails |

### Testing, Monitoring & Observability
| Layer | Tool | Purpose |
| --- | --- | --- |
| Unit/Integration Testing | Vitest + Testing Library | Logic verification + component testing |
| E2E Testing | Playwright | Full E2E user flow verification |
| Logging | Pino | Structured JSON logger |
| Error Tracking | Sentry | Prod crash reporting |
| Monitoring | OpenTelemetry (OTel) | Distributed tracing + telemetry collection |

### DevOps & Infrastructure
| Layer | Tool | Purpose |
| --- | --- | --- |
| Containerization | Docker | Standardized environment packaging |
| CI/CD Pipeline | GitHub Actions | Auto build, test, deploy workflows |
| Web Server | Nginx | Traffic routing, SSL completion, load balance |

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
│   │   ├── sign-in/[[...sign-in]]
│   │   │   └── page.tsx                   → Login page
│   │   ├── sign-up/[[...sign-up]]
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
│           └── extract/route.ts          → Extract profile data from uploaded resume PDF
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

| Folder | Owns |
| --- | --- |
| `app/` | Pages + API routes. Direct data loading. No biz/write logic. |
| `agent/` | AI agent logic (task planning, risk analysis, V5 runtime). No UI. |
| `actions/` | Server Actions for mutations. Validate params (Zod) + writes. |
| `components/` | Visual layouts + interactive components. No direct DB logic. |
| `lib/` | SDK init + shared utils. |
| `hooks/` | React state hooks, realtime subs, context accessors. |
| `types/` | Strict TS interfaces, schema enums, DB models. |

---

## Data Flow

### UI Queries (SSR)

```
User accesses /projects/[projectId]
        ↓
Next.js page fetches project info & tasks via createInsforgeServer()
        ↓
Server verifies organization membership & roles
        ↓
Page renders data into Components
```

### UI Mutations (Server Actions)

```
User updates task status in task-details-sheet
        ↓
Trigger client-side action handler
        ↓
Invoke updateTaskStatus action in actions/task.ts
        ↓
Action validates fields (Zod) + verifies credentials
        ↓
InsForge DB update executed
        ↓
Revalidate path causes page data reload
```

---

## InsForge Database Schema

Relational structure in PostgreSQL on InsForge. V1-V5 expansion.

### V1.0 Core Collaboration Tables

#### `organizations`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| name | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `memberships`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | text | Clerk User ID |
| organization_id | uuid | Ref organizations |
| role | text | OWNER / ADMIN / MEMBER (V4 extends) |
| created_at | timestamptz | |

#### `projects`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | |
| description | text | |
| status | text | PLANNING / ACTIVE / COMPLETED / ARCHIVED |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `tasks`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| project_id | uuid | Ref projects |
| organization_id | uuid | Ref organizations |
| title | text | |
| description | text | |
| status | text | TODO / IN_PROGRESS / DONE |
| priority | text | LOW / MEDIUM / HIGH / URGENT |
| assignee_id | text | Ref Clerk User ID (nullable) |
| due_date | timestamptz | |
| sprint_id | uuid | Ref sprints (nullable, V2) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `comments`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| task_id | uuid | Ref tasks |
| user_id | text | Ref Clerk User ID |
| content | text | Markdown content |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `attachments`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| task_id | uuid | Ref tasks |
| user_id | text | Ref Clerk User ID |
| file_name | text | |
| file_url | text | InsForge Storage path |
| created_at | timestamptz | |

#### `notifications`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| user_id | text | Ref Clerk User ID |
| content | text | Notification text |
| is_read | boolean | default false |
| created_at | timestamptz | |

---

### V2.0 Work Management Tables

#### `sprints`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | |
| goal | text | |
| start_date | timestamptz | |
| end_date | timestamptz | |
| status | text | PLANNED / ACTIVE / COMPLETED / CANCELLED |
| created_at | timestamptz | |

#### `activity_feed`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| project_id | uuid | Ref projects (nullable) |
| user_id | text | Ref Clerk User ID |
| action_type | text | e.g., task.created, task.completed |
| details | jsonb | Audit payload (diffs, titles) |
| created_at | timestamptz | |

#### `task_labels`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | e.g., Bug, Feature, Frontend |
| color | text | Hex or HSL token |
| created_at | timestamptz | |

#### `task_label_mappings`
| Column | Type | Notes |
| --- | --- | --- |
| task_id | uuid | Ref tasks (Composite PK) |
| label_id | uuid | Ref task_labels (Composite PK) |

---

### V3.0 Execution Platform Tables

#### `workflows`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | |
| trigger | text | trigger event name |
| conditions | jsonb | Filter criteria |
| actions | jsonb | Mutation list |
| enabled | boolean | Default true |
| created_at | timestamptz | |

#### `time_entries`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| task_id | uuid | Ref tasks |
| user_id | text | Ref Clerk User ID |
| start_time | timestamptz | |
| end_time | timestamptz | Nullable if running |
| duration | integer | Seconds |
| created_at | timestamptz | |

#### `integrations`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| provider | text | github / slack / gcal / etc. |
| config | jsonb | API tokens, channels, repos |
| status | text | ACTIVE / ERROR / DISCONNECTED |
| created_at | timestamptz | |

---

### V4.0 Enterprise Operating System Tables

#### `portfolios`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | |
| description | text | |
| owner_id | text | Ref Clerk User ID |
| status | text | ACTIVE / INACTIVE |
| created_at | timestamptz | |

#### `programs`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| portfolio_id | uuid | Ref portfolios |
| name | text | |
| manager_id | text | Ref Clerk User ID |
| status | text | ACTIVE / ARCHIVED |
| created_at | timestamptz | |

#### `program_projects`
| Column | Type | Notes |
| --- | --- | --- |
| program_id | uuid | Ref programs (Composite PK) |
| project_id | uuid | Ref projects (Composite PK) |

#### `custom_roles`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | Custom role ID |
| permissions | text[] | Allowed actions list |
| created_at | timestamptz | |

#### `custom_fields`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| entity_type | text | e.g., task, project |
| name | text | Label (e.g., Story Points) |
| field_type | text | number / text / select / date |
| created_at | timestamptz | |

#### `custom_field_values`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| entity_id | uuid | task/project ID |
| field_id | uuid | Ref custom_fields |
| value | text | Payload text |
| created_at | timestamptz | |

---

### V5.0 Intelligent Organizational OS Tables

#### `agents`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| name | text | |
| role | text | e.g., QA Agent, PM Agent |
| instructions | text | Custom prompts / system directions |
| permissions | jsonb | DB permissions map |
| model | text | e.g., gemini-1.5-pro, gpt-4o |
| created_at | timestamptz | |

#### `agent_runs`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| agent_id | uuid | Ref agents |
| status | text | RUNNING / COMPLETED / FAILED |
| started_at | timestamptz | |
| completed_at | timestamptz | |

#### `agent_logs`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| run_id | uuid | Ref agent_runs |
| level | text | INFO / WARNING / ERROR |
| message | text | Human-readable details |
| metadata | jsonb | Context payload |
| created_at | timestamptz | |

#### `objectives`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| title | text | Goal Objective |
| owner_id | text | Ref Clerk User ID |
| created_at | timestamptz | |

#### `key_results`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| objective_id | uuid | Ref objectives |
| metric | text | Measurable target |
| target | numeric | Goal number |
| current | numeric | Progress |
| created_at | timestamptz | |

#### `knowledge_documents`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| organization_id | uuid | Ref organizations |
| title | text | Heading |
| content | text | Full Markdown |
| type | text | policy / retro / decision / notes |
| created_at | timestamptz | |

#### `embeddings`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| entity_type | text | e.g., task, knowledge_documents |
| entity_id | uuid | Ref source record |
| embedding | vector(1536)| pgvector semantic search |
| created_at | timestamptz | |

---

## InsForge Storage

| Bucket | Path | Contents |
| --- | --- | --- |
| attachments | attachments/{org_id}/{project_id}/{task_id}/{file_name} | Task attachments |

Access: Auth org members with project read access only.

---

## Vector DB & RLS

- **Vector Storage:** PostgreSQL `pgvector`. Text embeddings (1536-dim) stored directly.
- **RLS Integration:** Vectors in standard tables. RLS applies directly.
- **Query Flow:** pgvector ops (<=>) evaluate RLS policies first (filter by `organization_id` + role) before dist calc. Multi-tenant isolation guaranteed.

---

## Auth

- Provider: Clerk
- Methods: Email/Pass, Google OAuth, GitHub OAuth
- Protected: `/dashboard`, `/orgs/**`, `/projects/**`, `/profile` (via middleware)
- Public: `/`, `/login`, `/register`
- Middleware (`middleware.ts`) verify auth sessions.

---

## InsForge Client Pattern

```typescript
// lib/insforge-client.ts
// Browser client — Client Components
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);

// lib/insforge-server.ts
// Server client — API, Actions, SSR
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

- **No DB writes on Browser:** All writes via Server Actions (`/actions/`) or API using `createInsforgeServer()`.
- **Zod Validations:** Actions validate inputs via Zod before writes.
- **Tenant Isolation:** All reads/writes filtered by `organization_id`. No cross-tenant leaks.
- **Style Consistency:** No hardcoded hex/raw Tailwind colors. Use HSL/CSS variables from `DESIGN.md` + `ui-tokens.md` in `components/ui/`.
- **Role Permissions:** Validate user role (`OWNER`, `ADMIN`, `MEMBER`) before project/membership changes.
- **Separation of Concerns:** API no UI logic. Components no DB logic.
- **Agent Imports:** `/agent` never imports from `/components` or `/actions`.
- **Server Actions & Agents:** Actions never call agent fns. Agents only from API.
- **Agent Error Handling:** Every action in try/catch. Log to `agent_logs`, never crash.
- **Resource Management:** Cleanup resources + API clients when done. No leaks.
