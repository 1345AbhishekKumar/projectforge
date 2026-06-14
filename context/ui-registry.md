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
