# TanStack Query Integration Patterns

This document outlines the established patterns for integrating TanStack Query in the Disaster Management System PWA. These patterns have been successfully implemented across all assessment forms and shared components.

## 🎯 Core Principles

### 1. **Data Fetching Anti-Patterns**
**❌ Avoid:**
```typescript
const [entities, setEntities] = useState<Entity[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/entities')
      const data = await response.json()
      setEntities(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [])
```

**✅ Use TanStack Query:**
```typescript
const { data: entities = [], isLoading, error, refetch } = useQuery({
  queryKey: ['entities'],
  queryFn: async () => {
    const response = await fetch('/api/entities')
    const data = await response.json()
    return data
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
  retry: 2
})
```

### 2. **Query Hook Pattern**
```typescript
// hooks/useEntities.ts
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().nullable(),
})

export type Entity = z.infer<typeof EntitySchema>

export function useEntities() {
  return useQuery({
    queryKey: ['entities'],
    queryFn: fetchEntities,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })
}

export function useFilteredEntities(searchTerm: string) {
  const { data: entities, isLoading, error } = useEntities()
  
  const filteredEntities = entities?.filter(entity => 
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entity.location && entity.location.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  return {
    data: filteredEntities,
    isLoading,
    error,
    totalCount: entities?.length || 0,
    filteredCount: filteredEntities.length,
  }
}
```

### 3. **Mutation Pattern**
```typescript
// hooks/useRapidAssessments.ts
export function useCreateRapidAssessment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createRapidAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rapidAssessmentKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to create rapid assessment:', error)
    },
  })
}
```

## 🏗️ Component Integration Pattern

### Assessment Form Template
```typescript
'use client'

// External libraries
import { Icon } from 'lucide-react'

// UI components
import { Button, Card, Form } from '@/components/ui'
import { Select, SelectContent } from '@/components/ui'

// Internal components
import { GPSCapture, MediaField } from '@/components/shared'

// Stores and hooks
import { useAssessments, useCreateAssessment } from '@/hooks/useRapidAssessments'
import { useFilteredEntities, type Entity } from '@/hooks/useEntities'
import { useAssessment } from '@/hooks/useAssessment'

// Utilities and types
import { ASSESSMENT_TYPE } from '@/types/assessment'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export function AssessmentForm() {
  // TanStack Query hooks for server state
  const { data: recentAssessments } = useAssessments()
  const { data: filteredEntities, isLoading: entitiesLoading } = useFilteredEntities('')
  const createAssessment = useCreateAssessment()
  
  // Local hooks for drafts
  const { drafts, saveDraft, deleteDraft } = useAssessment()
  
  // Form submission with mutation
  const handleSubmit = async (formData) => {
    try {
      await createAssessment.mutateAsync(assessmentData)
      // Handle success
    } catch (error) {
      // Handle error
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit')
    }
  }
  
  // Loading states in Select
  return (
    <SelectContent>
      {entitiesLoading ? (
        <SelectItem value="loading" disabled>
          Loading entities...
        </SelectItem>
      ) : filteredEntities?.length === 0 ? (
        <SelectItem value="no-entities" disabled>
          No entities found
        </SelectItem>
      ) : (
        filteredEntities.map((entity) => (
          <SelectItem key={entity.id} value={entity.id}>
            {entity.name} ({entity.type})
          </SelectItem>
        ))
      )}
    </SelectContent>
  )
}
```

## 🎨 Loading State Patterns

### Skeleton Loading Component
```typescript
// components/shared/AssessmentFormSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'

export function AssessmentFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-1/4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
```

### Loading States in Components
```typescript
if (isLoading) {
  return <AssessmentFormSkeleton />
}

// For Select dropdowns
<SelectContent>
  {entitiesLoading ? (
    <SelectItem value="loading" disabled>
      Loading entities...
    </SelectItem>
  ) : (
    // Render entities
  )}
</SelectContent>
```

## ⚡ Performance Optimization

### Query Configuration Best Practices
```typescript
useQuery({
  queryKey: ['resource-type', 'filters', searchParams],
  queryFn: fetchResource,
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 10 * 60 * 1000,        // 10 minutes
  retry: 2,                       // Retry failed requests
  enabled: !!user,              // Conditional fetching
  refetchOnWindowFocus: false,    // Prevent unnecessary refetches
})
```

### Prefetching Patterns
```typescript
// Prefetch related data when user navigates
const handleNavigation = () => {
  queryClient.prefetchQuery({
    queryKey: ['entities', 'detailed'],
    queryFn: fetchDetailedEntities,
  })
}
```

## 🛡️ Error Handling

### Proper Error Types
```typescript
try {
  await createAssessment.mutateAsync(assessmentData)
  setSuccessMessage('Assessment submitted successfully!')
} catch (error) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred'
  setErrorMessage(errorMessage)
}
```

### User-Friendly Error Messages
```typescript
if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {error.message || 'Failed to load data. Please try again.'}
      </AlertDescription>
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        <RefreshCw className="h-4 w-4 mr-1" />
        Retry
      </Button>
    </Alert>
  )
}
```

## 📚 Key Benefits Achieved

1. **Reduced Network Requests**: Intelligent caching prevents unnecessary API calls
2. **Improved UX**: Skeleton loading states and proper error handling
3. **Better Performance**: Background refetching and optimistic updates
4. **Type Safety**: Proper TypeScript integration with Zod schemas
5. **Consistency**: Unified patterns across all components
6. **Maintainability**: Clear separation of concerns and reusable hooks

## 🔧 Implementation Checklist

- [ ] Replace useEffect data fetching with useQuery
- [ ] Add proper query keys and caching strategies
- [ ] Implement loading states (skeletons preferred)
- [ ] Add error handling with retry functionality
- [ ] Create reusable query hooks
- [ ] Update mutation patterns with optimistic updates
- [ ] Add proper TypeScript types and Zod schemas
- [ ] Test error scenarios and loading states
- [ ] Verify caching behavior and performance improvements

## 📖 Related Documentation

- [TanStack Query Official Docs](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tanstack.com/query/latest/guides/queries)
- [Zod Schema Validation](https://zod.dev/)
- [Project Architecture](./architecture.md)

---

This documentation should be updated as new patterns are established and existing patterns are improved.