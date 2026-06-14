## Read Before Anything Else


do not read the lessons and learning-records folders. 
do not read what i do not tell  you to read, read only what i specify in the prompt or message.


Read in this exact order before any implementation:

1. context/overview.md
2. context/archi.md
3. context/design.md
4. context/ui-registry.md
5. context/code-standards.md
6. context/libs.md
7. context/build.md
8. context/progress-tracker.md

## Rules That Never Change

- Never use hardcoded hex values or raw Tailwind color classes
- Update `progress-tracker.md` and `ui-registry.md` after every feature
- Before any third party library — load its installed skill first,
  then read `context/libs.md` for project-specific rules
- If the same problem persists after one corrective prompt —
  stop immediately and run /recover

## Invariants — Never Violate These

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in agent/ never imports from components/ or actions/
- Server Actions never call agent functions — only API routes call agent functions
- All InsForge DB writes from the agent go through lib/insforge-server.ts only
- Easy Apply is never touched — external apply URLs only
- Every Stagehand act() call is wrapped in try/catch
- Match threshold always comes from MATCH_THRESHOLD in `lib/utils.ts`
- AgentSpan step IDs always use format apply-{job_id}

## Available Skills

- `/architect` — before any complex feature. Think before building.
- `/imprint` — after any new UI component. Capture patterns.
- `/review` — before demo or when something feels off.
- `/recover` — when something breaks after one failed correction.
- `/remember save` — when a feature spans multiple sessions.
- `/remember restore` — when returning after a multi-session feature.


---
description: Instructions building apps with MCP
globs: *
alwaysApply: true
---

# InsForge SDK Documentation - Overview

## What is InsForge?

Backend-as-a-service (BaaS) platform providing:

- **Database**: PostgreSQL with PostgREST API
- **Authentication**: Clerk
- **Storage**: File upload/download
- **AI**: OpenRouter key provisioning and model catalog for direct OpenAI-compatible integrations
- **Functions**: Serverless function deployment
- **Realtime**: WebSocket pub/sub (database + client events)

## Installation

The following is a step-by-step guide to installing and using the InsForge TypeScript SDK for Web applications. If you are building other types of applications, please refer to:
- [Swift SDK documentation](/sdks/swift/overview) for iOS, macOS, tvOS, and watchOS applications.
- [Kotlin SDK documentation](/sdks/kotlin/overview) for Android applications.
- [REST API documentation](/sdks/rest/overview) for direct HTTP API access.

### 🚨 CRITICAL: Follow these steps in order

### Step 1: Download Template

Use the `download-template` MCP tool to create a new project with your backend URL and anon key pre-configured.

### Step 2: Install SDK

```bash
npm install @insforge/sdk@latest
```

### Step 3: Create SDK Client

You must create a client instance using `createClient()` with your base URL and anon key:

```javascript
import { createClient } from '@insforge/sdk';

const client = createClient({
  baseUrl: 'https://your-app.region.insforge.app',  // Your InsForge backend URL
  anonKey: 'your-anon-key-here'       // Get this from backend metadata
});

```

**API BASE URL**: Your API base URL is `https://your-app.region.insforge.app`.

## Getting Detailed Documentation

### 🚨 CRITICAL: Always Fetch Documentation Before Writing Code

InsForge provides official SDKs and REST APIs, use them to interact with InsForge services from your application code.

- [TypeScript SDK](/sdks/typescript/overview) - JavaScript/TypeScript
- [Swift SDK](/sdks/swift/overview) - iOS, macOS, tvOS, and watchOS
- [Kotlin SDK](/sdks/kotlin/overview) - Android and Kotlin Multiplatform
- [REST API](/sdks/rest/overview) - Direct HTTP API access

Before writing or editing any InsForge integration code, you **MUST** call the `fetch-docs` or `fetch-sdk-docs` MCP tool to get the latest SDK documentation. This ensures you have accurate, up-to-date implementation patterns.

### Use the InsForge `fetch-docs` MCP tool to get specific SDK documentation:

Available documentation types:

- `"instructions"` - Essential backend setup (START HERE)
- `"real-time"` - Real-time pub/sub (database + client events) via WebSockets
- `"db-sdk-typescript"` - Database operations with TypeScript SDK
- **Authentication** - Choose based on implementation:
  - `"auth-sdk-typescript"` - TypeScript SDK methods for custom auth flows
  - `"auth-components-react"` - Pre-built auth UI for React+Vite (single-page app)
  - `"auth-components-react-router"` - Pre-built auth UI for React(Vite+React Router) (multi-page app)
  - `"auth-components-nextjs"` - Pre-built auth UI for Next.js (SSR app)
- `"storage-sdk"` - File storage operations
- `"functions-sdk"` - Serverless functions invocation
- `"ai-integration-sdk"` - AI integration with the provisioned OpenRouter key and OpenAI SDK
- `"deployment"` - Deploy frontend applications via MCP tool
- `"payments"` - Stripe Checkout, Billing Portal, webhook projections, and fulfillment patterns

These docs are mostly for the TypeScript SDK. For other languages, you can also use the `fetch-sdk-docs` MCP tool to get specific documentation.

### Use the InsForge `fetch-sdk-docs` MCP tool to get specific SDK documentation

You can fetch SDK documentation using the `fetch-sdk-docs` MCP tool with a specific feature type and language.

Available feature types:
- `db` - Database operations
- `storage` - File storage operations
- `functions` - Serverless functions invocation
- `auth` - User authentication
- `ai` - AI integration with the provisioned OpenRouter key and OpenAI SDK
- `realtime` - Real-time pub/sub (database + client events) via WebSockets
- `payments` - Stripe Checkout and Billing Portal with webhook-based fulfillment

Available languages:
- `typescript` - JavaScript/TypeScript SDK
- `swift` - Swift SDK (for iOS, macOS, tvOS, and watchOS)
- `kotlin` - Kotlin SDK (for Android and JVM applications)
- `rest-api` - REST API

Payments currently has TypeScript SDK docs only. Use the Payments API reference for non-TypeScript clients.

## When to Use SDK vs MCP Tools

### Always SDK for Application Logic:

- Authentication (register, login, logout, profiles)
- Database CRUD (select, insert, update, delete)
- Storage operations (upload, download files)
- AI integration via the provisioned OpenRouter key with the OpenAI SDK or OpenRouter HTTP API
- Serverless function invocation
- Payments checkout and customer portal session creation

### Use MCP Tools for Infrastructure:

- Project scaffolding (`download-template`) - Download starter templates with InsForge integration
- Backend setup and metadata (`get-backend-metadata`)
- Database schema management (`run-raw-sql`, `get-table-schema`)
- Storage bucket creation (`create-bucket`, `list-buckets`, `delete-bucket`)
- Serverless function deployment (`create-function`, `update-function`, `delete-function`)
- Frontend deployment (`create-deployment`) - Deploy frontend apps to InsForge hosting

## Important Notes

- SDK returns `{data, error}` structure for all operations
- Database inserts require array format: `[{...}]`
- Serverless functions have one endpoint and do not support nested route paths
- Storage: Upload files to buckets, store URLs in database
- AI integrations should call OpenRouter directly with `baseURL: "https://openrouter.ai/api/v1"` and a server-side `OPENROUTER_API_KEY`
- **EXTRA IMPORTANT**: Use Tailwind CSS 3.4 (do not upgrade to v4). Lock these dependencies in `package.json`