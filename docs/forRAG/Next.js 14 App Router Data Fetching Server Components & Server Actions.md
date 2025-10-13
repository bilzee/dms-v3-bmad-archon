---
title: "Module 5 – Next.js 14 App Router: Data Fetching, Server Components & Server Actions"
version: "1.0"
module: "Next.js App Router Deep Dive"
tags: ["Next.js 14", "App Router", "Server Components", "Server Actions", "Streaming", "Suspense", "Caching", "RAG"]
description: "Consolidated RAG-ready knowledge pack explaining data fetching, caching, streaming, server components, and server actions in Next.js 14 App Router."
---

# Module 5 – Next.js 14 App Router: Data Fetching, Server Components & Server Actions

---

## [Concept] Core App Router Concepts – Architecture, Rendering & Hydration

The **Next.js 14 App Router** organizes pages by folders (segments) inside the `app` directory.  
Each segment may include:
- `layout.tsx` – wraps nested routes.  
- `page.tsx` – route entry point.  
- `route.ts` – API-style endpoint.  

Dynamic segments use `[slug]` or `[...catchAll]`; optional segments use `[[slug]]`.  
Layouts implicitly wrap children—no need for a manual `children` prop.  
This structure compiles into a tree that enables **parallel routes** (`@slot`) and **intercepting routes** (`(…)segment`) for modals or overlays.  

**React Server Components (RSC)** run only on the server, with access to secrets and Node/Edge APIs.  
**Client components** (with `'use client'`) run in the browser and provide interactivity.  

During a render:
1. Server components render to an **RSC payload** – a serialized component tree.  
2. The client downloads HTML and RSC data.  
3. React hydrates only client components; hydration is incremental.  
4. Suspense enables streaming, letting parts of the UI appear before the full payload arrives.

---

## [Concept] Data Fetching & Caching – `fetch()`, Options, Caches & Revalidation

Next.js extends `fetch()` in server components with automatic caching and deduplication.

**Caching behavior:**

| Option | Meaning |
|---------|----------|
| `cache: 'force-cache'` | Default. Response stored in the Data Cache and reused until revalidation. |
| `cache: 'no-store'` or `next: { revalidate: 0 }` | Disables caching; always fetch fresh data. |
| `next: { revalidate: n }` | Enables Incremental Static Regeneration (ISR); refetch after *n* seconds. |
| `next: { tags: [...] }` | Adds cache tags for selective invalidation. |

Dynamic functions (`cookies()`, `headers()`, `searchParams`) mark a route as **dynamic**, disabling full-route caching.  
You can opt into dynamic rendering using:

```ts
export const dynamic = 'force-dynamic'
```
or define generateStaticParams() to pre-generate paths at build time.

After mutations, manually refresh caches with:

```tsx
revalidatePath('/posts')
revalidateTag('posts')
```

These update both the Data Cache and Full Route Cache.

## [Concept] Server Actions – Concept, Declaration & Usage
Server Actions are async functions that run on the server for data mutations or side effects.

Must include 'use server' at the top.

Can be invoked via <form action={myAction}> or <button formAction={myAction}>.

When called, Next.js sends a POST request to a generated endpoint.

The action executes on the server, performs the mutation, and returns the updated UI in one round trip.

Key properties:

Progressive enhancement: Works without JS; with JS, transitions use startTransition().

Only JSON-serializable arguments/returns. Use .bind(null, args) to pre-bind.

No automatic caching; explicitly call revalidatePath() or revalidateTag().

Built-in CSRF protection: validates Origin vs Host.

### Difference from Route Handlers:
Route Handlers expose REST-like endpoints for all HTTP methods but don’t trigger UI revalidation automatically.
Use Server Actions for form-based mutations tightly coupled to UI.

## [Concept] Streaming & Suspense – Partial Prerendering, Loading & Error Boundaries
React 18 + Next.js 14 stream the UI via Suspense.

A <Suspense> boundary renders a fallback until its child resolves.

Each loading.tsx file acts as an automatic Suspense boundary for its segment.

Streaming sends HTML chunks as soon as ready—eliminating waterfalls.

Partial Prerendering (PPR): static shells are built at compile-time, dynamic regions (“holes”) fill at request-time.

Error handling integrates into the route hierarchy:

error.tsx – per-segment error boundary.

not-found.tsx – handles 404s.

global-error.tsx – app-wide fallback.

Combine loading, error, and Suspense to create fault-tolerant streaming UIs.

## [Concept] Caching, Revalidation & Runtime Differences
Next.js uses two caches:

Data Cache – stores fetch() results (persistent).

Full Route Cache – stores HTML/RSC payloads per route.

A route is static when all fetches use force-cache and no dynamic functions are present.
It becomes dynamic if using no-store, dynamic APIs, or dynamic = 'force-dynamic'.

Revalidate manually via:

```tsx
revalidatePath('/posts')
revalidateTag('posts')
```

Use coarse-grained tags to avoid unbounded cache growth.

Runtime options:

runtime = 'edge' – global, low-latency, limited Node APIs.

runtime = 'nodejs' – full Node features, heavier cold starts.

Secrets are server-only; variables prefixed NEXT_PUBLIC_ are exposed to the client at build time.

[Concept] Security, Auth & Environment Handling
Server components can access secrets; client components cannot.
Return only sanitized data to clients—never leak credentials.
Authenticate via cookies or headers in server components:

```tsx 
const session = cookies().get('session')
```

Since this is dynamic, wrap it in <Suspense> if using PPR.
Validate sessions in server actions; treat actions like APIs—validate inputs, enforce authorization.

### Environment variables:

.env.local – private by default.

NEXT_PUBLIC_ – exposed to client; values frozen at build time.

Never read secrets in client code.

## [AntiPattern] Common Anti-Patterns – Mistakes & Fixes
Fetching inside client components – triggers browser requests and disables caching.
→ Fetch in server components or use React Query.

Hydration mismatches – rendering non-deterministic values (new Date(), Math.random()) on SSR.
→ Move logic to useEffect or add suppressHydrationWarning.

Global stores across requests – state leaks between users.
→ Create store per request (wrap in function).

Missing generateStaticParams() – dynamic segments fail during static build.
→ Provide params or mark route dynamic.

Wide revalidation scopes – invalidating / or * refetches everything.
→ Target specific paths/tags.

No error/loading boundaries – unhandled errors block route.
→ Add error.tsx and loading.tsx.

Dynamic APIs without Suspense – cookies/headers/no-store require Suspense to stream.

## [ErrorFix] Error Catalog – Error → Cause → Fix
Error	Cause	Fix
“Text content does not match server-rendered HTML.”	Non-deterministic render values or mismatched markup.	Use useEffect for dynamic logic; add suppressHydrationWarning.
“Hydration failed because initial UI does not match server.”	Data differs between SSR and client; third-party libs using window.	Guard browser code with typeof window !== 'undefined'; ensure consistent data.
“Dynamic server usage: cookies() not allowed in static routes.”	Using dynamic API inside static page.	Add export const dynamic = 'force-dynamic'.
“dynamicParams set false but no static params.”	Missing return in generateStaticParams.	Provide parameters or remove flag.
“CSRF error in server action.”	Origin ≠ Host.	Configure allowedOrigins or use route handlers for cross-origin.
“Not-found requested route segment.”	Missing default.tsx in slot directory.	Add default.tsx as fallback UI.

## [BestPractice] Best Practices
Server-first data fetching – fetch in server components for speed & security.

Use Suspense + loading.tsx – stream progressive UI.

Targeted revalidation – prefer revalidateTag/revalidatePath with clear scopes.

Avoid dynamic APIs in static routes; wrap necessary ones in Suspense.

Sanitize data on server; never send secrets.

Use generateStaticParams() for SEO and prebuild.

Run concurrent fetches via Promise.all() to prevent waterfalls.

Use <form> for mutations; get CSRF protection + progressive enhancement.

Specify runtime per route (Edge vs Node).

Manage .env properly; only expose via NEXT_PUBLIC_.

## [Integration] Integration Notes – React Query, Zustand & Legacy APIs
React Query:

Prefetch data on server, dehydrate(), then hydrate on client with <HydrationBoundary>.

Client useQuery() with same key uses cached data—no refetch.

After mutation, call revalidateTag() or queryClient.invalidateQueries().

Zustand:

Create store per request, never global.

Hydrate via props from server component.

Persist only in client (typeof window !== 'undefined').

Legacy APIs:

getServerSideProps / getStaticProps are Pages Router-only.

Replace with server components and generateStaticParams().

Avoid mixing routers in same tree.

## [Performance] Performance Rules
Consolidate fetches – rely on automatic deduplication.

Use Suspense for streaming – improves TTFB/FCP.

Tune cache modes – match data volatility.

Edge vs Node – choose per latency vs API needs.

Optimize dynamic routes – precompute via generateStaticParams().

Reduce bundle size – keep heavy logic on server.

Prefetch routes + data – use <Link prefetch> and prefetchQuery().

Concurrent rendering – use startTransition() and useActionState() for smooth UX.

## [Recipe] Recipes & Code Snippets
Server Component Fetch with Default Caching
```tsx
// app/posts/page.tsx
export default async function PostsPage() {
  const res = await fetch('https://api.example.com/posts')
  const posts = await res.json()
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
``` 

### Dynamic Fetch with No Cache
```tsx
export default async function Comments({ params }) {
  const res = await fetch(`https://api.example.com/posts/${params.id}/comments`, {
    cache: 'no-store',
  })
  const comments = await res.json()
  return <CommentsList comments={comments} />
}
``` 

### Time-based Revalidation (ISR)
```tsx
export default async function Blog() {
  const res = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 },
  })
  const posts = await res.json()
  return <PostList posts={posts} />
}
```

### Tag-based Caching and Revalidation
```tsx
// server component
export default async function Product({ params }) {
  const product = await fetch(`https://api.example.com/products/${params.id}`, {
    next: { tags: ['product', params.id] },
  }).then(r => r.json())
  return <ProductView product={product} />
}

// server action
export async function updateProduct(id, formData) {
  'use server'
  await fetch(`https://api.example.com/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(Object.fromEntries(formData)),
    headers: { 'Content-Type': 'application/json' },
  })
  revalidateTag('product')
  revalidateTag(id)
}
```

### Server Action with Form and Optimistic UI
```tsx
// app/posts/page.tsx
import { useActionState } from 'react'
import { createPost } from './actions'

export default function Posts() {
  const [state, formAction] = useActionState(createPost, { pending: false })
  return (
    <form action={formAction}>
      <input name="title" />
      <button type="submit">Create</button>
      {state.pending && <p>Creating…</p>}
    </form>
  )
}

// app/posts/actions.ts
export async function createPost(_, formData) {
  'use server'
  await db.insert(formData)
  revalidatePath('/posts')
  return { pending: false }
}
``` 

### Streaming UI with Suspense and loading.tsx
```tsx
// app/posts/loading.tsx
export default function Loading() {
  return <p>Loading posts…</p>
}

// app/posts/page.tsx
import { Suspense } from 'react'
import PostsList from './PostsList'

export default function PostsPage() {
  return (
    <Suspense fallback={<p>Fetching posts…</p>}>
      <PostsList />
    </Suspense>
  )
}
```

### Parallel Data Fetching with Suspense
```tsx
export default function Dashboard() {
  const userPromise = getUser()
  const postsPromise = getLatestPosts()
  return (
    <>
      <Suspense fallback={<p>Loading user…</p>}>
        <User promise={userPromise} />
      </Suspense>
      <Suspense fallback={<p>Loading posts…</p>}>
        <Posts promise={postsPromise} />
      </Suspense>
    </>
  )
}
```

### React Query Integration with Hydration
```tsx
// app/users/page.tsx
import { QueryClient, dehydrate } from '@tanstack/query-core'
import { HydrationBoundary } from '@tanstack/react-query'
import Users from './Users'
import { getUsers } from '@/lib/api'

export default async function UsersPage() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: ['users'], queryFn: getUsers })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Users />
    </HydrationBoundary>
  )
}

// app/users/Users.tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { getUsers } from '@/lib/api'

export default function Users() {
  const { data } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

### Zustand Store Per Request
```tsx
// lib/createStore.ts
import { create } from 'zustand'

export const createStore = (initial = { count: 0 }) =>
  create(set => ({
    count: initial.count,
    inc: () => set(s => ({ count: s.count + 1 })),
  }))

// app/counter/page.tsx
import Counter from './Counter'
export default async function Page() {
  const initial = await getInitialCount()
  return <Counter initialCount={initial} />
}

// app/counter/Counter.tsx
'use client'
import { useRef } from 'react'
import { createStore } from '@/lib/createStore'

export default function Counter({ initialCount }) {
  const storeRef = useRef(() => createStore({ count: initialCount }))
  const count = storeRef.current()((s) => s.count)
  const inc = storeRef.current()((s) => s.inc)
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={inc}>Increment</button>
    </div>
  )
}
```

### Route Handler vs Server Action
```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const posts = await db.posts.findMany()
  return NextResponse.json(posts)
}

export async function POST(request) {
  const data = await request.json()
  await db.posts.create({ data })
  return NextResponse.json({ ok: true })
}

// app/posts/actions.ts
export async function createPostAction(_, formData) {
  'use server'
  await db.posts.create({ data: Object.fromEntries(formData) })
  revalidatePath('/posts')
}

Edge Runtime Example
// app/geo/page.tsx
export const runtime = 'edge'

export default async function GeoPage() {
  const ip = headers().get('x-forwarded-for')
  const region = await fetch(`https://geo.example.com/${ip}`, { cache: 'no-store' }).then(r => r.json())
  return <p>You are visiting from {region.city}</p>
}
```

### Environment Variables
```tsx
// .env.local
DATABASE_URL=postgres://user:pass@host/db
NEXT_PUBLIC_SITE_URL=https://example.com

// server-only module
export async function getSecret() {
  const dbUrl = process.env.DATABASE_URL
  return connect(dbUrl)
}

// client component
'use client'
export default function Layout({ children }) {
  return <html><body data-site={process.env.NEXT_PUBLIC_SITE_URL}>{children}</body></html>
}
```
