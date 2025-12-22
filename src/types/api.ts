/**
 * Common API response types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: string[];
  timestamp?: string;
  requestId?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
  pages?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationParams;
}

export interface ApiError {
  success: false;
  data: null;
  message: string;
  errors?: string[];
  statusCode?: number;
  timestamp?: string;
  requestId?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith';
  value: any;
}

export interface SearchParams {
  query?: string;
  filters?: FilterParams[];
  sort?: SortParams[];
  pagination?: PaginationParams;
}

// Utility function to create standardized API responses
export function createApiResponse<T>(
  success: boolean,
  data: T | null,
  message: string,
  errors?: string[]
): ApiResponse<T> {
  return {
    success,
    data,
    message,
    errors,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID()
  };
}

// API Error constructor
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}