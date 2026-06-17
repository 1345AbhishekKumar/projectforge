# Report

This document records the mistakes, challenges, and lessons learned throughout the development of this application.

The purpose of this report is to:

* Document errors and incorrect decisions made during the development process.
* Analyze the root causes behind each mistake.
* Capture the lessons learned from those experiences.
* Establish best practices and preventive measures.
* Ensure that the same mistakes are not repeated in future stages of the project.

By continuously reviewing and learning from these mistakes, we can improve development quality, increase efficiency, and build a more reliable and maintainable application.


# Mistakes & Lessons Learned

## Mistake #1: Using HTML `<img>` Instead of Next.js `Image`

### ❌ Wrong

```html
<img src="/logo.png" alt="Logo" />
```

### ✅ Correct

```tsx
import Image from "next/image";

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={200}
/>
```

### Lesson Learned

Always use `next/image` in Next.js projects for automatic image optimization, lazy loading, improved performance, and better Core Web Vitals.

---

## Mistake #2: Using `<a>` Instead of Next.js `Link`

### ❌ Wrong

```html
<a href="/dashboard">Dashboard</a>
```

### ✅ Correct

```tsx
import Link from "next/link";

<Link href="/dashboard">
  Dashboard
</Link>
```

### Lesson Learned

Use `next/link` for internal navigation to enable client-side routing and faster page transitions.

---

## Mistake #3: Using `any` in TypeScript

### ❌ Wrong

```ts
const user: any = data;
```

### ✅ Correct

```ts
interface User {
  id: string;
  name: string;
}

const user: User = data;
```

### Lesson Learned

Avoid `any` whenever possible. Strong typing catches bugs early and improves code maintainability.

---

## Mistake #4: Hardcoding Values

### ❌ Wrong

```ts
const API_URL = "https://example.com/api";
```

### ✅ Correct

```env
NEXT_PUBLIC_API_URL=https://example.com/api
```

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

### Lesson Learned

Store environment-specific values in environment variables instead of hardcoding them.

---

## Mistake #5: Duplicating Logic

### ❌ Wrong

Same validation logic copied across multiple files.

### ✅ Correct

Create reusable utility functions, hooks, services, or components.

### Lesson Learned

Follow the DRY (Don't Repeat Yourself) principle.

---

## Mistake #6: Missing Loading and Error States

### ❌ Wrong

```tsx
const data = await fetchData();
return <Dashboard data={data} />;
```

### ✅ Correct

Handle:

* Loading State
* Error State
* Empty State
* Success State

### Lesson Learned

Every async operation should have proper state handling.

---

## Mistake #7: Direct Database Access from Client Components

### ❌ Wrong

Client component directly accessing database logic.

### ✅ Correct

Use:

* Server Actions
* Route Handlers
* API Routes

### Lesson Learned

Database operations should remain on the server side.

---

## Mistake #8: Not Validating User Input

### ❌ Wrong

Accepting form data without validation.

### ✅ Correct

Use Zod schemas for validation.

```ts
const schema = z.object({
  email: z.email(),
});
```

### Lesson Learned

Never trust user input.

---

## Mistake #9: Creating Large Components

### ❌ Wrong

One component containing 500+ lines of code.

### ✅ Correct

Break into smaller reusable components.

### Lesson Learned

Components should have a single responsibility.

---

## Mistake #10: Ignoring Project Standards

### ❌ Wrong

Different naming conventions and folder structures.

### ✅ Correct

Follow established project conventions.

### Lesson Learned

Consistency improves maintainability and team productivity.

---




# Rule

Before implementing any feature, ask:

1. Is there already a reusable solution?
2. Does this follow project standards?
3. Is it scalable?
4. Is it type-safe?
5. Is it secure?
6. Is it optimized?
7. Will future developers understand it?

If the answer to any question is "No", refactor before proceeding.
