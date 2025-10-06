import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/verify';
import { MultiUserAssignmentService } from '@/lib/assignment/multi-user-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type') || 'entities';

    // Get entity collaboration details
    if (entityId && type === 'entity') {
      const collaboration = await MultiUserAssignmentService.getEntityCollaboration(entityId);
      
      if (!collaboration) {
        return NextResponse.json(
          { error: 'Entity not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: collaboration
      });
    }

    // Get user assignment overview
    if (userId && type === 'user') {
      const overview = await MultiUserAssignmentService.getUserAssignmentOverview(userId);
      
      if (!overview) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: overview
      });
    }

    // Get collaborative entities list
    if (type === 'entities') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const collaborativeEntities = await MultiUserAssignmentService.getCollaborativeEntities(limit);

      return NextResponse.json({
        success: true,
        data: collaborativeEntities
      });
    }

    // Get assignment statistics
    if (type === 'statistics') {
      const stats = await MultiUserAssignmentService.getAssignmentStatistics();

      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching collaboration data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}