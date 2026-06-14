# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to ProjectForge.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/ssr";

export const insforge = createBrowserClient(
  process.env.NEXT_PUBLIC_INSFORGE_URL!,
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
);
```

```typescript
// lib/insforge-server.ts — server context only
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

- Browser client — Client Components, browser-side auth state, realtime subscriptions
- Server client — Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context

---

### Auth

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const {
  data: { user },
  error,
} = await insforge.auth.getUser();
if (!user) redirect("/login");
```

---

### DB Queries

```typescript
// Read
const { data, error } = await insforge
  .from("tasks")
  .select("*")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: false });

// Insert
const { data, error } = await insforge
  .from("tasks")
  .insert({ title, description, priority, organization_id: orgId })
  .select()
  .single();

// Update
const { error } = await insforge
  .from("tasks")
  .update({ status: "IN_PROGRESS" })
  .eq("id", taskId)
  .eq("organization_id", orgId); // always scope to organization
```

**Rules:**

- Always scope queries to the active `organization_id` — never query without tenant isolation filters
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row

---

### Storage

```typescript
// Upload file
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

const url = data.publicUrl;
```

**Storage paths:**

- Task attachments: `attachments/{org_id}/{project_id}/{task_id}/{file_name}`

**Rules:**

- Enforce file size checks (< 20MB) and MIME-type restrictions before uploading
- Always save the public URL back to the `attachments` table in the database
- Never write files to disk — upload buffers directly from request parameters

---

## NVIDIA GPT OSS 120B

**Check first:** Check AGENTS.md for an installed NVIDIA NIM skill. The skill will have the latest API patterns and model specifications.

### Structured JSON Response

```typescript
import OpenAI from "openai";

// NVIDIA NIMs provide an OpenAI-compatible API
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1",
});

const response = await nvidia.chat.completions.create({
  model: "nvidia/gpt-oss-120b",
  response_format: { type: "json_object" },
  temperature: 0.3,
  messages: [
    {
      role: "system",
      content: "You are a ProjectForge assistant. Return only valid JSON matching the requested schema.",
    },
    {
      role: "user",
      content: `Your prompt here`,
    },
  ],
});

const result = JSON.parse(response.choices[0].message.content!);
```

**Temperature settings:**

- `0.3` — task planning, scoring, extraction, research synthesis — deterministic results
- `0.7` — response drafting, custom explanations — natural variation

**Max tokens:**

- Task breaking + scoring: `400`
- Company research synthesis: `1000`
- Profile extraction: `800`

**Rules:**

- Model string is always `'nvidia/gpt-oss-120b'` — never use other model names
- Always use `response_format: { type: 'json_object' }` for structured data
- Always parse `response.choices[0].message.content` as string — even with json_object it returns a string
- Always validate parsed JSON before using — wrap in try/catch
- Page size is always `DEFAULT_PAGE_SIZE` from `lib/utils.ts` — never hardcode
- Company research synthesis must always return a complete dossier — never return empty even if browser scraping failed

---

## PostHog

**Check first:** Check AGENTS.md for an installed PostHog skill. If a PostHog MCP server is configured — use it. The skill/MCP will have the latest client and server patterns.

### Client Setup (Browser)

```typescript
// lib/posthog-client.ts
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined") {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
      capture_pageview: false, // manual pageview tracking
    });
  }
}

// Capture event client-side
posthog.capture("task_completed", {
  userId,
  taskId,
  projectId,
  orgId,
});
```

### Server Setup

```typescript
// lib/posthog-server.ts
import { PostHog } from "posthog-node";

export const createPostHogServer = () =>
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately
    flushInterval: 0, // no batching — Next.js functions are short-lived
  });

// Always use and shutdown in the same function
const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "agent_run_completed",
  properties: { userId, agentId, runId, status },
});
await posthog.shutdown(); // required — ensures event is sent
```

**Rules:**

- Always call `await posthog.shutdown()` in server-side functions — events are lost without it
- `flushAt: 1` and `flushInterval: 0` always set on server client
- Event names must match exactly the list in `code-standards.md`
- Always include `userId` as a property on every server-side event
- Call `posthog.identify(userId)` after login on client side
- Call `posthog.reset()` on logout on client side
