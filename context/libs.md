# Library Docs

Project-specific usage patterns. rules, patterns, constraints for ProjectForge.

---

## Before Using Any Library

1. **Check AGENTS.md**: skills installed + how to use. Skills have up-to-date API patterns.
2. **Check MCP server**: direct access to docs/logs. Use MCP before general knowledge.
3. **Read this file**: project-specific patterns overriding general knowledge.

Authority order:
`MCP server → Skills via AGENTS.md → This file → General training knowledge`

---

## InsForge

### Client vs Server

Two separate instances — never mix:

```typescript
// lib/insforge-client.ts — browser only
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);
```

```typescript
// lib/insforge-server.ts — server only
import { createServerClient } from "@insforge/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_INSFORGE_URL!,
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
};
```

**Rules:**
- Browser client: Client Components, auth state, realtime.
- Server client: Server Components, API, Actions, agents.
- Never mix context clients.

---

### Storage

```typescript
// Upload
const { data, error } = await insforge.storage
  .from("attachments")
  .upload(`${orgId}/${projectId}/${taskId}/${fileName}`, fileBuffer, {
    contentType: fileMimeType,
    upsert: false,
  });

// Get public URL
const { data } = insforge.storage
  .from("attachments")
  .getPublicUrl(`${orgId}/${projectId}/${taskId}/${fileName}`);
```

**Paths:** `attachments/{org_id}/{project_id}/{task_id}/{file_name}`

**Rules:**
- Checks size (< 20MB) + MIME before upload.
- Save public URL to DB `attachments` table.
- Buffer upload only. No local disk writes.

---

## NVIDIA GPT OSS 120B

### Structured JSON Response

```typescript
import OpenAI from "openai";

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1",
});

const response = await nvidia.chat.completions.create({
  model: "nvidia/gpt-oss-120b",
  response_format: { type: "json_object" },
  temperature: 0.3,
  messages: [
    { role: "system", content: "You are ProjectForge assistant. Return JSON." },
    { role: "user", content: prompt },
  ],
});

const result = JSON.parse(response.choices[0].message.content!);
```

**Temp:** `0.3` (deterministic tasks/risks), `0.7` (natural responses).
**Max tokens:** `400` (tasks), `1000` (research), `800` (profile).

**Rules:**
- Model: `'nvidia/gpt-oss-120b'`.
- `response_format: { type: 'json_object' }` for structured data.
- Validate parsed JSON in try/catch.
- Page size: `DEFAULT_PAGE_SIZE` from `lib/utils.ts`.
- Research must return complete dossier. No empty returns.

---

## PostHog

### Client Setup (Browser)

```typescript
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined") {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      capture_pageview: false,
    });
  }
}
```

### Server Setup

```typescript
import { PostHog } from "posthog-node";

export const createPostHogServer = () =>
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1,
    flushInterval: 0,
  });

const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "agent_run_completed",
  properties: { userId, agentId, runId, status },
});
await posthog.shutdown();
```

**Rules:**
- Always `await posthog.shutdown()` on server.
- `flushAt: 1`, `flushInterval: 0` for server.
- Events match `code-standards.md`.
- Include `userId` in server event properties.
- `posthog.identify(userId)` on login. `posthog.reset()` on logout.
