# Coding Standards - Disaster Management PWA

## Document Information
- **Version**: 1.0
- **Last Updated**: 2025-01-06
- **Purpose**: Comprehensive coding standards for Next.js 14 PWA project
- **Tech Stack**: Next.js 14, TypeScript, Shadcn/ui, Zustand, PostgreSQL/Prisma, IndexedDB

## Table of Contents
1. [TypeScript Standards](#typescript-standards)
2. [Next.js App Router Conventions](#nextjs-app-router-conventions)
3. [React Component Standards](#react-component-standards)
4. [State Management (Zustand)](#state-management-zustand)
5. [Database & API Standards](#database--api-standards)
6. [File Organization](#file-organization)
7. [Import/Export Standards](#importexport-standards)
8. [Styling Standards](#styling-standards)
9. [Testing Standards](#testing-standards)
10. [PWA-Specific Standards](#pwa-specific-standards)
11. [Error Handling](#error-handling)
12. [Performance Standards](#performance-standards)

---

## TypeScript Standards

### 1. Strict Configuration
```typescript
// tsconfig.json - Use strict mode
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 2. Type Definitions
```typescript
// ✅ Use interfaces for objects
interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

// ✅ Use types for unions and primitives
type UserRole = 'assessor' | 'coordinator' | 'responder' | 'donor' | 'admin';
type Status = 'pending' | 'approved' | 'rejected';

// ❌ Avoid any
const data: any = {}; // Bad

// ✅ Use proper typing
const data: Record<string, unknown> = {}; // Good
```

### 3. Generic Constraints
```typescript
// ✅ Use proper generic constraints
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// ✅ Constrain generics when needed
function processEntity<T extends { id: string }>(entity: T): T {
  // Implementation
}
```

---

## Next.js App Router Conventions

### 1. File Structure
```
src/app/
├── (auth)/              # Route groups for protected routes
├── (public)/            # Public routes
├── api/v1/             # API routes
├── layout.tsx          # Root layout
├── page.tsx            # Root page
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundaries
└── not-found.tsx       # 404 page
```

### 2. Page Components
```typescript
// ✅ Server Components by default
export default function AssessmentPage() {
  return <div>Assessment Dashboard</div>;
}

// ✅ Client Components when needed
'use client';
export default function InteractiveMap() {
  return <div>Interactive Map</div>;
}

// ✅ Use proper metadata export
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assessment Dashboard',
  description: 'View and manage disaster assessments',
};
```

### 3. API Routes
```typescript
// app/api/v1/assessments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Implementation
    return NextResponse.json({ data: [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## React Component Standards

### 1. Component Structure
```typescript
// ✅ Functional components with TypeScript
interface AssessmentFormProps {
  assessment?: Assessment;
  onSubmit: (data: AssessmentData) => Promise<void>;
  isLoading?: boolean;
}

export function AssessmentForm({ 
  assessment, 
  onSubmit, 
  isLoading = false 
}: AssessmentFormProps) {
  // Hooks first
  const [errors, setErrors] = useState<string[]>([]);
  const { user } = useAuthStore();
  
  // Event handlers
  const handleSubmit = async (data: AssessmentData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      setErrors(['Failed to submit assessment']);
    }
  };
  
  // Early returns
  if (!user) {
    return <div>Please log in to continue</div>;
  }
  
  // Main render
  return (
    <form onSubmit={handleSubmit}>
      {/* Component JSX */}
    </form>
  );
}
```

### 2. Props and Default Values
```typescript
// ✅ Use interface for props
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// ✅ Default values in destructuring
export function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  children, 
  onClick 
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }))}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### 3. Event Handlers
```typescript
// ✅ Proper event handler typing
const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setInput(event.target.value);
};

const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle submission
};
```

---

## State Management (Zustand)

### 1. Store Structure
```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  isLoading: false,
  error: null,
  
  // Actions
  signIn: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.signIn(credentials);
      set({ user, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Sign in failed',
        isLoading: false 
      });
    }
  },
  
  signOut: () => {
    set({ user: null, error: null });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));
```

### 2. Store Selectors
```typescript
// ✅ Use selectors for performance
const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => !!state.user);

// ✅ Combine related selectors
const { user, isLoading } = useAuthStore((state) => ({
  user: state.user,
  isLoading: state.isLoading,
}));
```

### 3. Persistence
```typescript
// ✅ Persist important state
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);
```

---

## Database & API Standards

### 1. Prisma Schema
```prisma
// ✅ Use consistent naming
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  role      UserRole
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  assessments Assessment[]

  @@map("users")
}

enum UserRole {
  ASSESSOR
  COORDINATOR
  RESPONDER
  DONOR
  ADMIN

  @@map("user_role")
}
```

### 2. API Response Types
```typescript
// types/api.ts
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3. Error Handling
```typescript
// lib/api/error-handler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): ApiResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      message: error.message,
      data: null,
    };
  }
  
  return {
    success: false,
    message: 'Internal server error',
    data: null,
  };
}
```

---

## File Organization

### 1. Component Files
```typescript
// components/forms/assessment/AssessmentForm/
├── index.ts              # Re-export
├── AssessmentForm.tsx    # Main component
├── AssessmentForm.test.tsx
├── AssessmentForm.types.ts
└── hooks/
    └── useAssessmentForm.ts
```

### 2. Index Files
```typescript
// components/forms/assessment/index.ts
export { AssessmentForm } from './AssessmentForm';
export { QuickAssessmentForm } from './QuickAssessmentForm';
export type { AssessmentFormProps } from './AssessmentForm.types';
```

### 3. Barrel Exports
```typescript
// components/ui/index.ts - Avoid deep barrel exports
export { Button } from './button';
export { Card } from './card';
export { Input } from './input';
// Don't re-export everything from subdirectories
```

---

## Import/Export Standards

### 1. Import Order
```typescript
// ✅ Standard import order
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 3. Internal components
import { AssessmentForm } from '@/components/forms/assessment';

// 4. Stores and hooks
import { useAuthStore } from '@/stores/auth.store';
import { useOffline } from '@/hooks/useOffline';

// 5. Utilities
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';

// 6. Types (always last)
import type { Assessment, User } from '@/types/entities';
```

### 2. Export Standards
```typescript
// ✅ Named exports preferred
export function AssessmentForm() {}
export const AssessmentSchema = z.object({});

// ✅ Default exports for pages and main components
export default function AssessmentPage() {}

// ✅ Type exports
export type { AssessmentFormProps };
```

---

## Styling Standards

### 1. Tailwind CSS
```typescript
// ✅ Use consistent class ordering
<div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm">

// ✅ Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<button 
  className={cn(
    "px-4 py-2 rounded-md font-medium transition-colors",
    variant === 'primary' && "bg-blue-600 text-white hover:bg-blue-700",
    variant === 'secondary' && "bg-gray-200 text-gray-900 hover:bg-gray-300",
    disabled && "opacity-50 cursor-not-allowed"
  )}
>
```

### 2. Component Variants
```typescript
// ✅ Use cva for component variants
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

## Testing Standards

### 1. Unit Tests
```typescript
// __tests__/components/AssessmentForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssessmentForm } from '@/components/forms/assessment/AssessmentForm';

describe('AssessmentForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  it('renders assessment form fields', () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/assessment type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
  });
  
  it('submits form with valid data', async () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/assessment type/i), {
      target: { value: 'rapid' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rapid'
        })
      );
    });
  });
});
```

### 2. Integration Tests
```typescript
// __tests__/api/assessments.test.ts
import { GET } from '@/app/api/v1/assessments/route';
import { NextRequest } from 'next/server';

describe('/api/v1/assessments', () => {
  it('returns assessments for authenticated user', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/assessments');
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

---

## PWA-Specific Standards

### 1. Service Worker
```typescript
// public/sw.js - Keep minimal
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});

self.addEventListener('fetch', (event) => {
  // Handle fetch events
});
```

### 2. Offline Storage
```typescript
// lib/db/offline.ts
import Dexie, { Table } from 'dexie';

interface OfflineAssessment {
  id: string;
  data: AssessmentData;
  timestamp: number;
  synced: boolean;
}

class OfflineDatabase extends Dexie {
  assessments!: Table<OfflineAssessment>;
  
  constructor() {
    super('DisasterManagementDB');
    this.version(1).stores({
      assessments: 'id, timestamp, synced'
    });
  }
}

export const offlineDb = new OfflineDatabase();
```

### 3. Sync Strategy
```typescript
// lib/sync/engine.ts
export class SyncEngine {
  async syncPendingData() {
    const pendingItems = await offlineDb.assessments
      .where('synced')
      .equals(false)
      .toArray();
      
    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        await offlineDb.assessments.update(item.id, { synced: true });
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
      }
    }
  }
}
```

---

## Error Handling

### 1. Error Boundaries
```typescript
// components/ErrorBoundary.tsx
'use client';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export function ErrorBoundary({ children, fallback: Fallback }: ErrorBoundaryProps) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {children}
    </React.Suspense>
  );
}
```

### 2. Error Types
```typescript
// types/errors.ts
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

---

## Performance Standards

### 1. Code Splitting
```typescript
// ✅ Dynamic imports for heavy components
const MapComponent = dynamic(() => import('@/components/InteractiveMap'), {
  loading: () => <p>Loading map...</p>,
  ssr: false
});

// ✅ Route-based code splitting happens automatically with App Router
```

### 2. Image Optimization
```typescript
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src="/disaster-icon.png"
  alt="Disaster icon"
  width={64}
  height={64}
  priority // For above-the-fold images
/>
```

### 3. Bundle Analysis
```typescript
// ✅ Regular bundle analysis
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

---

## Enforcement Tools

### 1. ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 2. Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 3. Git Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

---

## Summary

These coding standards ensure:
- **Type Safety**: Strict TypeScript configuration
- **Consistency**: Standardized patterns across the codebase
- **Performance**: Optimized builds and runtime performance
- **Maintainability**: Clear structure and documentation
- **Quality**: Automated testing and linting

All team members must follow these standards to maintain code quality and project scalability.