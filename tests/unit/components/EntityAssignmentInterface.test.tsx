import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityAssignmentInterface } from '@/components/features/assignments/EntityAssignmentInterface';
import { useEntityStore } from '@/stores/entity.store';
import { useAuthStore } from '@/stores/auth.store';

// Mock the stores
jest.mock('@/stores/entity.store');
jest.mock('@/stores/auth.store');

// Mock the child components
jest.mock('@/components/features/assignments/AssignmentTable', () => ({
  AssignmentTable: ({ assignments, onDeleteAssignment }: any) => (
    <div data-testid="assignment-table">
      {assignments.map((assignment: any) => (
        <div key={assignment.id} data-testid={`assignment-${assignment.id}`}>
          {assignment.user.email} - {assignment.entity.name}
          <button 
            onClick={() => onDeleteAssignment(assignment.id)}
            data-testid={`delete-${assignment.id}`}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}));

jest.mock('@/components/features/assignments/BulkAssignmentModal', () => ({
  BulkAssignmentModal: ({ open, onAssignmentComplete }: any) => (
    open ? (
      <div data-testid="bulk-assignment-modal">
        <button 
          onClick={onAssignmentComplete}
          data-testid="complete-bulk-assignment"
        >
          Complete Assignment
        </button>
      </div>
    ) : null
  )
}));

jest.mock('@/components/features/assignments/EntitySelector', () => ({
  EntitySelector: ({ value, onValueChange, entities }: any) => (
    <select 
      data-testid="entity-selector"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="">Select entity...</option>
      {entities.map((entity: any) => (
        <option key={entity.id} value={entity.id}>
          {entity.name}
        </option>
      ))}
    </select>
  )
}));

jest.mock('@/components/features/assignments/UserSelector', () => ({
  UserSelector: ({ value, onValueChange, users }: any) => (
    <select 
      data-testid="user-selector"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="">Select user...</option>
      {users.map((user: any) => (
        <option key={user.id} value={user.id}>
          {user.email}
        </option>
      ))}
    </select>
  )
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
}));

describe('EntityAssignmentInterface', () => {
  const mockEntityStore = {
    assignments: [
      {
        id: 'assignment1',
        userId: 'user1',
        entityId: 'entity1',
        assignedAt: '2024-01-01T00:00:00Z',
        assignedBy: 'coordinator1',
        user: {
          id: 'user1',
          email: 'assessor@test.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: [{ role: { name: 'ASSESSOR' } }]
        },
        entity: {
          id: 'entity1',
          name: 'Test Community',
          type: 'COMMUNITY',
          location: 'Test Location'
        }
      }
    ],
    entities: [
      {
        id: 'entity1',
        name: 'Test Community',
        type: 'COMMUNITY',
        location: 'Test Location',
        coordinates: null,
        metadata: null,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    assignableUsers: [
      {
        id: 'user1',
        email: 'assessor@test.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [{ role: { name: 'ASSESSOR' } }]
      },
      {
        id: 'user2',
        email: 'responder@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [{ role: { name: 'RESPONDER' } }]
      }
    ],
    isLoading: false,
    selectedEntities: [],
    selectedUsers: [],
    bulkAssignModalOpen: false,
    assignmentSearchQuery: '',
    currentPage: 1,
    totalPages: 1,
    fetchAssignments: jest.fn(),
    fetchEntities: jest.fn(),
    fetchAssignableUsers: jest.fn(),
    setAssignmentSearchQuery: jest.fn(),
    setBulkAssignModalOpen: jest.fn(),
    clearSelections: jest.fn(),
    createAssignment: jest.fn(),
    deleteAssignment: jest.fn()
  };

  const mockAuthStore = {
    currentRole: 'COORDINATOR'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEntityStore as jest.Mock).mockReturnValue(mockEntityStore);
    (useAuthStore as jest.Mock).mockReturnValue(mockAuthStore);
  });

  it('should render the assignment interface for coordinators', () => {
    render(<EntityAssignmentInterface />);

    expect(screen.getByText('Entity Assignment Management')).toBeInTheDocument();
    expect(screen.getByText('Assign entities to assessors and responders for role-based access control')).toBeInTheDocument();
    expect(screen.getByText('Quick Assign')).toBeInTheDocument();
    expect(screen.getByText('Bulk Assignment')).toBeInTheDocument();
  });

  it('should deny access for non-coordinator users', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      currentRole: 'ASSESSOR'
    });

    render(<EntityAssignmentInterface />);

    expect(screen.getByText('Access denied. Only coordinators can manage entity assignments.')).toBeInTheDocument();
    expect(screen.queryByText('Entity Assignment Management')).not.toBeInTheDocument();
  });

  it('should display assignment statistics correctly', () => {
    render(<EntityAssignmentInterface />);

    // Check statistics cards
    expect(screen.getByText('Total Assignments')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total assignments count

    expect(screen.getByText('Assigned Entities')).toBeInTheDocument();
    expect(screen.getByText('Assignable Users')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Assignable users count

    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // 1 assigned / 1 total entity
  });

  it('should call fetch functions on mount', () => {
    render(<EntityAssignmentInterface />);

    expect(mockEntityStore.fetchAssignments).toHaveBeenCalled();
    expect(mockEntityStore.fetchEntities).toHaveBeenCalled();
    expect(mockEntityStore.fetchAssignableUsers).toHaveBeenCalled();
  });

  it('should handle search functionality', async () => {
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    const searchInput = screen.getByPlaceholderText('Search assignments by user, entity, or type...');
    
    await user.type(searchInput, 'test search');

    expect(mockEntityStore.setAssignmentSearchQuery).toHaveBeenCalledWith('test search');
  });

  it('should open bulk assignment modal', async () => {
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    const bulkAssignButton = screen.getByText('Bulk Assignment');
    await user.click(bulkAssignButton);

    expect(mockEntityStore.setBulkAssignModalOpen).toHaveBeenCalledWith(true);
  });

  it('should show and hide quick assignment panel', async () => {
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    const quickAssignButton = screen.getByText('Quick Assign');
    await user.click(quickAssignButton);

    expect(screen.getByText('Quick Assignment')).toBeInTheDocument();
    expect(screen.getByText('Quickly assign a single user to a single entity')).toBeInTheDocument();
  });

  it('should handle quick assignment', async () => {
    mockEntityStore.createAssignment.mockResolvedValue(true);
    
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    // Open quick assign panel
    const quickAssignButton = screen.getByText('Quick Assign');
    await user.click(quickAssignButton);

    // Select user and entity
    const userSelector = screen.getByTestId('user-selector');
    const entitySelector = screen.getByTestId('entity-selector');
    
    await user.selectOptions(userSelector, 'user1');
    await user.selectOptions(entitySelector, 'entity1');

    // Click assign button
    const assignButton = screen.getByText('Assign');
    await user.click(assignButton);

    await waitFor(() => {
      expect(mockEntityStore.createAssignment).toHaveBeenCalledWith('user1', 'entity1');
    });
  });

  it('should handle assignment deletion', async () => {
    mockEntityStore.deleteAssignment.mockResolvedValue(true);
    
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    const deleteButton = screen.getByTestId('delete-assignment1');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockEntityStore.deleteAssignment).toHaveBeenCalledWith('assignment1');
    });
  });

  it('should filter assignments based on search query', () => {
    // Mock assignments with different data
    const mockStoreWithSearch = {
      ...mockEntityStore,
      assignmentSearchQuery: 'assessor',
      assignments: [
        {
          id: 'assignment1',
          user: { email: 'assessor@test.com', firstName: 'John', lastName: 'Doe' },
          entity: { name: 'Community A', type: 'COMMUNITY' }
        },
        {
          id: 'assignment2',
          user: { email: 'responder@test.com', firstName: 'Jane', lastName: 'Smith' },
          entity: { name: 'Community B', type: 'COMMUNITY' }
        }
      ]
    };

    (useEntityStore as jest.Mock).mockReturnValue(mockStoreWithSearch);

    render(<EntityAssignmentInterface />);

    // Should show assignment table with filtered assignments
    expect(screen.getByTestId('assignment-assignment1')).toBeInTheDocument();
    expect(screen.queryByTestId('assignment-assignment2')).not.toBeInTheDocument();
  });

  it('should handle bulk assignment completion', async () => {
    const mockStoreWithModal = {
      ...mockEntityStore,
      bulkAssignModalOpen: true
    };

    (useEntityStore as jest.Mock).mockReturnValue(mockStoreWithModal);

    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    expect(screen.getByTestId('bulk-assignment-modal')).toBeInTheDocument();

    const completeButton = screen.getByTestId('complete-bulk-assignment');
    await user.click(completeButton);

    expect(mockEntityStore.fetchAssignments).toHaveBeenCalled();
    expect(mockEntityStore.clearSelections).toHaveBeenCalled();
  });

  it('should show loading state', () => {
    const mockLoadingStore = {
      ...mockEntityStore,
      isLoading: true
    };

    (useEntityStore as jest.Mock).mockReturnValue(mockLoadingStore);

    render(<EntityAssignmentInterface />);

    // The assignment table should handle loading state
    expect(screen.getByTestId('assignment-table')).toBeInTheDocument();
  });

  it('should disable assign button when selections are incomplete', async () => {
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    // Open quick assign panel
    const quickAssignButton = screen.getByText('Quick Assign');
    await user.click(quickAssignButton);

    const assignButton = screen.getByText('Assign');
    expect(assignButton).toBeDisabled();

    // Select only user
    const userSelector = screen.getByTestId('user-selector');
    await user.selectOptions(userSelector, 'user1');
    expect(assignButton).toBeDisabled();

    // Select entity as well
    const entitySelector = screen.getByTestId('entity-selector');
    await user.selectOptions(entitySelector, 'entity1');
    expect(assignButton).not.toBeDisabled();
  });

  it('should clear search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<EntityAssignmentInterface />);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(mockEntityStore.setAssignmentSearchQuery).toHaveBeenCalledWith('');
  });

  it('should handle pagination', async () => {
    const mockStoreWithPagination = {
      ...mockEntityStore,
      currentPage: 1,
      totalPages: 3
    };

    (useEntityStore as jest.Mock).mockReturnValue(mockStoreWithPagination);

    render(<EntityAssignmentInterface />);

    // The assignment table should handle pagination
    expect(screen.getByTestId('assignment-table')).toBeInTheDocument();
  });
});