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



