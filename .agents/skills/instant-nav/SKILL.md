---
name: navigation-check
description: >
  Audit and implement instant, zero-delay navigation in Next.js App Router applications — securely.
  Use this skill whenever the user asks about navigation performance, slow page transitions,
  prefetching not working, Router Cache setup, skeleton loading, Partial Prerendering (PPR),
  caching strategy, or cross-user data leakage risks. Trigger on phrases like "my navigation
  is slow", "audit my Next.js routing", "implement instant navigation", "prefetching not working",
  "check my caching", "how do I use loading.tsx", "PPR setup", "navigation feels sluggish",
  "back button re-fetches", "skeleton screen", or any request to diagnose or improve Next.js
  navigation. Also trigger proactively when the user shares Next.js layout/page/config code and
  there's any hint of performance or caching concern — even casual phrasing like "why is my
  site slow" or "transitions don't feel instant".
---

# Navigation Check

A skill for auditing and implementing instant, zero-delay navigation in Next.js App Router
apps. Covers all four caching layers, prefetching strategies, streaming rendering with Suspense
and PPR, architectural anti-patterns, and security hardening for auth-gated routes.

---

## Step 1 — Detect Mode

Determine which mode applies before doing anything else:

- **Audit Mode** — the user has shared code or described a setup and wants diagnosis
- **Implement Mode** — the user wants concrete code for a specific pattern or fix
- **Full Sweep** — audit first, then produce prioritized implementations

If context is ambiguous, run a Full Sweep. Never ask for permission to proceed — infer intent
and get to work.

---

## Step 2 — Gather Context (if needed)

If the user hasn't provided enough to audit, ask for:

1. **Symptom** — "What feels slow?" (first visit, back button, navigation between pages, etc.)
2. **Next.js version** — PPR is stable in 16+; `staleTimes` is experimental in 14/15
3. **Key files** — `page.tsx`, `layout.tsx`, `loading.tsx`, `next.config.js`, any fetch/data-fetching logic
4. **Auth involved?** — Determines whether cross-user cache leakage checks apply

Don't ask for all four if two are enough. Read what's in the conversation first.

---

## Step 3 — Run the Audit

Work through all five audit domains. For each item, assign:
- ✅ Pass — correct, no action needed
- ⚠️ Warning — works but suboptimal
- ❌ Fail — broken or missing, needs fixing
- ➖ N/A — not applicable given the user's setup

### Domain A: Prefetching

| # | Check | What to look for |
|---|-------|-----------------|
| A1 | `<Link>` for all primary nav | `<a href>` bypasses prefetching entirely — flag every occurrence |
| A2 | `prefetch={false}` only when intentional | Disabling prefetch on visible nav links is a significant regression |
| A3 | Manual `router.prefetch()` for off-viewport links | Modal links, tooltip links, and sidebar items not in the viewport |
| A4 | Network-aware guard on aggressive prefetch | Prefetching on `slow-2g`/`2g` wastes bandwidth and may degrade UX |
| A5 | Dynamic routes have Suspense boundaries | Without a Suspense boundary, the router can't partially prefetch dynamic routes |

### Domain B: Multi-Layer Caching

| # | Check | What to look for |
|---|-------|-----------------|
| B1 | Static routes used where possible | No `cookies()`, `headers()`, `searchParams`, or uncached fetches in static pages |
| B2 | `fetch()` cache behavior is intentional | Every fetch should explicitly set `cache: 'no-store'` or `next.revalidate` — not rely on defaults blindly |
| B3 | No uncached fetches in `layout.tsx` | This is the most common Router Cache poison — flag immediately as ❌ Critical |
| B4 | Cache tags used for fine-grained invalidation | `revalidateTag()` preferred over `revalidatePath()` for multi-page invalidation |
| B5 | `staleTimes` tuned for data volatility | Default 30s for dynamic may be too short or too long depending on the app |

### Domain C: Rendering & Streaming

| # | Check | What to look for |
|---|-------|-----------------|
| C1 | `loading.tsx` exists for every dynamic segment | A missing `loading.tsx` means a blank screen on first visit to an uncached route |
| C2 | `<Suspense>` wraps async Server Components | Without a boundary, one slow component blocks the entire page render |
| C3 | Skeleton layout matches real content | A skeleton that shifts layout on content load creates jank — defeats the purpose |
| C4 | PPR adopted for applicable pages (16+) | Any page with a clear static shell + dynamic holes is a PPR candidate |
| C5 | Static shell correctly scoped in PPR | Headers, breadcrumbs, and hero content should live outside Suspense boundaries |

### Domain D: Architectural Patterns

| # | Check | What to look for |
|---|-------|-----------------|
| D1 | Data-fetching in `page.tsx`, not `layout.tsx` | Uncached fetches belong in leaf pages, not shared layouts |
| D2 | Dynamic deps in layout isolated with Suspense | If layout genuinely needs dynamic data, it must be inside `<Suspense>` |
| D3 | No `useEffect` as route-change listener | `useEffect` doesn't reliably fire on client-side navigations — use router events |
| D4 | Client state preserved across back navigations | Forms, scroll, and UI state should survive back-navigation via Router Cache |

### Domain E: Security 🔐

These checks are critical. A fast app that leaks user data is not acceptable.

| # | Check | Risk | What to look for |
|---|-------|------|-----------------|
| E1 | Auth-gated routes marked dynamic | **Critical** | Routes using `cookies()`, `headers()`, or session data must not be statically cached |
| E2 | No user-specific data in static RSC payloads | **Critical** | If a route is accidentally static, its RSC payload gets cached and may be replayed to the wrong user via the Router Cache |
| E3 | `{ cache: 'no-store' }` on PII/financial fetches | **High** | Even in dynamic routes, individual fetches for sensitive data need explicit opt-out |
| E4 | `revalidateTag()` scoped correctly | **High** | Tag names must not expose or overlap between users' data namespaces |
| E5 | Auth still enforced after logout (back button) | **High** | Verify that cached RSC payloads are invalidated or gated server-side on session check |

> For detailed security implementation patterns, see `references/security-guide.md`.

---

## Step 4 — Produce the Audit Report

Use this structure exactly:

```
## Navigation Audit — [App Name or Route]

### Summary
X issues found: N Critical · N High · N Medium · N Low
Security: [Clear / N flags]
Largest wins: [top 2–3 in plain English]

### 🔴 Critical
[ID] [Short title]
Problem: ...
Fix: [code or instruction]

### 🟠 High Impact
...

### 🟡 Medium
...

### 🟢 Low / Informational
...

### 🔐 Security Flags
...

### Recommended Implementation Order
1. [Highest impact / lowest effort first]
2. ...
```

Keep each finding concise — one problem, one fix. Link to implementation patterns below by
referencing them as "→ Pattern P3" etc.

---

## Step 5 — Implementation Patterns

Use these when producing code. Reference them in the audit by pattern ID.

### P1 — Correct `<Link>` Usage

```tsx
// ✅ Viewport-based automatic prefetch (covers all primary nav)
import Link from 'next/link'
<Link href="/dashboard">Dashboard</Link>

// ✅ Manual prefetch for links outside the viewport (modals, sidebars)
'use client'
import { useRouter } from 'next/navigation'
const router = useRouter()
<div onMouseEnter={() => router.prefetch('/settings')}>
  <button>Settings</button>
</div>

// ✅ Network-aware guard — skip prefetch on slow connections
const connection = (navigator as any).connection
if (!['slow-2g', '2g'].includes(connection?.effectiveType)) {
  router.prefetch('/heavy-page')
}

// ❌ Never use <a> for internal navigation
<a href="/dashboard">Dashboard</a>  // bypasses prefetch + client nav entirely
```

### P2 — Suspense Boundary on Dynamic Pages

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { UserStats } from './user-stats'     // async Server Component (dynamic)
import { StatsSkeleton } from './skeletons'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>  {/* static — prefetched as part of shell */}
      <Suspense fallback={<StatsSkeleton />}>
        <UserStats />     {/* streams in when data resolves */}
      </Suspense>
    </div>
  )
}
```

### P3 — `loading.tsx` Skeleton

```tsx
// app/dashboard/loading.tsx
// Automatically shown while the page's async data is resolving
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-48 bg-muted rounded" />
      <div className="h-4 bg-muted rounded w-2/3" />
    </div>
  )
}
// Key: skeleton dimensions should match real content to prevent layout shift
```

### P4 — Fix the Layout Anti-Pattern

```tsx
// ❌ Anti-pattern: uncached fetch in layout.tsx
// This makes EVERY page under this layout dynamic → poisons Router Cache for all of them
export default async function Layout({ children }) {
  const user = await fetch('/api/me', { cache: 'no-store' }).then(r => r.json())
  return <div><Topbar user={user} />{children}</div>
}

// ✅ Fix: isolate the dynamic fetch in a Suspense boundary inside the layout
import { Suspense } from 'react'
import { Topbar } from './topbar'         // fetches internally
import { TopbarSkeleton } from './skeletons'

export default function Layout({ children }) {
  return (
    <div>
      <Suspense fallback={<TopbarSkeleton />}>
        <Topbar />
      </Suspense>
      {children}  {/* child pages retain their own cacheability */}
    </div>
  )
}
```

### P5 — Cache Tags for Targeted Invalidation

```tsx
// 1. Tag the fetch
const product = await fetch(`/api/products/${id}`, {
  next: { tags: [`product:${id}`, 'products'] }
})

// 2. Invalidate by tag from a Server Action (not by path)
'use server'
import { revalidateTag } from 'next/cache'

export async function updateProduct(id: string, formData: FormData) {
  await db.products.update({ id, data: Object.fromEntries(formData) })
  revalidateTag(`product:${id}`)  // refreshes all pages tagged with this product
}

// Prefer revalidateTag() over revalidatePath() — it's more surgical
// and avoids accidentally nuking unrelated cached routes
```

### P6 — Partial Prerendering (Next.js 16+)

```js
// next.config.js
module.exports = {
  experimental: { ppr: 'incremental' }  // opt pages in individually
}
```

```tsx
// app/product/[id]/page.tsx
export const experimental_ppr = true  // opt this page into PPR

import { Suspense } from 'react'
import { ProductHero } from './product-hero'       // static — built at compile time
import { ProductReviews } from './product-reviews' // dynamic — streams at request time
import { ReviewsSkeleton } from './skeletons'

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <>
      {/* Static shell — served instantly from CDN edge */}
      <ProductHero id={params.id} />

      {/* Dynamic hole — filled by streaming at request time */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews id={params.id} />
      </Suspense>
    </>
  )
}
```

### P7 — Router Cache Tuning

```js
// next.config.js
// Adjust only when you understand your data's update frequency
module.exports = {
  experimental: {
    staleTimes: {
      dynamic: 60,   // default 30s — increase if dynamic content changes infrequently
      static: 300,   // default 300s (5 min) — rarely needs changing
    }
  }
}
// Warning: increasing dynamic staleTimes can cause stale auth content if not
// combined with proper route-level dynamic marking (see security-guide.md)
```

### P8 — Secure Dynamic Marking for Auth Routes

```tsx
// app/account/page.tsx

// Option A: Explicit — use when you want to be unambiguous
export const dynamic = 'force-dynamic'

// Option B: Implicit — calling cookies() or headers() automatically makes the route dynamic
import { cookies } from 'next/headers'

export default async function AccountPage() {
  const session = cookies().get('session')?.value
  if (!session) redirect('/login')

  const user = await db.users.findBySession(session)
  return <AccountUI user={user} />
}

// Either approach works — Option B is more natural but Option A is
// more explicit about intent, which is valuable for security audits
```

---

## Quick Diagnosis Table

Use this when the symptom is clear and the user doesn't need a full audit:

| Symptom | Likely Cause | Fast Fix |
|---------|-------------|----------|
| First visit shows blank screen | No `loading.tsx` | → Pattern P3 |
| Back button triggers full reload | Router Cache miss — Suspense boundary missing | → Pattern P2 |
| Navigation feels slow on dynamic routes | No static shell prefetched | → Pattern P2 + P6 |
| Entire site feels slow after layout change | Uncached fetch in `layout.tsx` | → Pattern P4 |
| Data stale after form submission | Missing cache invalidation | → Pattern P5 |
| User sees another user's data after back | Route accidentally static | → Pattern P8 |
| Slow on mobile, fast on desktop | Prefetching on slow networks | → Pattern P1 (network guard) |

---

## Notes on Next.js Version Compatibility

| Feature | Min Version | Notes |
|---------|-------------|-------|
| App Router | 13.4+ | Required for all patterns here |
| `staleTimes` | 14.2+ (experimental) | Flag as experimental in recommendations |
| PPR | 15 (experimental), 16 (stable) | Use `incremental` mode for gradual adoption |
| `use` hook for promises | 16+ | For passing server promises to client components |
| `<Activity />` for PPR | 16 internal | Not directly authored; used by the compiler |

When the user's Next.js version doesn't support a recommended feature, flag it clearly and
suggest the closest available alternative for their version.