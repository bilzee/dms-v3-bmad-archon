---
title: "Module 4 – Zustand + Next.js App Router Data Fetching + TanStack Query Sync"
version: "1.0"
module: "Zustand + Next.js Integration"
tags: ["Zustand", "TanStack Query", "Next.js App Router", "Server Actions", "Streaming", "Suspense", "RAG"]
description: "Consolidated knowledge pack explaining the coordination of Zustand (client state), Next.js App Router (server data fetching), and TanStack Query (server state) for SSR, streaming, and synchronization. All citations removed."
---

# Module 4 – Zustand + Next.js App Router Data Fetching + TanStack Query Sync

---

## [Concept] Client vs Server State

In a Next.js App Router application, both **client state** and **server state** coexist.  
**TanStack Query** manages *server state*—data fetched from remote APIs, cached, and invalidated automatically.  
**Zustand** manages *client state* such as UI filters, form drafts, or temporary selections.  

Key rules:

- Do **not** copy React Query data into Zustand; this duplicates state and causes synchronization bugs.  
- TanStack Query uses **query keys** (arrays) to uniquely identify data. Keys should include all variables used in the fetch function.  
- `staleTime` defines how long data is considered fresh; `cacheTime` controls cache garbage collection.  
- Next.js server functions run per request—never persist global state across users.

---

## [Concept] Next.js App Router Lifecycle

Next.js App Router distinguishes between **server components** and **client components**.

- **Server Components:**  
  - Run only on the server and can access secrets or databases.  
  - May perform async data fetching and call server actions.  
  - Output is streamed as an RSC (React Server Component) payload to the browser.

- **Client Components:**  
  - Prefaced with `"use client"`.  
  - Use hooks (`useState`, `useEffect`, etc.) and interact with the DOM.

- **Composition:**  
  Server components can embed client components and pass props down.  
  Suspense and streaming enable **Partial Pre-Rendering (PPR)**: static sections are sent first, while dynamic data resolves progressively.

- **Fetch Behavior:**  
  `fetch()` in server components is cached by default. Use `cache: 'no-store'` or `revalidate` options to control freshness.  
  **Route handlers** and **server actions** revalidate caches via `revalidateTag` or `revalidatePath`.

---

## [Concept] TanStack Query v5 Fundamentals

- Each query is identified by a **query key** (array).  
- Important options:
  - `staleTime`: duration before data becomes stale.
  - `cacheTime`: duration unused data remains cached.
- Use the **`select`** function to transform raw data; derived results are memoized.  
- **Mutations** (`useMutation`) support:
  - `onMutate`: optimistic updates.
  - `onError`: rollback.
  - `onSettled`: invalidate queries.

**SSR Pattern:**
- Create a new `QueryClient` per request.
- Prefetch data on the server via `prefetchQuery()`.
- Call `dehydrate()` and wrap the client component in `<HydrationBoundary>`.
- On the client, use the same query key and set `staleTime > 0` (often `Infinity`) to avoid refetch after hydration.

---

## [Concept] Zustand Essentials and SSR Integration

Zustand creates small, reactive stores for client state.  
Because stores are global singletons, you must create a new store per request during SSR to prevent **state leaks** between users.

Typical pattern:

```tsx
import { createStore } from 'zustand/vanilla'
import { createContext, useContext, useRef } from 'react'

const AppStoreContext = createContext(null)

export function AppStoreProvider({ children }) {
  const storeRef = useRef()
  if (!storeRef.current) {
    storeRef.current = createStore(() => ({ filter: '', setFilter: (f) => ({ filter: f }) }))
  }
  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {children}
    </AppStoreContext.Provider>
  )
}
```

export const useAppStore = (selector) => useContext(AppStoreContext)(selector)
Additional recommendations:

Split logic into slices (e.g., createFilterSlice, createAuthSlice).

Apply middleware (persist, devtools, immer) only to the combined store.

Use selectors with shallow to prevent re-renders.

Derive data from React Query inside components (via useEffect), not inside store files.

## [Concept] Coordination Between TanStack Query, Zustand and App Router
Integration involves maintaining clear boundaries:

UI State in Zustand – filters, selections, form drafts.

Server Data in React Query – fetched and cached remotely.

API Layer – pure async functions for fetch/mutate operations.

Query Hooks – use Zustand selectors to read filters, pass them into query keys.

Mutations & Invalidation – update via useMutation; on success, invalidate queries and clear local store.

SSR Hydration – prefetch on the server, dehydrate, then rehydrate on client.

Avoid putting fetch logic directly inside Zustand actions.
If syncing derived query data into Zustand, do it in useEffect within components.

## [BestPractice] Separation of Concerns
TanStack Query → server data

Zustand → local UI state

Never duplicate server data in Zustand.

Create new QueryClient and Zustand store per request for SSR.

Use <HydrationBoundary> to hydrate pre-fetched data.

Set staleTime > 0 on client to prevent duplicate refetch.

## [BestPractice] Query Keys and Selectors
Query keys must include all variables used in the fetch function.

Example: ['todos', { filter, page }]

Use select to derive slices of server data (e.g., sorting, filtering) instead of computing in components.

In Zustand, use selectors with shallow comparison for performance.

When combining slices, apply middleware at the root, not per slice.

## [BestPractice] Suspense and Streaming Usage
Wrap slow components in <Suspense> to enable streaming.

For RSC with useSuspenseQuery, prefetch or use ReactQueryStreamedHydration.

Assign staleTime > 0 so data stays fresh during hydration.

In Partial Pre-Rendering, annotate dynamic sections with <Suspense>.

## [BestPractice] Invalidation After Mutations and Server Actions
Use optimistic UI updates via onMutate.

Call queryClient.invalidateQueries() in onSettled.

For server actions, call revalidateTag or revalidatePath to refresh caches.

For multi-step forms or drag-and-drop UIs, hold unsaved changes in Zustand, then push via mutation when confirmed.

## [AntiPattern] Mixing Data Fetching Inside Stores
Performing API calls directly inside Zustand actions couples client and server state.
Instead, define pure fetch functions for React Query and update the store separately if needed.
Do not copy entire server responses into Zustand—store only minimal derived data (e.g., selection IDs).

## [AntiPattern] Global Stores or Query Clients
Creating global singletons in Next.js leads to data leaks between users.
Always create a new store and QueryClient per request, and provide via context.
In client components, persist one QueryClient but avoid recreating it with useState inside streaming boundaries.

## [AntiPattern] Incorrect Query Keys
Forgetting to include variables in query keys or using inconsistent keys leads to stale or infinite refetching.
Include all parameters used in the fetcher and keep key order consistent.
Avoid unstable object literals; memoize query keys.

## [AntiPattern] Missing staleTime for SSR Hydration
When hydrating server-prefetched queries on the client, set staleTime > 0 (often Infinity) to prevent immediate refetching and flashing loading states.

## [ErrorFix] Hydration Mismatch Errors
Symptom:
Warning: Text content did not match.

Causes:

Prefetching not done → server renders loading state, client renders data.

Using browser APIs in server components.

Zustand store initialized with different defaults than server.

Fix:

Prefetch all queries and wrap in <HydrationBoundary>.

Avoid accessing window or localStorage on server.

Ensure Zustand initial state matches SSR output.

Never call hooks conditionally.

## [ErrorFix] Infinite Refetch Loops
Symptom: Continuous refetching and network thrashing.
Causes: Query key changes on every render or effects calling refetch() repeatedly.
Fix:

Memoize query keys (useMemo).

Use stable primitives.

Set staleTime sensibly.

Avoid manual refetch loops; rely on invalidation.

## [ErrorFix] Stale Closures and Race Conditions
Cause: Async callbacks capture outdated state or dependencies.
Fix:

Include all variables in dependency arrays.

Use callback selectors (useCallback).

Return optimistic context from onMutate and restore in onError.

Avoid reading Zustand state outside hooks.

## [ErrorFix] Misuse of Server vs Client Boundaries
Errors:

useEffect inside Server Components.

Duplicated network calls in client and server.

Fix:

Fetch only in server components or React Query hooks.

Mark client components with "use client".

Use server actions for mutations and revalidation.

## [Integration] SSR/CSR/RSC Boundaries and Hydration
Workflow:

Create a QueryClient per request on the server.

Prefetch queries with prefetchQuery().

Dehydrate and wrap the client component with <HydrationBoundary>.

On client, wrap app in <QueryClientProvider> using a persistent QueryClient.

For streaming, use ReactQueryStreamedHydration.

Create Zustand stores per request; hydrate from initial state to match server markup.

Persist only on the client using the persist middleware.

## [Integration] Server Actions and Route Handlers
Server Actions: Functions marked 'use server' that run during form submission or events.

Perform updates, then call revalidateTag() or revalidatePath() to trigger cache invalidation.

Route Handlers: Define custom API endpoints under app/api/*.

Often serve as data sources for TanStack Query hooks.

When using optimistic updates, update Zustand only after the server action succeeds to avoid mismatches.

## [Integration] Combining Suspense, Streaming and Client State
Wrap interactive client components with <Suspense> to stream separately.

Use useSuspenseQuery for server data.

Hydrate Zustand store inside the Suspense boundary so both sources resolve together.

Compute derived state inside components rather than in the store file.

## [Performance] Rendering and Memory Optimization
Derive only necessary data using select.

Tune staleTime and cacheTime to data volatility.

Use keepPreviousData for paginated lists to prevent loading flicker.

In Zustand, use selectors + shallow comparison.

Minimize cross-slice dependencies.

Create per-request QueryClients and stores to prevent memory leaks.

## [Performance] Preventing Race Conditions
Manage optimistic updates properly: return context in onMutate, rollback on onError.

Always invalidate queries after mutations.

Keep query keys stable and memoized.

Avoid creating QueryClient inside server component during streaming—use useRef for stability.

## [Recipe] SSR Prefetch → Client Rehydration
```tsx
// server component page.tsx
import { QueryClient, dehydrate } from '@tanstack/react-query'
import { HydrationBoundary } from '@tanstack/react-query-next-experimental'
import { getProducts } from '@/lib/api'
import ProductsClient from './products-client'

export default async function Page() {
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({ queryKey: ['products'], queryFn: getProducts })
  const dehydrated = dehydrate(queryClient)
  return (
    <HydrationBoundary state={dehydrated}>
      <ProductsClient />
    </HydrationBoundary>
  )
}

// client component products-client.tsx
"use client"
import { useQuery } from '@tanstack/react-query'
import { getProducts } from '@/lib/api'

export default function ProductsClient() {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    staleTime: Infinity,
  })
  return <ProductList items={data ?? []} />
}
```

Ensures the client hydrates server data without a duplicate fetch.

## [Recipe] Mutation with Optimistic Update and Zustand Sync
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app'
import { updateProduct } from '@/lib/api'

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const removeSelected = useAppStore(s => s.removeSelected)
  return useMutation({
    mutationFn: updateProduct,
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: ['products'] })
      const prevData = queryClient.getQueryData(['products'])
      queryClient.setQueryData(['products'], (old = []) =>
        old.map(p => p.id === newProduct.id ? { ...p, ...newProduct } : p)
      )
      removeSelected(newProduct.id)
      return { prevData }
    },
    onError: (_err, _newProduct, ctx) => {
      queryClient.setQueryData(['products'], ctx?.prevData)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
```

## [Recipe] Safe Projection of Query Data into Zustand
```tsx
"use client"
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app'
import { getTodos } from '@/lib/api'

export default function TodoInit() {
  const { data } = useQuery({ queryKey: ['todos'], queryFn: getTodos })
  const setIds = useAppStore(s => s.setTodoIds)
  useEffect(() => {
    if (data) setIds(data.map(todo => todo.id))
  }, [data, setIds])
  return null
}
```

Derives minimal data from React Query and stores it locally without tight coupling.

## [Recipe] Cache Invalidation after Server Actions
```tsx
// server action updateProfile.ts
'use server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { updateProfileOnServer } from '@/lib/data'

export async function updateProfile(_prev, formData) {
  await updateProfileOnServer(formData)
  revalidateTag('user')
  revalidatePath('/profile')
  return { success: true }
}

// client component profile-form.tsx
"use client"
import { useFormState } from 'react-dom'
import { updateProfile } from './updateProfile'

export default function ProfileForm() {
  const [state, action] = useFormState(updateProfile, { success: false })
  return (
    <form action={action}>
      <button type="submit">Save</button>
      {state.success && <p>Saved!</p>}
    </form>
  )
}
```

## [Recipe] Streaming Form with Suspense and Zustand
```tsx
// server component page.tsx
import dynamic from 'next/dynamic'

export default function Page() {
  const HeavyForm = dynamic(() => import('./heavy-form'), {
    ssr: false,
    loading: () => <p>Loading form…</p>,
  })
  return (
    <>
      <h1>User Dashboard</h1>
      <HeavyForm />
    </>
  )
}

// client component heavy-form.tsx
"use client"
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getUserData } from '@/lib/api'
import { useUserStore } from '@/stores/user'

function UserFormContents() {
  const { data } = useQuery({ queryKey: ['user'], queryFn: getUserData })
  const setDraft = useUserStore(s => s.setDraft)
  if (data) setDraft(data)
  return <form>{/* bound to Zustand draft */}</form>
}

export default function HeavyForm() {
  return (
    <Suspense fallback={<p>Loading user…</p>}>
      <UserFormContents />
    </Suspense>
  )
}
```

Demonstrates streaming a client form that hydrates with server data and updates Zustand state.