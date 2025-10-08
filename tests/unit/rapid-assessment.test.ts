import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { rapidAssessmentService } from '@/lib/services/rapid-assessment.service';
import { RapidAssessmentType } from '@/types/rapid-assessment';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $transaction: jest.fn(),
    rapidAssessment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    healthAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    populationAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    foodAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    washAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    shelterAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    securityAssessment: {
      create: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

describe('RapidAssessmentService', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createAssessment', () => {
    it('should create a health assessment successfully', async () => {
      // Arrange
      const assessmentData = {
        rapidAssessmentType: RapidAssessmentType.HEALTH,
        rapidAssessmentDate: new Date(),
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

      const mockRapidAssessment = {
        id: 'assessment-123',
        rapidAssessmentType: RapidAssessmentType.HEALTH,
        rapidAssessmentDate: new Date(),
        affectedEntityId: 'entity-123',
        assessorName: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockHealthAssessment = {
        rapidAssessmentId: 'assessment-123',
        hasFunctionalClinic: true,
        numberHealthFacilities: 2,
        healthFacilityType: 'Primary Health Center',
        qualifiedHealthWorkers: 5,
        hasMedicineSupply: true,
        hasMedicalSupplies: true,
        hasMaternalChildServices: true,
        commonHealthIssues: '["Diarrhea","Malaria"]',
        additionalHealthDetails: '{}',
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      mockPrisma.$transaction = mockTransaction;
      (mockPrisma.rapidAssessment.create as jest.Mock).mockResolvedValue(mockRapidAssessment);
      (mockPrisma.healthAssessment.create as jest.Mock).mockResolvedValue(mockHealthAssessment);
      (mockPrisma.rapidAssessment.findUnique as jest.Mock).mockResolvedValue({
        ...mockRapidAssessment,
        healthAssessment: mockHealthAssessment,
      });

      // Act
      const result = await rapidAssessmentService.createAssessment(
        assessmentData,
        RapidAssessmentType.HEALTH
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('HEALTH assessment created successfully');
      expect(mockPrisma.rapidAssessment.create).toHaveBeenCalledWith({
        data: {
          rapidAssessmentType: RapidAssessmentType.HEALTH,
          rapidAssessmentDate: assessmentData.rapidAssessmentDate,
          affectedEntityId: assessmentData.affectedEntityId,
          assessorName: assessmentData.assessorName,
        },
      });
      expect(mockPrisma.healthAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rapidAssessmentId: 'assessment-123',
          hasFunctionalClinic: true,
          commonHealthIssues: '["Diarrhea","Malaria"]',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const assessmentData = {
        rapidAssessmentType: RapidAssessmentType.HEALTH,
        rapidAssessmentDate: new Date(),
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

      const mockTransaction = jest.fn().mockRejectedValue(new Error('Database error'));
      mockPrisma.$transaction = mockTransaction;

      // Act
      const result = await rapidAssessmentService.createAssessment(
        assessmentData,
        RapidAssessmentType.HEALTH
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database error');
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toBe('Database error');
    });
  });

  describe('getAssessmentById', () => {
    it('should return assessment with all type-specific data', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      const mockAssessment = {
        id: assessmentId,
        rapidAssessmentType: RapidAssessmentType.HEALTH,
        rapidAssessmentDate: new Date(),
        affectedEntityId: 'entity-123',
        assessorName: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        healthAssessment: {
          rapidAssessmentId: assessmentId,
          hasFunctionalClinic: true,
          numberHealthFacilities: 2,
          healthFacilityType: 'Primary Health Center',
          qualifiedHealthWorkers: 5,
          hasMedicineSupply: true,
          hasMedicalSupplies: true,
          hasMaternalChildServices: true,
          commonHealthIssues: '["Diarrhea","Malaria"]',
          additionalHealthDetails: '{}',
        },
      };

      (mockPrisma.rapidAssessment.findUnique as jest.Mock).mockResolvedValue(mockAssessment);

      // Act
      const result = await rapidAssessmentService.getAssessmentById(assessmentId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.healthAssessment).toBeDefined();
      expect(result.data!.healthAssessment!.commonHealthIssues).toEqual(['Diarrhea', 'Malaria']);
    });

    it('should return not found for non-existent assessment', async () => {
      // Arrange
      const assessmentId = 'non-existent';
      (mockPrisma.rapidAssessment.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await rapidAssessmentService.getAssessmentById(assessmentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Assessment not found');
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('performGapAnalysis', () => {
    it('should identify critical gaps in health assessment', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      const mockAssessment = {
        id: assessmentId,
        rapidAssessmentType: RapidAssessmentType.HEALTH,
        healthAssessment: {
          hasFunctionalClinic: false,
          hasMedicineSupply: false,
          hasMedicalSupplies: true,
          hasMaternalChildServices: false,
        },
      };

      jest.spyOn(rapidAssessmentService, 'getAssessmentById').mockResolvedValue({
        success: true,
        data: mockAssessment as any,
      });

      // Act
      const result = await rapidAssessmentService.performGapAnalysis(assessmentId);

      // Assert
      expect(result).toBeDefined();
      expect(result!.assessmentType).toBe(RapidAssessmentType.HEALTH);
      expect(result!.hasGaps).toBe(true);
      expect(result!.gapFields).toContain('Functional Clinic');
      expect(result!.gapFields).toContain('Medicine Supply');
      expect(result!.criticalGaps).toContain('No functional clinic available');
      expect(result!.criticalGaps).toContain('No medicine supply available');
      expect(result!.recommendations).toContain('Establish temporary medical facility');
    });

    it('should return no gaps for perfect health assessment', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      const mockAssessment = {
        id: assessmentId,
        rapidAssessmentType: RapidAssessmentType.HEALTH,
        healthAssessment: {
          hasFunctionalClinic: true,
          hasMedicineSupply: true,
          hasMedicalSupplies: true,
          hasMaternalChildServices: true,
        },
      };

      jest.spyOn(rapidAssessmentService, 'getAssessmentById').mockResolvedValue({
        success: true,
        data: mockAssessment as any,
      });

      // Act
      const result = await rapidAssessmentService.performGapAnalysis(assessmentId);

      // Assert
      expect(result).toBeDefined();
      expect(result!.hasGaps).toBe(false);
      expect(result!.gapFields).toHaveLength(0);
      expect(result!.criticalGaps).toHaveLength(0);
    });

    it('should handle WASH assessment gap analysis', async () => {
      // Arrange
      const assessmentId = 'assessment-456';
      const mockAssessment = {
        id: assessmentId,
        rapidAssessmentType: RapidAssessmentType.WASH,
        washAssessment: {
          isWaterSufficient: false,
          areLatrinesSufficient: false,
          hasOpenDefecationConcerns: true,
          functionalLatrinesAvailable: 2,
        },
      };

      jest.spyOn(rapidAssessmentService, 'getAssessmentById').mockResolvedValue({
        success: true,
        data: mockAssessment as any,
      });

      // Act
      const result = await rapidAssessmentService.performGapAnalysis(assessmentId);

      // Assert
      expect(result).toBeDefined();
      expect(result!.assessmentType).toBe(RapidAssessmentType.WASH);
      expect(result!.hasGaps).toBe(true);
      expect(result!.gapFields).toContain('Water Supply');
      expect(result!.gapFields).toContain('Latrine Facilities');
      expect(result!.gapFields).toContain('Open Defecation');
      expect(result!.criticalGaps).toContain('Insufficient water supply');
      expect(result!.criticalGaps).toContain('Open defecation concerns');
    });

    it('should return null for non-existent assessment', async () => {
      // Arrange
      const assessmentId = 'non-existent';
      jest.spyOn(rapidAssessmentService, 'getAssessmentById').mockResolvedValue({
        success: false,
        message: 'Assessment not found',
        errors: ['Not found'],
      });

      // Act
      const result = await rapidAssessmentService.performGapAnalysis(assessmentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateAssessment', () => {
    it('should update assessment successfully', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      const updateData = {
        hasFunctionalClinic: false,
        numberHealthFacilities: 3,
      };

      const mockExistingAssessment = {
        id: assessmentId,
        rapidAssessmentType: RapidAssessmentType.HEALTH,
      };

      const mockUpdatedAssessment = {
        ...mockExistingAssessment,
        hasFunctionalClinic: false,
        numberHealthFacilities: 3,
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      mockPrisma.$transaction = mockTransaction;
      (mockPrisma.rapidAssessment.update as jest.Mock).mockResolvedValue(mockUpdatedAssessment);
      (mockPrisma.healthAssessment.update as jest.Mock).mockResolvedValue(mockUpdatedAssessment);
      jest.spyOn(rapidAssessmentService, 'getAssessmentById').mockResolvedValue({
        success: true,
        data: mockUpdatedAssessment as any,
      });

      // Act
      const result = await rapidAssessmentService.updateAssessment(
        assessmentId,
        { healthAssessment: updateData },
        RapidAssessmentType.HEALTH
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('HEALTH assessment updated successfully');
    });
  });

  describe('deleteAssessment', () => {
    it('should delete assessment successfully', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      (mockPrisma.rapidAssessment.delete as jest.Mock).mockResolvedValue({});

      // Act
      const result = await rapidAssessmentService.deleteAssessment(assessmentId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Assessment deleted successfully');
      expect(mockPrisma.rapidAssessment.delete).toHaveBeenCalledWith({
        where: { id: assessmentId },
      });
    });

    it('should handle delete errors', async () => {
      // Arrange
      const assessmentId = 'assessment-123';
      (mockPrisma.rapidAssessment.delete as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      // Act
      const result = await rapidAssessmentService.deleteAssessment(assessmentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Delete failed');
    });
  });
});