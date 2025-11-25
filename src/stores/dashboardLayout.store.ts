import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PanelConfiguration {
  leftPanelWidth: number;
  centerPanelWidth: number;
  rightPanelWidth: number;
  layoutVersion: string;
}

interface DashboardLayoutState {
  // Panel configuration
  panelSizes: PanelConfiguration;
  
  // Resize state
  isResizing: boolean;
  activePanel: 'left' | 'center' | 'right' | null;
  
  // Responsive behavior
  isMobile: boolean;
  isTablet: boolean;
  
  // Incident management
  selectedIncidentId: string | null;
  incidentHistory: string[]; // Last 5 selected incidents
  realTimeUpdates: boolean;
  
  // Entity management
  selectedEntityId: string | null;
  entityHistory: string[]; // Last 5 selected entities
  includeAllEntities: boolean; // Whether to show "All Entities" aggregated data
  
  // Map state management (Story 7.4)
  mapViewport: {
    center: { lat: number; lng: number } | null;
    zoom: number | null;
    bounds: {
      northEast: { lat: number; lng: number };
      southWest: { lat: number; lng: number };
    } | null;
  };
  donorOverlayEnabled: boolean;
  selectedEntityFromMap: string | null;
  mapInitialized: boolean;
  
  // Actions
  setPanelSize: (panel: 'left' | 'center' | 'right', width: number) => void;
  setPanelSizes: (sizes: { left: number; center: number; right: number }) => void;
  setIsResizing: (resizing: boolean) => void;
  setActivePanel: (panel: 'left' | 'center' | 'right' | null) => void;
  setResponsiveState: (isMobile: boolean, isTablet: boolean) => void;
  
  // Incident actions
  setSelectedIncident: (incidentId: string | null) => void;
  addToIncidentHistory: (incidentId: string) => void;
  clearIncidentHistory: () => void;
  setRealTimeUpdates: (enabled: boolean) => void;
  
  // Entity actions
  setSelectedEntity: (entityId: string | null) => void;
  setIncludeAllEntities: (includeAll: boolean) => void;
  addToEntityHistory: (entityId: string) => void;
  clearEntityHistory: () => void;
  
  // Map actions (Story 7.4)
  setMapViewport: (center: { lat: number; lng: number } | null, zoom: number | null, bounds?: any) => void;
  setDonorOverlayEnabled: (enabled: boolean) => void;
  setSelectedEntityFromMap: (entityId: string | null) => void;
  setMapInitialized: (initialized: boolean) => void;
  
  // Layout preferences
  saveLayoutPreferences: () => void;
  loadLayoutPreferences: () => void;
  resetLayout: () => void;
  
  // Utility methods
  validatePanelSizes: (sizes: { left: number; center: number; right: number }) => boolean;
  constrainPanelSize: (panel: 'left' | 'center' | 'right', size: number) => number;
}

// Default panel configuration
const DEFAULT_PANEL_SIZES: PanelConfiguration = {
  leftPanelWidth: 30,
  centerPanelWidth: 40,
  rightPanelWidth: 30,
  layoutVersion: '1.0.0'
};

// Panel size constraints
const PANEL_CONSTRAINTS = {
  left: { min: 20, max: 50 },
  center: { min: 20, max: 60 },
  right: { min: 20, max: 50 }
};

/**
 * Zustand store for dashboard layout state and preferences
 * 
 * Features:
 * - Panel size management with constraints
 * - Resize state tracking
 * - Responsive behavior state
 * - Layout preference persistence
 * - Layout reset functionality
 */
export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      // Initial state
      panelSizes: DEFAULT_PANEL_SIZES,
      isResizing: false,
      activePanel: null,
      isMobile: false,
      isTablet: false,
      
      // Incident management initial state
      selectedIncidentId: null,
      incidentHistory: [],
      realTimeUpdates: false,
      
      // Entity management initial state
      selectedEntityId: null,
      entityHistory: [],
      includeAllEntities: true, // Default to "All Entities" view
      
      // Map state initial state (Story 7.4)
      mapViewport: {
        center: null,
        zoom: null,
        bounds: null
      },
      donorOverlayEnabled: false,
      selectedEntityFromMap: null,
      mapInitialized: false,

      // Panel size setters
      setPanelSize: (panel, width) => {
        const state = get();
        const constrainedWidth = state.constrainPanelSize(panel, width);
        
        set({
          panelSizes: {
            ...state.panelSizes,
            [`${panel}PanelWidth`]: constrainedWidth
          }
        });
      },

      setPanelSizes: (sizes) => {
        if (!get().validatePanelSizes(sizes)) {
          console.warn('Invalid panel sizes provided:', sizes);
          return;
        }

        const state = get();
        set({
          panelSizes: {
            ...state.panelSizes,
            leftPanelWidth: sizes.left,
            centerPanelWidth: sizes.center,
            rightPanelWidth: sizes.right
          }
        });
      },

      // Resize state setters
      setIsResizing: (resizing) => set({ isResizing: resizing }),
      setActivePanel: (panel) => set({ activePanel: panel }),

      // Responsive state setters
      setResponsiveState: (isMobile, isTablet) => 
        set({ isMobile, isTablet }),

      // Incident management actions
      setSelectedIncident: (incidentId) => {
        const state = get();
        set({ selectedIncidentId: incidentId });
        
        // Add to history if a valid incident was selected
        if (incidentId) {
          state.addToIncidentHistory(incidentId);
        }
      },

      addToIncidentHistory: (incidentId) => {
        const state = get();
        const history = state.incidentHistory.filter(id => id !== incidentId); // Remove if exists
        history.unshift(incidentId); // Add to front
        
        // Keep only last 5 incidents
        const limitedHistory = history.slice(0, 5);
        set({ incidentHistory: limitedHistory });
      },

      clearIncidentHistory: () => 
        set({ incidentHistory: [] }),

      setRealTimeUpdates: (enabled) => 
        set({ realTimeUpdates: enabled }),

      // Entity management actions
      setSelectedEntity: (entityId) => {
        const state = get();
        set({ 
          selectedEntityId: entityId,
          includeAllEntities: entityId === 'all' // Set includeAllEntities based on selection
        });
        
        // Add to history if a valid entity was selected (not "all")
        if (entityId && entityId !== 'all') {
          state.addToEntityHistory(entityId);
        }
      },

      setIncludeAllEntities: (includeAll) => {
        set({ 
          includeAllEntities: includeAll,
          selectedEntityId: includeAll ? 'all' : null
        });
      },

      addToEntityHistory: (entityId) => {
        const state = get();
        const history = state.entityHistory.filter(id => id !== entityId); // Remove if exists
        history.unshift(entityId); // Add to front
        
        // Keep only last 5 entities
        const limitedHistory = history.slice(0, 5);
        set({ entityHistory: limitedHistory });
      },

      clearEntityHistory: () => 
        set({ entityHistory: [] }),

      // Map actions (Story 7.4)
      setMapViewport: (center, zoom, bounds) => {
        const state = get();
        set({
          mapViewport: {
            center: center || state.mapViewport.center,
            zoom: zoom || state.mapViewport.zoom,
            bounds: bounds || state.mapViewport.bounds
          }
        });
      },

      setDonorOverlayEnabled: (enabled) => 
        set({ donorOverlayEnabled: enabled }),

      setSelectedEntityFromMap: (entityId) => {
        const state = get();
        set({ selectedEntityFromMap: entityId });
        
        // Also update the main selected entity if coming from map
        if (entityId && entityId !== state.selectedEntityId) {
          state.setSelectedEntity(entityId);
          state.addToEntityHistory(entityId);
        }
      },

      setMapInitialized: (initialized) => 
        set({ mapInitialized: initialized }),

      // Layout preferences
      saveLayoutPreferences: () => {
        // Automatically handled by persist middleware
        const state = get();
        console.log('Layout preferences saved:', state.panelSizes);
      },

      loadLayoutPreferences: () => {
        // Automatically loaded by persist middleware on store initialization
        const state = get();
        console.log('Layout preferences loaded:', state.panelSizes);
      },

      resetLayout: () => {
        set({
          panelSizes: DEFAULT_PANEL_SIZES,
          activePanel: null,
          isResizing: false
        });
        console.log('Layout reset to defaults');
      },

      // Utility methods
      validatePanelSizes: (sizes) => {
        const total = sizes.left + sizes.center + sizes.right;
        const isValid = Math.abs(total - 100) < 0.1; // Allow small floating point errors
        
        if (!isValid) {
          console.error(`Panel sizes must sum to 100%, got ${total}%`);
          return false;
        }

        // Check individual panel constraints
        Object.entries(sizes).forEach(([panel, size]) => {
          const constraints = PANEL_CONSTRAINTS[panel as keyof typeof PANEL_CONSTRAINTS];
          if (size < constraints.min || size > constraints.max) {
            console.error(`${panel} panel size ${size}% is outside constraints [${constraints.min}-${constraints.max}]`);
            return false;
          }
        });

        return true;
      },

      constrainPanelSize: (panel, size) => {
        const constraints = PANEL_CONSTRAINTS[panel];
        return Math.max(constraints.min, Math.min(constraints.max, size));
      }
    }),
    {
      name: 'dashboard-layout-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        panelSizes: state.panelSizes,
        selectedIncidentId: state.selectedIncidentId,
        incidentHistory: state.incidentHistory,
        realTimeUpdates: state.realTimeUpdates,
        selectedEntityId: state.selectedEntityId,
        entityHistory: state.entityHistory,
        includeAllEntities: state.includeAllEntities,
        donorOverlayEnabled: state.donorOverlayEnabled, // Persist donor overlay preference
        // Don't persist responsive state, resize state, or map viewport
        // These should be recalculated on each session
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Dashboard layout store rehydrated:', {
          panelSizes: state?.panelSizes,
          selectedIncidentId: state?.selectedIncidentId,
          incidentHistory: state?.incidentHistory,
          realTimeUpdates: state?.realTimeUpdates,
          selectedEntityId: state?.selectedEntityId,
          entityHistory: state?.entityHistory,
          includeAllEntities: state?.includeAllEntities
        });
      }
    }
  )
);

// Selectors for optimized component subscriptions
export const usePanelSizes = () => useDashboardLayoutStore((state) => state.panelSizes);
export const useResizeState = () => useDashboardLayoutStore((state) => ({
  isResizing: state.isResizing,
  activePanel: state.activePanel
}));
export const useResponsiveState = () => useDashboardLayoutStore((state) => ({
  isMobile: state.isMobile,
  isTablet: state.isTablet
}));

// Incident management selectors
export const useIncidentSelection = () => useDashboardLayoutStore((state) => ({
  selectedIncidentId: state.selectedIncidentId,
  incidentHistory: state.incidentHistory,
  realTimeUpdates: state.realTimeUpdates
}));

export const useIncidentActions = () => useDashboardLayoutStore((state) => ({
  setSelectedIncident: state.setSelectedIncident,
  addToIncidentHistory: state.addToIncidentHistory,
  clearIncidentHistory: state.clearIncidentHistory,
  setRealTimeUpdates: state.setRealTimeUpdates
}));

// Entity management selectors
export const useEntitySelection = () => useDashboardLayoutStore((state) => ({
  selectedEntityId: state.selectedEntityId,
  entityHistory: state.entityHistory,
  includeAllEntities: state.includeAllEntities
}));

export const useEntityActions = () => useDashboardLayoutStore((state) => ({
  setSelectedEntity: state.setSelectedEntity,
  setIncludeAllEntities: state.setIncludeAllEntities,
  addToEntityHistory: state.addToEntityHistory,
  clearEntityHistory: state.clearEntityHistory
}));

export const useLayoutActions = () => useDashboardLayoutStore((state) => ({
  setPanelSize: state.setPanelSize,
  setPanelSizes: state.setPanelSizes,
  setIsResizing: state.setIsResizing,
  setActivePanel: state.setActivePanel,
  setResponsiveState: state.setResponsiveState,
  saveLayoutPreferences: state.saveLayoutPreferences,
  resetLayout: state.resetLayout
}));

export default useDashboardLayoutStore;