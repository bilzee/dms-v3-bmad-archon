import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreliminaryAssessmentForm } from '@/components/forms/assessment/PreliminaryAssessmentForm'

// Mock the hooks
const mockCreateAssessment = jest.fn()
const mockCaptureGPS = jest.fn()
const mockSaveDraft = jest.fn()
const mockLoadDraft = jest.fn()

jest.mock('@/hooks/usePreliminaryAssessment', () => ({
  usePreliminaryAssessment: () => ({
    createAssessment: mockCreateAssessment,
    captureGPS: mockCaptureGPS,
    saveDraft: mockSaveDraft,
    loadDraft: mockLoadDraft,
    currentDraft: null,
    isLoading: false,
    error: null,
    gpsLocation: null,
    gpsError: null,
    isCapturingGPS: false,
    clearError: jest.fn(),
  }),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
    },
  }),
}))

// Mock geolocation
const mockGetCurrentPosition = jest.fn()
beforeEach(() => {
  global.navigator = {
    ...global.navigator,
    geolocation: {
      getCurrentPosition: mockGetCurrentPosition,
    } as any,
  }
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('PreliminaryAssessmentForm', () => {
  beforeEach(() => {
    mockCreateAssessment.mockClear()
    mockCaptureGPS.mockClear()
    mockSaveDraft.mockClear()
    mockLoadDraft.mockClear()
  })

  it('should render form fields correctly', () => {
    render(<PreliminaryAssessmentForm />)

    // Check required fields are present
    expect(screen.getByText('Reporting Location')).toBeInTheDocument()
    expect(screen.getByText('GPS Location Capture')).toBeInTheDocument()
    expect(screen.getByLabelText(/local government area/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ward/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reporting date/i)).toBeInTheDocument()
    expect(screen.getByText('Human Impact Assessment')).toBeInTheDocument()
    expect(screen.getByLabelText(/lives lost/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/injured/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/displaced/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/houses affected/i)).toBeInTheDocument()
  })

  it('should show incident creation section when showIncidentCreation is true', () => {
    render(<PreliminaryAssessmentForm showIncidentCreation={true} />)

    expect(screen.getByText('Incident Creation')).toBeInTheDocument()
    expect(screen.getByText(/create incident record/i)).toBeInTheDocument()
  })

  it('should handle form submission with valid data', async () => {
    const user = userEvent.setup()
    mockCreateAssessment.mockResolvedValue({ id: 'test-assessment' })

    render(<PreliminaryAssessmentForm />)

    // Fill in required fields
    await user.type(screen.getByLabelText(/local government area/i), 'Lagos Island')
    await user.type(screen.getByLabelText(/ward/i), 'Ward 1')
    
    const dateInput = screen.getByLabelText(/reporting date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2025-01-06')

    await user.type(screen.getByLabelText(/lives lost/i), '0')
    await user.type(screen.getByLabelText(/injured/i), '5')
    await user.type(screen.getByLabelText(/displaced/i), '20')
    await user.type(screen.getByLabelText(/houses affected/i), '10')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit assessment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportingLGA: 'Lagos Island',
            reportingWard: 'Ward 1',
            numberLivesLost: 0,
            numberInjured: 5,
            numberDisplaced: 20,
            numberHousesAffected: 10,
          }),
        })
      )
    })
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<PreliminaryAssessmentForm />)

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /submit assessment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/lga is required/i)).toBeInTheDocument()
      expect(screen.getByText(/ward is required/i)).toBeInTheDocument()
    })

    expect(mockCreateAssessment).not.toHaveBeenCalled()
  })

  it('should validate GPS coordinates bounds', async () => {
    const user = userEvent.setup()
    render(<PreliminaryAssessmentForm />)

    // Fill in other required fields first
    await user.type(screen.getByLabelText(/local government area/i), 'Lagos Island')
    await user.type(screen.getByLabelText(/ward/i), 'Ward 1')

    // Open manual GPS entry
    const manualEntryButton = screen.getByRole('button', { name: /manual entry/i })
    await user.click(manualEntryButton)

    // Enter invalid coordinates
    const latInput = screen.getByLabelText(/latitude/i)
    const lngInput = screen.getByLabelText(/longitude/i)
    
    await user.type(latInput, '95') // Invalid: > 90
    await user.type(lngInput, '185') // Invalid: > 180

    const setLocationButton = screen.getByRole('button', { name: /set location/i })
    await user.click(setLocationButton)

    await waitFor(() => {
      expect(screen.getByText(/latitude must be between -90 and 90/i)).toBeInTheDocument()
    })
  })

  it('should handle draft saving', async () => {
    const user = userEvent.setup()
    render(<PreliminaryAssessmentForm />)

    // Fill in some fields
    await user.type(screen.getByLabelText(/local government area/i), 'Lagos Island')
    await user.type(screen.getByLabelText(/injured/i), '5')

    // Save as draft
    const saveDraftButton = screen.getByRole('button', { name: /save draft/i })
    await user.click(saveDraftButton)

    await waitFor(() => {
      expect(mockSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          reportingLGA: 'Lagos Island',
          numberInjured: 5,
        })
      )
    })
  })

  it('should handle incident creation when checkbox is checked', async () => {
    const user = userEvent.setup()
    mockCreateAssessment.mockResolvedValue({ id: 'test-assessment' })

    render(<PreliminaryAssessmentForm showIncidentCreation={true} />)

    // Fill in required assessment fields
    await user.type(screen.getByLabelText(/local government area/i), 'Lagos Island')
    await user.type(screen.getByLabelText(/ward/i), 'Ward 1')
    await user.type(screen.getByLabelText(/lives lost/i), '0')
    await user.type(screen.getByLabelText(/injured/i), '5')
    await user.type(screen.getByLabelText(/displaced/i), '20')
    await user.type(screen.getByLabelText(/houses affected/i), '10')

    // Check the create incident checkbox
    const createIncidentCheckbox = screen.getByRole('checkbox', { name: /create incident record/i })
    await user.click(createIncidentCheckbox)

    // Fill in incident fields
    await user.type(screen.getByLabelText(/incident type/i), 'Flood')
    await user.selectOptions(screen.getByLabelText(/severity/i), 'HIGH')
    await user.type(screen.getByLabelText(/description/i), 'Flash flood in the area')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit assessment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          createIncident: true,
          incidentData: expect.objectContaining({
            type: 'Flood',
            severity: 'HIGH',
            description: 'Flash flood in the area',
          }),
        })
      )
    })
  })

  it('should disable form when disabled prop is true', () => {
    render(<PreliminaryAssessmentForm disabled={true} />)

    const lgaInput = screen.getByLabelText(/local government area/i)
    const wardInput = screen.getByLabelText(/ward/i)
    const submitButton = screen.getByRole('button', { name: /submit assessment/i })

    expect(lgaInput).toBeDisabled()
    expect(wardInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })

  it('should handle GPS location updates', async () => {
    const user = userEvent.setup()
    const mockPosition = {
      coords: {
        latitude: 9.072264,
        longitude: 7.491302,
      },
    }

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition)
    })

    render(<PreliminaryAssessmentForm />)

    // Capture GPS
    const captureGPSButton = screen.getByRole('button', { name: /capture gps/i })
    await user.click(captureGPSButton)

    await waitFor(() => {
      expect(screen.getByText(/latitude: 9.072264/i)).toBeInTheDocument()
      expect(screen.getByText(/longitude: 7.491302/i)).toBeInTheDocument()
    })
  })

  it('should validate impact numbers are non-negative', async () => {
    const user = userEvent.setup()
    render(<PreliminaryAssessmentForm />)

    // Fill in required fields
    await user.type(screen.getByLabelText(/local government area/i), 'Lagos Island')
    await user.type(screen.getByLabelText(/ward/i), 'Ward 1')

    // Enter negative numbers
    await user.type(screen.getByLabelText(/lives lost/i), '-1')
    await user.type(screen.getByLabelText(/injured/i), '-5')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit assessment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/number must be 0 or greater/i)).toBeInTheDocument()
    })

    expect(mockCreateAssessment).not.toHaveBeenCalled()
  })

  it('should handle media attachments section', () => {
    render(<PreliminaryAssessmentForm />)

    expect(screen.getByText('Media & Evidence')).toBeInTheDocument()
    expect(screen.getByText(/upload photos, videos, or documents/i)).toBeInTheDocument()
  })

  it('should show additional details section', () => {
    render(<PreliminaryAssessmentForm />)

    expect(screen.getByText('Additional Details')).toBeInTheDocument()
    expect(screen.getByLabelText(/additional notes/i)).toBeInTheDocument()
  })
})