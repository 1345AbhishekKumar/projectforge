## Read Before Anything Else


do not read the lessons and learning-records folders. 


## Development Rules & Constraints

### Scope Control

* Do not read, analyze, or modify files that are not explicitly mentioned in the prompt.
* Only inspect the files, folders, functions, or code sections specifically requested.
* Do not make assumptions about unrelated parts of the codebase.

### Project Structure

* All UI-related components must be placed inside:
  `projectforge/components/<feature>/`
* If the required UI folder does not exist, create it before adding components.
* Keep UI components organized by feature/domain.

### Validation

* Use **Zod** for all input validation.
* Validate:

  * Forms
  * API requests
  * Server actions
  * Query parameters
  * Environment variables when applicable

### State Management

* Use **Zustand** for client-side state management.
* Use **TanStack Query** for:

  * Data fetching
  * Caching
  * Mutations
  * Server state synchronization
* Avoid unnecessary global state when TanStack Query can handle the data.

### Code Organization

* Follow clean architecture and separation of concerns.
* Keep files between **200–300 lines maximum**.
* If a file grows beyond this limit:

  * Extract components
  * Extract hooks
  * Extract utilities
  * Extract types
  * Extract services
  * Extract validation schemas

### Error Handling

* Implement proper error handling everywhere.
* Handle:

  * API failures
  * Network errors
  * Database errors
  * Validation errors
  * Authentication/authorization failures
  * Unexpected runtime exceptions
* Provide meaningful error messages.
* Never silently ignore errors.

### Next.js Best Practices

* Always follow current Next.js best practices for performance, scalability, and maintainability.
* Prefer:

  * Server Components by default
  * Server Actions when appropriate
  * Streaming and Suspense
  * Route-based code splitting
  * Optimized data fetching patterns
  * Proper caching and revalidation strategies
  * Dynamic imports for heavy components
  * `next/image` for images
  * `next/font` for fonts
  * Metadata API for SEO
* Minimize client-side JavaScript whenever possible.

### Performance Requirements

* Optimize for:

  * Fast page loads
  * Low bundle size
  * Reduced re-renders
  * Efficient database queries
  * Minimal network requests
  * Strong Core Web Vitals scores

### Implementation Rules

* Write production-ready code only.
* Avoid duplicate code.
* Reuse existing utilities and abstractions whenever possible.
* Follow TypeScript strict mode.
* Use clear naming conventions.
* Add comments only when they provide meaningful context.
* Prioritize maintainability, readability, and long-term scalability.



Read in this exact order before any implementation:

1. context/overview.md
2. context/archi.md
3. context/design.md
4. context/ui-registry.md
5. context/code-standards.md
6. context/libs.md
7. context/build.md
8. context/progress-tracker.md

## Rules That Never Change

- Never use hardcoded hex values or raw Tailwind color classes
- Update `progress-tracker.md` and `ui-registry.md` after every feature
- Before any third party library — load its installed skill first,
  then read `context/libs.md` for project-specific rules
- If the same problem persists after one corrective prompt —
  stop immediately and run /recover

## Invariants — Never Violate These

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in agent/ never imports from components/ or actions/
- Server Actions never call agent functions — only API routes call agent functions
- All InsForge DB writes from the agent go through lib/insforge-server.ts only
- Easy Apply is never touched — external apply URLs only
- Every Stagehand act() call is wrapped in try/catch
- Match threshold always comes from MATCH_THRESHOLD in `lib/utils.ts`
- AgentSpan step IDs always use format apply-{job_id}

