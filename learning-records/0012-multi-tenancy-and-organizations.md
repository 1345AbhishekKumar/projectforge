# 0012 - Multi-Tenancy and Organizations in B2B SaaS

## Context
Following the lessons on basic user authentication and frontend route security, the curriculum required a paradigm shift. ProjectForge operates as a SaaS platform where users collaborate in workspaces. This necessitated learning about Multi-Tenancy, shifting the core domain anchor from the `User` to the `Organization`.

## Key Insights
- **The B2B Paradigm Shift**: In consumer apps, `User` owns data. In SaaS/B2B apps, an `Organization` (Tenant) owns data, and `Users` are merely members acting within the context of that organization.
- **Cross-Tenant Data Leaks**: The most critical security boundary in multi-tenancy is Data Isolation. Every core domain model (e.g., Projects, Tasks, Invoices) MUST have an `orgId` foreign key, and every database query MUST filter by the active `orgId`.
- **Database Schema Modeling**: A join table (e.g., `OrgMembership`) is required to map the Many-to-Many relationship between Users and Organizations, storing specific roles (e.g., Admin vs Member).
- **Middleware Enforcement**: Clerk provides the concept of an "Active Organization". Middleware can be used as an architectural choke-point to forcefully redirect users to an `/org-selection` page if they are authenticated but lack an active organization context.
- **Drop-in UI Components**: Managing the complexities of invitations, role-switching, and org management is best delegated to pre-built components like `<OrganizationSwitcher />` and `<OrganizationProfile />` rather than reinventing the wheel.

## Impact on Next Steps
With Multi-Tenancy understood, the foundation for a scalable SaaS architecture is set. The user understands how to isolate data, secure routes, and sync identities. The next logical progression would involve implementing the actual core features of ProjectForge (e.g., creating Projects) utilizing this enforced `orgId` context, or diving deeper into advanced Clerk features like granular Role-Based Access Control (RBAC) permissions.