# Learning Record: Webhook Signature Verification

## Mission Context
Engineering Thinking for System Design

## Core Concept
When using local tunnels (like ngrok) or deploying to production, webhook endpoints are exposed to the public internet. This means anyone can send an HTTP POST request to them. To safely synchronize external data (like Clerk SaaS Auth) with the internal database (ProjectForge), the system must cryptographically verify that the request is authentic.

## Key Insights
1. **The Forgery Threat**: A public endpoint (e.g., `/api/webhooks/clerk`) inherently trusts no one. Without verification, an attacker could forge a request to create, elevate, or delete users.
2. **Cryptographic Signatures (HMAC)**: Webhook providers (like Svix, used by Clerk) use a shared `WEBHOOK_SECRET`. They hash the payload using this secret and send the hash in a header (e.g., `svix-signature`).
3. **Local Verification**: The receiving server uses the exact same secret and the exact same payload to calculate its own hash. 
   - Match = Authentic request from Clerk.
   - Mismatch = Forgery or corrupted payload. Reject with 400 Bad Request.

## Next Steps
Understanding the architectural necessity of Webhooks and ngrok sets the stage for implementation. The next engineering step would be to review the actual code in ProjectForge that handles this Svix verification logic.