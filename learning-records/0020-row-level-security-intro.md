# 0020: Row Level Security (RLS) Intro

## Context
The user has successfully established identity and syncing using Clerk and Webhooks. We are now transitioning into data security at the database layer (PostgreSQL) using Row Level Security to prevent application-level data leaks.

## Key Learnings
- **Application vs. Database Authorization:** Understood the risk of omitting `WHERE` clauses in backend code.
- **Row Level Security (RLS):** Learned that RLS pushes authorization down to the database, where policies silently filter rows.
- **Syntax Basics:** Learned the concepts of `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY ... USING (...)`.
- **Silent Filtering:** Acknowledged that RLS doesn't inherently throw errors for unauthorized reads; it silently omits the rows from the result set.

## Next Steps
- Learn how to pass the Clerk JWT securely into PostgreSQL so that the `auth.uid()` function knows the current user's identity.