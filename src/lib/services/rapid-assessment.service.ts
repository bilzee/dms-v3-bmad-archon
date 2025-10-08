import { PrismaClient } from '@prisma/client';
import { 
  RapidAssessment, 
  RapidAssessmentType, 
  CreateRapidAssessmentRequest,
  RapidAssessmentResponse,
  RapidAssessmentListResponse,
  GapAnalysis
} from '@/types/rapid-assessment';

export class RapidAssessmentService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new rapid assessment with type-specific data
   */
  async createAssessment<T extends CreateRapidAssessmentRequest>(
    assessmentData: T,
    assessmentType: RapidAssessmentType
  ): Promise<RapidAssessmentResponse> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the base rapid assessment
        const rapidAssessment = await tx.rapidAssessment.create({
          data: {
            rapidAssessmentType: assessmentType,
            rapidAssessmentDate: assessmentData.rapidAssessmentDate,
            affectedEntityId: assessmentData.affectedEntityId,
            assessorName: assessmentData.assessorName,
          }
        });

        // Create type-specific assessment data
        let typeSpecificAssessment = null;
        const typeKey = this.getTypeKey(assessmentType);

        if (typeKey && assessmentData[typeKey as keyof T]) {
          const assessmentSpecificData = assessmentData[typeKey as keyof T] as any;
          
          // Convert arrays to JSON strings for database storage
          const processedData = this.processArraysToJson(assessmentSpecificData);

          typeSpecificAssessment = await tx[typeKey].create({
            data: {
              ...processedData,
              rapidAssessmentId: rapidAssessment.id
            }
          });
        }

        return { rapidAssessment, typeSpecificAssessment };
      });

      const completeAssessment = await this.getAssessmentById(result.rapidAssessment.id);
      
      return {
        success: true,
        data: completeAssessment.data!,
        message: `${assessmentType} assessment created successfully`
      };
    } catch (error) {
      console.error('Error creating rapid assessment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create assessment',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get assessment by ID with all type-specific data
   */
  async getAssessmentById(id: string): Promise<RapidAssessmentResponse> {
    try {
      const assessment = await this.prisma.rapidAssessment.findUnique({
        where: { id },
        include: {
          healthAssessment: true,
          populationAssessment: true,
          foodAssessment: true,
          washAssessment: true,
          shelterAssessment: true,
          securityAssessment: true,
          affectedEntity: true
        }
      });

      if (!assessment) {
        return {
          success: false,
          message: 'Assessment not found',
          errors: ['Assessment with provided ID does not exist']
        };
      }

      // Process JSON strings back to arrays
      const processedAssessment = this.processJsonToArrays(assessment);

      return {
        success: true,
        data: processedAssessment as RapidAssessment
      };
    } catch (error) {
      console.error('Error fetching assessment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch assessment',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get assessments for a specific user (assessor)
   */
  async getAssessmentsByUserId(
    userId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<RapidAssessmentListResponse> {
    try {
      const skip = (page - 1) * limit;
      
      const [assessments, total] = await Promise.all([
        this.prisma.rapidAssessment.findMany({
          where: {
            // Note: In the current schema, we don't have a direct userId relationship
            // This would need to be added or derived from entity assignments
          },
          include: {
            healthAssessment: true,
            populationAssessment: true,
            foodAssessment: true,
            washAssessment: true,
            shelterAssessment: true,
            securityAssessment: true,
            affectedEntity: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.rapidAssessment.count()
      ]);

      // Process JSON strings back to arrays
      const processedAssessments = assessments.map(assessment => 
        this.processJsonToArrays(assessment)
      );

      return {
        success: true,
        data: processedAssessments as RapidAssessment[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user assessments:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch assessments',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Update an existing assessment
   */
  async updateAssessment<T extends Partial<CreateRapidAssessmentRequest>>(
    id: string,
    updateData: T,
    assessmentType: RapidAssessmentType
  ): Promise<RapidAssessmentResponse> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Update the base rapid assessment
        const updatedBaseAssessment = await tx.rapidAssessment.update({
          where: { id },
          data: {
            rapidAssessmentDate: updateData.rapidAssessmentDate,
            affectedEntityId: updateData.affectedEntityId,
            assessorName: updateData.assessorName,
          }
        });

        // Update type-specific assessment data
        const typeKey = this.getTypeKey(assessmentType);
        let updatedTypeAssessment = null;

        if (typeKey && updateData[typeKey as keyof T]) {
          const assessmentSpecificData = updateData[typeKey as keyof T] as any;
          
          // Convert arrays to JSON strings for database storage
          const processedData = this.processArraysToJson(assessmentSpecificData);

          updatedTypeAssessment = await tx[typeKey].update({
            where: { rapidAssessmentId: id },
            data: processedData
          });
        }

        return { updatedBaseAssessment, updatedTypeAssessment };
      });

      const completeAssessment = await this.getAssessmentById(id);
      
      return {
        success: true,
        data: completeAssessment.data!,
        message: `${assessmentType} assessment updated successfully`
      };
    } catch (error) {
      console.error('Error updating assessment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update assessment',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Delete an assessment (cascade delete will remove type-specific data)
   */
  async deleteAssessment(id: string): Promise<RapidAssessmentResponse> {
    try {
      await this.prisma.rapidAssessment.delete({
        where: { id }
      });

      return {
        success: true,
        message: 'Assessment deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting assessment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete assessment',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Perform gap analysis on an assessment
   */
  async performGapAnalysis(assessmentId: string): Promise<GapAnalysis | null> {
    try {
      const assessmentResponse = await this.getAssessmentById(assessmentId);
      
      if (!assessmentResponse.success || !assessmentResponse.data) {
        return null;
      }

      const assessment = assessmentResponse.data;
      const gapFields: string[] = [];
      const criticalGaps: string[] = [];
      const recommendations: string[] = [];

      switch (assessment.rapidAssessmentType) {
        case RapidAssessmentType.HEALTH:
          const health = assessment.healthAssessment;
          if (health) {
            if (!health.hasFunctionalClinic) {
              gapFields.push('Functional Clinic');
              criticalGaps.push('No functional clinic available');
              recommendations.push('Establish temporary medical facility');
            }
            if (!health.hasMedicineSupply) {
              gapFields.push('Medicine Supply');
              criticalGaps.push('No medicine supply available');
              recommendations.push('Arrange emergency medical supplies');
            }
            if (!health.hasMedicalSupplies) {
              gapFields.push('Medical Supplies');
              recommendations.push('Provide basic medical equipment');
            }
            if (!health.hasMaternalChildServices) {
              gapFields.push('Maternal Child Services');
              recommendations.push('Establish maternal and child health services');
            }
          }
          break;

        case RapidAssessmentType.WASH:
          const wash = assessment.washAssessment;
          if (wash) {
            if (!wash.isWaterSufficient) {
              gapFields.push('Water Supply');
              criticalGaps.push('Insufficient water supply');
              recommendations.push('Arrange water trucking or water purification');
            }
            if (!wash.areLatrinesSufficient) {
              gapFields.push('Latrine Facilities');
              recommendations.push('Construct additional latrines');
            }
            if (wash.hasOpenDefecationConcerns) {
              gapFields.push('Open Defecation');
              criticalGaps.push('Open defecation concerns');
              recommendations.push('Implement hygiene promotion and latrine construction');
            }
          }
          break;

        case RapidAssessmentType.SHELTER:
          const shelter = assessment.shelterAssessment;
          if (shelter) {
            if (!shelter.areSheltersSufficient) {
              gapFields.push('Shelter Availability');
              criticalGaps.push('Insufficient shelter available');
              recommendations.push(`Provide ${shelter.numberSheltersRequired} additional shelters`);
            }
            if (!shelter.provideWeatherProtection) {
              gapFields.push('Weather Protection');
              criticalGaps.push('Shelters don\'t provide weather protection');
              recommendations.push('Upgrade shelter materials for weather protection');
            }
            if (shelter.areOvercrowded) {
              gapFields.push('Overcrowding');
              recommendations.push('Increase shelter capacity or add additional shelters');
            }
          }
          break;

        case RapidAssessmentType.SECURITY:
          const security = assessment.securityAssessment;
          if (security) {
            if (!security.hasProtectionReportingMechanism) {
              gapFields.push('Protection Reporting');
              criticalGaps.push('No protection reporting mechanism');
              recommendations.push('Establish protection reporting system');
            }
            if (!security.vulnerableGroupsHaveAccess) {
              gapFields.push('Vulnerable Group Access');
              criticalGaps.push('Vulnerable groups lack access to services');
              recommendations.push('Ensure access for vulnerable groups to all services');
            }
            if (security.gbvCasesReported) {
              gapFields.push('GBV Cases');
              criticalGaps.push('GBV cases reported');
              recommendations.push('Implement GBV prevention and response programs');
            }
          }
          break;

        case RapidAssessmentType.FOOD:
          const food = assessment.foodAssessment;
          if (food) {
            if (food.availableFoodDurationDays < 3) {
              gapFields.push('Food Supply');
              if (food.availableFoodDurationDays < 1) {
                criticalGaps.push('No food supply available');
              }
              recommendations.push(`Provide food for ${food.additionalFoodRequiredPersons} persons`);
            }
          }
          break;

        case RapidAssessmentType.POPULATION:
          const population = assessment.populationAssessment;
          if (population) {
            if (population.numberLivesLost > 0) {
              gapFields.push('Lives Lost');
              criticalGaps.push('Lives lost in disaster');
              recommendations.push('Provide mortality management and family support');
            }
            if (population.numberInjured > 0) {
              gapFields.push('Injuries');
              recommendations.push('Provide medical care for injured persons');
            }
          }
          break;
      }

      return {
        assessmentType: assessment.rapidAssessmentType,
        hasGaps: gapFields.length > 0,
        gapFields,
        criticalGaps,
        recommendations
      };
    } catch (error) {
      console.error('Error performing gap analysis:', error);
      return null;
    }
  }

  /**
   * Helper method to get the type-specific model key
   */
  private getTypeKey(assessmentType: RapidAssessmentType): string | null {
    const typeMap: Record<RapidAssessmentType, string> = {
      [RapidAssessmentType.HEALTH]: 'healthAssessment',
      [RapidAssessmentType.POPULATION]: 'populationAssessment',
      [RapidAssessmentType.FOOD]: 'foodAssessment',
      [RapidAssessmentType.WASH]: 'washAssessment',
      [RapidAssessmentType.SHELTER]: 'shelterAssessment',
      [RapidAssessmentType.SECURITY]: 'securityAssessment'
    };
    
    return typeMap[assessmentType] || null;
  }

  /**
   * Convert array fields to JSON strings for database storage
   */
  private processArraysToJson(data: any): any {
    const processed = { ...data };
    
    const arrayFields = [
      'commonHealthIssues',
      'foodSource',
      'waterSource',
      'shelterTypes',
      'requiredShelterType'
    ];

    arrayFields.forEach(field => {
      if (processed[field] && Array.isArray(processed[field])) {
        processed[field] = JSON.stringify(processed[field]);
      }
    });

    return processed;
  }

  /**
   * Convert JSON string fields back to arrays
   */
  private processJsonToArrays(assessment: any): any {
    const processed = { ...assessment };
    
    const jsonFields = [
      'commonHealthIssues',
      'additionalHealthDetails',
      'additionalPopulationDetails',
      'foodSource',
      'additionalFoodDetails',
      'waterSource',
      'additionalWashDetails',
      'shelterTypes',
      'requiredShelterType',
      'additionalShelterDetails',
      'additionalSecurityDetails'
    ];

    jsonFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        try {
          processed[field] = JSON.parse(processed[field]);
        } catch {
          // If parsing fails, keep as string or set appropriate default
          if (field.includes('Details')) {
            processed[field] = {};
          } else {
            processed[field] = [];
          }
        }
      }
    });

    return processed;
  }
}

export const rapidAssessmentService = new RapidAssessmentService();