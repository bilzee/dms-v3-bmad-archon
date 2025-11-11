import { z } from 'zod'

export const DonorRegistrationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  type: z.enum(['ORGANIZATION', 'INDIVIDUAL', 'GOVERNMENT', 'NGO', 'CORPORATE'], {
    errorMap: () => ({ message: 'Invalid donor type' })
  }),
  contactEmail: z.string().email('Invalid contact email format').optional(),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
  organization: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
  userCredentials: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    email: z.string().email('Invalid user email format'),
    name: z.string().min(2, 'User name must be at least 2 characters')
  })
})

export const DonorProfileUpdateSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').optional(),
  contactEmail: z.string().email('Invalid contact email format').optional(),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
  organization: z.string().min(2, 'Organization name must be at least 2 characters').optional()
})

export const DonorQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(['ORGANIZATION', 'INDIVIDUAL', 'GOVERNMENT', 'NGO', 'CORPORATE']).optional(),
  isActive: z.boolean().optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20)
})

export type DonorRegistrationInput = z.infer<typeof DonorRegistrationSchema>
export type DonorProfileUpdateInput = z.infer<typeof DonorProfileUpdateSchema>
export type DonorQueryInput = z.infer<typeof DonorQuerySchema>