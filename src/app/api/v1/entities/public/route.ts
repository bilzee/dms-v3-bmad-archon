import { NextRequest, NextResponse } from 'next/server';
import { entityService } from '@/lib/services/entity.service';

/**
 * GET /api/v1/entities/public
 * Public endpoint to get entities for assessment forms (development only)
 */
export async function GET(request: NextRequest) {
  try {
    // Skip database calls during Docker build phase - temporarily disabled for testing
    // if (process.env.NEXT_BUILD === "true") {
    //   return NextResponse.json({ success: true, data: [] });
    // }

    const result = await entityService.getAllEntities();
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching public entities:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      },
      { status: 500 }
    );
  }
}