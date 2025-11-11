import { z } from 'zod'

export const CommitmentItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  estimatedValue: z.number().positive('Estimated value must be greater than 0').optional()
})

export const CreateCommitmentSchema = z.object({
  entityId: z.string().uuid('Invalid entity ID'),
  incidentId: z.string().uuid('Invalid incident ID'),
  items: z.array(CommitmentItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

export const UpdateCommitmentSchema = z.object({
  items: z.array(CommitmentItemSchema).min(1, 'At least one item is required').optional(),
  status: z.enum(['PLANNED', 'PARTIAL', 'COMPLETE', 'CANCELLED']).optional(),
  deliveredQuantity: z.number().nonnegative('Delivered quantity must be non-negative').optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

export const CommitmentStatusUpdateSchema = z.object({
  status: z.enum(['PLANNED', 'PARTIAL', 'COMPLETE', 'CANCELLED']),
  deliveredQuantity: z.number().nonnegative('Delivered quantity must be non-negative').optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

export const CommitmentQuerySchema = z.object({
  entityId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  status: z.enum(['PLANNED', 'PARTIAL', 'COMPLETE', 'CANCELLED']).optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(50)
})

export const EntityAssignmentSchema = z.object({
  entityId: z.string().uuid('Invalid entity ID'),
  assignedBy: z.string().uuid('Invalid user ID')
})

// Type exports
export type CommitmentItemInput = z.infer<typeof CommitmentItemSchema>
export type CreateCommitmentInput = z.infer<typeof CreateCommitmentSchema>
export type UpdateCommitmentInput = z.infer<typeof UpdateCommitmentSchema>
export type CommitmentStatusUpdateInput = z.infer<typeof CommitmentStatusUpdateSchema>
export type CommitmentQueryInput = z.infer<typeof CommitmentQuerySchema>
export type EntityAssignmentInput = z.infer<typeof EntityAssignmentSchema>