---
title: "Module 4 – Zustand + Next.js App Router Data Fetching + TanStack Query Sync"
version: "1.0"
module: "Zustand + Next.js + TanStack Query Integration"
tags: ["Zustand", "Next.js App Router", "TanStack Query", "React Query", "Server Actions", "Streaming", "Suspense", "RAG"]
description: "Consolidated RAG-ready knowledge pack explaining coordination between Zustand (client state), TanStack Query (server state), and Next.js App Router (data-fetching lifecycle). Includes best practices, anti-patterns, error fixes, integration patterns, and recipes."
---

# Module 4 – Zustand + Next.js App Router Data Fetching + TanStack Query Sync

---

## [Concept] Core Concepts

### Client vs Server State

Client state represents temporary, interactive data such as form inputs or local UI toggles.  
It exists only in the browser and can be mutated freely.  
Server state represents authoritative data fetched from APIs or databases and is managed through caching and refetch logic.

- **TanStack Query (React Query)** manages server state.  
  It handles caching, staleness, background updates, pagination, optimistic mutations, and refetching.  
  Data in the query cache is **read-only** — React Query should remain the single source of truth.

- **Zustand** manages client state.  
  It provides lightweight stores for UI-level state such as filters or selections.  
  Use selectors for subscribing to slices of state and the `shallow` comparator to prevent unnecessary re-renders.

- **Next.js App Router** runs server components by default.  
  Server components can fetch data or prefetch query caches but cannot access or mutate client-side Zustand stores.

---

### Next.js App Router

The App Router is built around **React Server Components (RSC)**.

- **Server Components** run on the server, can fetch data, and access secrets. They cannot use React hooks like `useState` or manipulate the DOM.
- **Client Components** opt in via `'use client'`. They can use hooks, event handlers, and browser APIs.

**Streaming and Caching Layers:**
- **Data Cache**: Stores `fetch()` results for reuse across requests.
- **Full Route Cache**: Stores HTML/RSC payloads for routes; invalidated by `revalidatePath` or `revalidateTag`.
- **Router Cache**: Enables client-side transitions and partial prerendering.

Data is streamed from RSC to the browser and hydrated into client components for interactivity.

---

### TanStack Query v5

TanStack Query provides hooks for managing **server state**.

- **Query Keys:** Deterministic arrays that describe what a query depends on (e.g., `['posts', { filter: 'recent' }]`).  
  Query keys must be stable; order and structure matter.
- **Caching:** Controlled by `staleTime` (data freshness) and `cacheTime` (lifetime of unused data).  
- **Mutations:**  
  - Perform imperative data updates via `useMutation`.  
  - Support `onMutate` for optimistic updates, `onError` for rollbacks, and `onSettled` for invalidation.  
- **Hydration:**  
  Use `dehydrate()` on the server to serialize pre-fetched queries, then hydrate on the client with `<HydrationBoundary>`.

---

### Zustand Stores

Zustand creates global or scoped stores for **client state**.  
Stores are pure functions that update state immutably.  
Components subscribe to slices of state through selectors:

```tsx
const bears = useStore(state => state.bears)
``` 

Best practices:

Create multiple small stores instead of one large monolithic one.

Use createStore() with React Context for per-request stores in SSR.

Group store actions under an actions object to avoid unnecessary renders.

When selectors return objects or arrays, pass shallow to prevent re-renders.

### Orchestration Pattern
React Query holds authoritative server data.
Zustand manages local, derived, or UI-specific state.

Steps for clean orchestration:

Use React Query for all server data (read-only cache).

Use Zustand for client-side filters or form drafts.

Avoid duplicating query results inside Zustand.

When necessary (e.g., editing forms), copy query data as initial state and push updates via mutations.

After successful mutations, call queryClient.invalidateQueries() to refetch updated data.

## [BestPractice] Best Practices
Isolate Server and Client State: Keep React Query for server data; Zustand for local UI state only.

Deterministic Query Keys: Include all variables in the query key. Use consistent order and structure.

Shared Query Client:

- Server: create a new QueryClient per request.
- Client: use a persistent singleton instance via QueryClientProvider.

Prefetch + Hydrate: Prefetch queries in RSC with prefetchQuery() and wrap the client with <HydrationBoundary state={dehydrate(queryClient)}>.

Atomic Zustand Hooks: Export custom hooks per slice (e.g., useFilter(), useSetFilter()) to limit subscriptions.

Use Shallow Comparison: Use shallow or useShallow for derived objects/arrays.

Small, Scoped Stores: Initialize stores with context for per-route or per-request isolation.

Invalidate Queries After Mutations: Always call queryClient.invalidateQueries() after server updates.

Prefetch Concurrently: Use Promise.all() for multiple prefetches on the server to avoid waterfall delays.

## [AntiPattern] Anti-Patterns
Duplicating Server Data: Copying React Query results into Zustand leads to stale or inconsistent UI.

Global Stores in Server Components: Causes state leaks across requests. Always use createStore() inside context providers.

Mutating Server Cache in RSC: Do not mutate query cache in server components. Prefetch only.

Unstable Query Keys: Non-deterministic keys (functions, unsorted objects) cause refetch loops.

Creating New QueryClients in Clients: Instantiating inside components breaks hydration and forces refetches.

Infinite Refetch Loops: Caused by unstable query keys or effects calling refetch without dependencies.

Hydration Logic in Render: Using window or localStorage during render causes mismatches. Always rehydrate inside useEffect.

## [ErrorFix] Error Catalog
Symptom	Cause	Fix
Hydration Mismatch ("Text content does not match")	Reading browser APIs on the server, leaking Zustand store globally, mismatched query client.	Move client logic into useEffect; use per-request store; ensure shared QueryClient.
Infinite Refetch After SSR	Client instantiates new QueryClient, missing cache.	Use a shared singleton QueryClient; ensure same key structure.
Query Not Invalidated	invalidateQueries() called on new client or missing await.	Use useQueryClient() from context and await queryClient.invalidateQueries().
Stale Closures / Race Conditions	Outdated variables in mutation handlers or multiple optimistic updates.	Use onMutate context properly; update cache via queryClient.setQueryData().
Unexpected Rerenders	Subscribing to entire store or returning new object refs.	Use atomic selectors and shallow.
Server Action Not Executing	Missing 'use server' directive or no revalidation.	Add 'use server'; call revalidatePath() or revalidateTag().

## [Integration] Integration Notes
### RSC ↔ Client Boundaries
Server components fetch data and pass serialized props to client components.

Client components provide Zustand context and subscribe to stores.

Use per-request stores in SSR to prevent leakage.

### SSR Prefetch + Hydration
Create a new QueryClient on the server.

Prefetch queries concurrently (Promise.all).

Serialize via dehydrate().

Wrap the client in <HydrationBoundary>.

On the client, call useSuspenseQuery() with the same key and staleTime > 0.

### Streaming & Suspense
Wrap components using useSuspenseQuery() in <Suspense> with skeleton fallback.

Use shouldDehydrateQuery() to include pending queries in the dehydration payload.

Next.js streams RSC and client markup together for faster rendering.

### Mutations & Server Actions
Client mutations can call server actions or route handlers.

After successful mutation, call queryClient.invalidateQueries() or revalidate caches on the server.

Server actions should be marked 'use server' and call revalidatePath() or revalidateTag().

### Auth and Cookies
Include cookies/tokens in query keys to segregate caches per user.

Never persist secrets in Zustand; use secure cookies for auth.

## [Performance] Performance Rules
Tune staleTime & cacheTime: Longer staleTime avoids redundant refetching.

Avoid Over-Subscription: Use atomic selectors in Zustand.

Batch Updates: Combine related state updates in a single set() call.

Parallel Prefetch: Always prefetch multiple queries concurrently.

Streaming Rendering: Prefer useSuspenseQuery() for concurrent fetching.

Optimistic Mutations Carefully: Only use if predictions are reliable; otherwise, invalidate queries.

Limit Hydration Payload: Customize shouldDehydrateQuery() to reduce JSON size.

Persist Client State Safely: Rehydrate in useEffect and avoid sensitive data persistence.

## [Recipe] SSR Prefetch & Hydration with Zustand Filters
```tsx
// app/posts/page.tsx (Server Component)
import { getQueryClient } from '@/lib/getQueryClient'
import { dehydrate } from '@tanstack/react-query'
import PostsTable from './PostsTable'

export default async function PostsPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['posts', { filter: '' }],
    queryFn: () => fetchPosts(''),
    staleTime: 5 * 60 * 1000,
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsTable />
    </HydrationBoundary>
  )
}

// app/posts/PostsTable.tsx (Client Component)
'use client'
import { useFilter, useSetFilter } from '@/store/postsFilter'
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query'

export default function PostsTable() {
  const filter = useFilter()
  const setFilter = useSetFilter()
  const { data: posts } = useSuspenseQuery(
    queryOptions({
      queryKey: ['posts', { filter }],
      queryFn: () => fetchPosts(filter),
    })
  )
  return (
    <>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul>
        {posts.map((p) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </>
  )
}
``` 

This recipe demonstrates server-side prefetch and hydration with a client-side Zustand filter driving React Query.

## [Recipe] Mutation with Optimistic Update & Rollback
```tsx
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addItem } from '@/app/actions'

export default function AddItemButton() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (text: string) => addItem(text),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ['items'] })
      const previous = queryClient.getQueryData(['items'])
      queryClient.setQueryData(['items'], (old: any[] = []) => [
        { id: 'optimistic', text },
        ...old,
      ])
      return { previous }
    },
    onError: (_err, _text, ctx) => {
      queryClient.setQueryData(['items'], ctx?.previous)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
  return (
    <button onClick={() => mutation.mutate('New item')} disabled={mutation.isPending}>
      Add Item
    </button>
  )
}
```

## [Recipe] Using Zustand with React Query Derived State
```tsx
'use client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useCartStore } from '@/stores/cartStore'

export default function CartView() {
  const selected = useCartStore(s => s.selectedIds)
  const toggle = useCartStore(s => s.actions.toggle)
  const { data: items } = useSuspenseQuery({ queryKey: ['items'], queryFn: fetchItems })
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => toggle(item.id)}>
          <input type="checkbox" checked={selected.includes(item.id)} readOnly /> {item.name}
        </li>
      ))}
    </ul>
  )
}
```

This example scopes a per-route Zustand store to track UI selection while React Query manages data fetching.

## [Recipe] Invalidating Queries After a Server Action
```tsx
// app/actions/renameUser.ts (Server Action)
'use server'
import { revalidatePath } from 'next/cache'

export async function renameUserAction({ id, name }) {
  await db.users.update({ id, name })
  revalidatePath('/users')
}

// components/UserRenameForm.tsx (Client)
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { renameUserAction } from '../actions/renameUser'

export default function UserRenameForm({ id, currentName }) {
  const [name, setName] = useState(currentName)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => renameUserAction({ id, name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" disabled={mutation.isPending}>Rename</button>
    </form>
  )
}
``` 