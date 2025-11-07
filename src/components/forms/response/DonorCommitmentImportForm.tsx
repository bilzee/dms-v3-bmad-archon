'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Icons
import { Package, AlertTriangle, Search, Filter, Users, MapPin, Calendar, CheckCircle, AlertCircle, Plus, Minus, Eye, EyeOff } from 'lucide-react'

// Services and types
import { useAuthStore } from '@/stores/auth.store'
import { CommitmentService, type CommitmentItem } from '@/lib/services/commitment.service'

// Validation schema
const CommitmentImportSchema = z.object({
  commitmentId: z.string().min(1, 'Please select a commitment'),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().positive(),
    unit: z.string()
  })).min(1, 'At least one item must be selected'),
  notes: z.string().optional()
})

type FormData = z.infer<typeof CommitmentImportSchema>

interface DonorCommitmentImportFormProps {
  onSuccess?: (response: any) => void
  onCancel?: () => void
  entityId?: string
  incidentId?: string
}

export function DonorCommitmentImportForm({ 
  onSuccess,
  onCancel,
  entityId: preselectedEntityId,
  incidentId: preselectedIncidentId
}: DonorCommitmentImportFormProps) {
  const { user, token } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedCommitment, setSelectedCommitment] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<CommitmentItem[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [filters, setFilters] = useState({
    entityId: preselectedEntityId || 'all',
    incidentId: preselectedIncidentId || 'all',
    status: 'PLANNED'
  })

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(CommitmentImportSchema),
    defaultValues: {
      commitmentId: '',
      items: [],
      notes: ''
    }
  })

  // Query available commitments
  const { data: commitmentsData, isLoading, error } = useQuery({
    queryKey: ['available-commitments', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.entityId && filters.entityId !== 'all') params.append('entityId', filters.entityId)
      if (filters.incidentId && filters.incidentId !== 'all') params.append('incidentId', filters.incidentId)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/v1/commitments/available?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch commitments')
      }

      return response.json()
    },
    enabled: !!token
  })

  // Query assigned entities for filtering
  const { data: entitiesData } = useQuery({
    queryKey: ['assigned-entities', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID not available')
      }

      const params = new URLSearchParams()
      params.append('userId', user.id)

      const response = await fetch(`/api/v1/entities/assigned?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch entities')
      }

      return response.json()
    },
    enabled: !!token && !!user?.id
  })

  // Import commitment mutation
  const importMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/v1/responses/from-commitment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import commitment')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['available-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['planned-responses'] })
      onSuccess?.(data.data)
    }
  })

  // Handle commitment selection
  const handleCommitmentSelect = (commitment: any) => {
    setSelectedCommitment(commitment)
    setSelectedItems(commitment.items || [])
    form.setValue('commitmentId', commitment.id)
    form.setValue('items', commitment.items || [])
  }

  // Handle item quantity change
  const handleItemQuantityChange = (itemIndex: number, newQuantity: number) => {
    const maxAvailable = selectedCommitment?.availableQuantity || 0
    const totalSelected = selectedItems.reduce((sum, item, index) => 
      index === itemIndex ? sum + newQuantity : sum + item.quantity, 0
    )

    if (totalSelected > maxAvailable) {
      form.setError('items', { 
        message: `Total quantity (${totalSelected}) exceeds available (${maxAvailable})` 
      })
      return
    }

    const updatedItems = [...selectedItems]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: newQuantity
    }
    setSelectedItems(updatedItems)
    form.setValue('items', updatedItems)
    form.clearErrors('items')
  }

  // Handle form submission
  const onSubmit = (data: FormData) => {
    if (selectedItems.length === 0) {
      form.setError('items', { message: 'Please select at least one item' })
      return
    }

    // Open preview dialog before submission
    setIsPreviewOpen(true)
  }

  // Confirm import after preview
  const handleConfirmImport = () => {
    const data = form.getValues()
    data.items = selectedItems.filter(item => item.quantity > 0)
    
    importMutation.mutate(data)
    setIsPreviewOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 animate-pulse text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Loading available commitments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load commitments. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  const commitments = commitmentsData?.data || []
  const entities = entitiesData?.data || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import from Donor Commitment
          </CardTitle>
          <CardDescription>
            Select a donor commitment to auto-populate response details with available items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Entity</label>
              <Select value={filters.entityId} onValueChange={(value) => setFilters(prev => ({ ...prev, entityId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entities.filter((entity: any) => entity.id && entity.id !== '').map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name} ({entity.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search commitments..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Available Commitments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Available Commitments</h3>
              <Badge variant="secondary">
                {commitments.length} commitments
              </Badge>
            </div>

            {commitments.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No available commitments found for the selected filters.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {commitments.map((commitment: any) => (
                  <Card 
                    key={commitment.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCommitment?.id === commitment.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleCommitmentSelect(commitment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{commitment.donor.name}</span>
                            <Badge variant={commitment.donor.type === 'ORGANIZATION' ? 'default' : 'secondary'}>
                              {commitment.donor.type}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {commitment.entity.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(commitment.commitmentDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {commitment.availableQuantity} units available
                            </div>
                          </div>

                          {commitment.isPartiallyDelivered && (
                            <Badge variant="secondary" className="mb-2">
                              Partially Delivered ({commitment.utilizationRate.toFixed(1)}% used)
                            </Badge>
                          )}

                          <div className="text-sm text-gray-700">
                            {commitment.items?.slice(0, 3).map((item: any, index: number) => (
                              <span key={index} className="inline-block mr-2">
                                {item.name} ({item.quantity} {item.unit})
                              </span>
                            ))}
                            {commitment.items?.length > 3 && (
                              <span className="text-gray-500">
                                +{commitment.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {selectedCommitment?.id === commitment.id ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items Section */}
          {selectedCommitment && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-4">Select Items to Import</h3>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="items"
                      render={() => (
                        <FormItem>
                          <FormLabel>Items</FormLabel>
                          <FormDescription>
                            Adjust quantities as needed. Total: {selectedItems.reduce((sum, item) => sum + item.quantity, 0)} units
                          </FormDescription>
                          <FormControl>
                            <div className="space-y-3">
                              {selectedItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-gray-500">{item.unit}</div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleItemQuantityChange(index, Math.max(1, item.quantity - 1))}
                                      disabled={item.quantity <= 1}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                                      className="w-20 text-center"
                                      min="1"
                                      max={selectedCommitment?.availableQuantity || 0}
                                    />
                                    
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleItemQuantityChange(index, item.quantity + 1)}
                                      disabled={item.quantity >= (selectedCommitment?.availableQuantity || 0)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any additional notes about this import..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormMessage>{form.formState.errors.items?.message}</FormMessage>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={importMutation.isPending || selectedItems.length === 0}
                        className="flex-1"
                      >
                        {importMutation.isPending ? 'Importing...' : 'Preview Import'}
                      </Button>
                      
                      {onCancel && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onCancel}
                          disabled={importMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Commitment Import
            </DialogTitle>
            <DialogDescription className="text-base">
              Review the details below before importing the commitment.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCommitment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Donor</label>
                  <p className="text-sm">{selectedCommitment.donor.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Entity</label>
                  <p className="text-sm">{selectedCommitment.entity.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Incident</label>
                  <p className="text-sm">{selectedCommitment.incident.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Total Quantity</label>
                  <p className="text-sm">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Items to Import</label>
                <div className="mt-2 space-y-2">
                  {selectedItems.filter(item => item.quantity > 0).map((item, index) => (
                    <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>{item.name}</span>
                      <span>{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {form.watch('notes') && (
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-sm">{form.watch('notes')}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="bg-gray-50 dark:bg-gray-800 -mx-6 -mb-6 px-6 py-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              disabled={importMutation.isPending}
              className="min-w-24"
            >
              Back
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importMutation.isPending}
              className="min-w-32 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {importMutation.isPending ? 'Importing...' : 'Confirm Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}