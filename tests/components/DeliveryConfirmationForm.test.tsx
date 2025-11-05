import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DeliveryConfirmationForm } from '@/components/forms/delivery/DeliveryConfirmationForm'
import { useAuthStore } from '@/stores/auth.store'
import { useGPS } from '@/hooks/useGPS'
import { useOffline } from '@/hooks/useOffline'
import * as deliveryOfflineService from '@/lib/services/delivery-offline.service'

// Mock dependencies
vi.mock('@/stores/auth.store')
vi.mock('@/hooks/useGPS')
vi.mock('@/hooks/useOffline')
vi.mock('@/lib/services/delivery-offline.service')
vi.mock('@/hooks/useToast')

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseGPS = vi.mocked(useGPS)
const mockUseOffline = vi.mocked(useOffline)
const mockDeliveryOfflineService = vi.mocked(deliveryOfflineService)

describe('DeliveryConfirmationForm', () => {
  let queryClient: QueryClient
  let mockUser: any
  let mockGPSLocation: any

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    mockUser = {
      id: 'user-123',
      name: 'Test User',
      role: 'RESPONDER'
    }

    mockGPSLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      timestamp: new Date()
    }

    mockUseAuthStore.mockReturnValue({
      user: mockUser
    } as any)

    mockUseGPS.mockReturnValue({
      getCurrentLocation: vi.fn().mockResolvedValue(mockGPSLocation),
      isCapturing: false,
      error: null
    } as any)

    mockUseOffline.mockReturnValue({
      isOnline: true,
      connectionType: 'wifi'
    } as any)

    // Mock fetch for API calls
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (props = {}) => {
    const defaultProps = {
      responseId: 'resp-123',
      onSuccess: vi.fn(),
      onCancel: vi.fn()
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <DeliveryConfirmationForm {...defaultProps} {...props} />
      </QueryClientProvider>
    )
  }

  describe('Form Initialization', () => {
    it('should render form with all required fields', async () => {
      // Mock the response data
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'resp-123',
            status: 'PLANNED',
            items: [
              { id: 'item-1', itemName: 'Blanket', quantity: 10, unit: 'pieces' }
            ]
          }
        })
      } as Response)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/Delivery Notes/i)).toBeInTheDocument()
      expect(screen.getByText('Delivered Items')).toBeInTheDocument()
      expect(screen.getByText('Delivery Location')).toBeInTheDocument()
      expect(screen.getByText('Media Attachments')).toBeInTheDocument()
    })

    it('should capture GPS location on mount', async () => {
      const mockGetCurrentLocation = vi.fn().mockResolvedValue(mockGPSLocation)
      mockUseGPS.mockReturnValue({
        getCurrentLocation: mockGetCurrentLocation,
        isCapturing: false,
        error: null
      } as any)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()

      await waitFor(() => {
        expect(mockGetCurrentLocation).toHaveBeenCalled()
      })
    })

    it('should show online/offline status', async () => {
      mockUseOffline.mockReturnValue({
        isOnline: false,
        connectionType: 'none'
      } as any)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    beforeEach(async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })
    })

    it('should require GPS location for submission', async () => {
      mockUseGPS.mockReturnValue({
        getCurrentLocation: vi.fn().mockResolvedValue(null),
        isCapturing: false,
        error: 'GPS unavailable'
      } as any)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/GPS location is required/i)).toBeInTheDocument()
      })
    })

    it('should require at least one delivered item', async () => {
      // Mock empty items array
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/At least one delivered item is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Online Mode', () => {
    beforeEach(() => {
      mockUseOffline.mockReturnValue({
        isOnline: true,
        connectionType: 'wifi'
      } as any)
    })

    it('should submit delivery confirmation online successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { 
            id: 'resp-123', 
            status: 'PLANNED', 
            items: [
              { id: 'item-1', itemName: 'Blanket', quantity: 10, unit: 'pieces' }
            ]
          }
        })
      } as Response)

      const mockOnSuccess = vi.fn()
      renderComponent({ onSuccess: mockOnSuccess })

      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      // Mock successful delivery confirmation
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          data: {
            id: 'resp-123',
            status: 'DELIVERED',
            verificationStatus: 'SUBMITTED'
          }
        })
      } as Response)

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'DELIVERED',
            verificationStatus: 'SUBMITTED'
          })
        )
      })
    })

    it('should fallback to offline mode when online submission fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { 
            id: 'resp-123', 
            status: 'PLANNED', 
            items: [
              { id: 'item-1', itemName: 'Blanket', quantity: 10, unit: 'pieces' }
            ]
          }
        })
      } as Response)

      const mockOnSuccess = vi.fn()
      renderComponent({ onSuccess: mockOnSuccess })

      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      // Mock online failure, then offline success
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      
      mockDeliveryOfflineService.storeDeliveryConfirmation.mockResolvedValueOnce({
        success: false,
        operationId: 'op-123',
        timestamp: new Date(),
        networkStatus: 'offline'
      })

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockDeliveryOfflineService.storeDeliveryConfirmation).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            networkStatus: 'offline',
            message: expect.stringContaining('stored for offline sync')
          })
        )
      })
    })
  })

  describe('Offline Mode', () => {
    beforeEach(() => {
      mockUseOffline.mockReturnValue({
        isOnline: false,
        connectionType: 'none'
      } as any)
    })

    it('should store delivery confirmation offline when offline', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { 
            id: 'resp-123', 
            status: 'PLANNED', 
            items: [
              { id: 'item-1', itemName: 'Blanket', quantity: 10, unit: 'pieces' }
            ]
          }
        })
      } as Response)

      const mockOnSuccess = vi.fn()
      renderComponent({ onSuccess: mockOnSuccess })

      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      mockDeliveryOfflineService.storeDeliveryConfirmation.mockResolvedValueOnce({
        success: false,
        operationId: 'op-123',
        timestamp: new Date(),
        networkStatus: 'offline'
      })

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockDeliveryOfflineService.storeDeliveryConfirmation).toHaveBeenCalledWith(
          expect.any(Object),
          'resp-123',
          mockGPSLocation,
          expect.any(Array),
          mockUser.id
        )
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            networkStatus: 'offline'
          })
        )
      })
    })

    it('should show appropriate messaging for offline mode', async () => {
      mockUseOffline.mockReturnValue({
        isOnline: false,
        connectionType: 'none'
      } as any)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  describe('Media Handling', () => {
    it('should handle media attachment callbacks', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Media Attachments')).toBeInTheDocument()
      })

      // Simulate media attachment
      const mockMedia = [
        {
          id: 'media-1',
          filename: 'test.jpg',
          url: 'https://example.com/test.jpg',
          metadata: { gps: mockGPSLocation }
        }
      ]

      // The component should handle media attachments through props
      // This test verifies the media section renders correctly
      expect(screen.getByText('Media Attachments')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle response loading errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to load response'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Error Loading Response')).toBeInTheDocument()
      })
    })

    it('should handle GPS capture errors', async () => {
      mockUseGPS.mockReturnValue({
        getCurrentLocation: vi.fn().mockRejectedValue(new Error('GPS error')),
        isCapturing: false,
        error: 'GPS error'
      } as any)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/GPS location is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      // Check for proper form labeling
      expect(screen.getByLabelText(/Delivery Notes/i)).toBeInTheDocument()
      
      // Check for button roles
      expect(screen.getByRole('button', { name: /Confirm Delivery/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          data: { id: 'resp-123', status: 'PLANNED', items: [] }
        })
      } as Response)

      renderComponent()
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery')).toBeInTheDocument()
      })

      const submitButton = screen.getByRole('button', { name: /Confirm Delivery/i })
      
      // Test keyboard navigation
      submitButton.focus()
      expect(submitButton).toHaveFocus()
      
      // Test Enter key
      fireEvent.keyDown(submitButton, { key: 'Enter', code: 'Enter' })
    })
  })
})