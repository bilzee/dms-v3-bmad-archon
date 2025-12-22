# Situation Dashboard UX Enhancement - Phase 2: Interactive Data Exploration & Adaptive Modes

## Handover Note

**From:** Sally (UX Expert)  
**To:** BMad Dev Agent  
**Date:** 2025-12-03  
**Priority:** High  
**Phase:** 2 of 3 - Advanced User Experience  
**Estimated Effort:** 4-5 days  
**Dependencies:** Phase 1 (Visual Hierarchy) complete

---

## 🎯 Phase 2 Executive Summary

Build upon Phase 1's visual improvements by implementing interactive data exploration capabilities and adaptive display modes. This phase transforms the dashboard from a static display into an interactive analysis tool with multiple viewing modes tailored to different user needs.

## 📊 Key Improvements

### 1. Adaptive Display Modes (Executive/Operational/Analytical)
### 2. Interactive Drill-Down Capabilities
### 3. Real-time Update Indicators & Change Notifications
### 4. Enhanced Export Functionality (PDF Reports, Presentation Formats)

---

## 🎨 Implementation Tasks

### Task 1: Adaptive Display Mode System

**Files to Modify:**
- `src/stores/dashboardLayout.store.ts`
- `src/app/(auth)/coordinator/situation-dashboard/page.tsx`
- `src/components/layouts/AppShell.tsx` (or create dashboard toolbar)

#### 1.1 Create Display Mode Management

**File:** `src/stores/dashboardLayout.store.ts`

**Add to interface:**

```typescript
interface DashboardLayoutState {
  // ... existing properties
  
  // Display mode management
  displayMode: 'executive' | 'operational' | 'analytical';
  displayModePreferences: {
    executive: {
      showDetailedMetrics: boolean;
      showDemographics: boolean;
      showRecommendations: boolean;
    };
    operational: {
      showAssessmentDetails: boolean;
      showGapAnalysis: boolean;
      showEntityFilters: boolean;
    };
    analytical: {
      showTrends: boolean;
      showComparisons: boolean;
      showExportOptions: boolean;
    };
  };
  
  // Actions for display mode management
  setDisplayMode: (mode: 'executive' | 'operational' | 'analytical') => void;
  updateDisplayModePreferences: (mode: string, preferences: any) => void;
  getDisplayModeSettings: () => any;
}
```

**Add to store implementation:**

```typescript
// Add to initial state
displayMode: 'operational',
displayModePreferences: {
  executive: {
    showDetailedMetrics: false,
    showDemographics: true,
    showRecommendations: true
  },
  operational: {
    showAssessmentDetails: true,
    showGapAnalysis: true,
    showEntityFilters: true
  },
  analytical: {
    showTrends: true,
    showComparisons: true,
    showExportOptions: true
  }
},

// Add to actions
setDisplayMode: (mode) => {
  set({ displayMode: mode });
  // Optionally save to user preferences
},

updateDisplayModePreferences: (mode, preferences) => {
  const state = get();
  set({
    displayModePreferences: {
      ...state.displayModePreferences,
      [mode]: { ...state.displayModePreferences[mode], ...preferences }
    }
  });
},

getDisplayModeSettings: () => {
  const state = get();
  return {
    mode: state.displayMode,
    preferences: state.displayModePreferences[state.displayMode]
  };
}
```

#### 1.2 Create Display Mode Selector

**New File:** `src/components/dashboards/shared/DisplayModeSelector.tsx`

```typescript
import React from 'react';
import { useDashboardLayoutStore } from '@/stores/dashboardLayout.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  Users,
  FileText
} from 'lucide-react';

const DISPLAY_MODES = {
  executive: {
    label: 'Executive',
    icon: Eye,
    description: 'High-level overview for leadership',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  operational: {
    label: 'Operational',
    icon: Settings,
    description: 'Detailed view for field operations',
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  analytical: {
    label: 'Analytical',
    icon: BarChart3,
    description: 'Data analysis and trends',
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  }
} as const;

export function DisplayModeSelector() {
  const { displayMode, setDisplayMode } = useDashboardLayoutStore();

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg">
      {Object.entries(DISPLAY_MODES).map(([mode, config]) => {
        const Icon = config.icon;
        const isActive = displayMode === mode;
        
        return (
          <Button
            key={mode}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => setDisplayMode(mode as any)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
              isActive 
                ? `${config.color} shadow-sm` 
                : "hover:bg-gray-100"
            )}
            title={config.description}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
```

#### 1.3 Create Adaptive Layout Wrapper

**New File:** `src/components/dashboards/shared/AdaptiveLayout.tsx`

```typescript
import React from 'react';
import { useDashboardLayoutStore } from '@/stores/dashboardLayout.store';
import { cn } from '@/lib/utils';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const DISPLAY_MODE_STYLES = {
  executive: {
    container: 'gap-2',
    panels: 'p-2',
    cards: 'p-3',
    text: 'text-sm'
  },
  operational: {
    container: 'gap-4',
    panels: 'p-4',
    cards: 'p-4', 
    text: 'text-base'
  },
  analytical: {
    container: 'gap-3',
    panels: 'p-3',
    cards: 'p-3',
    text: 'text-sm'
  }
} as const;

export function AdaptiveLayout({ children, className }: AdaptiveLayoutProps) {
  const { displayMode } = useDashboardLayoutStore();
  const styles = DISPLAY_MODE_STYLES[displayMode];

  return (
    <div className={cn(
      "h-full transition-all duration-300 ease-in-out",
      styles.container,
      className
    )}>
      <div className={cn(
        "transition-all duration-300",
        styles.panels
      )}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              className: cn(
                child.props.className,
                styles.cards,
                styles.text,
                "transition-all duration-300"
              )
            });
          }
          return child;
        })}
      </div>
    </div>
  );
}
```

### Task 2: Interactive Drill-Down Capabilities

**Files to Modify:**
- `src/components/dashboards/situation/components/PopulationImpact.tsx`
- `src/components/dashboards/situation/components/GapAnalysisSummary.tsx`
- `src/components/dashboards/situation/EntityAssessmentPanel.tsx`

#### 2.1 Create Drill-Down Modal System

**New File:** `src/components/dashboards/shared/DrillDownModal.tsx`

```typescript
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowLeft, Download } from 'lucide-react';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  type: 'demographics' | 'gap-analysis' | 'entity-details' | 'trends';
}

export function DrillDownModal({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  type 
}: DrillDownModalProps) {
  const renderContent = () => {
    switch (type) {
      case 'demographics':
        return <DemographicDrillDown data={data} />;
      case 'gap-analysis':
        return <GapAnalysisDrillDown data={data} />;
      case 'entity-details':
        return <EntityDetailsDrillDown data={data} />;
      case 'trends':
        return <TrendsDrillDown data={data} />;
      default:
        return <div>No drill-down data available</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

// Drill-down component for demographics
function DemographicDrillDown({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Detailed demographic breakdown */}
        {data.demographics?.map((demo: any, index: number) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {demo.icon && <demo.icon className="h-5 w-5" />}
                {demo.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{demo.value.toLocaleString()}</span>
                  <Badge variant="outline">{demo.percentage}%</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {demo.details?.map((detail: string, i: number) => (
                    <div key={i} className="py-1">• {detail}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Entity-level breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Entity-Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.entityBreakdown?.map((entity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{entity.name}</div>
                  <div className="text-sm text-gray-600">{entity.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{entity.value.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">{entity.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Drill-down component for gap analysis
function GapAnalysisDrillDown({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.categories?.map((category: any, index: number) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Gap breakdown */}
                <div className="space-y-2">
                  {category.gaps?.map((gap: any, gapIndex: number) => (
                    <div key={gapIndex} className="flex items-center justify-between">
                      <span className="text-sm">{gap.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{gap.count}</span>
                        <Badge variant={gap.severity === 'high' ? 'destructive' : 'secondary'}>
                          {gap.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Recommendations */}
                {category.recommendations && (
                  <div className="pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {category.recommendations.map((rec: string, recIndex: number) => (
                        <li key={recIndex} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Placeholder drill-down components for other types
function EntityDetailsDrillDown({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Entity details implementation */}
            <div className="text-gray-500">Entity details drill-down coming soon...</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsDrillDown({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Trends analysis implementation */}
            <div className="text-gray-500">Trend analysis drill-down coming soon...</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 2.2 Update Population Impact with Drill-Down

**File:** `src/components/dashboards/situation/components/PopulationImpact.tsx`

**Changes Required:**

```typescript
// Add drill-down modal
import { DrillDownModal } from '@/components/dashboards/shared/DrillDownModal';

// Add state for drill-down modal
const [drillDownData, setDrillDownData] = React.useState<{
  isOpen: boolean;
  type: 'demographics' | 'gap-analysis' | 'entity-details' | 'trends';
  data: any;
  title: string;
}>({
  isOpen: false,
  type: 'demographics',
  data: null,
  title: ''
});

// Update demographic items with click handlers
{sortedDemographics
  .filter(demo => demo.value > 0)
  .slice(0, 4)
  .map((demo, index) => {
    const Icon = demo.icon;
    return (
      <div 
        key={index} 
        className="space-y-1 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
        onClick={() => setDrillDownData({
          isOpen: true,
          type: 'demographics',
          data: {
            demographics: sortedDemographics.filter(d => d.value > 0),
            entityBreakdown: populationData.entityBreakdown // Add this data from API
          },
          title: `${demo.label} Demographic Analysis`
        })}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            <span className="text-gray-600">{demo.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatNumber(demo.value)}</span>
            <span className="text-gray-400">{demo.percentage}%</span>
          </div>
        </div>
        <Progress 
          value={demo.percentage} 
          className="h-1 cursor-pointer"
        />
      </div>
    );
  })}

// Add drill-down modal at the end of component
<DrillDownModal
  isOpen={drillDownData.isOpen}
  onClose={() => setDrillDownData(prev => ({ ...prev, isOpen: false }))}
  title={drillDownData.title}
  data={drillDownData.data}
  type={drillDownData.type}
/>
```

### Task 3: Real-time Update Indicators

**Files to Modify:**
- `src/components/dashboards/situation/SituationDashboardLayout.tsx`
- `src/hooks/useRealTimeMonitoring.ts` (if exists, create if not)

#### 3.1 Create Real-time Update Hook

**New File:** `src/hooks/useRealTimeMonitoring.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ChangeData {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  entityId?: string;
  incidentId?: string;
}

interface RealTimeUpdatesProps {
  incidentId: string;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useRealTimeMonitoring({ 
  incidentId, 
  refreshInterval = 30000, // 30 seconds
  enabled = true 
}: RealTimeUpdatesProps) {
  const [changes, setChanges] = useState<ChangeData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);

  // Monitor dashboard data changes
  const { data: currentData, refetch } = useQuery({
    queryKey: ['dashboard-realtime', incidentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/dashboard/situation?incidentId=${incidentId}`);
      return response.json();
    },
    enabled: !!incidentId && enabled,
    refetchInterval: refreshInterval,
    onSuccess: (newData) => {
      // Compare with previous data to detect changes
      if (changes.length > 0) {
        const detectedChanges = detectChanges(changes[changes.length - 1], newData);
        if (detectedChanges.length > 0) {
          setChanges(prev => [...prev, ...detectedChanges]);
          setShowUpdateIndicator(true);
          setTimeout(() => setShowUpdateIndicator(false), 3000);
        }
      }
      setChanges(prev => [...prev, { field: 'full_refresh', newData, timestamp: new Date().toISOString() }]);
      setLastUpdate(new Date().toISOString());
    }
  });

  const detectChanges = useCallback((oldData: any, newData: any): ChangeData[] => {
    const detectedChanges: ChangeData[] = [];
    
    // Compare populations
    if (oldData.data?.selectedIncident?.populationImpact?.totalPopulation !== 
        newData.data?.selectedIncident?.populationImpact?.totalPopulation) {
      detectedChanges.push({
        field: 'population',
        oldValue: oldData.data?.selectedIncident?.populationImpact?.totalPopulation,
        newValue: newData.data?.selectedIncident?.populationImpact?.totalPopulation,
        timestamp: new Date().toISOString(),
        incidentId
      });
    }
    
    // Compare assessments count
    const oldAssessments = oldData.data?.entities?.length || 0;
    const newAssessments = newData.data?.entities?.length || 0;
    
    if (oldAssessments !== newAssessments) {
      detectedChanges.push({
        field: 'assessments',
        oldValue: oldAssessments,
        newValue: newAssessments,
        timestamp: new Date().toISOString(),
        incidentId
      });
    }
    
    // Compare gap analysis
    const oldGaps = oldData.data?.selectedIncident?.gapAnalysis?.totalGaps || 0;
    const newGaps = newData.data?.selectedIncident?.gapAnalysis?.totalGaps || 0;
    
    if (oldGaps !== newGaps) {
      detectedChanges.push({
        field: 'gaps',
        oldValue: oldGaps,
        newValue: newGaps,
        timestamp: new Date().toISOString(),
        incidentId
      });
    }
    
    return detectedChanges;
  }, [incidentId]);

  const clearChanges = useCallback(() => {
    setChanges([]);
  }, []);

  const acknowledgeChanges = useCallback(() => {
    setShowUpdateIndicator(false);
  }, []);

  return {
    changes,
    lastUpdate,
    showUpdateIndicator,
    clearChanges,
    acknowledgeChanges,
    refreshData: refetch
  };
}
```

#### 3.2 Create Update Indicator Component

**New File:** `src/components/dashboards/shared/UpdateIndicator.tsx**

```typescript
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Bell, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpdateIndicatorProps {
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: string;
  }>;
  lastUpdate: string | null;
  showIndicator: boolean;
  onAcknowledge: () => void;
  onRefresh: () => void;
  className?: string;
}

const CHANGE_ICONS = {
  population: Users,
  assessments: TrendingUp,
  gaps: AlertTriangle,
  full_refresh: RefreshCw
} as const;

const CHANGE_LABELS = {
  population: 'Population Data',
  assessments: 'Assessments',
  gaps: 'Gap Analysis',
  full_refresh: 'Data Refresh'
} as const;

export function UpdateIndicator({ 
  changes, 
  lastUpdate, 
  showIndicator, 
  onAcknowledge, 
  onRefresh,
  className 
}: UpdateIndicatorProps) {
  const recentChanges = changes.slice(-3); // Show last 3 changes

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 space-y-2 transition-all duration-300",
      showIndicator ? "translate-x-0" : "translate-x-full",
      className
    )}>
      {/* Update notification */}
      {showIndicator && recentChanges.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600 animate-pulse" />
              <span className="font-medium text-sm">Data Updated</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAcknowledge}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-2 mb-3">
            {recentChanges.map((change, index) => {
              const Icon = CHANGE_ICONS[change.field as keyof typeof CHANGE_ICONS] || RefreshCw;
              const label = CHANGE_LABELS[change.field as keyof typeof CHANGE_LABELS] || 'Data';
              
              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <Icon className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-600">{label} updated</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {new Date(lastUpdate || '').toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs h-6"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      )}
      
      {/* Quick refresh button */}
      {!showIndicator && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="bg-white shadow-md"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      )}
    </div>
  );
}
```

### Task 4: Enhanced Export Functionality

**Files to Modify:**
- `src/components/dashboards/situation/components/GapAnalysisSummary.tsx`
- `src/lib/exports/` (enhance existing export utilities)

#### 4.1 Create PDF Export Service

**New File:** `src/lib/exports/pdfExport.service.ts`

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

interface ExportData {
  title: string;
  incidentId: string;
  incidentName: string;
  generatedAt: string;
  sections: Array<{
    title: string;
    content: any;
    type: 'metrics' | 'charts' | 'tables';
  }>;
}

class PDFExportService {
  async exportDashboard(data: ExportData): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Add title
    pdf.setFontSize(20);
    pdf.text(data.title, pageWidth / 2, 20, { align: 'center' });
    
    // Add metadata
    pdf.setFontSize(12);
    pdf.text(`Incident: ${data.incidentName}`, 20, 35);
    pdf.text(`Generated: ${format(new Date(data.generatedAt), 'PPP p')}`, 20, 42);
    pdf.text(`Incident ID: ${data.incidentId}`, 20, 49);
    
    let yPosition = 65;
    
    // Add sections
    for (const section of data.sections) {
      // Check if we need a new page
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Section title
      pdf.setFontSize(16);
      pdf.text(section.title, 20, yPosition);
      yPosition += 10;
      
      // Section content based on type
      yPosition = await this.addSectionContent(pdf, section, yPosition);
      yPosition += 10;
    }
    
    // Save the PDF
    const fileName = `${data.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    pdf.save(fileName);
  }
  
  private async addSectionContent(
    pdf: jsPDF, 
    section: any, 
    yPosition: number
  ): Promise<number> {
    pdf.setFontSize(10);
    
    switch (section.type) {
      case 'metrics':
        return this.addMetricsContent(pdf, section.content, yPosition);
      case 'tables':
        return this.addTableContent(pdf, section.content, yPosition);
      case 'charts':
        return await this.addChartContent(pdf, section.content, yPosition);
      default:
        return yPosition;
    }
  }
  
  private addMetricsContent(pdf: jsPDF, metrics: any, yPosition: number): number {
    if (!metrics) return yPosition;
    
    const lineHeight = 6;
    const leftColumn = 20;
    const rightColumn = 100;
    
    // Key metrics in two columns
    const metricPairs = [
      { label: 'Total Entities', value: metrics.totalEntities || 0 },
      { label: 'Entities with Gaps', value: metrics.entitiesWithGaps || 0 },
      { label: 'Critical Gaps', value: metrics.criticalGaps || 0 },
      { label: 'Total Gaps', value: metrics.totalGaps || 0 }
    ];
    
    metricPairs.forEach((metric, index) => {
      const y = yPosition + (index * lineHeight);
      const x = index % 2 === 0 ? leftColumn : rightColumn;
      
      pdf.text(`${metric.label}:`, x, y);
      pdf.text(`${metric.value}`, x + 50, y);
    });
    
    return yPosition + (Math.ceil(metricPairs.length / 2) * lineHeight) + 10;
  }
  
  private addTableContent(pdf: jsPDF, tableData: any, yPosition: number): number {
    if (!tableData || !tableData.rows) return yPosition;
    
    const tableTop = yPosition;
    const rowHeight = 5;
    const colWidths = [60, 40, 30, 30]; // Adjust based on content
    
    // Table headers
    pdf.setFont(undefined, 'bold');
    tableData.headers?.forEach((header: string, index: number) => {
      const x = 20 + colWidths.slice(0, index).reduce((a, b) => a + b, 0);
      pdf.text(header, x, tableTop);
    });
    pdf.setFont(undefined, 'normal');
    
    // Table rows
    tableData.rows?.forEach((row: string[], rowIndex: number) => {
      const y = tableTop + rowHeight + (rowIndex * rowHeight);
      
      row.forEach((cell: string, cellIndex: number) => {
        const x = 20 + colWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0);
        pdf.text(cell, x, y);
      });
    });
    
    return tableTop + rowHeight + (tableData.rows?.length || 0) * rowHeight + 10;
  }
  
  private async addChartContent(pdf: jsPDF, chartElement: HTMLElement, yPosition: number): Promise<number> {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40; // 20mm margin each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add chart image
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      
      return yPosition + imgHeight + 10;
    } catch (error) {
      console.error('Error generating chart PDF:', error);
      return yPosition;
    }
  }
}

export const pdfExportService = new PDFExportService();
```

#### 4.2 Create Export Button Component

**New File:** `src/components/dashboards/shared/ExportButton.tsx`

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, Image } from 'lucide-react';
import { pdfExportService } from '@/lib/exports/pdfExport.service';
import { exportGapAnalysisToCsv } from '@/utils/export/gapAnalysisCsv';

interface ExportButtonProps {
  data: any;
  title: string;
  incidentId: string;
  incidentName: string;
  className?: string;
}

export function ExportButton({ 
  data, 
  title, 
  incidentId, 
  incidentName, 
  className 
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      await pdfExportService.exportDashboard({
        title,
        incidentId,
        incidentName,
        generatedAt: new Date().toISOString(),
        sections: [
          {
            title: 'Gap Analysis Summary',
            content: data,
            type: 'metrics'
          }
        ]
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      // Show error notification
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVExport = () => {
    try {
      exportGapAnalysisToCsv(data, {
        incidentId,
        incidentName,
        includeMetadata: true,
        includeTimestamps: true
      });
    } catch (error) {
      console.error('CSV export failed:', error);
    }
  };

  const handleImageExport = async () => {
    // Implementation for exporting as image
    const element = document.getElementById('gap-analysis-chart');
    if (element) {
      try {
        const canvas = await html2canvas(element);
        const link = document.createElement('a');
        link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Image export failed:', error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isExporting}
          className={className}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePDFExport}>
          <FileText className="h-4 w-4 mr-2" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCSVExport}>
          <Table className="h-4 w-4 mr-2" />
          CSV Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleImageExport}>
          <Image className="h-4 w-4 mr-2" />
          PNG Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 4.3 Update Gap Analysis Summary with Enhanced Export

**File:** `src/components/dashboards/situation/components/GapAnalysisSummary.tsx`

**Changes Required:**

```typescript
// Import enhanced export button
import { ExportButton } from '@/components/dashboards/shared/ExportButton';

// Replace existing export button with enhanced version
<ExportButton
  data={data}
  title="Gap Analysis Summary"
  incidentId={incidentId}
  incidentName={incidentName || 'Selected Incident'}
  className="text-xs"
/>
```

---

## 🧪 Testing Requirements

### Adaptive Display Mode Testing
1. **Mode Switching:**
   - [ ] Executive mode shows condensed, high-level information
   - [ ] Operational mode displays detailed field information
   - [ ] Analytical mode provides comprehensive data and trends
   - [ ] Smooth transitions between modes

2. **Content Adaptation:**
   - [ ] Components show/hide appropriate content per mode
   - [ ] Text sizing adjusts correctly
   - [ ] Card layouts adapt to mode requirements

### Interactive Drill-Down Testing
1. **Modal Functionality:**
   - [ ] Drill-down modals open correctly on click
   - [ ] Content displays properly in modals
   - [ ] Export functionality works within modals
   - [ ] Mobile responsiveness maintained

2. **Data Navigation:**
   - [ ] Demographic drill-down shows entity-level breakdown
   - [ ] Gap analysis drill-down displays detailed recommendations
   - [ ] Back navigation and closing work correctly

### Real-time Update Testing
1. **Update Detection:**
   - [ ] Changes detected and displayed correctly
   - [ ] Update notifications appear appropriately
   - [ ] Refresh functionality works as expected

2. **Performance:**
   - [ ] Real-time monitoring doesn't impact dashboard performance
   - [ ] Memory usage remains stable
   - ] Background updates work efficiently

### Export Functionality Testing
1. **PDF Export:**
   - [ ] PDF generates with correct formatting
   - [ ] All data included accurately
   - [ ] File downloads correctly

2. **CSV Export:**
   - [ ] CSV format is correct
   - [ ] Data integrity maintained
   - [ ] Large datasets handled properly

3. **Image Export:**
   - [ ] Charts export as high-quality images
   - [ ] Proper file naming
   - [ ] Multiple export formats work

---

## 🚨 Known Risks & Mitigations

### Technical Risks
1. **PDF Generation Performance:** Large dashboards may be slow to export
   - **Mitigation:** Implement progressive loading and user feedback
2. **Real-time Update Conflicts:** Multiple updates may conflict
   - **Mitigation:** Implement update queuing and conflict resolution
3. **Memory Usage:** Drill-down modals with large datasets
   - **Mitigation:** Virtualization and pagination for large data

### UX Risks
1. **Mode Confusion:** Users may not understand different display modes
   - **Mitigation:** Clear tooltips and contextual help
2. **Information Overload:** Drill-downs may show too much data
   - **Mitigation:** Smart data summarization and filtering
3. **Export Complexity:** Multiple export options may confuse users
   - **Mitigation:** Smart defaults and clear labeling

### Implementation Risks
1. **Breaking Changes:** New display modes may affect existing components
   - **Mitigation:** Backward compatibility and comprehensive testing
2. **State Management Complexity:** Multiple display modes increase complexity
   - **Mitigation:** Clear state management patterns and documentation
3. **Integration Issues:** New export functionality may conflict with existing
   - **Mitigation:** Careful integration testing and fallback options

---

## ✅ Acceptance Criteria

### Must Have
- [ ] Three adaptive display modes implemented with distinct layouts
- [ ] Interactive drill-down functionality for demographics and gap analysis
- [ ] Real-time update indicators with change notifications
- [ ] Enhanced export functionality (PDF, CSV, PNG)
- [ ] Smooth transitions and animations throughout
- [ ] Mobile responsiveness maintained for all new features

### Should Have
- [ ] User preferences for display mode settings
- [ ] Export customization options
- [ ] Advanced drill-down for entity details and trends
- [ ] Performance optimization for large datasets
- [ ] Keyboard navigation support for all interactive elements

### Could Have
- [ ] Automated report scheduling
- [ ] Custom report templates
- [ ] Advanced data visualization in drill-downs
- [ ] Multi-language support for exports

---

## 📚 References & Dependencies

### New Components to Create
- `src/components/dashboards/shared/DisplayModeSelector.tsx`
- `src/components/dashboards/shared/AdaptiveLayout.tsx`
- `src/components/dashboards/shared/DrillDownModal.tsx`
- `src/components/dashboards/shared/UpdateIndicator.tsx`
- `src/components/dashboards/shared/ExportButton.tsx`

### Hooks and Services
- `src/hooks/useRealTimeMonitoring.ts`
- `src/lib/exports/pdfExport.service.ts`

### External Dependencies
- `jspdf` for PDF generation
- `html2canvas` for image export
- `date-fns` for date formatting

### Integration Points
- Display mode selector integration with dashboard layout
- Real-time monitoring integration with existing data fetching
- Export service integration with existing export utilities
- Drill-down data structure integration with existing API responses

---

## 🎯 Success Metrics

### Quantitative
- **User Engagement:** 40% increase in dashboard interaction time
- **Export Usage:** 60% of users utilizing enhanced export features
- **Mode Adoption:** 70% of users switching between display modes
- **Drill-down Usage:** 50% of users accessing drill-down features

### Qualitative
- **User Satisfaction:** Improved feedback on data exploration capabilities
- **Decision Making:** Faster access to detailed information for decision-making
- **Workflow Efficiency:** Reduced time to generate reports and export data
- **Professional Polish:** More enterprise-ready and comprehensive dashboard

This phase significantly enhances the dashboard's interactivity and usability while maintaining the robust feature set established in Phase 1.