import { NextRequest, NextResponse } from 'next/server';
import { conflictResolver } from '@/lib/sync/conflict';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract query parameters (same as main conflicts endpoint)
    const entityType = searchParams.get('entityType') as 'assessment' | 'response' | 'entity' | null;
    const resolved = searchParams.get('resolved');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Authorization check (coordinator role required)
    // TODO: Implement proper role checking when auth system is available
    
    // Get all conflicts
    let conflicts = await conflictResolver.getConflictHistory();
    
    // Apply same filters as main endpoint
    if (entityType) {
      conflicts = conflicts.filter(conflict => conflict.entityType === entityType);
    }
    
    if (resolved !== null) {
      const isResolved = resolved === 'true';
      conflicts = conflicts.filter(conflict => conflict.isResolved === isResolved);
    }
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      conflicts = conflicts.filter(conflict => 
        new Date(conflict.createdAt) >= fromDate
      );
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      conflicts = conflicts.filter(conflict => 
        new Date(conflict.createdAt) <= toDate
      );
    }
    
    // Generate CSV content
    const csvHeaders = [
      'Conflict ID',
      'Entity Type',
      'Entity ID',
      'Conflict Date',
      'Resolution Method',
      'Local Version',
      'Server Version',
      'Resolved',
      'Resolved At',
      'Resolved By',
      'Auto Resolved',
      'Conflict Reason'
    ];
    
    const csvRows = conflicts.map(conflict => [
      conflict.conflictId,
      conflict.entityType.toUpperCase(),
      conflict.entityUuid,
      conflict.createdAt.toISOString(),
      conflict.resolutionStrategy.toUpperCase(),
      conflict.localVersion.toString(),
      conflict.serverVersion.toString(),
      conflict.isResolved ? 'Yes' : 'No',
      conflict.resolvedAt ? conflict.resolvedAt.toISOString() : '',
      conflict.resolvedBy || '',
      conflict.metadata?.autoResolved ? 'Yes' : 'No',
      conflict.metadata?.conflictReason || ''
    ]);
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          // Escape fields containing commas or quotes
          field.includes(',') || field.includes('"') ? 
            `"${field.replace(/"/g, '""')}"` : 
            field
        ).join(',')
      )
    ].join('\n');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `conflict-report-${timestamp}.csv`;
    
    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Error exporting conflicts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export conflicts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}