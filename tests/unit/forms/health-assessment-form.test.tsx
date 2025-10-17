import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import userEvent from '@testing-library/user-event'
import { HealthAssessmentForm } from '@/components/forms/assessment/HealthAssessmentForm'
import { HealthAssessmentInput } from '@/types/rapid-assessment'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams())
}))

jest.mock('@/components/shared/GPSCapture', () => ({
  GPSCapture: ({ onLocationCapture, disabled }: any) => (
    <div data-testid="gps-capture">
      <button 
        onClick={() => onLocationCapture(1.2345, 6.7890)}
        disabled={disabled}
      >
        Capture GPS
      </button>
    </div>
  )
}))

jest.mock('@/components/shared/MediaField', () => ({
  MediaField: ({ onPhotosChange, initialPhotos, maxPhotos }: any) => (
    <div data-testid="media-field">
      <div data-testid="photo-count">{initialPhotos?.length || 0}/{maxPhotos}</div>
      <button 
        onClick={() => onPhotosChange([...(initialPhotos || []), 'new-photo.jpg'])}
      >
        Add Photo
      </button>
    </div>
  )
}))

jest.mock('@/components/shared/EntitySelector', () => ({
  EntitySelector: ({ value, onChange, disabled }: any) => (
    <div data-testid="entity-selector">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid="entity-select"
      >
        <option value="">Select Entity</option>
        <option value="entity-1">Entity 1</option>
        <option value="entity-2">Entity 2</option>
      </select>
    </div>
  )
}))

const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn()
}

beforeEach(() => {
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  jest.clearAllMocks()
})

describe('HealthAssessmentForm', () => {
  const defaultProps = {
    entityId: 'entity-1',
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    isSubmitting: false,
    disabled: false
  }

  const mockInitialData: HealthAssessmentInput = {
    hasFunctionalClinic: true,
    hasEmergencyServices: false,
    numberHealthFacilities: 2,
    healthFacilityType: 'Primary Health Center',
    qualifiedHealthWorkers: 5,
    hasTrainedStaff: true,
    hasMedicineSupply: false,
    hasMedicalSupplies: true,
    hasMaternalChildServices: false,
    commonHealthIssues: ['Diarrhea', 'Malaria'],
    additionalHealthDetails: 'Initial health notes'
  }

  describe('Form Rendering', () => {
    it('renders form with all required fields', () => {
      render(<HealthAssessmentForm {...defaultProps} />)

      expect(screen.getByText('Health Assessment')).toBeInTheDocument()
      expect(screen.getByText('Assess healthcare facilities, services, and common health issues in the affected area')).toBeInTheDocument()

      // Boolean fields
      expect(screen.getByLabelText('Functional Clinic')).toBeInTheDocument()
      expect(screen.getByLabelText('Emergency Services')).toBeInTheDocument()
      expect(screen.getByLabelText('Trained Staff')).toBeInTheDocument()
      expect(screen.getByLabelText('Medicine Supply')).toBeInTheDocument()
      expect(screen.getByLabelText('Medical Supplies')).toBeInTheDocument()
      expect(screen.getByLabelText('Maternal & Child Services')).toBeInTheDocument()

      // Number fields
      expect(screen.getByLabelText('Number of Health Facilities')).toBeInTheDocument()
      expect(screen.getByLabelText('Qualified Health Workers')).toBeInTheDocument()

      // Select field
      expect(screen.getByLabelText('Primary Facility Type')).toBeInTheDocument()

      // Health issues
      expect(screen.getByText('Common Health Issues')).toBeInTheDocument()
      expect(screen.getByText('Diarrhea')).toBeInTheDocument()
      expect(screen.getByText('Malaria')).toBeInTheDocument()
      expect(screen.getByText('Respiratory Infections')).toBeInTheDocument()
      expect(screen.getByText('Malnutrition')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()

      // GPS and Media
      expect(screen.getByTestId('gps-capture')).toBeInTheDocument()
      expect(screen.getByTestId('media-field')).toBeInTheDocument()
    })

    it('displays initial data when provided', () => {
      render(<HealthAssessmentForm {...defaultProps} initialData={mockInitialData} />)

      expect(screen.getByLabelText('Functional Clinic')).toBeChecked()
      expect(screen.getByLabelText('Emergency Services')).not.toBeChecked()
      expect(screen.getByDisplayValue('2')).toBeInTheDocument() // numberHealthFacilities
      expect(screen.getByDisplayValue('5')).toBeInTheDocument() // qualifiedHealthWorkers
      expect(screen.getByDisplayValue('Primary Health Center')).toBeInTheDocument()
      expect(screen.getByLabelText('Diarrhea')).toBeChecked()
      expect(screen.getByLabelText('Malaria')).toBeChecked()
      expect(screen.getByDisplayValue('Initial health notes')).toBeInTheDocument()
    })

    it('shows gap analysis badges appropriately', () => {
      render(<HealthAssessmentForm {...defaultProps} initialData={mockInitialData} />)

      // Should show "Gap" badges for unchecked boolean fields
      expect(screen.getByText('Gap')).toBeInTheDocument() // For hasEmergencyServices
      expect(screen.getByText('Gap')).toBeInTheDocument() // For hasMedicineSupply
      expect(screen.getByText('Gap')).toBeInTheDocument() // For hasMaternalChildServices

      // Should not show "Gap" badges for checked fields
      const functionalClinicLabel = screen.getByLabelText('Functional Clinic').closest('div')
      expect(functionalClinicLabel).not.toContainHTML('Gap')
    })

    it('displays critical gaps summary when gaps exist', () => {
      render(<HealthAssessmentForm {...defaultProps} initialData={mockInitialData} />)

      expect(screen.getByText('Critical Gaps Identified')).toBeInTheDocument()
      expect(screen.getByText(/Emergency Services, Medicine Supply, Maternal & Child Services/)).toBeInTheDocument()
    })

    it('hides critical gaps when no gaps exist', () => {
      const noGapsData = {
        ...mockInitialData,
        hasEmergencyServices: true,
        hasMedicineSupply: true,
        hasMaternalChildServices: true
      }

      render(<HealthAssessmentForm {...defaultProps} initialData={noGapsData} />)

      expect(screen.queryByText('Critical Gaps Identified')).not.toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    it('allows toggling boolean fields', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const functionalClinicCheckbox = screen.getByLabelText('Functional Clinic')
      
      await user.click(functionalClinicCheckbox)
      expect(functionalClinicCheckbox).toBeChecked()

      await user.click(functionalClinicCheckbox)
      expect(functionalClinicCheckbox).not.toBeChecked()

      // Check that gap badge appears/disappears
      const parent = functionalClinicCheckbox.closest('div')
      if (functionalClinicCheckbox.checked) {
        expect(parent).not.toContainHTML('Gap')
      } else {
        expect(parent).toContainHTML('Gap')
      }
    })

    it('allows entering numeric values', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const facilitiesInput = screen.getByLabelText('Number of Health Facilities')
      
      await user.clear(facilitiesInput)
      await user.type(facilitiesInput, '5')
      
      expect(facilitiesInput).toHaveValue(5)
    })

    it('handles invalid numeric input gracefully', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const facilitiesInput = screen.getByLabelText('Number of Health Facilities')
      
      await user.clear(facilitiesInput)
      await user.type(facilitiesInput, 'invalid')
      
      // Should default to 0 for invalid input
      expect(facilitiesInput).toHaveValue(0)
    })

    it('allows selecting health issues', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const diarrheaCheckbox = screen.getByLabelText('Diarrhea')
      const malariaCheckbox = screen.getByLabelText('Malaria')
      
      await user.click(diarrheaCheckbox)
      await user.click(malariaCheckbox)
      
      expect(diarrheaCheckbox).toBeChecked()
      expect(malariaCheckbox).toBeChecked()

      await user.click(diarrheaCheckbox) // Uncheck
      expect(diarrheaCheckbox).not.toBeChecked()
      expect(malariaCheckbox).toBeChecked()
    })

    it('allows selecting facility type', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const facilitySelect = screen.getByLabelText('Primary Facility Type')
      
      await user.selectOptions(facilitySelect, 'Hospital')
      
      expect(facilitySelect).toHaveValue('Hospital')
    })

    it('allows entering additional details', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const detailsTextarea = screen.getByPlaceholderText('Provide any additional health assessment details...')
      
      await user.type(detailsTextarea, 'Additional health assessment details here')
      
      expect(detailsTextarea).toHaveValue('Additional health assessment details here')
    })
  })

  describe('GPS and Media Integration', () => {
    it('captures GPS coordinates', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const gpsButton = screen.getByText('Capture GPS')
      await user.click(gpsButton)

      // GPS coordinates should be captured and included in form submission
      // This would be verified when form is submitted
    })

    it('adds media attachments', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const addButton = screen.getByText('Add Photo')
      await user.click(addButton)

      expect(screen.getByText('1/5')).toBeInTheDocument() // Shows 1 photo out of 5 max
    })

    it('limits media attachments to maximum', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const addButton = screen.getByText('Add Photo')
      
      // Add 5 photos (maximum)
      for (let i = 0; i < 5; i++) {
        await user.click(addButton)
      }

      expect(screen.getByText('5/5')).toBeInTheDocument()
    })
  })

  describe('Entity Selection', () => {
    it('allows changing entity selection', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      const entitySelect = screen.getByTestId('entity-select')
      
      await user.selectOptions(entitySelect, 'entity-2')
      
      expect(entitySelect).toHaveValue('entity-2')
    })

    it('disables entity selector when disabled prop is true', () => {
      render(<HealthAssessmentForm {...defaultProps} disabled={true} />)

      const entitySelect = screen.getByTestId('entity-select')
      expect(entitySelect).toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<HealthAssessmentForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill required fields
      await user.click(screen.getByLabelText('Functional Clinic'))
      await user.type(screen.getByLabelText('Number of Health Facilities'), '3')
      await user.type(screen.getByLabelText('Qualified Health Workers'), '5')
      await user.selectOptions(screen.getByLabelText('Primary Facility Type'), 'Clinic')
      await user.click(screen.getByLabelText('Diarrhea'))

      // Submit form
      const submitButton = screen.getByText('Submit Health Assessment')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'HEALTH',
            entityId: 'entity-1',
            healthData: expect.objectContaining({
              hasFunctionalClinic: true,
              numberHealthFacilities: 3,
              qualifiedHealthWorkers: 5,
              healthFacilityType: 'Clinic',
              commonHealthIssues: ['Diarrhea']
            })
          })
        )
      })
    })

    it('includes GPS coordinates when captured', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<HealthAssessmentForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Capture GPS
      await user.click(screen.getByText('Capture GPS'))
      
      // Fill minimal required fields and submit
      await user.click(screen.getByLabelText('Functional Clinic'))
      await user.type(screen.getByLabelText('Number of Health Facilities'), '1')
      await user.type(screen.getByLabelText('Qualified Health Workers'), '1')
      await user.selectOptions(screen.getByLabelText('Primary Facility Type'), 'Clinic')

      const submitButton = screen.getByText('Submit Health Assessment')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            coordinates: {
              latitude: 1.2345,
              longitude: 6.7890,
              timestamp: expect.any(Date),
              captureMethod: 'GPS'
            }
          })
        )
      })
    })

    it('includes media attachments when added', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<HealthAssessmentForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Add photo
      await user.click(screen.getByText('Add Photo'))
      
      // Fill minimal required fields and submit
      await user.click(screen.getByLabelText('Functional Clinic'))
      await user.type(screen.getByLabelText('Number of Health Facilities'), '1')
      await user.type(screen.getByLabelText('Qualified Health Workers'), '1')
      await user.selectOptions(screen.getByLabelText('Primary Facility Type'), 'Clinic')

      const submitButton = screen.getByText('Submit Health Assessment')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            mediaAttachments: ['new-photo.jpg']
          })
        )
      })
    })

    it('disables submit button when no entity is selected', () => {
      render(<HealthAssessmentForm {...defaultProps} entityId="" />)

      const submitButton = screen.getByText('Submit Health Assessment')
      expect(submitButton).toBeDisabled()
    })

    it('disables submit button when form is disabled', () => {
      render(<HealthAssessmentForm {...defaultProps} disabled={true} />)

      const submitButton = screen.getByText('Submit Health Assessment')
      expect(submitButton).toBeDisabled()
    })

    it('shows loading state when submitting', () => {
      render(<HealthAssessmentForm {...defaultProps} isSubmitting={true} />)

      const submitButton = screen.getByText('Submitting...')
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const mockOnCancel = jest.fn()
      const user = userEvent.setup()
      
      render(<HealthAssessmentForm {...defaultProps} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and descriptions', () => {
      render(<HealthAssessmentForm {...defaultProps} />)

      // Check that all form controls have associated labels
      expect(screen.getByLabelText('Functional Clinic')).toBeInTheDocument()
      expect(screen.getByLabelText('Number of Health Facilities')).toBeInTheDocument()
      expect(screen.getByLabelText('Primary Facility Type')).toBeInTheDocument()
      
      // Check for field descriptions
      expect(screen.getByText('At least one functional healthcare facility exists')).toBeInTheDocument()
      expect(screen.getByText('Total number of healthcare facilities in the area')).toBeInTheDocument()
    })

    it('provides appropriate ARIA attributes', () => {
      render(<HealthAssessmentForm {...defaultProps} />)

      // Check for appropriate role attributes
      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Submit Health Assessment' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<HealthAssessmentForm {...defaultProps} />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText('Functional Clinic')).toHaveFocus()

      await user.tab()
      // Should focus next form element
    })
  })

  describe('Error Handling', () => {
    it('handles submission errors gracefully', async () => {
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))
      const user = userEvent.setup()
      
      render(<HealthAssessmentForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill required fields
      await user.click(screen.getByLabelText('Functional Clinic'))
      await user.type(screen.getByLabelText('Number of Health Facilities'), '1')
      await user.type(screen.getByLabelText('Qualified Health Workers'), '1')
      await user.selectOptions(screen.getByLabelText('Primary Facility Type'), 'Clinic')

      // Submit form
      const submitButton = screen.getByText('Submit Health Assessment')
      await user.click(submitButton)

      // Should not crash and form should remain usable
      expect(screen.getByText('Health Assessment')).toBeInTheDocument()
    })
  })
})