export interface DonorCommitment {
  id: string
  donorId: string
  entityId: string
  incidentId: string
  status: CommitmentStatus
  items: CommitmentItem[]
  totalCommittedQuantity: number
  deliveredQuantity: number
  verifiedDeliveredQuantity: number
  commitmentDate: string
  lastUpdated: string
  notes?: string
  
  // Relationships
  donor: Donor
  entity: Entity
  incident: Incident
  responses: any[]
}

export interface CommitmentItem {
  name: string
  unit: string
  quantity: number
  estimatedValue?: number
}

export enum CommitmentStatus {
  PLANNED = 'PLANNED',
  PARTIAL = 'PARTIAL',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED'
}

export interface Donor {
  id: string
  name: string
  type: string
  organization?: string
  contactEmail?: string
  contactPhone?: string
}

export interface Entity {
  id: string
  name: string
  type: string
  location?: string
}

export interface Incident {
  id: string
  type: string
  subType?: string
  severity: string
  status: string
  description?: string
  location?: string
}