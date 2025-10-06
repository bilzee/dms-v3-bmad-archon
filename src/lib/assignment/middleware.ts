import { NextRequest, NextResponse } from 'next/server';
import { AutoAssignmentService } from './auto-assignment';

/**
 * Middleware decorator to auto-assign users to entities
 */
export function withAutoAssignment(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Execute the original handler first
      const response = await handler(request, context);
      
      // Only process successful responses
      if (!response.ok) {
        return response;
      }

      // Extract response data for auto-assignment processing
      const responseClone = response.clone();
      const responseData = await responseClone.json().catch(() => null);

      if (!responseData?.data) {
        return response;
      }

      // Process auto-assignments based on the endpoint
      const pathname = request.nextUrl.pathname;
      await processAutoAssignment(pathname, responseData.data, request);

      return response;
    } catch (error) {
      console.error('Auto-assignment middleware error:', error);
      // Don't fail the request if auto-assignment fails
      return await handler(request, context);
    }
  };
}

/**
 * Process auto-assignment based on API endpoint and data
 */
async function processAutoAssignment(
  pathname: string,
  data: any,
  request: NextRequest
): Promise<void> {
  try {
    // Extract user ID from request (assuming it's in headers or auth context)
    const userId = await extractUserIdFromRequest(request);
    if (!userId) return;

    // Handle assessment creation
    if (pathname.includes('/assessments') && request.method === 'POST') {
      await handleAssessmentAutoAssignment(data, userId);
    }
    
    // Handle response creation
    else if (pathname.includes('/responses') && request.method === 'POST') {
      await handleResponseAutoAssignment(data, userId);
    }
    
    // Handle entity creation
    else if (pathname.includes('/entities') && request.method === 'POST') {
      await handleEntityAutoAssignment(data, userId);
    }
  } catch (error) {
    console.error('Error processing auto-assignment:', error);
  }
}

/**
 * Handle auto-assignment when assessment is created
 */
async function handleAssessmentAutoAssignment(assessmentData: any, userId: string): Promise<void> {
  if (assessmentData.entityId && assessmentData.assessorId) {
    // Auto-assign assessor to entity
    await AutoAssignmentService.autoAssignAssessor(
      assessmentData.assessorId,
      assessmentData.entityId,
      userId
    );

    // If assessment is based on another assessment, inherit assignments
    if (assessmentData.parentAssessmentId) {
      // Get parent assessment entity
      // This would require database lookup to get parent entity
      // For now, we'll skip inheritance for assessments
    }
  }
}

/**
 * Handle auto-assignment when response is created
 */
async function handleResponseAutoAssignment(responseData: any, userId: string): Promise<void> {
  if (responseData.entityId && responseData.responderId) {
    // Auto-assign responder to entity
    await AutoAssignmentService.autoAssignResponder(
      responseData.responderId,
      responseData.entityId,
      userId
    );

    // If response is based on an assessment, inherit assignments
    if (responseData.assessmentId && responseData.assessmentEntityId) {
      await AutoAssignmentService.inheritAssignments(
        responseData.responderId,
        responseData.assessmentEntityId,
        responseData.entityId,
        'RESPONDER',
        userId
      );
    }
  }
}

/**
 * Handle auto-assignment when entity is created
 */
async function handleEntityAutoAssignment(entityData: any, userId: string): Promise<void> {
  if (entityData.id) {
    // Bulk auto-assign users to new entity based on rules
    await AutoAssignmentService.bulkAutoAssignOnEntityCreation(
      entityData.id,
      userId
    );
  }
}

/**
 * Extract user ID from request (placeholder implementation)
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // This would typically extract from JWT token or auth context
    // For now, we'll return null to disable auto-assignment
    // In real implementation, integrate with your auth system
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    // Decode JWT token to get user ID
    // This is a placeholder - use your actual JWT verification
    return null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Higher-order function to add auto-assignment to specific API routes
 */
export function enableAutoAssignment() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = withAutoAssignment(originalMethod);
    
    return descriptor;
  };
}

/**
 * Utility to manually trigger auto-assignment
 */
export async function triggerAutoAssignment(
  type: 'assessment' | 'response' | 'entity',
  data: {
    userId: string;
    entityId: string;
    userRole?: string;
    assignedBy?: string;
  }
): Promise<boolean> {
  try {
    const { userId, entityId, userRole, assignedBy = userId } = data;

    switch (type) {
      case 'assessment':
        return await AutoAssignmentService.autoAssignAssessor(userId, entityId, assignedBy);
      
      case 'response':
        return await AutoAssignmentService.autoAssignResponder(userId, entityId, assignedBy);
      
      case 'entity':
        await AutoAssignmentService.bulkAutoAssignOnEntityCreation(entityId, assignedBy);
        return true;
      
      default:
        if (userRole) {
          return await AutoAssignmentService.autoAssignOnCreation(
            userId,
            entityId,
            userRole,
            assignedBy
          );
        }
        return false;
    }
  } catch (error) {
    console.error('Error triggering auto-assignment:', error);
    return false;
  }
}

/**
 * Check if auto-assignment should be applied for a request
 */
export function shouldAutoAssign(pathname: string, method: string): boolean {
  const autoAssignPaths = [
    '/api/v1/assessments',
    '/api/v1/responses',
    '/api/v1/entities'
  ];

  return method === 'POST' && autoAssignPaths.some(path => pathname.includes(path));
}