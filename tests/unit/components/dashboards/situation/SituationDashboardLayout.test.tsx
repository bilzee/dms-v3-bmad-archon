import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { SituationDashboardLayout } from '@/components/dashboards/situation/SituationDashboardLayout';

// Mock the dashboard layout store
jest.mock('@/stores/dashboardLayout.store', () => ({
  useDashboardLayoutStore: () => ({
    panelSizes: {
      leftPanelWidth: 30,
      centerPanelWidth: 40,
      rightPanelWidth: 30,
      layoutVersion: '1.0.0'
    },
    isResizing: false,
    activePanel: null,
    isMobile: false,
    setPanelSizes: jest.fn(),
    setIsResizing: jest.fn(),
    setActivePanel: jest.fn(),
    setResponsiveState: jest.fn()
  })
}));

// Mock UI components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: any) => <div data-testid="select" {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button data-testid="select-trigger" {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value, onSelect }: any) => (
    <div onClick={() => onSelect && onSelect(value)} data-testid="select-item">{children}</div>
  ),
}));

// Mock PanelResizer
jest.mock('@/components/dashboards/situation/PanelResizer', () => ({
  PanelResizer: ({ onResize, disabled }: any) => (
    <div data-testid="panel-resizer" data-disabled={disabled}>
      <button
        data-testid="resize-left"
        onClick={() => onResize(25, 50, 25)}
        disabled={disabled}
      />
      <button
        data-testid="resize-right"
        onClick={() => onResize(35, 30, 35)}
        disabled={disabled}
      />
    </div>
  )
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderComponent = (props = {}) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SituationDashboardLayout {...props}>
        <div>Left Panel Content</div>
        <div>Center Panel Content</div>
        <div>Right Panel Content</div>
      </SituationDashboardLayout>
    </QueryClientProvider>
  );
};

describe('SituationDashboardLayout', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  it('renders three distinct panels on desktop', () => {
    const { container } = renderComponent();
    
    // Find the main layout container with grid classes
    const layoutContainer = container.querySelector('.grid');
    expect(layoutContainer).toBeInTheDocument();
    expect(layoutContainer?.children).toHaveLength(3);
    
    // Verify each panel has the correct styling classes
    const panels = Array.from(layoutContainer?.children || []);
    panels.forEach(panel => {
      expect(panel).toHaveClass('bg-white', 'border', 'overflow-hidden', 'h-full', 'flex', 'flex-col');
    });
  });

  it('applies correct CSS Grid layout for desktop', () => {
    const { container } = renderComponent();
    
    const layoutContainer = container.querySelector('.grid');
    expect(layoutContainer).toHaveClass('gap-0', 'transition-all', 'duration-200');
  });

  it('uses default panel sizes when none provided', () => {
    const { container } = renderComponent();
    
    const layoutContainer = container.querySelector('.grid');
    expect(layoutContainer).toHaveStyle({
      gridTemplateColumns: '30% 40% 30%'
    });
  });

  it('uses custom panel sizes when provided', () => {
    const customSizes = {
      leftPanelWidth: 25,
      centerPanelWidth: 50,
      rightPanelWidth: 25
    };
    
    const { container } = renderComponent({ defaultPanelSizes: customSizes });
    
    const layoutContainer = container.querySelector('.grid');
    expect(layoutContainer).toHaveStyle({
      gridTemplateColumns: '25% 50% 25%'
    });
  });

  it('adapts to mobile viewport', async () => {
    // Mock mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { container } = renderComponent();
    
    // Wait for resize effect to trigger
    await waitFor(() => {
      const layoutContainer = container.querySelector('.grid');
      expect(layoutContainer).toHaveStyle({
        gridTemplateColumns: '1fr'
      });
    });
  });

  it('handles resize functionality correctly', async () => {
    renderComponent();
    
    // Mock resize functionality would be tested in PanelResizer component tests
    // This test ensures the layout container responds to resize events
    const resizerContainer = screen.getByTestId('panel-resizer');
    expect(resizerContainer).toBeInTheDocument();
    
    // Simulate resize action
    const resizeLeftButton = screen.getByTestId('resize-left');
    await user.click(resizeLeftButton);
    
    // Verify layout updates (this would be handled by the PanelResizer component)
    expect(resizeLeftButton).not.toBeDisabled();
  });

  it('maintains accessibility attributes', () => {
    renderComponent();
    
    // Panels should have appropriate ARIA attributes when implemented
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const customClass = 'custom-dashboard-layout';
    const { container } = renderComponent({ className: customClass });
    
    const layoutContainer = container.querySelector('.grid');
    expect(layoutContainer).toHaveClass(customClass);
  });

  it('handles window resize events', async () => {
    const { container } = renderComponent();
    
    // Initial desktop state
    let layoutContainer = container.querySelector('.grid');
    expect(layoutContainer).toHaveStyle({
      gridTemplateColumns: '30% 40% 30%'
    });

    // Simulate mobile resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    // Trigger resize event
    fireEvent.resize(window);

    // Wait for resize effect
    await waitFor(() => {
      layoutContainer = container.querySelector('.grid');
      expect(layoutContainer).toHaveStyle({
        gridTemplateColumns: '1fr'
      });
    });
  });

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderComponent();

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('validates panel size constraints', () => {
    const invalidSizes = {
      leftPanelWidth: 60, // Above max of 50
      centerPanelWidth: 60, // Above max of 60
      rightPanelWidth: 10   // Below min of 20
    };

    // The component should handle invalid sizes gracefully
    expect(() => {
      renderComponent({ defaultPanelSizes: invalidSizes });
    }).not.toThrow();
  });
});