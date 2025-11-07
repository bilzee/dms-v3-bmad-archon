import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleSwitcher } from '@/components/layouts/RoleSwitcher';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeftRight: () => <div data-testid="arrow-left-right-icon" />,
  Check: () => <div data-testid="check-icon" />,
  TriangleAlert: () => <div data-testid="triangle-alert-icon" />,
  User: () => <div data-testid="user-icon" />
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/assessor/dashboard'
  },
  writable: true
});

describe('RoleSwitcher Component', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default auth state
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      },
      isAuthenticated: true,
      currentRole: 'ASSESSOR',
      availableRoles: ['ASSESSOR', 'COORDINATOR'],
      switchRole: jest.fn(),
      canSwitchToRole: jest.fn(),
      saveRoleSession: jest.fn(),
      getRoleSession: jest.fn(),
      clearRoleSession: jest.fn(),
      getCurrentRolePermissions: jest.fn(),
      token: 'token',
      roles: ['ASSESSOR', 'COORDINATOR'],
      permissions: ['ASSESSMENT_CREATE'],
      login: jest.fn(),
      logout: jest.fn(),
      refresh: jest.fn(),
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
      hasAnyRole: jest.fn()
    });
  });

  describe('Component Rendering', () => {
    it('should not render when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isAuthenticated: false
      });

      render(<RoleSwitcher />);
      
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });

    it('should not render when user has only one role', () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        availableRoles: ['ASSESSOR']
      });

      render(<RoleSwitcher />);
      
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });

    it('should render when user is authenticated with multiple roles', () => {
      render(<RoleSwitcher />);
      
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
      expect(screen.getByText('Assessor')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-left-right-icon')).toBeInTheDocument();
    });

    it('should display current role correctly', () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        currentRole: 'COORDINATOR'
      });

      render(<RoleSwitcher />);
      
      expect(screen.getByText('Coordinator')).toBeInTheDocument();
    });
  });

  describe('Dropdown Menu', () => {
    it('should show dropdown when clicked', async () => {
      render(<RoleSwitcher />);
      
      // Click the role switcher button
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText('Switch Role')).toBeInTheDocument();
      });

      // Check that role options are displayed
      expect(screen.getByText('Assessor')).toBeInTheDocument();
      expect(screen.getByText('Coordinator')).toBeInTheDocument();
    });

    it('should show current role as selected', async () => {
      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Current role should have check icon
        const checkIcons = screen.getAllByTestId('check-icon');
        expect(checkIcons).toHaveLength(1);
      });
    });
  });

  describe('Role Switching', () => {
    it('should call switchRole when clicking different role', async () => {
      const mockSwitchRole = jest.fn();
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        switchRole: mockSwitchRole
      });

      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Click on a different role
        const coordinatorOption = screen.getByText('Coordinator');
        fireEvent.click(coordinatorOption);
      });

      expect(mockSwitchRole).toHaveBeenCalledWith('COORDINATOR');
    });

    it('should show unsaved changes warning when applicable', async () => {
      // Mock checkForUnsavedChanges to return true
      const originalAlert = window.alert;
      window.alert = jest.fn();

      // Add a form with data to the DOM
      document.body.innerHTML = `
        <form data-dirty="true">
          <input value="test" data-initial-value="" />
        </form>
      `;

      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const coordinatorOption = screen.getByText('Coordinator');
        fireEvent.click(coordinatorOption);
      });

      // Should show warning dialog
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      // Restore original alert
      window.alert = originalAlert;
    });

    it('should redirect to correct dashboard after role switch', async () => {
      const mockSwitchRole = jest.fn();
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        switchRole: mockSwitchRole
      });

      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const coordinatorOption = screen.getByText('Coordinator');
        fireEvent.click(coordinatorOption);
      });

      // Should redirect to coordinator dashboard
      expect(window.location.href).toBe('http://localhost:3000/coordinator/dashboard');
    });
  });

  describe('Unsaved Changes Warning', () => {
    it('should show warning dialog when there are unsaved forms', async () => {
      // Add forms with unsaved changes
      document.body.innerHTML = `
        <form data-dirty="true">
          <input type="text" value="test" />
        </form>
      `;

      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const coordinatorOption = screen.getByText('Coordinator');
        fireEvent.click(coordinatorOption);
      });

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
        expect(screen.getByText('Save & Switch')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should close warning when cancel is clicked', async () => {
      document.body.innerHTML = `
        <form data-dirty="true">
          <input type="text" value="test" />
        </form>
      `;

      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const coordinatorOption = screen.getByText('Coordinator');
        fireEvent.click(coordinatorOption);
      });

      // Click cancel on warning
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
      });
    });

    it('should proceed with role switch when Save & Switch is clicked', async () => {
      const mockSwitchRole = jest.fn();
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        switchRole: mockSwitchRole
      });

      document.body.innerHTML = `
        <form data-dirty="true">
          <input type="text" value="test" />
        </form>
      `;

      render(<RoleSwitcher />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        const coordinatorOption = screen.getByText('Coordinator');
        fireEvent.click(coordinatorOption);
      });

      // Click Save & Switch on warning
      const saveSwitchButton = screen.getByText('Save & Switch');
      fireEvent.click(saveSwitchButton);

      await waitFor(() => {
        expect(mockSwitchRole).toHaveBeenCalledWith('COORDINATOR');
        expect(window.location.href).toBe('http://localhost:3000/coordinator/dashboard');
      });
    });
  });
});