# Memory — Organization Hierarchies & Advanced Notifications

Last updated: 2026-06-21T14:19:00+05:30

## What was built

- **Feature 4.10: Organization Hierarchies**:
  - Database schema alterations: Added `manager_id` (TEXT) to `departments` and `department_id` (UUID) to `memberships`, with corresponding indexes.
  - Security Helpers: Implemented `isChildDepartment`, `getManagedDepartmentId`, `verifyDepartmentScopeForProject`, and `verifyDepartmentScopeForMember` in [lib/auth-helpers.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/lib/auth-helpers.ts).
  - Server Actions: Created [actions/department.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/actions/department.ts) for department CRUD and membership assignment.
  - Access Scoping: Updated project and membership actions to filter and authorize data scoped to a department manager's descendant tree.
  - UI Settings Dashboard: Built [app/settings/departments/page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/settings/departments/page.tsx) integrating whiteboard components [DepartmentTree.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/departments/DepartmentTree.tsx), [DepartmentForm.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/departments/DepartmentForm.tsx), and [MemberAssignment.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/departments/MemberAssignment.tsx).
  - Sidebar Navigation: Added Departments settings link to [Sidebar.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/layout/Sidebar.tsx).
- **Feature 4.12: Advanced Notifications**:
  - Added `"TASK_ESCALATION"` to `NotificationType` in [types/index.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/types/index.ts).
  - Added `sendRoleTargetedNotification` server action in [actions/notification.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/actions/notification.ts) to fan-out alerts to users matching specific roles.
  - Implemented recursive supervisor lookup and task escalation in [actions/escalation.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/actions/escalation.ts) to escalate tasks overdue by >24h to department managers (or fallback to org owners/admins).

## Decisions made

- **Supervisor Resolution**: A task's supervisor is resolved by checking the assignee's department manager, tracing recursively up the tree node-by-node if the manager is unassigned, and falling back to the organization owner/admin.
- **Strict Separation & File Limits**: Kept features decoupled and components modular to adhere strictly to the 200–300 lines limit for all new files.

## Problems solved

- **Recursive Cycle Guards**: Added a descendant verification in `updateDepartment` using `isChildDepartment` to prevent cycle generation (e.g. assigning a child node as its parent's parent).
- **Escalation Deduplication**: Implemented content-based task ID matching to guarantee that task escalation notifications are not duplicate-sent to supervisors/admins within 24 hours.

## Current state

- Features 4.10 and 4.12 are fully implemented, compile cleanly, and are integrated into the application settings and navigation layout.
- The automated test suite was skipped per explicit user instruction.

## Next session starts with

- Open [context/todos.md](file:///d:/MyProjects/ongoing_Projects/projectforge/context/todos.md) and review the checklist/todos for remaining V4 features or next tasks.

## Open questions

- None.
