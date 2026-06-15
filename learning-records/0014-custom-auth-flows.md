# 0014 - Custom Authentication Flows (Headless Auth)

## Context
As the curriculum progressed from backend hooks (Lesson 13) to frontend security (Lesson 14), and advanced RBAC permissions (Lesson 16), the final frontier of authentication mastery is User Experience. While Drop-in components (`<SignIn />`) are efficient, enterprise applications often require bespoke onboarding flows. This lesson covers building custom UIs using Clerk's headless hooks.

## Key Insights
- **The State Machine Concept**: Authentication is not binary. It's a state machine driven by the `signIn.status` property. A flow might start at `null`, transition to `needs_first_factor` (waiting for password), then `needs_second_factor` (waiting for 2FA), before finally reaching `complete`.
- **Headless Hooks**: Using `useSignIn()` and `useSignUp()` gives developers 100% control over the DOM. The provider handles the cryptography and backend logic, while the developer writes the HTML forms and TailwindCSS styling.
- **The `setActive` Requirement**: A common pitfall in custom flows is achieving a `complete` status but failing to log the user in locally. Developers MUST call `setActive({ session: result.createdSessionId })` to write the JWT session cookie to the browser.
- **Advanced Strategies**: Custom flows allow for specialized strategies like `email_code` (Passwordless OTPs), where the developer initiates the strategy and then handles the `attemptFirstFactor` verification in separate custom UI steps.

## Impact on Next Steps
With the ability to build custom sign-in wizards, handle complex 2FA state machines, secure edge routes, enforce granular permissions, and sync data via webhooks, the user has achieved a comprehensive understanding of modern, scalable Identity Architecture. This concludes the core authentication loop. Future deep-dives could involve automated testing of these custom flows or managing complex JWT templates.