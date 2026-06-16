# 0022: Advanced RLS Patterns & Performance

## Context
The user has mastered the basics of RLS and transaction-local session variables. We are now moving into production-grade multi-tenancy, RBAC, and performance optimization.

## Key Learnings
- **USING vs WITH CHECK:** Learned that `USING` checks visibility of existing rows, while `WITH CHECK` validates the state of a row after an `INSERT` or `UPDATE`.
- **Multi-Tenancy (Org Level):** Learned the pattern of using `org_id` in RLS policies to support shared access within a team.
- **RBAC in DB:** Learned how to bake roles (Admin vs Member) directly into RLS policies to simplify application logic.
- **Performance Optimization:** Understood the "Subquery Trap"—avoiding `EXISTS` or sub-queries in policies to prevent O(N) performance degradation.
- **System Bypassing:** Learned about `SUPERUSER`, `BYPASSRLS`, and separate connection strings for background tasks.

## Next Steps
- Implement a real SQL migration script for a multi-tenant `projects` table.
- Explore automatic transaction wrapping in Next.js/Drizzle/Prisma to ensure RLS is always active.