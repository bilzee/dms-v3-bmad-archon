---
title: "Module 8 – Dexie + Encryption Patterns (Next.js App Router)"
version: "1.0"
module: "8"
tags: ["Dexie", "IndexedDB", "Web Crypto API", "Encryption", "Next.js", "App Router", "Offline Sync", "Key Management", "Web Workers", "CSP"]
description: "RAG-ready knowledge pack on Dexie (IndexedDB wrapper) and client-side encryption strategies in Next.js App Router, covering schema design, transactions, concurrency, Web Crypto, key management, sync, performance, and error handling."
---

Module 8: Dexie + Encryption Patterns (Next.js App Router)

---

[Concept] ### Core IndexedDB & Dexie Fundamentals

IndexedDB is a transactional database built into browsers. Each database has a **name** and **integer version**; calling `indexedDB.open(name, version)` triggers `onupgradeneeded` when upgrading.  
- **Object stores** = tables with keys and indexes (unique, multi-entry).  
- **Transactions**: `db.transaction(storeNames, mode)` — short-lived, auto-commit on success.  
- Avoid asynchronous code outside the transaction scope to prevent `TransactionInactiveError`.  

**Dexie.js** wraps IndexedDB with a fluent API:
```ts
db.version(1).stores({
  users: '++id, name, age'
})
```

Dexie handles creation, upgrades, and async operations.
Transactions:

```ts
db.transaction('rw', db.users, async () => { ... })
```

Features include hooks, live queries, and schema upgrades.

### [Concept] ### Dexie in Next.js App Router & Browser Boundaries

IndexedDB only runs in browser — use 'use client' directive or dynamic imports.

Server Components cannot access window or browser APIs.

Mark client components with 'use client', or use:

```tsx
const NotesList = dynamic(() => import('./NotesList'), { ssr: false });
Guard code with if (typeof window === 'undefined') return null;

Only expose environment variables prefixed with NEXT_PUBLIC_.

Encryption logic should reside in client components, while servers handle secrets or key provisioning.

### [Concept] ### Encryption Threat Model & Options

Threat models:

Device theft → encrypt IndexedDB at rest.

XSS → little protection if compromised; mitigate via strict CSP, Trusted Types.

Multi-user device → isolate encryption per user.

Offline attacker → encrypt + derive keys securely.

Encryption approaches:

Storage-level (OS/TPM) — protects against offline theft.

App-level — encrypt before saving to IndexedDB; supports per-user keys and offline access.

### [BestPractice] ### Key Derivation & Encryption with Web Crypto

Use Web Crypto API:

Derive keys with PBKDF2:

```tsx
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
Use AES-GCM encryption:

Random 12-byte IV per record (crypto.getRandomValues()).

Store IV and salt with ciphertext.

Use HKDF for high-entropy secrets (e.g., ECDH outputs).

Always store metadata (salt, iteration, user id) with records.

### [BestPractice] ### Dexie Schema & Data Modeling

Use ++id or custom primary keys.

Avoid indexing binary data or large blobs.

Split entities into separate stores to reduce contention.

Use multi-entry (*tags) for arrays.

For migrations:

```tsx
db.version(2).stores({ notes: '++id, title, *tags, createdAt' })
  .upgrade(tx => tx.table('notes').toCollection().modify(note => note.createdAt = Date.now()));
Keep upgrade functions idempotent and incremental.

```
### [BestPractice] ### Managing Transactions & Multi-tab Concurrency

Use:

```tsx
db.transaction('rw', [stores], async () => { ... })
```

Keep transactions short; async awaits can auto-close them.

Use Dexie.waitFor() to keep transactions alive during async calls.

Multi-tab: Dexie emits storagemutated and supports BroadcastChannel for sync.

Handle upgrades:

```tsx
Dexie.on.blocked = () => alert('Close other tabs to continue upgrade');
```

Fallbacks: Safari 15 lacks BroadcastChannel; use service worker messaging.

### [BestPractice] ### Reactivity & Dexie LiveQuery

Use liveQuery() for reactive queries:

```tsx
const notes = useLiveQuery(() => db.notes.toArray(), [], []);
```

Avoid “render storms” by narrowing filters and stable query functions.

Use Suspense boundaries or useSyncExternalStore for async React integration.

Offload heavy work to Web Workers.

### [BestPractice] ### Key Management & Rotation

Never store raw keys in IndexedDB or localStorage.

User-derived: derive via PBKDF2/Argon2, store only salt + iteration count.

Remote-provisioned: fetch encrypted key post-auth and decrypt locally.

Rotation: re-encrypt with new key and store version metadata:

```tsx
await db.transaction('rw', db.notes, async () => {
  await db.notes.toCollection().modify(async note => {
    // decrypt & re-encrypt with new key
  });
});
```

Revocation: clear keys on logout; separate encryption contexts per user.

### [BestPractice] ### Sync & Offline Patterns

Revision counters: increment per update (rev > lastSynced).

Vector clocks: detect causality between replicas.

CRDTs: resolve concurrent edits automatically.

Always encrypt payloads before sync; store only ciphertext server-side.

Include revision in AES-GCM’s AAD to prevent replay.

Keep metadata (IDs, revisions) unencrypted for indexing.

Re-key old data in schema upgrades via db.version().upgrade().

### [AntiPattern] ### Common Mistakes

Reusing IVs with AES-GCM → breaks security.

Weak KDF (low iterations, fixed salt).

Storing raw keys in browser storage.

Indexing large binary blobs → performance crash.

Using IndexedDB in Server Components.

Awaiting async operations mid-transaction.

Encrypting all fields (breaks queries).

Stacking multiple ciphers (AES-CTR + GCM = bad).

Ignoring XSS — enforce CSP + Trusted Types.

### [ErrorFix] ### Error Catalog

Error	Likely Cause	Fix
QuotaExceededError	Storage full or cleared	Catch error, delete old data, compress, or prompt user
VersionError	DB version < installed version	Increment version; don’t downgrade
TransactionInactiveError	Async code outside transaction	Keep operations inside Dexie scope; use Dexie.waitFor()
blocked	Another tab open during upgrade	Close other tabs; handle Dexie.on.blocked
window is not defined	IndexedDB used in server component	Use client-only or dynamic(..., { ssr: false })
InvalidKeyUsage	Wrong key or IV	Use AES-GCM 12-byte IVs
Unsupported KDF	Using Argon2 in WebCrypto	Use PBKDF2 or derive on backend

### [Integration] ### Notes for Next.js App Router & Dexie

Place Dexie code in 'use client' components.

Use dynamic() with ssr: false for client-only components.

Fetch secrets in server components; pass derived keys via props.

Apply strict CSP and nonces via middleware:

```tsx
res.headers.set('Content-Security-Policy', "script-src 'self' 'nonce-XYZ' 'strict-dynamic'; object-src 'none'; base-uri 'none'");
```

Use Trusted Types to mitigate DOM-based XSS.

Use Service Workers for background sync and offline cache.

Offload crypto tasks to Web Workers with message passing.

Implement BroadcastChannel or fallback messaging for tab sync.

### [Performance] ### Rules & Optimization

Use bulkAdd() / bulkPut() for batching.

Avoid indexing binary fields.

Replace offset pagination with cursor-based queries:

```tsx
const cursor = await db.table.orderBy('id').filter(...).first();
```

Stream data via each() or limit().

Free space regularly with compaction or upgrade.

Offload heavy crypto to Web Workers.

For React:

Use stable query keys.

Combine filters with where() and equals().

Use reverse() and pagination for large collections.

### [Recipe] ### 1. Initialize Dexie with Schema & Migration

```tsx
import Dexie, { Table } from 'dexie';
```

export interface Note { id?: number; title: string; body: string; tags: string[]; }
class NotesDB extends Dexie {
  notes!: Table<Note>;
  constructor() {
    super('notes');
    this.version(1).stores({ notes: '++id, title, *tags' });
    this.version(2).stores({ notes: '++id, title, *tags, createdAt' })
      .upgrade(tx => tx.table('notes').toCollection().modify(note => note.createdAt = Date.now()));
  }
}
export const db = new NotesDB();

### [Recipe] ### 2. Derive a Key with PBKDF2

```tsx
export async function deriveKey(password: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

### [Recipe] ### 3. Encrypt & Decrypt with AES-GCM

```tsx
export async function encrypt(key: CryptoKey, plaintext: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv, data: new Uint8Array(ciphertext) };
}

export async function decrypt(key: CryptoKey, iv: Uint8Array, data: Uint8Array) {
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new Uint8Array(decrypted);
}
```

### [Recipe] ### 4. Transparent Encryption Middleware

```tsx
import { db } from './db';
import { deriveKey, encrypt, decrypt } from './crypto';

let cryptoKey: CryptoKey;
export async function setPassphrase(pass: string) {
  const salt = new Uint8Array(JSON.parse(localStorage.getItem('salt') || '[]'));
  cryptoKey = await deriveKey(pass, salt);
}

db.table('notes').hook('creating', function (primKey, obj) {
  const plain = new TextEncoder().encode(JSON.stringify(obj));
  return encrypt(cryptoKey, plain).then(({ iv, data }) => {
    obj.iv = Array.from(iv);
    obj.cipher = Array.from(data);
    delete obj.title;
    delete obj.body;
    delete obj.tags;
  });
});

db.table('notes').hook('reading', function (obj) {
  if (!obj.cipher) return obj;
  const iv = new Uint8Array(obj.iv);
  const data = new Uint8Array(obj.cipher);
  return decrypt(cryptoKey, iv, data).then(buf => JSON.parse(new TextDecoder().decode(buf)));
});
```
### [Recipe] ### 5. Live Query Hook with React

```tsx
'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export default function NotesList() {
  const notes = useLiveQuery(() => db.notes.toArray(), [], []);
  if (!notes) return <p>Loading…</p>;
  return (
    <ul>{notes.map(note => <li key={note.id}>{note.title}</li>)}</ul>
  );
}
```
### [Recipe] ### 6. Dynamic Import in Next.js

```tsx
import dynamic from 'next/dynamic';
const NotesList = dynamic(() => import('../components/NotesList'), { ssr: false });

export default function Page() {
  return <main><h1>Your Notes</h1><NotesList /></main>;
}
```

### [Recipe] ### 7. Background Key Rotation

```tsx
import { db } from './db';
import { deriveKey, encrypt, decrypt } from './crypto';

export async function rotateKey(oldKey: CryptoKey, newPass: string, newSalt: Uint8Array) {
  const newKey = await deriveKey(newPass, newSalt);
  await db.transaction('rw', db.notes, async () => {
    await db.notes.toCollection().modify(async note => {
      const decrypted = await decrypt(oldKey, new Uint8Array(note.iv), new Uint8Array(note.cipher));
      const reEnc = await encrypt(newKey, decrypted);
      note.iv = Array.from(reEnc.iv);
      note.cipher = Array.from(reEnc.data);
    });
  });
  return newKey;
}
```
### [Recipe] ### 8. BroadcastChannel Fallback

```tsx
const channel = 'notes-updates';
let bc: BroadcastChannel | null;
if ('BroadcastChannel' in self) bc = new BroadcastChannel(channel);

export function publishUpdate(detail: any) {
  bc?.postMessage(detail);
  self.clients?.matchAll({ type: 'window' }).then(clients =>
    clients.forEach(client => client.postMessage({ channel, detail }))
  );
}

if (bc) bc.onmessage = e => handleUpdate(e.data);
self.addEventListener('message', e => {
  if (e.data.channel === channel) handleUpdate(e.data.detail);
});
```
### [Recipe] ### 9. Sync Mutation with Revision Counter

```tsx
export async function syncChanges(lastRev: number) {
  const pending = await db.notes.where('rev').above(lastRev).toArray();
  const response = await fetch('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ pending, lastRev }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { changes, newRev } = await response.json();
  await db.transaction('rw', db.notes, async () => {
    changes.forEach((note: any) => db.notes.put(note));
  });
  return newRev;
}
```
### [Recipe] ### 10. Handle Quota Exceeded

```tsx
try {
  await db.bulkAdd(items);
} catch (e) {
  const name = (e as any).name || (e as any).inner?.name;
  if (name === 'QuotaExceededError') {
    await db.notes.where('pinned').equals(0).delete();
    alert('Storage full; old notes removed');
  } else {
    throw e;
  }
}
```

### [Recipe] ### 11. Secure Content with CSP Nonce

```tsx
import { NextResponse } from 'next/server';
export function middleware(req) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const res = NextResponse.next();
  res.headers.set('x-nonce', nonce);
  res.headers.set('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`);
  return res;
}
```

### [Recipe] ### 12. Use HKDF for High-Entropy Keys

```tsx
export async function deriveHKDF(secret: ArrayBuffer, salt: Uint8Array, info: Uint8Array) {
  const baseKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
``` 
