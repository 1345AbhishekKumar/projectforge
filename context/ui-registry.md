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
### Notification Components

#### NotificationBell Component
- **File Path:** [NotificationBell.tsx](file:///d:/MyProjects/ongoing_Projects/projectforge/components/notifications/NotificationBell.tsx)
- **Bell Button Classes:** `relative p-2 rounded-full border-2 border-black bg-white hover:bg-neutral-bg shadow-flat-offset-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0`
- **Unread Badge Classes:** `absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-accent-pink border-2 border-black rounded-full flex items-center justify-center font-sans text-[10px] font-bold text-primary leading-none px-0.5`
- **Dropdown Panel Classes:** `absolute right-0 top-full mt-2 w-80 bg-white border-2 border-black rounded-sketchy shadow-flat-offset z-[100] overflow-hidden`
- **Dropdown Header Classes:** `flex items-center justify-between px-4 py-3 border-b-2 border-black`
- **Date Group Header Classes:** `px-4 py-1.5 border-b border-black/10 bg-neutral-bg/50` with `font-cursive text-sm font-bold text-secondary` label
- **Notification Row (Unread):** `w-full text-left flex items-start gap-3 px-4 py-3 border-b border-black/10 bg-accent-yellow/20 hover:bg-accent-yellow/40`
- **Notification Row (Read):** `w-full text-left flex items-start gap-3 px-4 py-3 border-b border-black/10 hover:bg-neutral-bg/50`
- **Unread Dot:** `block w-2 h-2 rounded-full bg-tertiary`
- **Empty State Classes:** `px-4 py-8 text-center`

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

