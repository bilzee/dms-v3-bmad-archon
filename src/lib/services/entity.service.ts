import { PrismaClient } from '@prisma/client';

export interface Entity {
  id: string;
  name: string;
  type: string;
  location?: string;
  coordinates?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityListResponse {
  success: boolean;
  data?: Entity[];
  message?: string;
  errors?: string[];
}

export class EntityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get all active entities
   */
  async getAllEntities(): Promise<EntityListResponse> {
    try {
      const entities = await this.prisma.entity.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return {
        success: true,
        data: entities
      };
    } catch (error) {
      console.error('Error fetching entities:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch entities',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get entities by type
   */
  async getEntitiesByType(type: string): Promise<EntityListResponse> {
    try {
      const entities = await this.prisma.entity.findMany({
        where: {
          type: type.toUpperCase(),
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return {
        success: true,
        data: entities
      };
    } catch (error) {
      console.error('Error fetching entities by type:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch entities',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Search entities by name, type, or location
   */
  async searchEntities(searchTerm: string): Promise<EntityListResponse> {
    try {
      const entities = await this.prisma.entity.findMany({
        where: {
          isActive: true,
          OR: [
            {
              name: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              type: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              location: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          ]
        },
        orderBy: {
          name: 'asc'
        }
      });

      return {
        success: true,
        data: entities
      };
    } catch (error) {
      console.error('Error searching entities:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to search entities',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get entity by ID
   */
  async getEntityById(id: string): Promise<{ success: boolean; data?: Entity; message?: string; errors?: string[] }> {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { id }
      });

      if (!entity) {
        return {
          success: false,
          message: 'Entity not found',
          errors: ['Entity with provided ID does not exist']
        };
      }

      return {
        success: true,
        data: entity
      };
    } catch (error) {
      console.error('Error fetching entity:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch entity',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

export const entityService = new EntityService();