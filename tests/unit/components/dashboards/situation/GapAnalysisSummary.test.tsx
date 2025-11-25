import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GapAnalysisSummary } from '@/components/dashboards/situation/components/GapAnalysisSummary';
import type { GapAnalysisSummaryData } from '@/hooks/useGapAnalysisRealtime';

// Mock UI components as per testing standards
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" className={className} data-value={value}>
      <div style={{ width: `${value}%` }} />
    </div>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span data-testid="badge" className={className} data-variant={variant}>
      {children}
    </span>
  )
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick} 
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  )
}));

// Mock GapIndicator component
jest.mock('@/components/dashboards/situation/components/GapIndicator', () => ({
  GapIndicator: ({ hasGap, severity, size, showLabel, className }: any) => (
    <div 
      data-testid="gap-indicator" 
      data-has-gap={hasGap}
      data-severity={severity}
      data-size={size}
      data-show-label={showLabel}
      className={className}
    >
      {showLabel && <span>{severity}</span>}
      {!showLabel && hasGap && <span>{severity}</span>}
      {!hasGap && <span>No Gap</span>}
    </div>
  )
}));

// Mock CSV export utilities
jest.mock('@/utils/export/gapAnalysisCsv', () => ({
  exportGapAnalysisToCsv: jest.fn(),
  validateGapAnalysisData: jest.fn()
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon">Download</div>,
  AlertTriangle: () => <div data-testid="alert-icon">Alert</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  TrendingUp: () => <div data-testid="trending-icon">Trending</div>,
  BarChart3: () => <div data-testid="chart-icon">Chart</div>,
  PieChart: () => <div data-testid="pie-icon">Pie</div>,
  Activity: () => <div data-testid="activity-icon">Activity</div>,
  RefreshCw: () => <div data-testid="refresh-icon">Refresh</div>
}));

describe('GapAnalysisSummary', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  // Mock test data
  const mockGapAnalysisData: GapAnalysisSummaryData = {
    totalEntities: 100,
    severityDistribution: {
      high: 25,
      medium: 35,
      low: 15
    },
    assessmentTypeGaps: {
      HEALTH: {
        severity: 'high',
        entitiesAffected: 45,
        percentage: 45.0
      },
      FOOD: {
        severity: 'medium',
        entitiesAffected: 30,
        percentage: 30.0
      },
      WASH: {
        severity: 'low',
        entitiesAffected: 20,
        percentage: 20.0
      },
      SHELTER: {
        severity: 'high',
        entitiesAffected: 60,
        percentage: 60.0
      },
      SECURITY: {
        severity: 'medium',
        entitiesAffected: 25,
        percentage: 25.0
      }
    },
    lastUpdated: '2025-01-24T10:30:00.000Z'
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    user = userEvent.setup();

    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock validation to return success
    const { validateGapAnalysisData } = require('@/utils/export/gapAnalysisCsv');
    validateGapAnalysisData.mockReturnValue({ isValid: true });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GapAnalysisSummary
          incidentId="test-incident-001"
          incidentName="Test Incident"
          data={mockGapAnalysisData}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('renders gap analysis summary with correct title and structure', () => {
    renderComponent();

    expect(screen.getByText('Gap Analysis Summary')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-header')).toBeInTheDocument();
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  it('displays overall status indicator with correct severity', () => {
    renderComponent();

    const gapIndicators = screen.getAllByTestId('gap-indicator');
    expect(gapIndicators.length).toBeGreaterThan(0);
    
    // Check that at least one gap indicator shows the overall status
    const overallStatus = screen.getAllByText('HIGH')[0]; // Get first HIGH text
    expect(overallStatus).toBeInTheDocument();
  });

  it('shows correct summary statistics', () => {
    renderComponent();

    // Check entities with gaps calculation
    const totalWithGaps = mockGapAnalysisData.severityDistribution.high + 
                          mockGapAnalysisData.severityDistribution.medium + 
                          mockGapAnalysisData.severityDistribution.low; // 75
    
    expect(screen.getByText(`${totalWithGaps} of ${mockGapAnalysisData.totalEntities} entities have gaps`)).toBeInTheDocument();
    expect(screen.getByText('75.0% coverage rate')).toBeInTheDocument();
  });

  it('displays severity distribution with correct values and progress bars', () => {
    renderComponent();

    // Check severity distribution labels
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    expect(screen.getByText('Low Priority')).toBeInTheDocument();

    // Check counts and percentages
    expect(screen.getByText('25 entities (33.3%)')).toBeInTheDocument(); // High
    expect(screen.getByText('35 entities (46.7%)')).toBeInTheDocument(); // Medium
    expect(screen.getByText('15 entities (20.0%)')).toBeInTheDocument(); // Low

    // Check progress bars are rendered
    const progressBars = screen.getAllByTestId('progress');
    expect(progressBars.length).toBeGreaterThanOrEqual(3); // At least 3 for severity
  });

  it('displays assessment type breakdown correctly', () => {
    renderComponent();

    // Check assessment types are displayed
    expect(screen.getByText('Health Services')).toBeInTheDocument();
    expect(screen.getByText('Food Security')).toBeInTheDocument();
    expect(screen.getByText('Water & Sanitation')).toBeInTheDocument();
    expect(screen.getByText('Shelter & Housing')).toBeInTheDocument();
    expect(screen.getByText('Security & Protection')).toBeInTheDocument();

    // Check specific values
    expect(screen.getByText('45 entities affected')).toBeInTheDocument(); // Health
    expect(screen.getByText('45.0%')).toBeInTheDocument(); // Health percentage
  });

  it('shows export button and handles export correctly', async () => {
    const { exportGapAnalysisToCsv } = require('@/utils/export/gapAnalysisCsv');
    
    renderComponent();

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();

    await user.click(exportButton);

    await waitFor(() => {
      expect(exportGapAnalysisToCsv).toHaveBeenCalledWith(mockGapAnalysisData, {
        incidentId: "test-incident-001",
        incidentName: "Test Incident",
        includeMetadata: true,
        includeTimestamps: true
      });
    });
  });

  it('disables export button when no data is provided', () => {
    renderComponent({ data: undefined });

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('shows loading state correctly', () => {
    renderComponent({ isLoading: true });

    expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    expect(screen.queryByText('Gap Analysis Summary')).toBeInTheDocument();
    
    // Should not show data when loading
    expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
  });

  it('shows no data state when no data is provided', () => {
    renderComponent({ data: undefined, isLoading: false });

    expect(screen.getByText('No gap analysis data available')).toBeInTheDocument();
    expect(screen.getByText('Select an incident to view gap analysis')).toBeInTheDocument();
  });

  it('validates data before export', async () => {
    const { validateGapAnalysisData, exportGapAnalysisToCsv } = require('@/utils/export/gapAnalysisCsv');
    
    // Mock validation to fail
    validateGapAnalysisData.mockReturnValue({ 
      isValid: false, 
      error: 'Invalid data format' 
    });

    renderComponent();

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    // Should not call export if validation fails
    await waitFor(() => {
      expect(exportGapAnalysisToCsv).not.toHaveBeenCalled();
    });
  });

  it('displays last updated timestamp when data is provided', () => {
    renderComponent();

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    // Check for the refresh icon and timestamp text pattern
    const refreshIcon = screen.getByTestId('refresh-icon');
    expect(refreshIcon).toBeInTheDocument();
  });

  it('shows correct severity colors based on data', () => {
    renderComponent();

    const gapIndicators = screen.getAllByTestId('gap-indicator');
    
    // Should have indicators for overall status and each assessment type
    expect(gapIndicators.length).toBeGreaterThan(5);
    
    // Check that at least some indicators have valid severity values
    const validSeverities = gapIndicators
      .map(indicator => indicator.getAttribute('data-severity'))
      .filter(severity => severity && ['HIGH', 'MEDIUM', 'LOW', 'CRITICAL'].includes(severity));
    
    expect(validSeverities.length).toBeGreaterThan(0);
  });

  it('handles custom export function when provided', async () => {
    const customExport = jest.fn();
    
    renderComponent({ onExport: customExport });

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    expect(customExport).toHaveBeenCalledTimes(1);
  });

  it('calculates percentages correctly for assessment types', () => {
    const dataWithMixedPercentage = {
      ...mockGapAnalysisData,
      totalEntities: 50,
      assessmentTypeGaps: {
        ...mockGapAnalysisData.assessmentTypeGaps,
        HEALTH: {
          severity: 'high' as const,
          entitiesAffected: 25,
          percentage: 50.0
        }
      }
    };

    renderComponent({ data: dataWithMixedPercentage });

    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });
});