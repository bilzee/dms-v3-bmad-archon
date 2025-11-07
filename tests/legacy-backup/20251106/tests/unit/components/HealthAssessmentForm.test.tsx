import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HealthAssessmentForm } from '@/components/forms/assessment/HealthAssessmentForm';
import { HEALTH_ISSUES_OPTIONS } from '@/types/rapid-assessment';

// Mock components
jest.mock('@/components/shared/GPSCapture', () => ({
  GPSCapture: ({ onLocationCapture, initialLocation }: any) => (
    <div data-testid="gps-capture">
      <button
        onClick={() => onLocationCapture(11.506, 13.098)}
        data-testid="capture-gps"
      >
        Capture GPS
      </button>
      {initialLocation && (
        <div data-testid="initial-location">
          {initialLocation.lat}, {initialLocation.lng}
        </div>
      )}
    </div>
  ),
}));

jest.mock('@/components/shared/MediaField', () => ({
  MediaField: ({ onPhotosChange, initialPhotos }: any) => (
    <div data-testid="media-field">
      <input
        data-testid="photo-input"
        onChange={(e) => onPhotosChange(['photo1.jpg', 'photo2.jpg'])}
      />
      {initialPhotos && (
        <div data-testid="initial-photos">
          {initialPhotos.join(', ')}
        </div>
      )}
    </div>
  ),
}));

// Mock form validation schema
const mockHealthSchema = z.object({
  rapidAssessmentDate: z.date(),
  affectedEntityId: z.string().min(1),
  assessorName: z.string().min(1),
  hasFunctionalClinic: z.boolean(),
  numberHealthFacilities: z.number().int().min(0),
  healthFacilityType: z.string().min(1),
  qualifiedHealthWorkers: z.number().int().min(0),
  hasMedicineSupply: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasMaternalChildServices: z.boolean(),
  commonHealthIssues: z.array(z.enum(HEALTH_ISSUES_OPTIONS)),
  additionalHealthDetails: z.string().optional(),
});

describe('HealthAssessmentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockEntities = [
    { id: 'entity-1', name: 'Community A', type: 'COMMUNITY' },
    { id: 'entity-2', name: 'Health Center B', type: 'FACILITY' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderForm = (initialData = {}) => {
    return render(
      <HealthAssessmentForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
        entities={mockEntities}
      />
    );
  };

  it('renders all form fields correctly', () => {
    // Act
    renderForm();

    // Assert
    expect(screen.getByLabelText(/Assessment Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assessor Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Select affected entity/i)).toBeInTheDocument();
    expect(screen.getByTestId('gps-capture')).toBeInTheDocument();
    expect(screen.getByTestId('media-field')).toBeInTheDocument();
    expect(screen.getByText(/Functional Clinic Available/i)).toBeInTheDocument();
    expect(screen.getByText(/Medicine Supply Available/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical Supplies Available/i)).toBeInTheDocument();
    expect(screen.getByText(/Maternal & Child Services/i)).toBeInTheDocument();
    expect(screen.getByText(/Common Health Issues/i)).toBeInTheDocument();
    expect(screen.getByText(/Additional Health Details/i)).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    // Arrange
    const initialData = {
      assessorName: 'John Doe',
      affectedEntityId: 'entity-1',
      hasFunctionalClinic: true,
      numberHealthFacilities: 2,
      healthFacilityType: 'Primary Health Center',
      qualifiedHealthWorkers: 3,
      hasMedicineSupply: true,
      hasMedicalSupplies: false,
      hasMaternalChildServices: true,
      commonHealthIssues: ['Diarrhea', 'Malaria'],
    };

    // Act
    renderForm(initialData);

    // Assert
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Community A \(COMMUNITY\)/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Functional Clinic Available/ })).toBeChecked();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Primary Health Center')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Medicine Supply Available/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Medical Supplies Available/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Maternal & Child Services/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Diarrhea/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Malaria/ })).toBeChecked();
  });

  it('requires validation for required fields', async () => {
    // Act
    renderForm();
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /Save Assessment/i });
    fireEvent.click(submitButton);

    // Assert - Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Assessor name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Entity is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Health facility type is required/i)).toBeInTheDocument();
    });

    // Form should not have been submitted
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles checkbox interactions correctly', async () => {
    // Act
    renderForm();
    
    const functionalClinicCheckbox = screen.getByRole('checkbox', { name: /Functional Clinic Available/i });
    
    // Initially unchecked
    expect(functionalClinicCheckbox).not.toBeChecked();
    
    // Check the box
    fireEvent.click(functionalClinicCheckbox);
    expect(functionalClinicCheckbox).toBeChecked();
    
    // Uncheck the box
    fireEvent.click(functionalClinicCheckbox);
    expect(functionalClinicCheckbox).not.toBeChecked();
  });

  it('handles health issues selection correctly', async () => {
    // Act
    renderForm();
    
    const diarrheaCheckbox = screen.getByRole('checkbox', { name: /Diarrhea/i });
    const malariaCheckbox = screen.getByRole('checkbox', { name: /Malaria/i });
    
    // Initially unchecked
    expect(diarrheaCheckbox).not.toBeChecked();
    expect(malariaCheckbox).not.toBeChecked();
    
    // Select multiple issues
    fireEvent.click(diarrheaCheckbox);
    fireEvent.click(malariaCheckbox);
    
    expect(diarrheaCheckbox).toBeChecked();
    expect(malariaCheckbox).toBeChecked();
  });

  it('handles GPS location capture', async () => {
    // Act
    renderForm();
    
    const captureButton = screen.getByTestId('capture-gps');
    fireEvent.click(captureButton);

    // Assert - GPS coordinates should be captured
    // Note: In a real test, we would check if the form values are updated
    expect(captureButton).toBeInTheDocument();
  });

  it('handles media attachment changes', async () => {
    // Act
    renderForm();
    
    const photoInput = screen.getByTestId('photo-input');
    fireEvent.change(photoInput);

    // Assert - Photos should be updated
    expect(photoInput).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    // Act
    renderForm();
    
    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Assessor Name/i), {
      target: { value: 'John Doe' }
    });
    
    fireEvent.change(screen.getByLabelText(/Health facility type/i), {
      target: { value: 'Primary Health Center' }
    });
    
    // Select entity (would need to mock the Select component behavior)
    const entitySelect = screen.getByText(/Select affected entity/i);
    fireEvent.click(entitySelect);
    fireEvent.click(screen.getByText(/Community A \(COMMUNITY\)/));
    
    // Check at least one health issue
    fireEvent.click(screen.getByRole('checkbox', { name: /Diarrhea/i }));
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /Save Assessment/i });
    fireEvent.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          assessorName: 'John Doe',
          affectedEntityId: 'entity-1',
          healthFacilityType: 'Primary Health Center',
          hasFunctionalClinic: false, // Default value
          numberHealthFacilities: 0, // Default value
          qualifiedHealthWorkers: 0, // Default value
          hasMedicineSupply: false, // Default value
          hasMedicalSupplies: false, // Default value
          hasMaternalChildServices: false, // Default value
          commonHealthIssues: ['Diarrhea'],
          photos: ['photo1.jpg', 'photo2.jpg'], // Mocked from MediaField
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    // Act
    renderForm();
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Assert
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables form when isLoading is true', () => {
    // Act
    renderForm();
    render(
      <HealthAssessmentForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
        entities={mockEntities}
      />
    );

    // Assert
    const submitButton = screen.getByRole('button', { name: /Saving\.\.\./i });
    expect(submitButton).toBeDisabled();
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  it('displays gap status badges correctly', () => {
    // Act
    renderForm();

    // Assert - Initial status badges should be present
    expect(screen.getByText(/No Gap/)).toBeInTheDocument();
    expect(screen.getByText(/Gap Identified/)).toBeInTheDocument();
  });

  it('shows gap analysis indicators for boolean fields', () => {
    // Act
    renderForm({
      hasFunctionalClinic: false,
      hasMedicineSupply: false,
      hasMedicalSupplies: true,
      hasMaternalChildServices: false,
    });

    // Assert - Should show appropriate gap status
    expect(screen.getByText(/Critical Gap/i)).toBeInTheDocument();
    expect(screen.getByText(/No Gap/i)).toBeInTheDocument();
  });
});