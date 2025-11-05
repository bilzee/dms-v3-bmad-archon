import { prisma } from '../db/client';

const MOCK_USER_EMAILS = [
  'multirole@dms.gov.ng',
  'responder@dms.gov.ng', 
  'assessor@dms.gov.ng',
  'coordinator@dms.gov.ng',
  'donor@dms.gov.ng',
  'admin@dms.gov.ng'
];

/**
 * Check if a user is a mock user (development only)
 */
export function isMockUser(userEmail: string): boolean {
  return process.env.NODE_ENV === 'development' && MOCK_USER_EMAILS.includes(userEmail);
}

/**
 * Create audit log safely - skips foreign key constraint for mock users during development
 */
export async function createAuditLog(data: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    // For mock users during development, skip audit log creation to avoid foreign key constraint
    if (process.env.NODE_ENV === 'development') {
      const isMockUser = MOCK_USER_EMAILS.some(email => 
        data.userId === email || 
        data.userId.includes(email) || 
        (typeof data.userId === 'string' && data.userId.length < 10) // Mock IDs are short strings like '1', '5'
      );
      
      if (isMockUser) {
        console.log(`[DEV] Skipping audit log for mock user ${data.userId}: ${data.action} on ${data.resource}:${data.resourceId}`);
        return null;
      }
    }

    // For real users, create proper audit log
    return await prisma.auditLog.create({
      data
    });
  } catch (error) {
    // Log error but don't fail the operation
    console.error('Failed to create audit log:', error);
    return null;
  }
}

/**
 * Create audit log within a transaction safely
 */
export async function createAuditLogInTransaction(
  tx: any, 
  data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    // For mock users during development, skip audit log creation to avoid foreign key constraint
    if (process.env.NODE_ENV === 'development') {
      const isMockUser = MOCK_USER_EMAILS.some(email => 
        data.userId === email || 
        data.userId.includes(email) || 
        (typeof data.userId === 'string' && data.userId.length < 10) // Mock IDs are short strings like '1', '5'
      );
      
      if (isMockUser) {
        console.log(`[DEV] Skipping audit log for mock user ${data.userId}: ${data.action} on ${data.resource}:${data.resourceId}`);
        return null;
      }
    }

    // For real users, create proper audit log
    return await tx.auditLog.create({
      data
    });
  } catch (error) {
    // Log error but don't fail the transaction
    console.error('Failed to create audit log in transaction:', error);
    return null;
  }
}