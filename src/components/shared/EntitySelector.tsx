'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MapPin, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { entityAssignmentService, Entity } from '@/lib/services/entity-assignment.service'
import { useAuthStore } from '@/stores/auth.store'

interface EntitySelectorProps {
  value?: string
  onValueChange: (entityId: string) => void
  disabled?: boolean
  showAssignmentInfo?: boolean
  className?: string
}

interface EntityWithAssignment extends Entity {
  assignedUsersCount?: number
  canCreateAssessment?: boolean
}

export function EntitySelector({ 
  value, 
  onValueChange, 
  disabled = false,
  showAssignmentInfo = true,
  className 
}: EntitySelectorProps) {
  const [entities, setEntities] = useState<EntityWithAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<EntityWithAssignment | null>(null)
  
  const { user } = useAuthStore()

  const loadEntities = async () => {
    if (!user) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get entities available for assessment by this user
      const availableEntities = await entityAssignmentService.getAvailableEntitiesForAssessment(user.id)
      
      // Enhance with assignment information
      const entitiesWithInfo: EntityWithAssignment[] = await Promise.all(
        availableEntities.map(async (entity) => {
          try {
            const assignedUsers = await entityAssignmentService.getEntityAssignedUsers(entity.id)
            const canCreate = await entityAssignmentService.canCreateAssessment(user.id, entity.id)
            
            return {
              ...entity,
              assignedUsersCount: assignedUsers.length,
              canCreateAssessment: canCreate
            }
          } catch (err) {
            console.error(`Error loading assignment info for entity ${entity.id}:`, err)
            return {
              ...entity,
              assignedUsersCount: 0,
              canCreateAssessment: false
            }
          }
        })
      )

      setEntities(entitiesWithInfo)

      // Set selected entity if value is provided
      if (value) {
        const selected = entitiesWithInfo.find(e => e.id === value)
        setSelectedEntity(selected || null)
      }
    } catch (err) {
      console.error('Error loading entities:', err)
      setError('Failed to load available entities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntities()
  }, [user])

  useEffect(() => {
    if (value) {
      const selected = entities.find(e => e.id === value)
      setSelectedEntity(selected || null)
    } else {
      setSelectedEntity(null)
    }
  }, [value, entities])

  const handleEntityChange = (entityId: string) => {
    const selected = entities.find(e => e.id === entityId)
    setSelectedEntity(selected || null)
    onValueChange(entityId)
  }

  const getEntityTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      'COMMUNITY': 'default',
      'WARD': 'secondary',
      'LGA': 'outline',
      'STATE': 'destructive',
      'FACILITY': 'default',
      'CAMP': 'secondary'
    }
    return typeColors[type] || 'outline'
  }

  const getAssignmentStatus = (entity: EntityWithAssignment) => {
    if (!entity.canCreateAssessment) {
      return { status: 'unauthorized', color: 'destructive', text: 'Not Authorized' }
    }
    
    if (entity.assignedUsersCount === 0) {
      return { status: 'unassigned', color: 'secondary', text: 'No Assignees' }
    }
    
    if (entity.assignedUsersCount === 1) {
      return { status: 'assigned', color: 'default', text: 'Assigned' }
    }
    
    return { status: 'shared', color: 'default', text: 'Shared Assignment' }
  }

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please log in to select an entity for assessment.
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading available entities...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" onClick={loadEntities} className="ml-2">
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </Alert>
    )
  }

  if (entities.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No entities are currently assigned to you for assessment. 
          Please contact your coordinator to get entity assignments.
        </AlertDescription>
        <Button variant="outline" size="sm" onClick={loadEntities} className="ml-2">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={handleEntityChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Select an entity to assess">
            {selectedEntity ? (
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{selectedEntity.name}</span>
                <Badge variant={getEntityTypeColor(selectedEntity.type)} className="ml-2">
                  {selectedEntity.type}
                </Badge>
              </div>
            ) : (
              'Select an entity to assess'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {entities.map((entity) => {
            const assignmentStatus = getAssignmentStatus(entity)
            return (
              <SelectItem 
                key={entity.id} 
                value={entity.id}
                disabled={!entity.canCreateAssessment}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="truncate max-w-[200px]">{entity.name}</span>
                    <Badge variant={getEntityTypeColor(entity.type)}>
                      {entity.type}
                    </Badge>
                  </div>
                  {showAssignmentInfo && (
                    <div className="flex items-center space-x-1">
                      {entity.assignedUsersCount > 0 && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="h-3 w-3 mr-1" />
                          {entity.assignedUsersCount}
                        </div>
                      )}
                      <Badge variant={assignmentStatus.color as any} className="text-xs">
                        {assignmentStatus.text}
                      </Badge>
                    </div>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {selectedEntity && showAssignmentInfo && (
        <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedEntity.location && (
                <div className="flex items-center text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {selectedEntity.location}
                </div>
              )}
              <Badge variant={getAssignmentStatus(selectedEntity).color as any} className="text-xs">
                {getAssignmentStatus(selectedEntity).text}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Users className="h-3 w-3 mr-1" />
              {selectedEntity.assignedUsersCount} assignee(s)
            </div>
          </div>
        </div>
      )}

      {selectedEntity && !selectedEntity.canCreateAssessment && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to create assessments for this entity. 
            Please contact your coordinator for proper assignment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}