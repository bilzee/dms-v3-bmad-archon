import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { requireAnyRole } from '@/lib/auth/middleware';

export const GET = requireAnyRole('COORDINATOR', 'ADMIN')(async (request: NextRequest, context) => {
  try {
    const url = new URL(request.url);
    const roleFilter = url.searchParams.get('role'); // Optional role filter (ASSESSOR, RESPONDER)

    // Build where clause for role filtering
    let roleWhere = {};
    if (roleFilter && ['ASSESSOR', 'RESPONDER'].includes(roleFilter)) {
      roleWhere = {
        roles: {
          some: {
            role: {
              name: roleFilter
            }
          }
        }
      };
    } else {
      // Default: get users with ASSESSOR or RESPONDER roles
      roleWhere = {
        roles: {
          some: {
            role: {
              name: {
                in: ['ASSESSOR', 'RESPONDER']
              }
            }
          }
        }
      };
    }

    // Get assignable users (ASSESSOR and RESPONDER roles)
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...roleWhere
      },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});