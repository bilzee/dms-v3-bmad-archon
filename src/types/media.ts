import { MediaAttachment as PrismaMediaAttachment, SyncStatus } from '@prisma/client'

// Re-export SyncStatus for other modules
export { SyncStatus }

// Extended MediaAttachment interface matching the updated Prisma schema
export interface MediaAttachment extends PrismaMediaAttachment {
  // All Prisma fields are included automatically
  // Extended interface for delivery documentation
}

// GPS metadata structure for delivery documentation
export interface GPSMetadata {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  timestamp: Date
  deviceHeading?: number
  speed?: number
}

// Delivery-specific media metadata structure
export interface DeliveryMediaMetadata {
  capturedFor: 'delivery_proof' | 'pre_delivery' | 'post_delivery' | 'assessment'
  deliveryId?: string
  assessmentId?: string
  gps: GPSMetadata
  deliveryTimestamp?: Date
  deliveryNotes?: string
  verificationStatus?: 'pending' | 'verified' | 'rejected'
}

// Media upload progress tracking
export interface MediaUploadProgress {
  id: string
  file: File
  localPath?: string
  uploadProgress: number
  isUploading: boolean
  isCompleted: boolean
  error?: string
  gpsMetadata?: GPSMetadata
  deliveryMetadata?: DeliveryMediaMetadata
}

// Media sync status for offline support
export interface MediaSyncStatus {
  mediaId: string
  localPath: string
  remoteUrl?: string
  syncStatus: SyncStatus
  lastSyncAttempt?: Date
  syncError?: string
  retryCount: number
}

// Props for delivery-specific media field component
export interface DeliveryMediaFieldProps {
  onResponseMediaChange: (media: MediaAttachment[]) => void
  initialMedia?: MediaAttachment[]
  deliveryId?: string
  assessmentId?: string
  maxPhotos?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
  requireGPS?: boolean
  offlineEnabled?: boolean
  showLocationPreview?: boolean
}

// Media service interface for delivery documentation
export interface MediaService {
  // Upload with GPS metadata
  uploadDeliveryMedia: (
    file: File,
    metadata: DeliveryMediaMetadata,
    responseId?: string,
    assessmentId?: string
  ) => Promise<MediaAttachment>
  
  // GPS capture
  captureGPSLocation: () => Promise<GPSMetadata>
  
  // Offline support
  storeMediaOffline: (
    file: File,
    metadata: DeliveryMediaMetadata
  ) => Promise<MediaUploadProgress>
  
  syncPendingMedia: () => Promise<MediaAttachment[]>
  
  // Media management
  getMediaByResponse: (responseId: string) => Promise<MediaAttachment[]>
  getMediaByAssessment: (assessmentId: string) => Promise<MediaAttachment[]>
  deleteMedia: (mediaId: string) => Promise<void>
  
  // Verification support
  markMediaForVerification: (mediaId: string) => Promise<void>
  updateMediaVerificationStatus: (
    mediaId: string, 
    status: 'verified' | 'rejected',
    feedback?: string
  ) => Promise<void>
}

// Media validation rules
export interface MediaValidationRules {
  maxSizeBytes: number
  allowedTypes: string[]
  maxPhotos: number
  requireGPS: boolean
  minGPSAccuracy?: number // in meters
  maxPhotoAgeMinutes?: number // for delivery photos
}

// Default validation rules for delivery documentation
export const DEFAULT_DELIVERY_MEDIA_RULES: MediaValidationRules = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxPhotos: 5,
  requireGPS: true,
  minGPSAccuracy: 100, // 100 meters accuracy required
  maxPhotoAgeMinutes: 60 // Photos must be taken within 1 hour of delivery
}