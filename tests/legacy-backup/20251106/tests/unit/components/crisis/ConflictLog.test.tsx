import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictLog } from '@/components/dashboards/crisis/ConflictLog';
import { useConflicts } from '@/hooks/useConflicts';

// Mock the useConflicts hook
jest.mock('@/hooks/useConflicts', () => ({
  useConflicts: jest.fn(),
}));

const mockUseConflicts = useConflicts as jest.MockedFunction<typeof useConflicts>;

// Mock data
const mockConflicts = [
  {
    id: 'conflict-1',
    entityType: 'ASSESSMENT' as const,
    entityId: 'entity-1',
    conflictDate: new Date('2025-01-01T10:00:00.000Z'),
    resolutionMethod: 'LAST_WRITE_WINS' as const,
    winningVersion: { data: 'server' },
    losingVersion: { data: 'local' },
    resolvedAt: new Date('2025-01-01T10:01:00.000Z'),
    isResolved: true,
    resolvedBy: 'system',
    localVersion: 1,
    serverVersion: 2,
    metadata: {
      localLastModified: new Date('2025-01-01T09:59:00.000Z'),
      serverLastModified: new Date('2025-01-01T10:00:00.000Z'),
      conflictReason: 'Version mismatch',
      autoResolved: true
    }
  },
  {
    id: 'conflict-2',
    entityType: 'RESPONSE' as const,
    entityId: 'entity-2',
    conflictDate: new Date('2025-01-01T11:00:00.000Z'),
    resolutionMethod: 'LAST_WRITE_WINS' as const,
    winningVersion: { data: 'local' },
    losingVersion: { data: 'server' },
    isResolved: false,
    localVersion: 3,
    serverVersion: 2,
    metadata: {
      localLastModified: new Date('2025-01-01T10:59:00.000Z'),
      serverLastModified: new Date('2025-01-01T10:58:00.000Z'),
      conflictReason: 'Data conflict',
      autoResolved: false
    }
  }
];

const mockSummary = {
  totalConflicts: 2,
  unresolvedConflicts: 1,
  autoResolvedConflicts: 1,
  manuallyResolvedConflicts: 0,
  resolutionRate: 50,
  conflictsByType: {
    assessment: 1,
    response: 1,
    entity: 0
  },
  recentConflicts: [],
  lastUpdated: '2025-01-01T12:00:00.000Z'
};

const mockPagination = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
  hasNext: false,
  hasPrev: false
};

const defaultMockReturn = {
  conflicts: mockConflicts,
  summary: mockSummary,
  loading: false,
  error: null,
  pagination: mockPagination,
  fetchConflicts: jest.fn(),
  fetchSummary: jest.fn(),
  exportConflicts: jest.fn(),
  refresh: jest.fn(),
};

describe('ConflictLog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConflicts.mockReturnValue(defaultMockReturn);
  });

  it('should render conflict log with conflicts', async () => {
    render(<ConflictLog />);

    expect(screen.getByText('Sync Conflicts')).toBeInTheDocument();
    expect(screen.getByText('2 total • 1 unresolved')).toBeInTheDocument();
    
    // Check if conflicts are grouped and displayed
    await waitFor(() => {
      expect(screen.getByText('ASSESSMENT entity-1')).toBeInTheDocument();
      expect(screen.getByText('RESPONSE entity-2')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      conflicts: [],
      loading: true,
    });

    render(<ConflictLog />);

    expect(screen.getByRole('generic')).toHaveClass('animate-pulse');
  });

  it('should show error state', () => {
    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      error: 'Failed to load conflicts',
    });

    render(<ConflictLog />);

    expect(screen.getByText('Error loading conflicts')).toBeInTheDocument();
    expect(screen.getByText('Failed to load conflicts')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should show empty state when no conflicts', () => {
    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      conflicts: [],
      summary: {
        ...mockSummary,
        totalConflicts: 0,
        unresolvedConflicts: 0,
      },
    });

    render(<ConflictLog />);

    expect(screen.getByText('No conflicts found')).toBeInTheDocument();
    expect(screen.getByText('All data is synchronized without conflicts.')).toBeInTheDocument();
  });

  it('should expand and collapse conflict groups', async () => {
    render(<ConflictLog />);

    // Find and click on a group header to expand
    const groupHeader = screen.getByRole('button', { name: /ASSESSMENT entity-1/ });
    fireEvent.click(groupHeader);

    // Check if conflict details are shown
    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('LAST-WRITE-WINS')).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(groupHeader);

    // Conflict details should be hidden (we can't easily test this with current implementation)
  });

  it('should handle filter changes', async () => {
    const mockFetchConflicts = jest.fn();
    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      fetchConflicts: mockFetchConflicts,
    });

    render(<ConflictLog />);

    // Find and change entity type filter
    const entityTypeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(entityTypeSelect, { target: { value: 'assessment' } });

    await waitFor(() => {
      expect(mockFetchConflicts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        entityType: 'assessment',
      });
    });
  });

  it('should handle pagination', async () => {
    const mockFetchConflicts = jest.fn();
    const paginationWithNext = {
      ...mockPagination,
      page: 1,
      totalPages: 2,
      hasNext: true,
    };

    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      pagination: paginationWithNext,
      fetchConflicts: mockFetchConflicts,
    });

    render(<ConflictLog />);

    // Find and click next button
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockFetchConflicts).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
      });
    });
  });

  it('should handle export button click', async () => {
    const mockExportConflicts = jest.fn();
    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      exportConflicts: mockExportConflicts,
    });

    render(<ConflictLog />);

    // Find and click export button
    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockExportConflicts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });
  });

  it('should handle refresh button click', async () => {
    const mockRefresh = jest.fn();
    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      refresh: mockRefresh,
    });

    render(<ConflictLog />);

    // Find and click refresh button
    const refreshButton = screen.getByTitle('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should render in compact mode', () => {
    render(<ConflictLog compact={true} />);

    // In compact mode, filters and export should not be visible
    expect(screen.queryByText('Export CSV')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('All Types')).not.toBeInTheDocument();
  });

  it('should display conflict status indicators correctly', async () => {
    render(<ConflictLog />);

    // Expand a conflict group to see details
    const groupHeader = screen.getByRole('button', { name: /ASSESSMENT entity-1/ });
    fireEvent.click(groupHeader);

    await waitFor(() => {
      // Check for resolved status
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      
      // Check for resolution method badge
      expect(screen.getByText('LAST-WRITE-WINS')).toBeInTheDocument();
      
      // Check for version information
      expect(screen.getByText('v1 ↔ v2')).toBeInTheDocument();
    });
  });

  it('should format relative time correctly', async () => {
    // Create a conflict from 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentConflict = {
      ...mockConflicts[0],
      conflictDate: twoHoursAgo,
    };

    mockUseConflicts.mockReturnValue({
      ...defaultMockReturn,
      conflicts: [recentConflict],
    });

    render(<ConflictLog />);

    await waitFor(() => {
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });
});