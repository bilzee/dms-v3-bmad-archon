import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { AutoAssignmentService, AutoAssignmentConfig } from '@/lib/assignment/auto-assignment';
import { z } from 'zod';

const autoAssignmentRuleSchema = z.object({
  entityType: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP']),
  userRole: z.enum(['ASSESSOR', 'RESPONDER']),
  autoAssignOnCreation: z.boolean(),
  inheritFromWorkflow: z.boolean(),
  notificationEnabled: z.boolean()
});

const autoAssignmentConfigSchema = z.object({
  rules: z.array(autoAssignmentRuleSchema),
  globalSettings: z.object({
    enableAutoAssignment: z.boolean(),
    enableInheritance: z.boolean(),
    enableNotifications: z.boolean()
  })
});

export const GET = requireRole('COORDINATOR')(async (request: NextRequest, context) => {
  try {

    const config = AutoAssignmentService.getConfig();

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error fetching auto-assignment config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireRole('COORDINATOR')(async (request: NextRequest, context) => {
  try {

    const body = await request.json();
    const validatedConfig = autoAssignmentConfigSchema.parse(body);

    // Update the configuration
    AutoAssignmentService.updateConfig(validatedConfig);

    return NextResponse.json({
      success: true,
      message: 'Auto-assignment configuration updated successfully',
      data: AutoAssignmentService.getConfig()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating auto-assignment config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireRole('COORDINATOR')(async (request: NextRequest, context) => {
  try {

    // Reset to default configuration
    const defaultConfig = {
      rules: [
        {
          entityType: 'COMMUNITY',
          userRole: 'ASSESSOR',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: true
        },
        {
          entityType: 'COMMUNITY',
          userRole: 'RESPONDER',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: true
        },
        {
          entityType: 'WARD',
          userRole: 'ASSESSOR',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: false
        },
        {
          entityType: 'WARD',
          userRole: 'RESPONDER',
          autoAssignOnCreation: true,
          inheritFromWorkflow: true,
          notificationEnabled: false
        }
      ],
      globalSettings: {
        enableAutoAssignment: true,
        enableInheritance: true,
        enableNotifications: true
      }
    };

    AutoAssignmentService.updateConfig(defaultConfig);

    return NextResponse.json({
      success: true,
      message: 'Auto-assignment configuration reset to defaults',
      data: AutoAssignmentService.getConfig()
    });

  } catch (error) {
    console.error('Error resetting auto-assignment config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});