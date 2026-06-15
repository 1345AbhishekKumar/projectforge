# Memory — Feature 1.7: Comments & Attachments

Last updated: 2026-06-16T00:40:39+05:30

## What was built

- **Database Tables**: Created `comments`, `attachments`, and `notifications` tables via InsForge MCP raw SQL. Also created an `attachments` storage bucket.
- **TypeScript Types**: Appended `Comment`, `Attachment`, `Notification`, `CommentWithUser`, and `AttachmentWithUser` interfaces to [types/index.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/types/index.ts).
- **Server Actions**:
  - [actions/comment.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/actions/comment.ts) — `createComment`, `getTaskComments`, `deleteComment` with notification triggers on create.
  - [actions/attachment.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/actions/attachment.ts) — `createAttachment`, `getTaskAttachments`, `deleteAttachment` with InsForge Storage integration.
  - [actions/notification.ts](file:///d:/MyProjects/ongoing_Projects/projectforge/actions/notification.ts) — `createNotification`, `getUserNotifications`, `markNotificationRead`.
- **UI — TaskDetailsSheet.tsx** ([components/tasks/TaskDetailsSheet.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/tasks/TaskDetailsSheet.tsx)): Major refactor adding a two-tab layout ("Details" and "Comments & Files"). Implements comment feed, comment composer with send button, file upload input with 20 MB size limit, executable file blocking, upload progress tracking, and attachment list with download/delete actions. User avatars use `next/image` (`<Image>`).

## Decisions made

- **Tab layout in TaskDetailsSheet**: "Details" tab retains existing assignee/priority/due-date fields; "Comments & Files" tab is the new panel — keeps the drawer uncluttered.
- **Storage key convention**: Attachment files are stored under `{org_id}/{task_id}/{filename}` in the `attachments` bucket.
- **20 MB upload cap + executable block**: Enforced client-side before upload; blocked extensions include `.exe`, `.sh`, `.bat`, `.cmd`, `.ps1`.
- **`next/image` for avatars**: Replaced all `<img>` elements with `<Image>` (width=24, height=24) to satisfy the `@next/next/no-img-element` ESLint rule.

## Problems solved

- ESLint warning `@next/next/no-img-element` at `TaskDetailsSheet.tsx:598` — resolved by importing and using `next/image` `<Image>` component.
- Build exit code 1 when running through PowerShell pipeline (`Select-Object -Last 30`) was a shell artifact — the actual Next.js build compiled successfully with 0 errors and 0 warnings.

## Current state

- Feature 1.7 is fully functional and integrated. `bun run build` compiles cleanly: ✓ 0 errors, 0 warnings, all 10 routes generated.
- All prior features (1.1–1.6) remain intact and unaffected.

## Next session starts with

- Identify and begin the next feature from `context/progress-tracker.md` (likely Feature 1.8 or the next highest-priority item on the roadmap). Run `/remember restore` first.

## Open questions

- None.
