---
title: "Module 7 – NextAuth.js + Supabase Auth Integration (Next.js App Router)"
version: "1.0"
module: "7"
tags: ["NextAuth.js", "Supabase Auth", "Next.js 14", "App Router", "RLS", "JWT", "Sessions", "Server Components", "Integration Patterns"]
description: "RAG-ready knowledge pack detailing the integration of NextAuth.js (Auth.js) with Supabase Auth in Next.js 14 App Router, covering identity models, RLS, session strategies, security, performance, anti-patterns, errors, and implementation recipes."
---

Module 7 Knowledge Pack: NextAuth.js + Supabase Auth Integration (Next.js App Router)

---

### Overview

This knowledge pack summarises how to integrate NextAuth.js (Auth.js) with Supabase Auth in Next.js 14 App Router applications. It covers architecture, session strategies, integration patterns, App Router boundaries, RLS, security, performance, troubleshooting, and recipes. Each chunk is tagged for easy ingestion by a retrieval-augmented generation (RAG) system.

---

### [Concept] Core Concepts

**NextAuth.js architecture and session models**

NextAuth.js consists of **providers**, **adapters**, **callbacks**, and a **session strategy**.

- **Providers** handle sign-in methods (Email, OAuth, OIDC, Credentials).
- **Adapters** persist users, sessions, and tokens in the database; Supabase offers an official adapter that stores data in a `next_auth` schema.
- **Callbacks** enrich tokens or sessions; the `jwt` callback runs on sign-in and token updates, while the `session` callback copies fields from the token into the session.

**Session Strategies:**
- **JWT sessions:** Encrypted JWT stored in HttpOnly cookie — fast, portable, but hard to revoke.
- **Database sessions:** Token in cookie, data in DB — allows revocation but adds DB queries.

NextAuth defaults to **DB sessions when an adapter is used**, but can force JWT sessions via:

```ts
session: { strategy: 'jwt' }
``` 

Supabase Auth basics

Supabase Auth uses GoTrue to issue and refresh JWTs with standard claims (iss, aud, exp, sub, role, etc.). Tokens map to auth.sessions. Supabase roles: anon, authenticated, service_role — matching respective API keys. RLS enforces data access using claims from these tokens.

Integration strategies:

NextAuth as Identity Provider: NextAuth manages users; Supabase is the data layer.

Supabase as Identity Provider: Supabase manages auth; NextAuth becomes optional.

App Router Compatibility

NextAuth’s getServerSession() retrieves session data in Server Components, Route Handlers, and Server Actions. It avoids extra API calls.
In Client Components, wrap with <SessionProvider> and use useSession().

### [Integration] Sharing Identity Between NextAuth and Supabase

Using Supabase Adapter (NextAuth as Primary)

Stores user/session data in Supabase’s next_auth schema.

Does not use Supabase Auth or features like MFA.

To enforce RLS:

Generate a Supabase JWT in the session callback using the Supabase JWT secret:

```ts
const payload = {
  aud: 'authenticated',
  sub: user.id,
  email: user.email,
  role: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600,
};
session.supabaseAccessToken = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!);
```
Create a next_auth.uid() function in Postgres to read claims.

Write RLS policies using next_auth.uid() for access control.

Pass the token to Supabase client:

```ts
createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${session.supabaseAccessToken}` } },
});
```

Using Supabase Auth (No NextAuth Adapter)

Use @supabase/ssr for browser/server clients.

Retrieve user via supabase.auth.getUser() (not getSession()).

Middleware refreshes expired tokens and sets cookies.

Use publishable key on the client, service_role key only server-side.

This approach supports all Supabase Auth features (email, phone, OAuth, SSO, MFA).

Mapping Metadata and Roles

Extend next-auth.d.ts to include supabaseAccessToken and custom claims.

In Supabase Auth, embed roles/tenants in app_metadata or user_metadata.

In NextAuth’s jwt and session callbacks, forward roles/org IDs to the session payload.

Service Role Usage

Use service_role key only on the server.

Do not expose it in browser code or share between admin and user clients.

Avoid sending both user JWT and service_role key in headers — the service_role overrides and bypasses RLS.

### [BestPractice] Secure Integration & RLS-Safe Patterns

Always enable RLS on exposed tables.

Generate minimal Supabase JWT claims (aud, sub, role, exp).

Use getServerSession() in Server Components and Actions.

Explicitly forward required token fields in session callback.

Keep cookies HttpOnly, Secure, and sameSite: 'lax'.

Avoid storing sensitive data in JWT payloads.

Use token rotation (updateAge, maxAge) for both NextAuth and Supabase.

Verify tokens server-side using supabase.auth.getUser() or Supabase JWT secret.

Rotate API keys regularly and isolate admin operations in route handlers.

### [AntiPattern] Common Pitfalls

Exposing service_role key in browser — bypasses RLS.

Using useSession() in server components — causes dynamic usage errors.

Forgetting to expose next_auth schema — blocks REST API access.

Failing to forward token fields — missing user.id or roles in session.

Generating JWT without exp — creates unexpiring tokens.

Passing both service_role key and JWT — RLS bypassed.

Using getSession() instead of getUser() — insecure cookie-based validation.

Assuming Supabase adapter uses Supabase Auth — it doesn’t.

Passing session object to server actions — can be tampered with.

### [ErrorFix] Common Errors & Fixes

Error	Likely Cause	Fix
Permission denied / 42501	RLS enabled, no matching policy or missing token	Add RLS policy using next_auth.uid(); ensure Authorization header uses Bearer <token>
Queries bypass RLS	Using service_role key client-side	Use anon key client-side; reserve service role for server
Missing user.id in session	Token fields not forwarded	Copy user.id and roles in jwt & session callbacks
Dynamic server usage error	useSession() in server component	Replace with getServerSession()
Stale Supabase token	getSession() used instead of getUser()	Use middleware to refresh and verify tokens
REST API access error	next_auth schema not exposed	Add to API’s exposed schemas

### [Integration] App Router, RSC Boundaries & Middleware

Server Components: Use getServerSession() or supabase.auth.getUser().

Client Components: Use useSession() inside <SessionProvider>.

Route Handlers: Use getServerSession(req, res, authOptions) for NextAuth; createServerClient() for Supabase.

Server Actions: Always call getServerSession() within the action (don’t pass via params).

Middleware:

For Supabase-only: Refresh tokens and update cookies.

For NextAuth: Use built-in withAuth middleware for route protection with matchers.

Edge Runtime: Use JWT sessions; DB sessions supported only in Node runtime.

### [Performance] Performance & Developer Experience Rules

Parallelize data + session fetching using Promise.all().

Cache lightweight user data in session to reduce Supabase queries.

Keep JWT sessions short-lived; tune maxAge, updateAge.

Use Supabase’s SESSION_IDLE_TIMEOUT and SESSION_LIFETIME settings.

Minimize DB lookups with JWT strategy when possible.

Use sameSite='lax' cookies for better caching.

Store secrets in .env.local or hosting env vars only.

Include roles in JWT claims for RLS performance.

Disable caching (noStore()) for user-specific queries.

### [Recipe] Configure NextAuth with Supabase Adapter & GitHub Provider

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import jwt from 'jsonwebtoken';

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role;
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (secret) {
        const payload = {
          aud: 'authenticated',
          sub: token.sub,
          email: token.email,
          role: token.role,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        };
        session.supabaseAccessToken = jwt.sign(payload, secret);
      }
      return session;
    },
  },
};
export const handler = NextAuth(authOptions);
```

### [Recipe] Creating a Supabase Client with RLS Token

```ts
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Session } from 'next-auth';

export function createSupabaseClient(session?: Session) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: session?.supabaseAccessToken
          ? { Authorization: `Bearer ${session.supabaseAccessToken}` }
          : {},
      },
    },
  );
}
```

### [Recipe] Server Component Querying Supabase

```tsx
// app/dashboard/page.tsx
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { createSupabaseClient } from '@/lib/supabaseClient';

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) return <p>Access denied</p>;
  const supabase = createSupabaseClient(session);
  const { data, error } = await supabase.from('projects').select('*').eq('owner_id', session.user.id);
  if (error) return <p>Error: {error.message}</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

### [Recipe] Protected API Route Using Supabase

```ts
// app/api/projects/route.ts
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabaseClient';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createSupabaseClient(session);
  const { data, error } = await supabase.from('projects').select('*').eq('owner_id', session.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}
```

### [Recipe] Server Action Requiring Authentication

```ts
// app/actions/create-project.ts
'use server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createSupabaseClient } from '@/lib/supabaseClient';

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  const supabase = createSupabaseClient(session);
  const title = formData.get('title') as string;
  const { error } = await supabase.from('projects').insert({ title, owner_id: session.user.id });
  if (error) throw error;
}
```

### [Recipe] Role-Based Protection with Middleware

```ts
// middleware.ts
export { default } from 'next-auth/middleware';
export const config = {
  matcher: ['/admin/:path*'],
};
```

### [Recipe] Passwordless Magic Link (NextAuth)

```ts
import EmailProvider from 'next-auth/providers/email';

providers: [
  EmailProvider({
    server: process.env.EMAIL_SERVER!,
    from: process.env.EMAIL_FROM!,
  }),
];

// signIn('email', { email })
```

### [Recipe] Logout & Session Revoke

```ts
import { signOut } from 'next-auth/react';

function LogoutButton() {
  return <button onClick={() => signOut({ callbackUrl: '/' })}>Log out</button>;
}
```

If using Supabase Auth, also call:

```ts
supabase.auth.signOut();
```

### [Recipe] Rotating Supabase Token on Session Refresh

```ts
callbacks: {
  async jwt({ token, session }) {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (session && secret) {
      const exp = Math.floor(Date.now() / 1000) + 60 * 5;
      token.supabaseAccessToken = jwt.sign({
        aud: 'authenticated',
        sub: token.sub,
        email: token.email,
        role: token.role,
        exp,
      }, secret);
    }
    return token;
  },
},
```

### [Recipe] Supabase Middleware for Server-Side Auth (No NextAuth)

```ts
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(request);
  const { data, error } = await supabase.auth.getUser();
  const response = NextResponse.next();
  if (error || !data.user) return response;
  const { session } = await supabase.auth.refreshSession();
  response.cookies.set('supabase-auth-token', JSON.stringify(session), { httpOnly: true });
  return response;
}
```
