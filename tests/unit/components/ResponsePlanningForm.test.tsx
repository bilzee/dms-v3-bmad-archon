import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'
import { ResponsePlanningForm } from '@/components/forms/response/ResponsePlanningForm'
import { CreatePlannedResponseInput } from '@/lib/validation/response'
import { useAuthStore } from '@/stores/auth.store'
import { useOffline } from '@/hooks/useOffline'

// Mock dependencies
jest.mock('@/stores/auth.store')
jest.mock('@/hooks/useOffline')
jest.mock('@/hooks/useCollaboration')
jest.mock('@/lib/services/entity-assignment.service')
jest.mock('@/lib/services/response-offline.service')

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockUseOffline = useOffline as jest.MockedFunction<typeof useOffline>
const mockUseCollaboration = jest.requireMock('@/hooks/useCollaboration')

// Test wrapper component
function createTestWrapper({ children }: { children: React.ReactNode }) {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('ResponsePlanningForm Component', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'RESPONDER'
  }

  const mockEntities = [
    {
      id: 'entity-1',
      name: 'Test Location',
      type: 'COMMUNITY'
    }
  ]

  const mockAssessments = [
    {
      id: 'assessment-1',
      rapidAssessmentType: 'HEALTH',
      rapidAssessmentDate: '2024-01-01',
      status: 'VERIFIED',
      affectedEntity: {
        id: 'entity-1',
        name: 'Test Location',
        type: 'COMMUNITY'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default auth mock
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      // ... other store properties
    } as any)

    // Setup default offline mock
    mockUseOffline.mockReturnValue({
      isOnline: true,
      isSyncing: false,
      syncProgress: 0,
      isWorkingOffline: jest.fn(() => false),
      queueOperation: jest.fn(),
      getOfflineResponse: jest.fn()
    })

    // Setup default collaboration mock
    mockUseCollaboration.useCollaboration = jest.fn().mockReturnValue({
      isActive: false,
      isCurrentUserCollaborating: false,
      canEdit: true,
      collaborators: [],
      actions: {
        joinCollaboration: jest.fn(),
        leaveCollaboration: jest.fn(),
        startEditing: jest.fn(),
        stopEditing: jest.fn()
      }
    })

    // Mock entity assignment service
    jest.doMock('@/lib/services/entity-assignment.service', () => ({
      entityAssignmentService: {
        getAssignedEntities: jest.fn().mockResolvedValue(mockEntities),
        getVerifiedAssessments: jest.fn().mockResolvedValue(mockAssessments)
      }
    }))

    // Mock response service
    jest.doMock('@/lib/services/response-offline.service', () => ({
      responseOfflineService: {
        createPlannedResponse: jest.fn().mockResolvedValue({
          id: 'response-123',
          ...mockResponseData
        })
      }
    }))
  })

  const mockResponseData: CreatePlannedResponseInput = {
    assessmentId: 'assessment-1',
    entityId: 'entity-1',
    type: 'HEALTH',
    priority: 'HIGH',
    description: 'Test response plan',
    items: [
      {
        name: 'Medical Supplies',
        unit: 'kits',
        quantity: 10
      }
    ]
  }

  describe('Form Rendering', () => {
    it('should render all form fields in create mode', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Check main form elements
      expect(screen.getByText('Create Response Plan')).toBeInTheDocument()
      expect(screen.getByLabelText(/Entity/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Response Type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument()
      expect(screen.getByText(/Response Items/i)).toBeInTheDocument()
      
      // Check buttons
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Plan/i })).toBeInTheDocument()
    })

    it('should render in edit mode with correct title', () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm 
            mode="edit" 
            initialData={mockResponseData}
          />
        </createTestWrapper>
      )

      expect(screen.getByText('Edit Response Plan')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Update Plan/i })).toBeInTheDocument()
    })

    it('should show online status indicators', () => {
      mockUseOffline.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        syncProgress: 0,
        isWorkingOffline: jest.fn(() => false),
        queueOperation: jest.fn(),
        getOfflineResponse: jest.fn()
      })

      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      expect(screen.getByText(/Online/i)).toBeInTheDocument()
    })

    it('should show offline status indicators', () => {
      mockUseOffline.mockReturnValue({
        isOnline: false,
        isSyncing: false,
        syncProgress: 0,
        isWorkingOffline: jest.fn(() => true),
        queueOperation: jest.fn(),
        getOfflineResponse: jest.fn()
      })

      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      expect(screen.getByText(/Offline/i)).toBeInTheDocument()
      expect(screen.getByText(/Will Sync Later/i)).toBeInTheDocument()
      expect(screen.getByText(/You are currently offline/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save Locally/i })).toBeInTheDocument()
    })

    it('should show sync progress when syncing', () => {
      mockUseOffline.mockReturnValue({
        isOnline: true,
        isSyncing: true,
        syncProgress: 50,
        isWorkingOffline: jest.fn(() => false),
        queueOperation: jest.fn(),
        getOfflineResponse: jest.fn()
      })

      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      expect(screen.getByText(/Syncing your response plan/)).toBeInTheDocument()
      expect(screen.getByText(/50%/)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /Create Plan/i })
      fireEvent.click(submitButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/Entity is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Assessment is required/i)).toBeInTheDocument()
      })
    })

    it('should validate item fields', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Fill entity and assessment
      fireEvent.change(screen.getByLabelText(/Entity/i), {
        target: { value: 'entity-1' }
      })

      // Try to add empty item
      const addItemButton = screen.getByRole('button', { name: /Add Item/i })
      fireEvent.click(addItemButton)

      await waitFor(() => {
        expect(screen.getByText(/Item name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/Unit is required/i)).toBeInTheDocument()
      })
    })

    it('should validate positive quantities', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Set entity and assessment to enable form
      fireEvent.change(screen.getByLabelText(/Entity/i), {
        target: { value: 'entity-1' }
      })

      // Try to set negative quantity
      const quantityInput = screen.getByLabelText(/Quantity/i)
      fireEvent.change(quantityInput, { target: { value: '-1' } })

      await waitFor(() => {
        expect(screen.getByText(/Quantity must be positive/i)).toBeInTheDocument()
      })
    })
  })

  describe('Item Management', () => {
    it('should add new items dynamically', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      const addItemButton = screen.getByRole('button', { name: /Add Item/i })
      
      // Initially should have one item
      expect(screen.getAllByText(/Item 1/i)).toHaveLength(1)

      // Add another item
      fireEvent.click(addItemButton)

      await waitFor(() => {
        expect(screen.getByText(/Item 2/i)).toBeInTheDocument()
      })
    })

    it('should remove items when there are multiple', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Add second item
      const addItemButton = screen.getByRole('button', { name: /Add Item/i })
      fireEvent.click(addItemButton)

      await waitFor(() => {
        expect(screen.getByText(/Item 2/i)).toBeInTheDocument()
      })

      // Remove first item
      const removeButtons = screen.getAllByRole('button', { name: /Remove item/i })
      fireEvent.click(removeButtons[0])

      await waitFor(() => {
        expect(screen.queryByText(/Item 1/i)).not.toBeInTheDocument()
        expect(screen.getByText(/Item 1/i)).toBeInTheDocument() // Item 2 becomes Item 1
      })
    })

    it('should not allow removing the last item', async () => {
      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Try to find remove button for single item
      const removeButton = screen.queryByRole('button', { name: /Remove item/i })
      expect(removeButton).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should submit valid form successfully', async () => {
      const mockOnSuccess = jest.fn()

      render(
        <createTestWrapper>
          <ResponsePlanningForm 
            mode="create" 
            onSuccess={mockOnSuccess}
          />
        </createTestWrapper>
      )

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Entity/i), {
        target: { value: 'entity-1' }
      })

      // Fill item details
      fireEvent.change(screen.getByLabelText(/Item Name/i), {
        target: { value: 'Test Item' }
      })
      fireEvent.change(screen.getByLabelText(/Unit/i), {
        target: { value: 'kits' }
      })
      fireEvent.change(screen.getByLabelText(/Quantity/i), {
        target: { value: '10' }
      })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Create Plan/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'HEALTH',
            items: expect.arrayContaining([
              expect.objectContaining({
                name: 'Test Item',
                unit: 'kits',
                quantity: 10
              })
            ])
          })
        )
      })
    })

    it('should handle offline submission', async () => {
      mockUseOffline.mockReturnValue({
        isOnline: false,
        isSyncing: false,
        syncProgress: 0,
        isWorkingOffline: jest.fn(() => true),
        queueOperation: jest.fn(),
        getOfflineResponse: jest.fn()
      })

      const mockOnSuccess = jest.fn()

      render(
        <createTestWrapper>
          <ResponsePlanningForm 
            mode="create" 
            onSuccess={mockOnSuccess}
          />
        </createTestWrapper>
      )

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Entity/i), {
        target: { value: 'entity-1' }
      })

      fireEvent.change(screen.getByLabelText(/Item Name/i), {
        target: { value: 'Test Item' }
      })
      fireEvent.change(screen.getByLabelText(/Unit/i), {
        target: { value: 'kits' }
      })
      fireEvent.change(screen.getByLabelText(/Quantity/i), {
        target: { value: '10' }
      })

      const submitButton = screen.getByRole('button', { name: /Save Locally/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            syncStatus: 'pending'
          })
        )
      })
    })

    it('should handle submission errors', async () => {
      // Mock service to throw error
      jest.doMock('@/lib/services/response-offline.service', () => ({
        responseOfflineService: {
          createPlannedResponse: jest.fn().mockRejectedValue(new Error('Network error'))
        }
      }))

      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="create" />
        </createTestWrapper>
      )

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Entity/i), {
        target: { value: 'entity-1' }
      })

      fireEvent.change(screen.getByLabelText(/Item Name/i), {
        target: { value: 'Test Item' }
      })
      fireEvent.change(screen.getByLabelText(/Unit/i), {
        target: { value: 'kits' }
      })
      fireEvent.change(screen.getByLabelText(/Quantity/i), {
        target: { value: '10' }
      })

      const submitButton = screen.getByRole('button', { name: /Create Plan/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Collaboration Features', () => {
    it('should show collaboration status in edit mode', () => {
      mockUseCollaboration.useCollaboration = jest.fn().mockReturnValue({
        isActive: true,
        isCurrentUserCollaborating: true,
        canEdit: true,
        collaborators: [
          {
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: false
          }
        ],
        actions: {
          joinCollaboration: jest.fn(),
          leaveCollaboration: jest.fn(),
          startEditing: jest.fn(),
          stopEditing: jest.fn()
        }
      })

      render(
        <createTestWrapper>
          <ResponsePlanningForm mode="edit" />
        </createTestWrapper>
      )

      expect(screen.getByText(/Collaborators/i)).toBeInTheDocument()
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    })
  })

  describe('Cancel Behavior', () => {
    it('should call onCancel when cancel button is clicked', () => {
      const mockOnCancel = jest.fn()

      render(
        <createTestWrapper>
          <ResponsePlanningForm 
            mode="create" 
            onCancel={mockOnCancel}
          />
        </createTestWrapper>
      )

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should show confirmation dialog when form is dirty', async () => {
      // Mock window.confirm
      const mockConfirm = jest.fn(() => true)
      Object.defineProperty(window, 'confirm', {
        value: mockConfirm,
        writable: true
      })

      const mockOnCancel = jest.fn()

      render(
        <createTestWrapper>
          <ResponsePlanningForm 
            mode="create" 
            onCancel={mockOnCancel}
          />
        </createTestWrapper>
      )

      // Make form dirty by typing in a field
      fireEvent.change(screen.getByLabelText(/Item Name/i), {
        target: { value: 'Test Item' }
      })

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledWith(
          'Are you sure you want to cancel? All unsaved changes will be lost.'
        )
        expect(mockOnCancel).toHaveBeenCalled()
      })
    })
  })
})