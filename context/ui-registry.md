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

