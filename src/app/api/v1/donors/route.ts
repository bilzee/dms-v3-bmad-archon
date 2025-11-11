import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { DonorRegistrationSchema } from '@/lib/validation/donor';
import { AuthService } from '@/lib/auth/service';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = DonorRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0',
            requestId: uuidv4()
          }
        },
        { status: 400 }
      );
    }

    const { name, type, contactEmail, contactPhone, organization, userCredentials } = validation.data;

    // Check for duplicate organization name
    const existingDonor = await prisma.donor.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          ...(contactEmail ? [{ contactEmail: { equals: contactEmail, mode: 'insensitive' } as const }] : [])
        ]
      }
    });

    if (existingDonor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization with this name or email already exists',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0',
            requestId: uuidv4()
          }
        },
        { status: 409 }
      );
    }

    // Check for duplicate user email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: userCredentials.email, mode: 'insensitive' } },
          { username: { equals: userCredentials.username, mode: 'insensitive' } }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email or username already exists',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0',
            requestId: uuidv4()
          }
        },
        { status: 409 }
      );
    }

    // Get DONOR role
    const donorRole = await prisma.role.findUnique({
      where: { name: 'DONOR' }
    });

    if (!donorRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'Donor role not found in system',
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0',
            requestId: uuidv4()
          }
        },
        { status: 500 }
      );
    }

    // Create donor and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create donor record
      const donor = await tx.donor.create({
        data: {
          name,
          type,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          organization: organization || null,
          isActive: true
        }
      });

      // Hash password
      const passwordHash = await AuthService.hashPassword(userCredentials.password);

      // Create user account
      const user = await tx.user.create({
        data: {
          username: userCredentials.username,
          email: userCredentials.email,
          passwordHash,
          name: userCredentials.name,
          organization: name, // Link to donor organization
          isActive: true,
          isLocked: false
        }
      });

      // Assign DONOR role to user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: donorRole.id,
          assignedBy: user.id // Self-assigned for registration
        }
      });

      // Log audit entry
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'DONOR_REGISTRATION',
          resource: 'Donor',
          resourceId: donor.id,
          oldValues: null as any,
          newValues: JSON.stringify({
            donorName: name,
            donorType: type,
            userEmail: userCredentials.email
          }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return { donor, user };
    });

    // Generate auth token for immediate login
    const token = AuthService.generateToken({
      userId: result.user.id,
      email: result.user.email,
      roles: ['DONOR'],
      permissions: ['DONOR_ACCESS']
    });

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = result.user as any;

    return NextResponse.json({
      success: true,
      data: {
        donor: result.donor,
        user: userWithoutPassword,
        token,
        roles: ['DONOR']
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: uuidv4()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Donor registration error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const search = searchParams.get('search');
    const type = searchParams.get('type') as any;
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const total = await prisma.donor.count({ where });

    // Get donors with pagination
    const donors = await prisma.donor.findMany({
      where,
      include: {
        _count: {
          select: {
            commitments: true,
            responses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        donors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: uuidv4()
      }
    });

  } catch (error) {
    console.error('Donors list error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    );
  }
}