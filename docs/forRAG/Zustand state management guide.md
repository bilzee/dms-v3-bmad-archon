---
title: "Module 3 – Zustand: State-Management in React Applications"
version: "1.0"
module: "Zustand State Management Guide"
tags: ["Zustand", "React 18", "Next.js", "App Router", "State Management", "RAG"]
description: "Cleaned Markdown knowledge pack detailing Zustand concepts, best practices, anti-patterns, error fixes, integration with Next.js, and performance optimizations for ingestion into RAG systems."
---

# Module 3 – Zustand: State-Management in React Applications

Zustand is a lightweight state-management library that complements React 18’s hooks model.  
It offers a simple API for creating stores, subscribing to state, and dispatching actions without boilerplate.  
This knowledge pack synthesizes the core concepts, best-practice patterns, anti-patterns, error-and-fix catalogues, integration notes, performance rules and practical recipes for using Zustand in React applications – especially within Next.js 14 and the App Router.

---

## [Concept] Core Concepts

### Creating a Store

Zustand stores are functions created with `create` (or `createStore` in vanilla environments).  
The store holds state and actions and returns a hook that components can call to select state.

```tsx
import { create } from 'zustand'

export const useCountStore = create((set, get) => ({
  count: 0,
  inc: () => set(state => ({ count: state.count + 1 })),
}))
Each call to useCountStore(selector) subscribes the component to a slice of state.
Zustand merges updates at the top level of the state object automatically.
For nested objects, spread nested properties manually or pass true as the second argument to set to replace state entirely.

### Slices Pattern
Large stores can be split into slices – independent pieces of state logic – and combined.
Define slice creators that receive set, get, and return partial state. Combine them with object spread.
Apply middleware once after combining slices, not inside each slice.
This pattern encourages modularity and makes adding new slices non-disruptive.

### Selectors and Shallow Comparison
Selectors are functions that pick subsets of state.
Always subscribe using selectors rather than the full store to prevent unnecessary re-renders.
When selecting arrays or objects, use the shallow comparator from zustand/shallow.

```tsx
import { shallow } from 'zustand/shallow'
const bears = useStore(state => state.bears, shallow)
For derived values that are always shallow-equal, use useShallow.
Memoize complex selectors with useMemo or useCallback for stability between renders.

### Immutable Updates and Merging
Zustand encourages immutable updates.
set merges shallowly, so nested objects must be spread manually.

```tsx
set(state => ({
  user: { ...state.user, name: 'John' }
}))
```
To replace the entire state, call set(newState, true).
For deep structures, consider using Immer or functional lenses for composable updates.

### Middleware
Zustand provides middleware to extend store behavior:

devtools – Integrates Redux DevTools for action inspection and time travel.

persist – Saves state to localStorage, sessionStorage, or custom storage.

immer – Enables Immer’s draft API for immutable updates.

```tsx
import { create } from 'zustand'
import { devtools, persist, immer } from 'zustand/middleware'

export const useTodoStore = create(
  devtools(
    persist(
      immer((set) => ({
        todos: [],
        addTodo: (text) => set(state => { state.todos.push({ id: Date.now(), text }) }),
      })),
      { name: 'todo-storage' },
    ),
    { name: 'todo-devtools' },
  ),
)
```
Middleware can be composed: devtools(persist(immer(...))).

### Persist and Hydration
The persist middleware hydrates state synchronously with localStorage/sessionStorage or asynchronously with IndexedDB.
For async storage, hydration occurs after mount, so the store returns initial state on first render.

Use helper methods:

useStore.persist.rehydrate() – manually trigger hydration.

useStore.persist.hasHydrated() – check hydration status.

skipHydration – defer hydration until explicitly called.

onRehydrateStorage / onFinishHydration – track lifecycle events.

Custom merge functions can control how persisted and current state combine.

## [BestPractice] Best Practices
### Organize Stores and Slices
- Create separate stores for unrelated domains (e.g., user, cart).
- Use slices within one store for related logic.
- Apply middleware at the combined level, not inside each slice.
- Keep actions colocated with state to avoid scattered logic.

### Selective Subscriptions and Memoization
- Subscribe only to needed slices using selectors.
- Use shallow comparison to prevent redundant renders.
- Memoize selectors with useMemo or useCallback.
- Avoid subscribing to the entire store.

### Avoid Over-Reliance on Global State
- Keep transient UI state local to components.
- Persist only essential data.
- Overuse of global stores leads to tight coupling and re-renders.

### Use Per-Request Stores in Next.js
Next.js 14 App Router runs server and client components concurrently.
A global store is shared across users and requests.
Instead, create per-request stores with createStore and provide them through React context.

```tsx
import { createStore } from 'zustand/vanilla'
import { createContext, useRef, useContext } from 'react'

const CounterStoreContext = createContext(null)

export const CounterStoreProvider = ({ children }) => {
  const storeRef = useRef()
  if (!storeRef.current) {
    storeRef.current = createStore(() => ({ count: 0, inc: () => {} }))
  }
  return (
    <CounterStoreContext.Provider value={storeRef.current}>
      {children}
    </CounterStoreContext.Provider>
  )
}
```
Use useSyncExternalStore or useStore to consume the store in client components.
Never access Zustand stores in server components.

### Resetting and Versioning
Implement reset() actions to restore initial state.
For persisted stores, version your schema and add a migrate function to transform stored data.

## [AntiPattern] Anti-Patterns
- Overloading a single store: Avoid monolithic stores; split into slices or separate stores.
- Mutating state directly: Never assign state manually (useStore().count = 5). Always use set().
- Creating stores inside components: Causes re-creation on every render and state loss.
- Non-memoized selectors: Leads to redundant renders.
- Persisting functions: JSON serialization removes methods; restore via custom merge.

## [ErrorFix] Error Catalog
### Hydration Mismatch in Next.js
Cause: Server renders differ from client (e.g., accessing localStorage too early).
Fix: Use skipHydration, manually call rehydrate() in useEffect, and delay rendering until hydrated.

```tsx
function HydrationGate({ children }) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    useStore.persist.rehydrate().then(() => setHydrated(true))
  }, [])
  if (!hydrated) return <p>Loading...</p>
  return children
}
```

### Stale Closures
Cause: Async callbacks capture outdated state references.
Fix: Always read state via get() inside actions, not from closures.

```tsx
set((state) => ({ count: state.count + 1 })) // ✅ fresh state each call
```

### Lost State on Hot Reload
Cause: HMR reloads modules and resets store state.
Fix: Save and restore store state across reloads.

```tsx
export const zustandHmrFix = (name, useStore) => {
  if (import.meta.hot) {
    const prev = import.meta.hot.data[name]
    if (prev) useStore.setState(prev)
    useStore.subscribe((s) => { import.meta.hot.data[name] = s })
    import.meta.hot.accept(() => useStore.setState(import.meta.hot.data[name]))
  }
}
```

### Missing Methods After Hydration
Cause: Persisted stores lose functions after JSON serialization.
Fix: Provide a custom merge to combine persisted plain data with initial state.

```tsx
const useStore = create(
  persist((set) => ({
    count: 0,
    inc: () => set(s => ({ count: s.count + 1 })),
  }), {
    name: 'counter',
    merge: (persisted, current) => ({ ...current, ...persisted }),
  }),
)
```

### Race Condition with Async Storage
Cause: Async storage rehydrates too late; default state overwrites persisted data.
Fix: Use custom merge and await rehydrate() before rendering.

## [Integration] Integration Notes
### Next.js App Router & Server Components
- Per-request store: Create store per user request with createStore.
- Client components only: Hooks like useStore must not run on the server.
- Hydration strategy: Set skipHydration and trigger manually.
- Immutable data flow: Pass props from server → client; don’t mutate shared state.

### React Suspense and useSyncExternalStore
Zustand internally uses useSyncExternalStore.
Do not suspend rendering based on store updates; instead, use explicit loading flags inside the store.

### Context Interop
Zustand stores can interoperate with React Context.
Create a vanilla store, wrap it in a Context Provider, and access with custom hook:

```tsx
import { createStore } from 'zustand/vanilla'
import { createContext, useContext, useRef } from 'react'

const CounterStoreContext = createContext(null)

export const CounterStoreProvider = ({ children }) => {
  const storeRef = useRef()
  if (!storeRef.current) storeRef.current = createStore(() => ({ count: 0, inc: () => {} }))
  return (
    <CounterStoreContext.Provider value={storeRef.current}>
      {children}
    </CounterStoreContext.Provider>
  )
}

export const useCounterStore = (selector) => {
  const store = useContext(CounterStoreContext)
  return store.subscribe(selector, () => selector(store.getState()))
}
```

## [Performance] Performance Rules
- Subscribe selectively with shallow comparators.
- Split state logically into slices or multiple stores.
- Derive computed values via selectors instead of storing duplicates.
- Memoize heavy selectors with useMemo or useCallback.
- Persist only required fields (partialize).
- Lazy-load store modules to reduce initial bundle size.

## [Recipe] Recipes & Snippets
### Persisting State with localStorage / sessionStorage
```tsx
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useBearStore = create()(persist(
  (set, get) => ({
    bears: 0,
    fish: 0,
    addBear: () => set({ bears: get().bears + 1 }),
    addFish: () => set({ fish: get().fish + 1 }),
  }),
  {
    name: 'bear-storage',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ bears: state.bears }),
  },
))
```

### Async Actions (fetch + update)
```tsx
export const usePostsStore = create((set) => ({
  posts: [],
  isLoading: false,
  fetchPosts: async () => {
    set({ isLoading: true })
    const res = await fetch('https://jsonplaceholder.typicode.com/posts')
    const data = await res.json()
    set({ posts: data, isLoading: false })
  },
}))
```

### Combining Middleware
```tsx
import { create } from 'zustand'
import { devtools, persist, immer } from 'zustand/middleware'

export const useTodoStore = create(
  devtools(
    persist(
      immer((set) => ({
        todos: [],
        addTodo: (text) => set((state) => { state.todos.push({ id: Date.now(), text }) }),
      })),
      { name: 'todo-storage' },
    ),
    { name: 'todo-devtools' },
  ),
)
```

### Manual Hydration with skipHydration
```tsx
const useCartStore = create(
  persist(
    (set) => ({ items: [] }),
    { name: 'cart-store', skipHydration: true },
  ),
)

function CartComponent() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    useCartStore.persist.rehydrate().then(() => setHydrated(true))
  }, [])
  if (!hydrated) return <p>Loading…</p>
  const items = useCartStore((s) => s.items)
  return <ul>{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
}
```

### Zustand + React Context Interop
```tsx
import { createStore } from 'zustand/vanilla'
import { createContext, useContext, useRef } from 'react'

const CounterStoreContext = createContext(null)

export const CounterProvider = ({ children }) => {
  const storeRef = useRef()
  if (!storeRef.current) {
    storeRef.current = createStore(() => ({ count: 0, inc: () => {} }))
  }
  return (
    <CounterStoreContext.Provider value={storeRef.current}>
      {children}
    </CounterStoreContext.Provider>
  )
}

export const useCounterStore = (selector) => {
  const store = useContext(CounterStoreContext)
  return store.subscribe(selector, () => selector(store.getState()))
}
```

### Async Storage Race Prevention
Use custom deep merge to combine persisted and current state, preventing overwrites.

Virtualized Lists for Large Forms
Combine useFieldArray-style state with react-window or similar virtualization libraries for lists exceeding hundreds of items.