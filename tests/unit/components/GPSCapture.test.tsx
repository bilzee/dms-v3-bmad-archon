import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GPSCapture } from '@/components/shared/GPSCapture'

// Mock geolocation
const mockGetCurrentPosition = jest.fn()

beforeEach(() => {
  // Mock navigator.geolocation
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

describe('GPSCapture', () => {
  const mockOnLocationCapture = jest.fn()

  beforeEach(() => {
    mockOnLocationCapture.mockClear()
  })

  it('should render GPS capture interface', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    expect(screen.getByText('GPS Location Capture')).toBeInTheDocument()
    expect(screen.getByText('Capture GPS coordinates automatically or enter them manually')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /capture gps/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument()
  })

  it('should show required badge when required prop is true', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} required />)

    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('should disable buttons when disabled prop is true', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} disabled />)

    expect(screen.getByRole('button', { name: /capture gps/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /manual entry/i })).toBeDisabled()
  })

  it('should display initial location when provided', () => {
    const initialLocation = { lat: 9.072264, lng: 7.491302 }
    
    render(
      <GPSCapture 
        onLocationCapture={mockOnLocationCapture} 
        initialLocation={initialLocation}
      />
    )

    expect(screen.getByText(/current location/i)).toBeInTheDocument()
    expect(screen.getByText(/latitude: 9.072264/i)).toBeInTheDocument()
    expect(screen.getByText(/longitude: 7.491302/i)).toBeInTheDocument()
  })

  it('should capture GPS coordinates successfully', async () => {
    const mockPosition = {
      coords: {
        latitude: 9.072264,
        longitude: 7.491302,
      },
    }

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition)
    })

    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    const captureButton = screen.getByRole('button', { name: /capture gps/i })
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(mockOnLocationCapture).toHaveBeenCalledWith(9.072264, 7.491302)
    })

    expect(screen.getByText(/current location/i)).toBeInTheDocument()
    expect(screen.getByText(/latitude: 9.072264/i)).toBeInTheDocument()
    expect(screen.getByText(/longitude: 7.491302/i)).toBeInTheDocument()
  })

  it('should handle GPS capture errors', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: 'Location access denied',
    }

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError)
    })

    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    const captureButton = screen.getByRole('button', { name: /capture gps/i })
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(screen.getByText(/location access denied by user/i)).toBeInTheDocument()
    })

    expect(mockOnLocationCapture).not.toHaveBeenCalled()
  })

  it('should show manual entry form when manual entry button is clicked', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    const manualButton = screen.getByRole('button', { name: /manual entry/i })
    fireEvent.click(manualButton)

    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /set location/i })).toBeInTheDocument()
  })

  it('should handle manual coordinate entry', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    // Open manual entry
    const manualButton = screen.getByRole('button', { name: /manual entry/i })
    fireEvent.click(manualButton)

    // Fill in coordinates
    const latInput = screen.getByLabelText(/latitude/i)
    const lngInput = screen.getByLabelText(/longitude/i)
    
    fireEvent.change(latInput, { target: { value: '9.072264' } })
    fireEvent.change(lngInput, { target: { value: '7.491302' } })

    // Submit
    const setLocationButton = screen.getByRole('button', { name: /set location/i })
    fireEvent.click(setLocationButton)

    expect(mockOnLocationCapture).toHaveBeenCalledWith(9.072264, 7.491302)
  })

  it('should validate manual coordinate input', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    // Open manual entry
    const manualButton = screen.getByRole('button', { name: /manual entry/i })
    fireEvent.click(manualButton)

    // Fill in invalid coordinates
    const latInput = screen.getByLabelText(/latitude/i)
    const lngInput = screen.getByLabelText(/longitude/i)
    
    fireEvent.change(latInput, { target: { value: 'invalid' } })
    fireEvent.change(lngInput, { target: { value: '7.491302' } })

    // Submit
    const setLocationButton = screen.getByRole('button', { name: /set location/i })
    fireEvent.click(setLocationButton)

    expect(screen.getByText(/please enter valid latitude and longitude values/i)).toBeInTheDocument()
    expect(mockOnLocationCapture).not.toHaveBeenCalled()
  })

  it('should validate latitude bounds', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    // Open manual entry
    const manualButton = screen.getByRole('button', { name: /manual entry/i })
    fireEvent.click(manualButton)

    // Fill in out-of-bounds latitude
    const latInput = screen.getByLabelText(/latitude/i)
    const lngInput = screen.getByLabelText(/longitude/i)
    
    fireEvent.change(latInput, { target: { value: '95' } }) // > 90
    fireEvent.change(lngInput, { target: { value: '7.491302' } })

    // Submit
    const setLocationButton = screen.getByRole('button', { name: /set location/i })
    fireEvent.click(setLocationButton)

    expect(screen.getByText(/latitude must be between -90 and 90/i)).toBeInTheDocument()
    expect(mockOnLocationCapture).not.toHaveBeenCalled()
  })

  it('should validate longitude bounds', () => {
    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    // Open manual entry
    const manualButton = screen.getByRole('button', { name: /manual entry/i })
    fireEvent.click(manualButton)

    // Fill in out-of-bounds longitude
    const latInput = screen.getByLabelText(/latitude/i)
    const lngInput = screen.getByLabelText(/longitude/i)
    
    fireEvent.change(latInput, { target: { value: '9.072264' } })
    fireEvent.change(lngInput, { target: { value: '185' } }) // > 180

    // Submit
    const setLocationButton = screen.getByRole('button', { name: /set location/i })
    fireEvent.click(setLocationButton)

    expect(screen.getByText(/longitude must be between -180 and 180/i)).toBeInTheDocument()
    expect(mockOnLocationCapture).not.toHaveBeenCalled()
  })

  it('should show error when geolocation is not supported', async () => {
    // Mock unsupported geolocation
    global.navigator = {
      ...global.navigator,
      geolocation: undefined as any,
    }

    render(<GPSCapture onLocationCapture={mockOnLocationCapture} />)

    const captureButton = screen.getByRole('button', { name: /capture gps/i })
    fireEvent.click(captureButton)

    await waitFor(() => {
      expect(screen.getByText(/geolocation is not supported by this browser/i)).toBeInTheDocument()
    })
  })

  it('should clear location when clear button is clicked', () => {
    const initialLocation = { lat: 9.072264, lng: 7.491302 }
    
    render(
      <GPSCapture 
        onLocationCapture={mockOnLocationCapture} 
        initialLocation={initialLocation}
      />
    )

    // Open manual entry to see clear button
    const manualButton = screen.getByRole('button', { name: /manual entry/i })
    fireEvent.click(manualButton)

    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    expect(screen.queryByText(/current location/i)).not.toBeInTheDocument()
  })
})