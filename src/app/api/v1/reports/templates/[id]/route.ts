/**
 * Individual Report Template API Routes
 * GET - Get specific report template
 * PATCH - Update report template
 * DELETE - Delete report template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { ReportTemplateEngine } from '@/lib/ports/template-engine';
import { ApiResponse } from '@/types/api';

// Validation schemas
const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['ASSESSMENT', 'RESPONSE', 'ENTITY', 'DONOR', 'CUSTOM']).optional(),
  layout: z.array(z.any()).min(1).optional(),
  isPublic: z.boolean().optional()
});

/**
 * GET /api/v1/reports/templates/[id]
 * Get specific report template with preview data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Unauthorized'),
        { status: 401 }
      );
    }

    const templateId = params.id;

    // Check if it's a default template
    if (templateId.startsWith('default_')) {
      const defaultTemplateName = templateId.replace('default_', '').replace(/_/g, ' ');
      const defaultTemplate = await import('@/lib/ports/template-engine')
        .then(module => module.DEFAULT_TEMPLATES)
        .then(templates => 
          templates.find(t => 
            t.name.toLowerCase() === defaultTemplateName.toLowerCase()
          )
        );

      if (!defaultTemplate) {
        return NextResponse.json(
          new ApiResponse(false, null, 'Default template not found'),
          { status: 404 }
        );
      }

      const mockData = ReportTemplateEngine.generateMockData(defaultTemplate);
      const preview = ReportTemplateEngine.renderTemplatePreview(defaultTemplate);

      return NextResponse.json(
        new ApiResponse(true, {
          ...defaultTemplate,
          id: templateId,
          preview,
          mockData,
          isDefault: true
        }, 'Default template retrieved successfully'),
        { status: 200 }
      );
    }

    // Get user template
    const template = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { createdById: session.user.id },
          { isPublic: true }
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            configurations: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Template not found or access denied'),
        { status: 404 }
      );
    }

    // Generate preview for the template
    const preview = ReportTemplateEngine.renderTemplatePreview(template);

    return NextResponse.json(
      new ApiResponse(true, {
        ...template,
        preview
      }, 'Template retrieved successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting report template:', error);
    return NextResponse.json(
      new ApiResponse(false, null, 'Failed to retrieve report template'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/reports/templates/[id]
 * Update specific report template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Unauthorized'),
        { status: 401 }
      );
    }

    const templateId = params.id;

    // Don't allow updating default templates
    if (templateId.startsWith('default_')) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Default templates cannot be modified'),
        { status: 403 }
      );
    }

    // Check if user owns the template
    const existingTemplate = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        createdById: session.user.id
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Template not found or access denied'),
        { status: 404 }
      );
    }

    // Check user permissions
    const userRoles = await db.userRole.findMany({
      where: { userId: session.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    const hasPermission = userRoles.some(userRole =>
      userRole.role.permissions.some(rolePermission =>
        rolePermission.permission.code === 'REPORT_UPDATE' ||
        rolePermission.permission.code === 'ADMIN'
      )
    );

    if (!hasPermission) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Insufficient permissions to update report templates'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateTemplateSchema.parse(body);

    // Validate updated template structure if layout is being updated
    if (validatedData.layout) {
      const updatedTemplate = {
        ...existingTemplate,
        ...validatedData
      };

      const templateValidation = ReportTemplateEngine.validateTemplate(updatedTemplate);
      if (!templateValidation.valid) {
        return NextResponse.json(
          new ApiResponse(false, null, 'Template validation failed', templateValidation.errors),
          { status: 400 }
        );
      }
    }

    // Update template
    const updatedTemplate = await db.reportTemplate.update({
      where: { id: templateId },
      data: validatedData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            configurations: true
          }
        }
      }
    });

    return NextResponse.json(
      new ApiResponse(true, updatedTemplate, 'Report template updated successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating report template:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Invalid request data', error.errors),
        { status: 400 }
      );
    }

    return NextResponse.json(
      new ApiResponse(false, null, 'Failed to update report template'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/reports/templates/[id]
 * Delete specific report template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Unauthorized'),
        { status: 401 }
      );
    }

    const templateId = params.id;

    // Don't allow deleting default templates
    if (templateId.startsWith('default_')) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Default templates cannot be deleted'),
        { status: 403 }
      );
    }

    // Check if user owns the template
    const existingTemplate = await db.reportTemplate.findFirst({
      where: {
        id: templateId,
        createdById: session.user.id
      }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Template not found or access denied'),
        { status: 404 }
      );
    }

    // Check user permissions
    const userRoles = await db.userRole.findMany({
      where: { userId: session.user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    const hasPermission = userRoles.some(userRole =>
      userRole.role.permissions.some(rolePermission =>
        rolePermission.permission.code === 'REPORT_DELETE' ||
        rolePermission.permission.code === 'ADMIN'
      )
    );

    if (!hasPermission) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Insufficient permissions to delete report templates'),
        { status: 403 }
      );
    }

    // Check if template has configurations
    const configurationsCount = await db.reportConfiguration.count({
      where: { templateId }
    });

    if (configurationsCount > 0) {
      return NextResponse.json(
        new ApiResponse(false, null, 'Cannot delete template with existing configurations', {
          configurationsCount
        }),
        { status: 409 }
      );
    }

    // Delete template
    await db.reportTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json(
      new ApiResponse(true, null, 'Report template deleted successfully'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting report template:', error);
    return NextResponse.json(
      new ApiResponse(false, null, 'Failed to delete report template'),
      { status: 500 }
    );
  }
}