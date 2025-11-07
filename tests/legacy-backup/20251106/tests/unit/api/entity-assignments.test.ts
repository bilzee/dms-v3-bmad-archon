import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/entity-assignments/route';
import { DELETE } from '@/app/api/v1/entity-assignments/[id]/route';
import { POST as BulkPOST } from '@/app/api/v1/entity-assignments/bulk/route';
import { prisma } from '@/lib/db/client';
import * as verifyModule from '@/lib/auth/verify';

// Mock dependencies
jest.mock('@/lib/db/client', () => ({
  prisma: {
    entityAssignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    entity: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth/verify');

describe('Entity Assignment API Endpoints', () => {
  const mockUser = {
    id: 'user123',
    email: 'coordinator@test.com',
    roles: [
      {
        role: {
          id: 'role123',
          name: 'COORDINATOR',
          permissions: []
        }
      }
    ]
  };

  const mockAssessor = {
    id: 'assessor123',
    email: 'assessor@test.com',
    roles: [
      {
        role: {
          id: 'role456',
          name: 'ASSESSOR',
          permissions: []
        }
      }
    ]
  };

  const mockEntity = {
    id: 'entity123',
    name: 'Test Community',
    type: 'COMMUNITY',
    location: 'Test Location'
  };

  const mockAssignment = {
    id: 'assignment123',
    userId: 'assessor123',
    entityId: 'entity123',
    assignedBy: 'user123',
    assignedAt: new Date(),
    user: mockAssessor,
    entity: mockEntity
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/entity-assignments', () => {
    it('should create a new assignment successfully', async () => {
      // Mock auth verification
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      // Mock database operations
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAssessor);
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(mockEntity);
      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.entityAssignment.create as jest.Mock).mockResolvedValue(mockAssignment);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'assessor123',
          entityId: 'entity123',
          assignedBy: 'user123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAssignment);
      expect(prisma.entityAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'assessor123',
          entityId: 'entity123',
          assignedBy: 'user123'
        },
        include: expect.any(Object)
      });
    });

    it('should reject assignment if user lacks coordinator role', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: {
          ...mockUser,
          roles: [{ role: { name: 'ASSESSOR' } }]
        }
      });

      const request = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'assessor123',
          entityId: 'entity123',
          assignedBy: 'user123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only coordinators can manage entity assignments');
    });

    it('should reject assignment if target user not found', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'nonexistent123',
          entityId: 'entity123',
          assignedBy: 'user123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should reject assignment if user lacks appropriate role', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const userWithoutRole = {
        ...mockAssessor,
        roles: [{ role: { name: 'COORDINATOR' } }]
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userWithoutRole);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'assessor123',
          entityId: 'entity123',
          assignedBy: 'user123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('User must have ASSESSOR or RESPONDER role');
    });

    it('should reject assignment if assignment already exists', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAssessor);
      (prisma.entity.findUnique as jest.Mock).mockResolvedValue(mockEntity);
      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: 'assessor123',
          entityId: 'entity123',
          assignedBy: 'user123'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Assignment already exists');
    });
  });

  describe('GET /api/v1/entity-assignments', () => {
    it('should fetch assignments with pagination', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const mockAssignments = [mockAssignment];
      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignments);
      (prisma.entityAssignment.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAssignments);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      });
    });
  });

  describe('DELETE /api/v1/entity-assignments/[id]', () => {
    it('should delete assignment successfully', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);
      (prisma.entityAssignment.delete as jest.Mock).mockResolvedValue(mockAssignment);

      const response = await DELETE(
        new NextRequest('http://localhost/api/v1/entity-assignments/assignment123', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer valid-token' }
        }),
        { params: { id: 'assignment123' } }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Assignment deleted successfully');
      expect(prisma.entityAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment123' }
      });
    });

    it('should return 404 if assignment not found', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      (prisma.entityAssignment.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest('http://localhost/api/v1/entity-assignments/nonexistent', {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer valid-token' }
        }),
        { params: { id: 'nonexistent' } }
      );

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Assignment not found');
    });
  });

  describe('POST /api/v1/entity-assignments/bulk', () => {
    it('should create bulk assignments successfully', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const mockUsers = [mockAssessor];
      const mockEntities = [mockEntity];
      const mockCreatedAssignments = [mockAssignment];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.entity.findMany as jest.Mock).mockResolvedValue(mockEntities);
      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$transaction as jest.Mock).mockResolvedValue(mockCreatedAssignments);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments/bulk', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: ['assessor123'],
          entityIds: ['entity123'],
          assignedBy: 'user123'
        })
      });

      const response = await BulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.created).toBe(1);
      expect(data.skipped).toBe(0);
      expect(data.data).toEqual(mockCreatedAssignments);
    });

    it('should handle missing users in bulk assignment', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]); // No users found

      const request = new NextRequest('http://localhost/api/v1/entity-assignments/bulk', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: ['nonexistent123'],
          entityIds: ['entity123'],
          assignedBy: 'user123'
        })
      });

      const response = await BulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Some users not found');
      expect(data.missingUserIds).toEqual(['nonexistent123']);
    });

    it('should skip existing assignments in bulk operation', async () => {
      (verifyModule.verifyToken as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser
      });

      const mockUsers = [mockAssessor];
      const mockEntities = [mockEntity];
      const existingAssignments = [mockAssignment];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.entity.findMany as jest.Mock).mockResolvedValue(mockEntities);
      (prisma.entityAssignment.findMany as jest.Mock).mockResolvedValue(existingAssignments);

      const request = new NextRequest('http://localhost/api/v1/entity-assignments/bulk', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: ['assessor123'],
          entityIds: ['entity123'],
          assignedBy: 'user123'
        })
      });

      const response = await BulkPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.created).toBe(0);
      expect(data.skipped).toBe(1);
      expect(data.message).toContain('All assignments already exist');
    });
  });
});