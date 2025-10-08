import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { POST, GET, PUT, DELETE } from '@/app/api/v1/rapid-assessments/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/services/rapid-assessment.service');
jest.mock('@/lib/auth/role-check');
jest.mock('@/lib/auth/get-current-user');

import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { requireRole } from '@/lib/auth/role-check';
import { getCurrentUser } from '@/lib/auth/get-current-user';

describe('/api/v1/rapid-assessments', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user authentication
    const mockUser = {
      id: 'user-123',
      email: 'assessor@example.com',
      name: 'John Assessor',
    };
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (requireRole as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/v1/rapid-assessments', () => {
    it('should create a health assessment successfully', async () => {
      // Arrange
      const requestBody = {
        rapidAssessmentType: 'HEALTH',
        rapidAssessmentDate: '2025-10-07T10:00:00.000Z',
        affectedEntityId: 'entity-123',
        assessorName: 'John Doe',
        healthAssessment: {
          hasFunctionalClinic: true,
          numberHealthFacilities: 2,
          healthFacilityType: 'Primary Health Center',
          qualifiedHealthWorkers: 5,
          hasMedicineSupply: true,
          hasMedicalSupplies: true,
          hasMaternalChildServices: true,
          commonHealthIssues: ['Diarrhea', 'Malaria'],
        },
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'assessment-123',
          rapidAssessmentType: 'HEALTH',
          createdAt: new Date(),
        },
        message: 'HEALTH assessment created successfully',
      };

      const mockServiceResponse = Promise.resolve(mockResponse);
      (rapidAssessmentService.createAssessment as jest.Mock).mockReturnValue(mockServiceResponse);

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: requestBody,
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      expect(responseData.message).toBe('HEALTH assessment created successfully');
      expect(rapidAssessmentService.createAssessment).toHaveBeenCalledWith(
        requestBody,
        'HEALTH'
      );
    });

    it('should return 401 for unauthorized requests', async () => {
      // Arrange
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: {},
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Unauthorized');
    });

    it('should return 403 for users without assessor role', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(false);

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: {},
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Forbidden: Assessor role required');
    });

    it('should return 400 for invalid assessment type', async () => {
      // Arrange
      const requestBody = {
        rapidAssessmentType: 'INVALID_TYPE',
        affectedEntityId: 'entity-123',
        assessorName: 'John Doe',
      };

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: requestBody,
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Invalid assessment type');
    });

    it('should return 400 for validation errors', async () => {
      // Arrange
      const requestBody = {
        rapidAssessmentType: 'HEALTH',
        // Missing required fields
      };

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: requestBody,
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Validation error');
      expect(responseData.errors).toBeDefined();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const requestBody = {
        rapidAssessmentType: 'HEALTH',
        rapidAssessmentDate: '2025-10-07T10:00:00.000Z',
        affectedEntityId: 'entity-123',
        assessorName: 'John Doe',
        healthAssessment: {
          hasFunctionalClinic: true,
          numberHealthFacilities: 2,
          healthFacilityType: 'Primary Health Center',
          qualifiedHealthWorkers: 5,
          hasMedicineSupply: true,
          hasMedicalSupplies: true,
          hasMaternalChildServices: true,
          commonHealthIssues: ['Diarrhea'],
        },
      };

      const mockServiceResponse = Promise.resolve({
        success: false,
        message: 'Database error',
        errors: ['Connection failed'],
      });
      (rapidAssessmentService.createAssessment as jest.Mock).mockReturnValue(mockServiceResponse);

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: requestBody,
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Database error');
      expect(responseData.errors).toEqual(['Connection failed']);
    });
  });

  describe('GET /api/v1/rapid-assessments', () => {
    it('should return assessments for authenticated users', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'assessment-1',
            rapidAssessmentType: 'HEALTH',
            createdAt: new Date(),
          },
          {
            id: 'assessment-2',
            rapidAssessmentType: 'WASH',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      const mockServiceResponse = Promise.resolve(mockResponse);
      (rapidAssessmentService.getAssessmentsByUserId as jest.Mock).mockReturnValue(mockServiceResponse);

      mockReq = createMocks({
        method: 'GET',
        url: '/api/v1/rapid-assessments',
        query: { page: '1', limit: '10' },
      });

      // Act
      const response = await GET(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      expect(responseData.pagination).toBeDefined();
      expect(rapidAssessmentService.getAssessmentsByUserId).toHaveBeenCalledWith('temp', 1, 10);
    });

    it('should handle query parameters correctly', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: [],
        pagination: {
          page: 2,
          limit: 5,
          total: 0,
          totalPages: 0,
        },
      };

      const mockServiceResponse = Promise.resolve(mockResponse);
      (rapidAssessmentService.getAssessmentsByUserId as jest.Mock).mockReturnValue(mockServiceResponse);

      mockReq = createMocks({
        method: 'GET',
        url: '/api/v1/rapid-assessments?page=2&limit=5',
        query: { page: '2', limit: '5' },
      });

      // Act
      const response = await GET(mockReq.req);

      // Assert
      expect(response.status).toBe(200);
      expect(rapidAssessmentService.getAssessmentsByUserId).toHaveBeenCalledWith('temp', 2, 5);
    });

    it('should return 401 for unauthorized requests', async () => {
      // Arrange
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      mockReq = createMocks({
        method: 'GET',
        url: '/api/v1/rapid-assessments',
      });

      // Act
      const response = await GET(mockReq.req);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      // Arrange
      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json',
        },
      });

      // Mock the JSON.parse to throw an error
      const originalJson = mockReq.req.json;
      mockReq.req.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Internal server error');

      // Restore original method
      mockReq.req.json = originalJson;
    });

    it('should handle service timeout errors', async () => {
      // Arrange
      const requestBody = {
        rapidAssessmentType: 'HEALTH',
        affectedEntityId: 'entity-123',
        assessorName: 'John Doe',
        healthAssessment: {
          hasFunctionalClinic: true,
        },
      };

      const mockServiceResponse = Promise.reject(new Error('Request timeout'));
      (rapidAssessmentService.createAssessment as jest.Mock).mockReturnValue(mockServiceResponse);

      mockReq = createMocks({
        method: 'POST',
        url: '/api/v1/rapid-assessments',
        body: requestBody,
      });

      // Act
      const response = await POST(mockReq.req);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Request timeout');
    });
  });
});