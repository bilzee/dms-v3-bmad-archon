import { randomUUID } from 'crypto'

export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValues: any
  newValues: any
  ipAddress: string
  userAgent: string
  timestamp: Date
}

export interface AuditLogCreateParams {
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValues: any
  newValues: any
  ipAddress: string
  userAgent: string
}

export interface IAuditLogService {
  logAction(params: AuditLogCreateParams): Promise<void>
  getAuditHistory(entityType: string, entityId: string): Promise<AuditLogEntry[]>
  getUserAuditHistory(userId: string, limit?: number): Promise<AuditLogEntry[]>
}

export class AuditLogServiceImpl implements IAuditLogService {
  async logAction(params: AuditLogCreateParams): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: randomUUID(),
        timestamp: new Date(),
        ...params
      }

      // For now, log to console - in production this would go to database
      console.log('AUDIT LOG:', {
        id: auditEntry.id,
        userId: auditEntry.userId,
        action: auditEntry.action,
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        timestamp: auditEntry.timestamp.toISOString(),
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent
      })

      // TODO: Store in database when audit log table is available
      // await prisma.auditLog.create({ data: auditEntry })
      
    } catch (error) {
      console.error('Failed to log audit action:', error)
      // Audit logging failures should not crash the application
    }
  }

  async getAuditHistory(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    // TODO: Implement database query when audit log table is available
    console.log(`Getting audit history for ${entityType}:${entityId}`)
    return []
  }

  async getUserAuditHistory(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    // TODO: Implement database query when audit log table is available
    console.log(`Getting user audit history for ${userId}, limit: ${limit}`)
    return []
  }
}

// Singleton instance
export const auditLogService = new AuditLogServiceImpl()