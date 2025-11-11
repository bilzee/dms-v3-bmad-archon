import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { DonorProfileUpdateSchema } from '@/lib/validation/donor';
import { v4 as uuidv4 } from 'uuid';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, roles } = context;
    
    // Check if user has donor role
    if (!roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Donor role required' },
        { status: 403 }
      );
    }

    // Find donor profile linked to user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find donor by organization name match (since User has organization field)
    const donor = await prisma.donor.findFirst({
      where: {
        name: user.organization || undefined
      },
      include: {
        _count: {
          select: {
            commitments: true,
            responses: true
          }
        }
      }
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor profile not found' },
        { status: 404 }
      );
    }

    // Calculate performance metrics
    const [commitmentStats, responseStats] = await Promise.all([
      prisma.donorCommitment.aggregate({
        where: { donorId: donor.id },
        _sum: { totalCommittedQuantity: true, deliveredQuantity: true },
        _count: { id: true }
      }),
      prisma.rapidResponse.aggregate({
        where: { donorId: donor.id },
        _count: { id: true }
      })
    ]);

    const totalCommitments = commitmentStats._count.id;
    const totalCommitted = commitmentStats._sum.totalCommittedQuantity || 0;
    const totalDelivered = commitmentStats._sum.deliveredQuantity || 0;
    const totalResponses = responseStats._count.id;

    const deliveryRate = totalCommitted > 0 ? (totalDelivered / totalCommitted) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        donor: {
          ...donor,
          metrics: {
            commitments: {
              total: totalCommitments,
              totalCommitted,
              delivered: totalDelivered,
              deliveryRate: Math.round(deliveryRate * 100) / 100
            },
            responses: {
              total: totalResponses
            },
            combined: {
              totalActivities: totalCommitments + totalResponses
            }
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: uuidv4()
      }
    });

  } catch (error) {
    console.error('Donor profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, roles } = context;
    
    // Check if user has donor role
    if (!roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Donor role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = DonorProfileUpdateSchema.safeParse(body);
    
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

    // Find user and donor
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const donor = await prisma.donor.findFirst({
      where: { name: user.organization || undefined }
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: 'Donor profile not found' },
        { status: 404 }
      );
    }

    // Check for duplicate contact email if being updated
    if (validation.data.contactEmail) {
      const existingDonor = await prisma.donor.findFirst({
        where: {
          contactEmail: { equals: validation.data.contactEmail, mode: 'insensitive' },
          id: { not: donor.id }
        }
      });

      if (existingDonor) {
        return NextResponse.json(
          { success: false, error: 'Email already in use by another donor' },
          { status: 409 }
        );
      }
    }

    // Update donor profile
    const updatedDonor = await prisma.donor.update({
      where: { id: donor.id },
      data: {
        ...validation.data,
        updatedAt: new Date()
      }
    });

    // Log audit entry
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DONOR_PROFILE_UPDATE',
        resource: 'Donor',
        resourceId: donor.id,
        oldValues: JSON.stringify({
          name: donor.name,
          contactEmail: donor.contactEmail,
          contactPhone: donor.contactPhone,
          organization: donor.organization
        }),
        newValues: JSON.stringify(validation.data),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      data: { donor: updatedDonor },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: uuidv4()
      }
    });

  } catch (error) {
    console.error('Donor profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});