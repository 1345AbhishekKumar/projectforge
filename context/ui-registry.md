# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Registered Components

### Authentication Screens

#### Login Screen (Sign-In)
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/(auth)/sign-in/[[...sign-in]]/page.tsx)
- **Container Classes:** `min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary relative py-12 px-4`

#### Signup Screen (Sign-Up)
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/(auth)/sign-up/[[...sign-up]]/page.tsx)
- **Container Classes:** `min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary relative py-12 px-4`

#### SSO Callback Screen
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/(auth)/sso-callback/page.tsx)
- **Description:** Renders Clerk's `<AuthenticateWithRedirectCallback />` to handle OAuth logins.

### Main Dashboard Screen

#### Workspace Dashboard
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/dashboard/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex flex-col`
- **Navbar Classes:** `w-full bg-white border-b-2 border-black px-6 py-3 flex items-center justify-between sticky top-0 z-50`
- **Card Classes:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8`
- **Widget Classes:** `border-2 border-black rounded-sketchy-sm p-6 shadow-flat-offset-sm`

### Organization Screens

#### Create Organization Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/orgs/create/page.tsx)
- **Container Classes:** `min-h-screen w-full flex items-center justify-center bg-neutral-bg bg-dot-grid text-primary relative py-12 px-4`
- **Card Classes:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8`
- **Input Classes:** `w-full px-4 py-3 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:ring-2 focus:ring-tertiary`
- **Submit Button Classes:** `w-full py-3 bg-tertiary hover:bg-tertiary-hover text-white font-sans text-sm font-bold border-2 border-black rounded-full shadow-flat-offset-sm`

#### OrgSwitcher Component
- **File Path:** [OrgSwitcher.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/orgs/OrgSwitcher.tsx)
- **State Consumer:** Consumes `useOrgStore` to set and react to the active organization.
- **Trigger Classes:** `flex items-center gap-2 bg-white border-2 border-black rounded-full px-3 py-1.5 font-sans text-xs font-bold shadow-flat-offset-sm`
- **Dropdown Classes:** `bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset z-50`
- **Role Badge Colors:** `OWNER: bg-accent-purple text-white`, `ADMIN: bg-accent-blue text-primary`, `MEMBER: bg-accent-green text-primary`

#### Members Settings Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/organizations/settings/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex flex-col`
- **Card Classes:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`

#### MemberList Component
- **File Path:** [MemberList.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/orgs/MemberList.tsx)
- **Table Row Classes:** `border-b border-black/10 hover:bg-neutral-bg/50`
- **Dropdown Selector Classes:** `bg-white border-2 border-black rounded-full px-2.5 py-1 font-sans text-xs font-bold shadow-flat-offset-sm focus:outline-none`

#### InviteModal Component (Invite Form Card)
- **File Path:** [InviteModal.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/orgs/InviteModal.tsx)
- **Card Classes:** `bg-accent-yellow border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 rotate-[0.5deg]`
- **Input Classes:** `w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary`

### Project Management Screens

#### Projects Directory Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/projects/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex flex-col`
- **Header Card Classes:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-4`
- **Column Card Classes:** `bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4`

#### Project Details Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/projects/[id]/page.tsx)
- **Header Card Classes:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 flex flex-col md:flex-row md:items-center justify-between gap-6`
- **Tab Button (Active):** `bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] px-6 py-2.5 text-sm font-bold font-cursive`
- **Empty State Card:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-8 md:p-12 text-center max-w-lg mx-auto`

#### ProjectCard Component
- **File Path:** [ProjectCard.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/projects/ProjectCard.tsx)
- **Card Link:** `block w-full rounded-sketchy p-5 shadow-flat-offset-sm hover:-translate-y-1 hover:rotate-1 hover:shadow-flat-offset active:translate-y-0.5 active:rotate-0 transition-all duration-200 cursor-pointer`
- **Badge Colors:** `PLANNING: bg-accent-yellow`, `ACTIVE: bg-accent-blue`, `COMPLETED: bg-accent-green`, `ARCHIVED: bg-neutral-bg`

#### CreateProjectModal Component
- **File Path:** [CreateProjectModal.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/projects/CreateProjectModal.tsx)
- **Card Wrapper:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg]`
- **Input Classes:** `w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-tertiary`

### Task Management Components

#### CreateTaskModal Component
- **File Path:** [CreateTaskModal.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/tasks/CreateTaskModal.tsx)
- **Card Wrapper:** `bg-white border-2 border-black rounded-sketchy shadow-flat-offset p-6 md:p-8 max-w-md w-full relative rotate-[0.5deg] max-h-[90vh]`
- **Input Classes:** `w-full px-3 py-2 border-2 border-black rounded-sketchy-sm font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tertiary`

#### TaskDetailsSheet Component
- **File Path:** [TaskDetailsSheet.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/tasks/TaskDetailsSheet.tsx)
- **Container Classes:** `fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end`
- **Drawer Classes:** `bg-white border-l-2 border-black w-full max-w-lg h-full p-6 md:p-8 relative shadow-[-4px_0_0_rgba(0,0,0,1)] flex flex-col gap-6 overflow-y-auto`

#### TaskList Component
- **File Path:** [TaskList.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/tasks/TaskList.tsx)
- **Grid Layout Classes:** `grid grid-cols-1 md:grid-cols-3 gap-6`
- **Column Card Classes:** `bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 min-h-[300px]`
- **Column Header Classes:** `flex items-center justify-between border-b-2 border-black pb-2 mb-1`

#### TaskRow Component
- **File Path:** [TaskRow.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/tasks/TaskRow.tsx)
- **Row Container Classes:** `flex items-center justify-between p-4 border-2 border-black rounded-sketchy bg-white hover:bg-neutral-bg/30 transition-all duration-200 shadow-flat-offset-sm hover:-translate-y-0.5 cursor-pointer gap-4`
- **Checkbox Classes:** `w-5 h-5 border-2 border-black rounded-sm flex items-center justify-center cursor-pointer bg-white`
- **Priority Badge Colors:** `LOW: bg-white border border-black/20`, `MEDIUM: bg-accent-blue/40 border-2 border-black`, `HIGH: bg-accent-yellow border-2 border-black`, `URGENT: bg-accent-pink border-2 border-black`
- **Overdue Date Badge:** `bg-accent-pink text-primary animate-pulse`

#### TaskDetailsSheet Component (Tabs & Uploaders)
- **Tabs Container Classes:** `flex border-b border-black`
- **Active Tab Button:** `px-4 py-2 font-cursive text-lg font-bold border-t-2 border-x-2 border-black rounded-t-lg -mb-[2px] transition-all bg-accent-yellow shadow-[0_-2px_0_rgba(0,0,0,1)]`
- **Uploader Dropzone:** `border-2 border-dashed border-black rounded-sketchy p-6 text-center hover:bg-neutral-bg/30 transition-all cursor-pointer block relative`
- **Upload Progress Bar:** `w-full bg-neutral-dot border-2 border-black rounded-full h-4 overflow-hidden relative`
- **Timeline Comment Card:** `bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm relative`

#### TaskFilters Component
- **File Path:** [TaskFilters.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/tasks/TaskFilters.tsx)
- **Container Classes:** `flex flex-wrap items-center gap-4 bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm`
- **Filter Trigger Button:** `flex items-center gap-2 px-3 py-1.5 border-2 border-black rounded-full bg-white hover:bg-neutral-bg text-xs font-bold font-sans shadow-flat-offset-xs transition-all`
- **Dropdown List Card:** `absolute left-0 mt-2 w-48 bg-white border-2 border-black rounded-sketchy-sm shadow-flat-offset p-2 z-50 flex flex-col gap-1`
- **Clear Filters Button:** `px-3 py-1.5 bg-accent-pink border-2 border-black rounded-full text-xs font-bold font-sans hover:bg-opacity-80 active:translate-y-0.5 shadow-flat-offset-xs`
- **Save View Form:** `flex items-center gap-2 border-2 border-black rounded-full px-3 py-1.5 bg-white text-xs font-bold shadow-flat-offset-xs`
- **Input Box:** `border-0 p-0 focus:ring-0 w-24 text-xs font-bold font-sans placeholder:text-secondary/40`

### Notification Components

#### NotificationBell Component
- **File Path:** [NotificationBell.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/notifications/NotificationBell.tsx)
- **State Consumer:** Consumes `useNotificationStore` for notification items, count, dropdown toggle, and marking read.
- **Bell Button Classes:** `relative p-2 rounded-full border-2 border-black bg-white hover:bg-neutral-bg shadow-flat-offset-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0`
- **Unread Badge Classes:** `absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-accent-pink border-2 border-black rounded-full flex items-center justify-center font-sans text-[10px] font-bold text-primary leading-none px-0.5`
- **Dropdown Panel Classes:** `absolute right-0 top-full mt-2 w-80 bg-white border-2 border-black rounded-sketchy shadow-flat-offset z-[100] overflow-hidden`
- **Dropdown Header Classes:** `flex items-center justify-between px-4 py-3 border-b-2 border-black`
- **Date Group Header Classes:** `px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50` with `font-cursive text-sm font-bold text-secondary` label
- **Notification Row (Unread):** `w-full text-left flex items-start gap-3 px-4 py-3 border-b border-black/10 bg-accent-yellow/20 hover:bg-accent-yellow/40`
- **Notification Row (Read):** `w-full text-left flex items-start gap-3 px-4 py-3 border-b border-black/10 hover:bg-neutral-bg/50`
- **Unread Dot:** `block w-2 h-2 rounded-full bg-tertiary`
- **Empty State Classes:** `px-4 py-8 text-center`

### Search Components

#### GlobalSearchModal Component
- **File Path:** [GlobalSearchModal.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/search/GlobalSearchModal.tsx)
- **State Consumer:** Consumes `useSearchStore` for modal open/close toggle state.
- **Description:** Search overlay that debounces input, performs organization-scoped searches for tasks, projects, and members, and provides hotkey accessibility (Cmd/Ctrl + K).

### Sprint Management Components

#### Sprints Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/sprints/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex`
- **Panel Classes:** `bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm flex flex-col gap-4`
- **Sprint Card Classes:** `border-2 border-black rounded-sketchy-sm p-4 bg-accent-blue/10 flex flex-col gap-3`

#### Sidebar Component
- **File Path:** [Sidebar.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/layout/Sidebar.tsx)
- **Container Classes:** `w-64 bg-white border-r-2 border-black flex flex-col h-screen sticky top-0 z-40 p-6 gap-6`
- **Link Button Classes:** `w-full text-left flex items-center gap-3 px-4 py-2.5 border-2 border-black font-sans text-sm font-bold shadow-flat-offset-sm transition-all duration-200`

### Kanban Board Components

#### Kanban Board Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/projects/[id]/board/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex`
- **Columns Grid Classes:** `grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4 items-start min-h-[60vh]`
- **Column Container Classes:** `bg-white border-2 border-black rounded-sketchy p-5 shadow-flat-offset-sm flex flex-col gap-4 min-h-[500px] transition-all duration-150 relative`
- **Column Dropzone Dragover Classes:** `bg-accent-yellow/10 border-dashed border-tertiary translate-y-0.5 shadow-none`
- **Sticky Note Card Classes:** `p-5 border-2 border-black rounded-sketchy-sm cursor-grab active:cursor-grabbing transition-all duration-150 select-none relative shadow-sm`
- **Sticky Note Card Colors:** `LOW (Blue): bg-[#D0E1FD] hover:bg-[#C2D8FC]`, `MEDIUM (Green): bg-[#D4EDDA] hover:bg-[#C6E9CE]`, `HIGH (Yellow): bg-[#FFF2B2] hover:bg-[#FFEAA3]`, `URGENT (Pink): bg-[#FFD2D2] hover:bg-[#FFC4C4]`

### Activity Feed Components

#### Activity Feed Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/projects/[id]/activity/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex`
- **Tab Button (Active):** `bg-accent-yellow border-2 border-black border-b-0 rounded-t-lg shadow-[0_-2px_0_rgba(0,0,0,1)] px-6 py-2.5 text-sm font-bold font-cursive`

#### ActivityFeed Component
- **File Path:** [ActivityFeed.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/activities/ActivityFeed.tsx)
- **Timeline Line:** `absolute left-8 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-black/20 z-0`
- **Timeline Icon Badge:** `absolute left-4 top-2.5 w-9 h-9 rounded-full border-2 border-black flex items-center justify-center shadow-flat-offset-sm transition-all hover:scale-105`
- **Detail Card:** `bg-white border-2 border-black rounded-sketchy p-4 shadow-flat-offset-sm hover:-translate-y-0.5 hover:shadow-flat-offset transition-all duration-200`
- **Comment Quote Bubble:** `bg-[#FFF2B2] border-2 border-black rounded-sketchy-sm p-3 relative shadow-flat-offset-sm max-w-lg italic font-sans text-xs text-secondary/90 rotate-[0.5deg]`
- **Load More Button:** `flex items-center gap-2 bg-white hover:bg-neutral-bg text-primary border-2 border-black font-sans text-xs font-bold px-6 py-2.5 rounded-full shadow-flat-offset-sm active:translate-y-0.5 hover:-translate-y-0.5 transition-all`

### Analytics Page & Components

#### Analytics Page
- **File Path:** [page.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/app/analytics/page.tsx)
- **Container Classes:** `min-h-screen w-full bg-neutral-bg bg-dot-grid text-primary flex`

#### StatsGrid & StatsCard Component
- **File Path:** [StatsGrid.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/analytics/StatsGrid.tsx)
- **Card Wrapper:** `border-2 border-black rounded-sketchy p-6 shadow-flat-offset-sm hover:-translate-y-0.5 hover:shadow-flat-offset transition-all duration-200`

#### WorkloadBreakdown Component
- **File Path:** [WorkloadBreakdown.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/analytics/WorkloadBreakdown.tsx)
- **Card Wrapper:** `bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[0.5deg]`
- **Segmented Bar:** `w-full h-5 border-2 border-black rounded-full overflow-hidden bg-white flex relative shadow-sm`

#### CompletionTrend Component
- **File Path:** [CompletionTrend.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/analytics/CompletionTrend.tsx)
- **Card Wrapper:** `bg-white border-2 border-black rounded-sketchy p-6 shadow-flat-offset flex flex-col gap-6 rotate-[-0.5deg]`
- **SVG Axis Lines:** `stroke="#000000" strokeWidth="3"`
- **SVG Bar Shadows:** `fill="#000000" rx="4"`
- **SVG Bars:** `fill="#D4EDDA" stroke="#000000" strokeWidth="2.5" rx="4"`



