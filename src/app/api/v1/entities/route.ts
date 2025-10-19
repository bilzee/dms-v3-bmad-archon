import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { withAuth, requireAnyRole } from '@/lib/auth/middleware';

export const GET = withAuth(
  requireAnyRole('COORDINATOR', 'ADMIN')(async (request: NextRequest, context) => {
    try {
      console.log('DEBUG: Entities API - User roles:', context.roles) // Debug logging
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      // Get all entities with pagination
      const [entities, total] = await Promise.all([
        prisma.entity.findMany({
          skip,
          take: limit,
          where: {
            isActive: true
          },
          orderBy: {
            name: 'asc'
          }
        }),
        prisma.entity.count({
          where: {
            isActive: true
          }
        })
      ]);

      return NextResponse.json({
        success: true,
        data: entities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching entities:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })
);