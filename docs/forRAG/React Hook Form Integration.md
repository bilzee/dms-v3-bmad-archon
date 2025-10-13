---
title: "Module 2 – React Hook Form + Radix UI Integration (Advanced) with TanStack Query"
version: "1.0"
module: "React Hook Form Integration"
tags: ["React Hook Form", "Radix UI", "TanStack Query", "Next.js", "Advanced Forms", "RAG"]
description: "Cleaned Markdown knowledge pack covering advanced form handling using React Hook Form, Radix UI, and TanStack Query in Next.js App Router. Citations removed and square-bracket tags retained for RAG ingestion."
---

# Module 2: React Hook Form + Radix UI Integration (Advanced) with TanStack Query

---

## [Concept] Advanced React Hook Form (RHF)

React Hook Form (RHF) handles form state using uncontrolled inputs and refs, which reduces re-renders compared with controlled components.  
For advanced usage, RHF exposes `useForm`, `useFieldArray`, `Controller` and `FormProvider`.

- **Resolvers & schema validation:**  
  RHF accepts custom resolvers (`zodResolver`, `yupResolver`, or custom async resolvers) for schema-based validation.  
  A resolver returns validated values and an error map.  
  The `useYupValidationResolver` hook creates a memoized async resolver transforming Yup errors into RHF errors.

- **Nested & dynamic fields:**  
  `useFieldArray` manages arrays of inputs with methods such as `append`, `remove`, `swap`, and `move`.  
  Combined with virtualization libraries like `react-window`, field arrays can handle thousands of items efficiently.

- **FormProvider & context:**  
  `FormProvider` wraps a form and shares methods via `useFormContext`.  
  Since it relies on React Context, any state change triggers descendant re-renders; wrap nested inputs in `React.memo` to limit updates.

- **Controlled vs uncontrolled:**  
  RHF is optimized for uncontrolled inputs but supports controlled ones via `Controller`.  
  Use controlled components only when a UI library requires it (e.g., Radix Select).  
  Controlled inputs need `value` and `onChange` props and re-render more often.

---

## [Concept] Radix UI Primitives & ShadCN Form

Radix UI offers accessible unstyled primitives (Dialog, Dropdown, Popover, Select, Tabs, Toast, etc.).  
ShadCN’s form utilities wrap these primitives with RHF integration.

- **Form structure:**  
  `<Form>` sets up context and ARIA relationships.  
  It uses `<FormField>`, `<FormLabel>`, `<FormControl>`, `<FormDescription>` and `<FormMessage>` to build accessible groups.  
  Labels and messages are auto-linked via IDs.

- **Accessible primitives:**  
  Components like Dialog, Popover, Select, and Toast handle focus and keyboard navigation automatically.  
  Controlled components (e.g., Select) must be wrapped with `Controller` and receive `value` and `onValueChange`.  
  Ensure `SelectItem` values are strings to prevent type mismatches.

- **Notifications & feedback:**  
  Use Radix Toast or Dialog for success/error messages after submission.  
  ShadCN examples demonstrate toast confirmation inside `onSubmit`.

- **Tabs & dynamic UIs:**  
  Tabs organize multi-section forms without unmounting their state.  

---

## [Concept] TanStack Query v5 (React Query)

TanStack Query manages asynchronous server state.

- **Queries (`useQuery`)**  
  Fetches and caches data.  
  When pre-filling forms, wait for data before passing `defaultValues`.  
  Rendering with `undefined` defaults causes uncontrolled-to-controlled warnings.

- **Mutations (`useMutation`)**  
  Handles data modifications via `onMutate`, `onError`, `onSuccess`, and `onSettled`.  
  Supports optimistic updates, rollbacks, and cache invalidation.  
  Use `mutateAsync` to await inside `onSubmit`.

- **Optimistic updates & error handling**  
  Perform immediate UI updates in `onMutate`.  
  Roll back on error and refetch fresh data in `onSettled`.

- **Server actions as POST APIs**  
  Apply full security lifecycle: authorization, validation/sanitization, business logic, DTO mapping, and standardized responses.  

---

## [BestPractice] Form State & Validation

- **Use resolvers for schema validation:**  
  Define Zod/Yup schemas outside the component and pass a memoized resolver to `useForm`.

- **Control vs uncontrolled inputs:**  
  Default to `register()` for uncontrolled inputs.  
  Use `Controller` only for Radix or Material UI controlled components.

- **Leverage FormProvider:**  
  Wrap forms with `FormProvider`; access context via `useFormContext`.  
  Memoize nested fields to avoid full re-renders.

- **Read formState before render:**  
  Access `formState` (e.g., `isDirty`, `isSubmitting`) early to activate RHF proxies.

- **Dynamic fields with useFieldArray:**  
  Manage arrays of objects efficiently; combine with `react-window` for large lists.

- **Reset & default values:**  
  Call `form.reset(data)` after mutations.  
  Set `defaultValues` only after data is loaded to avoid warnings.

- **Accessible labels & messages:**  
  Use `FormField`, `FormLabel`, `FormControl`, and `FormMessage` for ARIA support.

- **Separate mutation logic:**  
  Keep API calls in custom hooks and pass `mutateAsync` into forms for clarity and testability.

---

## [BestPractice] TanStack Query Integration

- **Asynchronous default values:**  
  Fetch data in a parent component and render the form after data is available.  

- **Derive form state:**  
  Combine server data and form state in UI (e.g., `value={field.value ?? data.firstName}`).

- **Use staleTime:**  
  Prevent background refetch from overwriting user input.

- **Invalidate or update queries:**  
  Use `queryClient.invalidateQueries()` or `setQueryData()` in `onSuccess`.

- **Optimistic updates:**  
  Return previous data in `onMutate`; rollback on error and refetch afterwards.

- **Error & loading indicators:**  
  Display Radix Toast/Dialog on error; disable submit while loading.

- **Security:**  
  Validate and sanitize on server; mask internal errors before sending responses.

---

## [AntiPattern] Common Pitfalls

- Mixing Radix Form and RHF — redundant and conflicting state.  
- Uncontrolled vs controlled mismatch in `Select`; always use `Controller`.  
- Calling `reset()` or `setValue()` during render.  
- Passing undefined `defaultValues` before data arrives.  
- Failing to invalidate queries after mutation.  
- Using `register()` on controlled components instead of `Controller`.  
- Overusing `FormProvider` at the top level causing global re-renders.  
- Omitting rollback context in `onMutate`.  

---

## [ErrorFix] Error Catalog

| Error Message | Likely Cause | Fix |
|----------------|--------------|-----|
| “A component is changing an uncontrolled input to be controlled.” | `useForm` called before data was fetched | Render form after data exists or provide safe defaults |
| “Radix Select value doesn’t update after reset” | Used `defaultValue` instead of controlled `value` | Wrap with `Controller`; ensure string values; call `reset()` in `useEffect` |
| “Cannot update a component while rendering a different component.” | Reset or setValue called during render | Move reset into `useEffect` or mutation callbacks |
| “Stale data displayed after mutation” | Not invalidating queries after useMutation | Call `invalidateQueries()` or `setQueryData()` in `onSuccess` |
| “Optimistic update did not roll back” | Missing context in `onMutate` | Return previous data and restore in `onError` |
| “Validation messages not showing” | Resolver missing or errors not passed to UI | Provide schema resolver and use `FormMessage` |
| “Server action leaks sensitive data” | Returned raw database entities | Transform responses to DTO and mask errors on server |

---

## [Integration] Forms with Mutations and Queries

### 1. Forms with useMutation
Define a mutation and call it in `onSubmit`; use Radix UI for feedback.

```tsx
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
    reset();
    toast('User updated');
  },
});

<form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
  {/* form fields */}
</form>
Use await mutation.mutateAsync(values) to await submissions and disable buttons while loading.
```

### 2. Prefilling forms from queries
Wait for data before rendering the form to avoid uncontrolled warnings.

```tsx

const { data, isLoading } = useQuery(['user'], fetchUser);
const form = useForm({ defaultValues: { name: '' } });

useEffect(() => { if (data) form.reset(data); }, [data]);
```

### 3. Error & success handling with Radix
Use Radix Toast/Dialog for accessible feedback.

```tsx

if (mutation.isError) toast({ title: 'Error', description: mutation.error.message });
if (mutation.isSuccess) toast({ title: 'Saved', description: 'Changes saved.' });
```
Disable submit buttons while mutation.isLoading.


### 4. Dynamic field arrays
```tsx

const { fields, append, remove } = useFieldArray({ control, name: 'emails' });

{fields.map((field, i) => (
  <input key={field.id} {...register(`emails.${i}.value`)} />
))}
<button onClick={() => append({ value: '' })}>Add</button>
```
Combine with Radix Tabs or Accordion for complex UI.

### 5. Server actions & safe mutations
Validate and sanitize input on server using Zod, perform logic, transform to DTO, and return a standardized success/error envelope.
Client mutations should handle errors and update caches accordingly.

## [Performance] Optimization Strategies
- Prefer uncontrolled inputs for minimal re-renders.
- Memoize nested components within FormProvider.
- Read formState during render to activate tracking.
- Wrap resolvers in useCallback to avoid re-creation.
- Use query staleTime to protect in-progress forms.
- Virtualize large lists with react-window.
- Disable RHF DevTools in production.
- Use setQueryData for direct cache updates to reduce network traffic.

## [Recipe] Form with Mutation & Toast
```tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, FormField, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectItem } from '@radix-ui/react-select';
import { toast } from '@/components/ui/use-toast';

const schema = z.object({
  name: z.string().min(1),
  role: z.enum(['admin', 'user']),
});

export function UserForm({ initial }) {
  const queryClient = useQueryClient();
  const { handleSubmit, control, register, reset } = useForm({
    defaultValues: initial,
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: async (values) =>
      fetch('/api/users', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['users']);
      reset();
      toast({ title: 'Saved', description: 'User created successfully' });
    },
  });
  return (
    <Form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <FormField name="name" render={({ field }) => (
        <FormControl><input {...field} placeholder="Name" /></FormControl>
      )} />
      <FormField name="role" control={control} render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
        </Select>
      )} />
      {mutation.isError && <FormMessage>{mutation.error?.message}</FormMessage>}
      <button disabled={mutation.isLoading}>Submit</button>
    </Form>
  );
}
``` 

## [Recipe] Prefilled Form from Query
```tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

export function EditProfile() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(['profile'], fetchProfile, { staleTime: 5 * 60 * 1000 });
  const form = useForm({ defaultValues: { name: '', email: '' } });

  React.useEffect(() => { if (data) form.reset(data); }, [data, form]);

  const mutation = useMutation(updateProfile, {
    onSuccess: (updated) => queryClient.setQueryData(['profile'], updated),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <input {...form.register('name')} />
      <input {...form.register('email')} />
      <button type="submit" disabled={mutation.isLoading}>Save</button>
    </form>
  );
}
```

## [Recipe] Custom Async Resolver with Yup
```tsx

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

const schema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
});

function useYupResolver(validationSchema) {
  return useCallback(async (data) => {
    try {
      const values = await validationSchema.validate(data, { abortEarly: false });
      return { values, errors: {} };
    } catch (err) {
      return {
        values: {},
        errors: err.inner.reduce((acc, curr) => ({
          ...acc,
          [curr.path]: { type: curr.type || 'validation', message: curr.message },
        }), {}),
      };
    }
  }, [validationSchema]);
}

export function ContactForm() {
  const resolver = useYupResolver(schema);
  const { register, handleSubmit, formState } = useForm({ resolver });
  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('firstName')} />
      {formState.errors.firstName && <p>{formState.errors.firstName.message}</p>}
      <input {...register('lastName')} />
      {formState.errors.lastName && <p>{formState.errors.lastName.message}</p>}
      <input type="submit" />
    </form>
  );
}
```

## [Recipe] Dynamic List with useFieldArray & Virtualization
```tsx

import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { FixedSizeList as List } from 'react-window';

function OrdersForm() {
  const { control, handleSubmit } = useForm({
    defaultValues: { items: Array.from({ length: 1000 }, () => ({ quantity: 1 })) },
  });
  const { fields, update } = useFieldArray({ control, name: 'items' });

  const Row = ({ index, style }) => (
    <div style={style} key={fields[index].id}>
      <Controller
        name={`items.${index}.quantity`}
        control={control}
        render={({ field }) => (
          <input type="number" {...field} onChange={(e) => update(index, { quantity: Number(e.target.value) })} />
        )}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <List height={300} itemCount={fields.length} itemSize={35} width={200}>
        {Row}
      </List>
      <button type="submit">Submit</button>
    </form>
  );
}
```

## [Recipe] Optimistic Update with TanStack Query
```tsx

import { useMutation, useQueryClient } from '@tanstack/react-query';

function useAddTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTodo) => fetch('/api/todos', { method: 'POST', body: JSON.stringify(newTodo) }),
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries(['todos']);
      const previous = queryClient.getQueryData(['todos']);
      queryClient.setQueryData(['todos'], (old = []) => [...old, newTodo]);
      return { previous };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previous) queryClient.setQueryData(['todos'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['todos']);
    },
  });
}
```
Here, onMutate adds a new item to the cached list and returns previous data for rollback.
If the request fails, onError restores the cache, and onSettled invalidates queries to refetch updated data.