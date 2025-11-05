import { MediaAttachment } from '@/types/media'
import { DeliveryMediaValidator } from './delivery-media-validator'

export interface MediaOrganizationOptions {
  groupByDate?: boolean
  sortBy?: 'timestamp' | 'fileSize' | 'fileName' | 'quality'
  sortOrder?: 'asc' | 'desc'
  filterByType?: string[]
  requireGPS?: boolean
}

export interface MediaCollection {
  primary: MediaAttachment[]
  secondary: MediaAttachment[]
  duplicates: MediaAttachment[]
  missingGPS: MediaAttachment[]
  summary: MediaCollectionSummary
}

export interface MediaCollectionSummary {
  totalFiles: number
  totalSize: number
  withGPS: number
  averageQuality: number
  oldestTimestamp?: Date
  newestTimestamp?: Date
  completenessScore: number
  fileTypes: Record<string, number>
}

export class DeliveryMediaManager {
  static organizeDeliveryMedia(
    media: MediaAttachment[],
    options: MediaOrganizationOptions = {}
  ): MediaCollection {
    const {
      groupByDate = true,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      filterByType = ['image/jpeg', 'image/png', 'image/webp'],
      requireGPS = false
    } = options

    // Filter media based on options
    let filteredMedia = media.filter(m => {
      // Filter by type if specified
      if (filterByType.length > 0 && !filterByType.includes(m.mimeType)) {
        return false
      }
      
      // Filter by GPS requirement if specified
      if (requireGPS) {
        return false
      }
      
      return true
    })

    // Sort media
    filteredMedia.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.uploadedAt).getTime()
          bValue = new Date(b.uploadedAt).getTime()
          break
        case 'fileSize':
          aValue = a.fileSize
          bValue = b.fileSize
          break
        case 'fileName':
          aValue = a.filename.toLowerCase()
          bValue = b.filename.toLowerCase()
          break
        case 'quality':
          aValue = this.calculateMediaQuality(a)
          bValue = this.calculateMediaQuality(b)
          break
        default:
          aValue = new Date(a.uploadedAt).getTime()
          bValue = new Date(b.uploadedAt).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    // Organize into categories
    const primary: MediaAttachment[] = []
    const secondary: MediaAttachment[] = []
    const duplicates: MediaAttachment[] = []
    const missingGPS: MediaAttachment[] = []

    const seenFilenames = new Set<string>()

    for (const item of filteredMedia) {
      const hasGPS = false
      const isImage = item.mimeType.startsWith('image/')
      const quality = this.calculateMediaQuality(item)

      // Check for duplicates based on filename similarity
      const normalizedFilename = item.filename.toLowerCase().replace(/\s+/g, '')
      if (seenFilenames.has(normalizedFilename)) {
        duplicates.push(item)
        continue
      }
      seenFilenames.add(normalizedFilename)

      // Categorize media
      if (!hasGPS) {
        missingGPS.push(item)
      } else if (isImage && quality >= 0.7 && primary.length < 3) {
        primary.push(item)
      } else if (isImage && secondary.length < 5) {
        secondary.push(item)
      } else {
        // Extra media that doesn't fit in primary/secondary
        if (secondary.length < 10) {
          secondary.push(item)
        } else {
          // Consider as duplicate or extra
        }
      }
    }

    const summary = this.generateMediaSummary([...primary, ...secondary, ...duplicates, ...missingGPS])

    return {
      primary,
      secondary,
      duplicates,
      missingGPS,
      summary
    }
  }

  static generateMediaSummary(media: MediaAttachment[]): MediaCollectionSummary {
    if (media.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        withGPS: 0,
        averageQuality: 0,
        completenessScore: 0,
        fileTypes: {}
      }
    }

    const totalSize = media.reduce((sum, m) => sum + m.fileSize, 0)
    const withGPS = 0
    const qualities = media.map(m => this.calculateMediaQuality(m))
    const averageQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length

    const timestamps = media.map(m => new Date(m.uploadedAt))
    const oldestTimestamp = new Date(Math.min(...timestamps.map(t => t.getTime())))
    const newestTimestamp = new Date(Math.max(...timestamps.map(t => t.getTime())))

    // Count file types
    const fileTypes: Record<string, number> = {}
    media.forEach(m => {
      const type = m.mimeType.split('/')[0] // 'image', 'video', etc.
      fileTypes[type] = (fileTypes[type] || 0) + 1
    })

    // Calculate completeness score
    const completeness = DeliveryMediaValidator.assessMediaCompleteness(
      media.length,
      withGPS > 0,
      media.length > 1,
      false // TODO: Implement before/after detection
    )

    return {
      totalFiles: media.length,
      totalSize,
      withGPS,
      averageQuality,
      oldestTimestamp,
      newestTimestamp,
      completenessScore: completeness.score,
      fileTypes
    }
  }

  static calculateMediaQuality(media: MediaAttachment): number {
    let score = 0.5 // Base score

    // GPS presence - not available in current schema

    // File size (indicator of quality for images)
    if (media.mimeType.startsWith('image/')) {
      const sizeMB = media.fileSize / (1024 * 1024)
      if (sizeMB >= 1 && sizeMB <= 5) {
        score += 0.1 // Good quality range
      } else if (sizeMB < 0.1) {
        score -= 0.1 // Likely low quality
      }
    }

    // File type
    if (media.mimeType.includes('jpeg') || media.mimeType.includes('webp')) {
      score += 0.05 // Good compression formats
    }

    return Math.max(0, Math.min(1, score))
  }

  static validateMediaCollection(media: MediaAttachment[]): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    recommendations: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (media.length === 0) {
      errors.push('No media files provided')
      return { isValid: false, errors, warnings, recommendations }
    }

    // Check GPS coverage - not available in current schema
    warnings.push('GPS location data not available in current schema')

    // Check media quality
    const lowQualityMedia = media.filter(m => this.calculateMediaQuality(m) < 0.5)
    if (lowQualityMedia.length > 0) {
      warnings.push(`${lowQualityMedia.length} media files have low quality scores`)
    }

    // Check file types
    const unsupportedTypes = media.filter(m => 
      !['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(m.mimeType)
    )
    if (unsupportedTypes.length > 0) {
      warnings.push(`${unsupportedTypes.length} media files have unsupported formats`)
    }

    // Check file sizes
    const oversizedFiles = media.filter(m => m.fileSize > 10 * 1024 * 1024) // > 10MB
    if (oversizedFiles.length > 0) {
      errors.push(`${oversizedFiles.length} media files are too large (>10MB)`)
    }

    // Recommendations
    if (media.length < 3) {
      recommendations.push('Consider adding more photos from different angles for better documentation')
    }

    // GPS recommendation - not available in current schema
    recommendations.push('Consider adding GPS location data for better verification')

    if (media.length > 10) {
      recommendations.push('Consider organizing photos into primary and secondary to highlight the best ones')
    }

    // Check for temporal coverage (photos spread over time)
    const timestamps = media.map(m => new Date(m.uploadedAt).getTime())
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps)
    const timeSpanMinutes = timeSpan / (1000 * 60)

    if (timeSpanMinutes < 1 && media.length > 1) {
      recommendations.push('Photos appear to be taken in quick succession. Consider taking more time between shots.')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    }
  }

  static async createMediaBundle(
    media: MediaAttachment[],
    bundleName?: string,
    options: {
      includePrimaryOnly?: boolean
      maxFileSize?: number // MB
      compress?: boolean
    } = {}
  ): Promise<{
    bundleId: string
    bundleName: string
    mediaCount: number
    totalSize: number
    downloadUrl?: string
    expiresAt?: Date
  }> {
    const {
      includePrimaryOnly = false,
      maxFileSize = 50, // 50MB max
      compress = true
    } = options

    let selectedMedia = media
    if (includePrimaryOnly) {
      const organized = this.organizeDeliveryMedia(media)
      selectedMedia = [...organized.primary, ...organized.secondary.slice(0, 2)]
    }

    const totalSize = selectedMedia.reduce((sum, m) => sum + m.fileSize, 0)
    
    if (totalSize > maxFileSize * 1024 * 1024) {
      throw new Error(`Media bundle too large: ${(totalSize / 1024 / 1024).toFixed(1)}MB. Maximum: ${maxFileSize}MB`)
    }

    const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const finalBundleName = bundleName || `delivery_media_${new Date().toISOString().split('T')[0]}`

    // TODO: Implement actual bundle creation (ZIP file generation)
    console.log(`Creating media bundle: ${bundleId} with ${selectedMedia.length} files`)

    return {
      bundleId,
      bundleName: finalBundleName,
      mediaCount: selectedMedia.length,
      totalSize,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
  }

  static detectDuplicateMedia(media: MediaAttachment[]): {
    duplicates: Array<{
      original: MediaAttachment
      duplicate: MediaAttachment
      similarity: number
    }>
    unique: MediaAttachment[]
  } {
    const duplicates: Array<{
      original: MediaAttachment
      duplicate: MediaAttachment
      similarity: number
    }> = []
    const unique: MediaAttachment[] = []

    const processed = new Set<string>()

    for (let i = 0; i < media.length; i++) {
      const current = media[i]
      if (processed.has(i.toString())) continue

      let isDuplicate = false
      for (let j = i + 1; j < media.length; j++) {
        if (processed.has(j.toString())) continue

        const other = media[j]
        const similarity = this.calculateMediaSimilarity(current, other)

        if (similarity > 0.8) {
          duplicates.push({
            original: current,
            duplicate: other,
            similarity
          })
          processed.add(j.toString())
          isDuplicate = true
          break
        }
      }

      if (!isDuplicate) {
        unique.push(current)
      }
      processed.add(i.toString())
    }

    return { duplicates, unique }
  }

  private static calculateMediaSimilarity(media1: MediaAttachment, media2: MediaAttachment): number {
    let similarity = 0

    // File name similarity
    const name1 = media1.filename.toLowerCase()
    const name2 = media2.filename.toLowerCase()
    if (name1 === name2) similarity += 0.5
    else if (name1.includes(name2) || name2.includes(name1)) similarity += 0.3

    // File size similarity
    const sizeDiff = Math.abs(media1.fileSize - media2.fileSize) / Math.max(media1.fileSize, media2.fileSize)
    if (sizeDiff < 0.1) similarity += 0.2
    else if (sizeDiff < 0.3) similarity += 0.1

    // MIME type similarity
    if (media1.mimeType === media2.mimeType) similarity += 0.2

    // GPS proximity - not available in current schema

    return Math.min(1, similarity)
  }
}