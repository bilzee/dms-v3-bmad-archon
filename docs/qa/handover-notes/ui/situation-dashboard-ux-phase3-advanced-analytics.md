# Situation Dashboard UX Enhancement - Phase 3: Advanced Analytics & Collaboration

## Handover Note

**From:** Sally (UX Expert)  
**To:** BMad Dev Agent  
**Date:** 2025-12-03  
**Priority:** Medium-High  
**Phase:** 3 of 3 - Enterprise Analytics & Collaboration  
**Estimated Effort:** 6-8 days  
**Dependencies:** Phase 1 & Phase 2 complete

---

## 🎯 Phase 3 Executive Summary

Implement enterprise-grade analytics features and real-time collaboration capabilities that transform the dashboard into a comprehensive humanitarian response coordination platform. This phase focuses on AI-powered insights, predictive analytics, and multi-user collaboration features.

## 📊 Key Improvements

### 1. AI-Powered Recommendations & Scenario Modeling
### 2. Multi-User Collaboration Features
### 3. Advanced Trend Analysis & Predictive Analytics
### 4. Resource Impact Calculator

---

## 🎨 Implementation Tasks

### Task 1: AI-Powered Recommendations Engine

**Files to Create:**
- `src/lib/ai/recommendations.service.ts`
- `src/components/analytics/RecommendationsPanel.tsx`
- `src/components/analytics/ScenarioModeling.tsx`

#### 1.1 Create AI Recommendations Service

**New File:** `src/lib/ai/recommendations.service.ts`

```typescript
interface GapAnalysisData {
  totalGaps: number;
  criticalGaps: number;
  assessmentTypeGaps: Record<string, any>;
  entitiesAffected: number;
}

interface EntityAssessmentData {
  entityId: string;
  entityName: string;
  assessments: Record<string, any>;
  location: string;
  priority: 'high' | 'medium' | 'low';
}

interface ResourceAllocation {
  entityType: string;
  resourceType: string;
  quantity: number;
  priority: number;
  estimatedImpact: number;
}

interface ScenarioInput {
  resourceAllocation: ResourceAllocation[];
  timeHorizon: number; // days
  constraints: {
    budget?: number;
    personnel?: number;
    equipment?: Record<string, number>;
  };
}

interface Recommendation {
  id: string;
  type: 'resource_allocation' | 'prioritization' | 'efficiency' | 'prevention';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: {
    gapReduction: number;
    livesImproved: number;
    timeline: string;
  };
  resources: Array<{
    type: string;
    quantity: number;
    cost?: number;
  }>;
  confidence: number; // 0-100
  dataSources: string[];
  generatedAt: string;
}

class AIRecommendationsService {
  private baseUrl = '/api/v1/ai/recommendations';

  async generateRecommendations(
    incidentId: string,
    gapAnalysisData: GapAnalysisData,
    entityAssessments: EntityAssessmentData[]
  ): Promise<Recommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incidentId,
          gapAnalysis: gapAnalysisData,
          entityAssessments,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.processRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback to rule-based recommendations
      return this.generateRuleBasedRecommendations(gapAnalysisData, entityAssessments);
    }
  }

  async runScenarioModeling(
    incidentId: string,
    scenario: ScenarioInput
  ): Promise<{
    projectedOutcomes: {
      gapReduction: number;
      timeline: number;
      resourceEfficiency: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    recommendations: Recommendation[];
    confidence: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/scenario-modeling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incidentId,
          scenario,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error running scenario modeling:', error);
      // Fallback to simple projection
      return this.generateSimpleProjection(scenario);
    }
  }

  private processRecommendations(rawRecommendations: any[]): Recommendation[] {
    return rawRecommendations.map(rec => ({
      id: this.generateId(),
      type: rec.type || 'resource_allocation',
      priority: rec.priority || 'medium',
      title: rec.title,
      description: rec.description,
      rationale: rec.rationale || 'Based on gap analysis patterns',
      expectedImpact: {
        gapReduction: rec.expectedImpact?.gapReduction || 0,
        livesImproved: rec.expectedImpact?.livesImproved || 0,
        timeline: rec.expectedImpact?.timeline || '7-14 days'
      },
      resources: rec.resources || [],
      confidence: rec.confidence || 75,
      dataSources: rec.dataSources || ['gap_analysis', 'historical_data'],
      generatedAt: new Date().toISOString()
    }));
  }

  private generateRuleBasedRecommendations(
    gapData: GapAnalysisData,
    entities: EntityAssessmentData[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical gap recommendations
    if (gapData.criticalGaps > 0) {
      recommendations.push({
        id: this.generateId(),
        type: 'resource_allocation',
        priority: 'critical',
        title: 'Immediate Resource Deployment for Critical Gaps',
        description: `${gapData.criticalGaps} critical gaps identified requiring immediate intervention`,
        rationale: 'Critical gaps pose immediate risks to affected populations',
        expectedImpact: {
          gapReduction: gapData.criticalGaps,
          livesImproved: Math.round(gapData.criticalGaps * 50),
          timeline: '24-48 hours'
        },
        resources: [
          { type: 'Emergency Response Team', quantity: Math.ceil(gapData.criticalGaps / 3) },
          { type: 'Medical Supplies', quantity: gapData.criticalGaps * 10 }
        ],
        confidence: 85,
        dataSources: ['gap_analysis', 'severity_mapping'],
        generatedAt: new Date().toISOString()
      });
    }

    // High-priority entity recommendations
    const highPriorityEntities = entities.filter(e => e.priority === 'high');
    if (highPriorityEntities.length > 0) {
      recommendations.push({
        id: this.generateId(),
        type: 'prioritization',
        priority: 'high',
        title: 'Focus Resources on High-Priority Locations',
        description: `${highPriorityEntities.length} locations identified as high priority for immediate attention`,
        rationale: 'These locations have the most severe gaps and largest affected populations',
        expectedImpact: {
          gapReduction: highPriorityEntities.length * 2,
          livesImproved: Math.round(highPriorityEntities.length * 100),
          timeline: '3-5 days'
        },
        resources: [
          { type: 'Assessment Teams', quantity: highPriorityEntities.length },
          { type: 'Emergency Supplies', quantity: highPriorityEntities.length * 5 }
        ],
        confidence: 90,
        dataSources: ['entity_assessments', 'priority_scoring'],
        generatedAt: new Date().toISOString()
      });
    }

    // Efficiency recommendations
    if (gapData.totalGaps > gapData.entitiesAffected) {
      recommendations.push({
        id: this.generateId(),
        type: 'efficiency',
        priority: 'medium',
        title: 'Optimize Resource Allocation Efficiency',
        description: 'Multiple gaps per entity suggest opportunities for coordinated interventions',
        rationale: 'Bundling resources for entities with multiple gaps improves efficiency',
        expectedImpact: {
          gapReduction: Math.round(gapData.totalGaps * 0.3),
          livesImproved: Math.round(gapData.entitiesAffected * 20),
          timeline: '5-7 days'
        },
        resources: [
          { type: 'Coordination Team', quantity: 1 },
          { type: 'Integrated Response Kits', quantity: Math.ceil(gapData.entitiesAffected / 2) }
        ],
        confidence: 75,
        dataSources: ['gap_analysis', 'efficiency_patterns'],
        generatedAt: new Date().toISOString()
      });
    }

    return recommendations;
  }

  private generateSimpleProjection(scenario: ScenarioInput) {
    const totalResources = scenario.resourceAllocation.reduce((sum, resource) => 
      sum + (resource.quantity * resource.priority), 0
    );

    return {
      projectedOutcomes: {
        gapReduction: Math.round(totalResources / 10),
        timeline: scenario.timeHorizon,
        resourceEfficiency: Math.min(95, 60 + (totalResources / 50)),
        riskLevel: totalResources > 100 ? 'low' : totalResources > 50 ? 'medium' : 'high'
      },
      recommendations: [],
      confidence: 65
    };
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const aiRecommendationsService = new AIRecommendationsService();
```

#### 1.2 Create Recommendations Panel

**New File:** `src/components/analytics/RecommendationsPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock,
  Target,
  CheckCircle,
  X,
  Info
} from 'lucide-react';
import { aiRecommendationsService, Recommendation } from '@/lib/ai/recommendations.service';
import { cn } from '@/lib/utils';

interface RecommendationsPanelProps {
  incidentId: string;
  gapAnalysisData: any;
  entityAssessments: any[];
  className?: string;
}

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200', 
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
} as const;

const TYPE_ICONS = {
  resource_allocation: Target,
  prioritization: AlertTriangle,
  efficiency: TrendingUp,
  prevention: Lightbulb
} as const;

export function RecommendationsPanel({ 
  incidentId, 
  gapAnalysisData, 
  entityAssessments,
  className 
}: RecommendationsPanelProps) {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  // Fetch AI recommendations
  const {
    data: recommendations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ai-recommendations', incidentId],
    queryFn: () => aiRecommendationsService.generateRecommendations(
      incidentId,
      gapAnalysisData,
      entityAssessments
    ),
    enabled: !!incidentId && !!gapAnalysisData,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  const handleAcceptRecommendation = (recId: string) => {
    // Implementation for accepting recommendation
    console.log('Accepting recommendation:', recId);
    // This would integrate with the task management system
  };

  const handleDismissRecommendation = (recId: string) => {
    // Implementation for dismissing recommendation
    console.log('Dismissing recommendation:', recId);
  };

  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-3 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Recommendations Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-3">
              AI recommendations temporarily unavailable
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalRecs = recommendations.filter(r => r.priority === 'critical');
  const highRecs = recommendations.filter(r => r.priority === 'high');
  const mediumRecs = recommendations.filter(r => r.priority === 'medium');

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalRecs.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalRecs.length} Critical
              </Badge>
            )}
            {highRecs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {highRecs.length} High
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommendations" className="text-xs">
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommendations" className="space-y-3 mt-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recommendations available</p>
                <p className="text-xs mt-1">
                  Complete more assessments to generate AI recommendations
                </p>
              </div>
            ) : (
              recommendations.map((rec: Recommendation) => {
                const IconComponent = TYPE_ICONS[rec.type];
                const isExpanded = expandedRec === rec.id;
                
                return (
                  <div 
                    key={rec.id}
                    className={cn(
                      "border rounded-lg p-3 cursor-pointer transition-all duration-200",
                      "hover:shadow-sm hover:border-blue-200",
                      PRIORITY_COLORS[rec.priority]
                    )}
                    onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">
                            {rec.title}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">
                            {rec.description}
                          </div>
                          
                          {isExpanded && (
                            <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-1">
                                  Expected Impact
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <div className="font-medium">{rec.expectedImpact.gapReduction}</div>
                                    <div className="text-gray-500">Gap Reduction</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">{rec.expectedImpact.livesImproved}</div>
                                    <div className="text-gray-500">Lives Improved</div>
                                  </div>
                                  <div>
                                    <div className="font-medium">{rec.expectedImpact.timeline}</div>
                                    <div className="text-gray-500">Timeline</div>
                                  </div>
                                </div>
                              </div>

                              {rec.resources.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    Required Resources
                                  </div>
                                  <div className="space-y-1">
                                    {rec.resources.map((resource, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-xs">
                                        <span>{resource.type}</span>
                                        <span className="font-medium">×{resource.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Info className="h-3 w-3" />
                                  <span>Confidence: {rec.confidence}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptRecommendation(rec.id);
                                    }}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismissRecommendation(rec.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", PRIORITY_COLORS[rec.priority])}
                        >
                          {rec.priority}
                        </Badge>
                        <div className="text-xs text-gray-400">
                          {rec.confidence}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="scenarios" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Scenario modeling coming soon</p>
              <p className="text-xs mt-1">
                Test different resource allocation strategies
              </p>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Advanced insights coming soon</p>
              <p className="text-xs mt-1">
                AI-powered trend analysis and predictions
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

### Task 2: Multi-User Collaboration Features

**Files to Create:**
- `src/lib/collaboration/collaboration.service.ts`
- `src/components/collaboration/CollaborationPanel.tsx`
- `src/components/collaboration/UserCursors.tsx`

#### 2.1 Create Collaboration Service

**New File:** `src/lib/collaboration/collaboration.service.ts`

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'coordinator' | 'assessor' | 'responder' | 'viewer';
  avatar?: string;
  isOnline: boolean;
  lastSeen: string;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  componentId: string;
  timestamp: string;
}

interface Annotation {
  id: string;
  userId: string;
  componentId: string;
  content: string;
  position: { x: number; y: number };
  createdAt: string;
  replies: AnnotationReply[];
}

interface AnnotationReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface HandoffItem {
  id: string;
  fromUserId: string;
  toUserId: string;
  entityIds: string[];
  incidentId: string;
  notes: string;
  status: 'pending' | 'accepted' | 'completed';
  createdAt: string;
  completedAt?: string;
}

class CollaborationService {
  private wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    if (typeof window !== 'undefined') {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('Collaboration WebSocket connected');
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = () => {
        console.log('Collaboration WebSocket disconnected');
        this.emit('disconnected');
        // Attempt reconnection after delay
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
    }
  }

  private handleMessage(data: any) {
    const { type, payload } = data;
    this.emit(type, payload);
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Cursor position tracking
  sendCursorPosition(position: CursorPosition) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'cursor_position',
        payload: position
      }));
    }
  }

  // Annotation management
  async createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt'>): Promise<Annotation> {
    const response = await fetch('/api/v1/collaboration/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotation)
    });

    if (!response.ok) {
      throw new Error('Failed to create annotation');
    }

    const newAnnotation = await response.json();
    this.emit('annotation_created', newAnnotation);
    return newAnnotation;
  }

  async getAnnotations(componentId: string): Promise<Annotation[]> {
    const response = await fetch(`/api/v1/collaboration/annotations?componentId=${componentId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch annotations');
    }

    return response.json();
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    const response = await fetch(`/api/v1/collaboration/annotations/${annotationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete annotation');
    }

    this.emit('annotation_deleted', annotationId);
  }

  // User management
  async getActiveUsers(incidentId: string): Promise<User[]> {
    const response = await fetch(`/api/v1/collaboration/users?incidentId=${incidentId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch active users');
    }

    return response.json();
  }

  async sendHandoff(handoff: Omit<HandoffItem, 'id' | 'createdAt'>): Promise<HandoffItem> {
    const response = await fetch('/api/v1/collaboration/handoffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(handoff)
    });

    if (!response.ok) {
      throw new Error('Failed to create handoff');
    }

    const newHandoff = await response.json();
    this.emit('handoff_created', newHandoff);
    return newHandoff;
  }

  async getHandoffs(incidentId: string): Promise<HandoffItem[]> {
    const response = await fetch(`/api/v1/collaboration/handoffs?incidentId=${incidentId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch handoffs');
    }

    return response.json();
  }

  async acceptHandoff(handoffId: string): Promise<HandoffItem> {
    const response = await fetch(`/api/v1/collaboration/handoffs/${handoffId}/accept`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to accept handoff');
    }

    const updatedHandoff = await response.json();
    this.emit('handoff_accepted', updatedHandoff);
    return updatedHandoff;
  }

  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export const collaborationService = new CollaborationService();
```

#### 2.2 Create Collaboration Panel

**New File:** `src/components/collaboration/CollaborationPanel.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  MessageSquare, 
  ArrowRightLeft, 
  User,
  UserPlus,
  UserCheck,
  Clock,
  Eye
} from 'lucide-react';
import { collaborationService, User, HandoffItem } from '@/lib/collaboration/collaboration.service';
import { cn } from '@/lib/utils';

interface CollaborationPanelProps {
  incidentId: string;
  currentUserId: string;
  className?: string;
}

export function CollaborationPanel({ 
  incidentId, 
  currentUserId,
  className 
}: CollaborationPanelProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCollaborationData = async () => {
      try {
        const [users, handoffsData] = await Promise.all([
          collaborationService.getActiveUsers(incidentId),
          collaborationService.getHandoffs(incidentId)
        ]);
        
        setActiveUsers(users.filter(user => user.id !== currentUserId));
        setHandoffs(handoffsData);
      } catch (error) {
        console.error('Failed to load collaboration data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollaborationData();

    // Set up event listeners
    const handleUserJoined = (user: User) => {
      if (user.id !== currentUserId) {
        setActiveUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
      }
    };

    const handleUserLeft = (userId: string) => {
      setActiveUsers(prev => prev.filter(u => u.id !== userId));
    };

    const handleHandoffCreated = (handoff: HandoffItem) => {
      setHandoffs(prev => [...prev, handoff]);
    };

    const handleHandoffAccepted = (handoff: HandoffItem) => {
      setHandoffs(prev => 
        prev.map(h => h.id === handoff.id ? handoff : h)
      );
    };

    collaborationService.on('user_joined', handleUserJoined);
    collaborationService.on('user_left', handleUserLeft);
    collaborationService.on('handoff_created', handleHandoffCreated);
    collaborationService.on('handoff_accepted', handleHandoffAccepted);

    return () => {
      collaborationService.off('user_joined', handleUserJoined);
      collaborationService.off('user_left', handleUserLeft);
      collaborationService.off('handoff_created', handleHandoffCreated);
      collaborationService.off('handoff_accepted', handleHandoffAccepted);
    };
  }, [incidentId, currentUserId]);

  const handleAcceptHandoff = async (handoffId: string) => {
    try {
      await collaborationService.acceptHandoff(handoffId);
    } catch (error) {
      console.error('Failed to accept handoff:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'coordinator': return 'bg-blue-100 text-blue-700';
      case 'assessor': return 'bg-green-100 text-green-700';
      case 'responder': return 'bg-orange-100 text-orange-700';
      case 'viewer': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHandoffStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'accepted': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("h-fit", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Collaboration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Collaboration
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="text-xs">
              Active Users ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="handoffs" className="text-xs">
              Handoffs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3 mt-4">
            {activeUsers.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No other active users</p>
                <p className="text-xs mt-1">
                  Team members will appear here when they join
                </p>
              </div>
            ) : (
              activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                        user.isOnline ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getRoleBadgeColor(user.role))}
                        >
                          {user.role}
                        </Badge>
                        {!user.isOnline && (
                          <span className="text-xs text-gray-500">
                            Last seen {new Date(user.lastSeen).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="handoffs" className="space-y-3 mt-4">
            {handoffs.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active handoffs</p>
                <p className="text-xs mt-1">
                  Create handoffs to transfer responsibilities
                </p>
              </div>
            ) : (
              handoffs.map((handoff) => (
                <div
                  key={handoff.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline"
                        className={cn("text-xs", getHandoffStatusColor(handoff.status))}
                      >
                        {handoff.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(handoff.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {handoff.status === 'pending' && handoff.toUserId === currentUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-6"
                        onClick={() => handleAcceptHandoff(handoff.id)}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>
                        <strong>{handoff.fromUserId === currentUserId ? 'You' : 'Another user'}</strong>
                        {' '}handed off{' '}
                        <strong>{handoff.entityIds.length} entities</strong>
                        {' '}to{' '}
                        <strong>{handoff.toUserId === currentUserId ? 'you' : 'another user'}</strong>
                      </span>
                    </div>
                    
                    {handoff.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        {handoff.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

### Task 3: Advanced Trend Analysis

**Files to Create:**
- `src/lib/analytics/trendAnalysis.service.ts`
- `src/components/analytics/TrendAnalysisPanel.tsx`

#### 3.1 Create Trend Analysis Service

**New File:** `src/lib/analytics/trendAnalysis.service.ts`

```typescript
interface TrendData {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

interface TrendAnalysis {
  metric: string;
  data: TrendData[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changeRate: number; // percentage change
  confidence: number; // 0-100
  forecast?: TrendData[]; // predicted future values
  anomalies?: Array<{
    timestamp: string;
    value: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

interface ComparisonData {
  period1: {
    label: string;
    data: TrendData[];
  };
  period2: {
    label: string;
    data: TrendData[];
  };
  comparison: {
    changePercent: number;
    significance: 'significant' | 'moderate' | 'minimal';
    insights: string[];
  };
}

class TrendAnalysisService {
  private baseUrl = '/api/v1/analytics/trends';

  async getTrendAnalysis(
    incidentId: string,
    metrics: string[],
    timeRange: { start: string; end: string }
  ): Promise<TrendAnalysis[]> {
    try {
      const response = await fetch(`${this.baseUrl}/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          metrics,
          timeRange
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      // Fallback to mock data
      return this.generateMockTrendData(metrics, timeRange);
    }
  }

  async getComparisonAnalysis(
    incidentId: string,
    metric: string,
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): Promise<ComparisonData> {
    try {
      const response = await fetch(`${this.baseUrl}/comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          metric,
          period1,
          period2
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching comparison analysis:', error);
      return this.generateMockComparisonData();
    }
  }

  async predictTrends(
    incidentId: string,
    metrics: string[],
    forecastDays: number
  ): Promise<TrendAnalysis[]> {
    try {
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          metrics,
          forecastDays
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error predicting trends:', error);
      return this.generateMockPredictions(metrics, forecastDays);
    }
  }

  private generateMockTrendData(
    metrics: string[],
    timeRange: { start: string; end: string }
  ): TrendAnalysis[] {
    return metrics.map(metric => {
      const data: TrendData[] = [];
      const start = new Date(timeRange.start);
      const end = new Date(timeRange.end);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      for (let i = 0; i <= daysDiff; i++) {
        const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const baseValue = this.getBaseValueForMetric(metric);
        const variation = (Math.random() - 0.5) * baseValue * 0.3;
        const trend = i * 2; // Slight upward trend
        
        data.push({
          timestamp: date.toISOString(),
          value: Math.max(0, baseValue + variation + trend),
          label: date.toLocaleDateString()
        });
      }

      const trend = this.calculateTrend(data);
      
      return {
        metric,
        data,
        trend: trend.direction,
        changeRate: trend.changeRate,
        confidence: Math.floor(Math.random() * 30) + 70,
        forecast: this.generateForecast(data, 7)
      };
    });
  }

  private generateMockComparisonData(): ComparisonData {
    const now = new Date();
    const period1Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const period1End = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const period2Start = period1End;
    const period2End = now;

    return {
      period1: {
        label: 'Last Week',
        data: this.generateDataForPeriod(period1Start, period1End, 100)
      },
      period2: {
        label: 'This Week',
        data: this.generateDataForPeriod(period2Start, period2End, 120)
      },
      comparison: {
        changePercent: 20,
        significance: 'significant',
        insights: [
          '20% increase in assessments completed',
          'Improved efficiency in gap identification',
          'Faster response times to critical needs'
        ]
      }
    };
  }

  private generateMockPredictions(metrics: string[], forecastDays: number): TrendAnalysis[] {
    return metrics.map(metric => ({
      metric,
      data: [],
      trend: 'increasing' as const,
      changeRate: 15,
      confidence: 75,
      forecast: this.generateForecast([], forecastDays)
    }));
  }

  private getBaseValueForMetric(metric: string): number {
    const baseValues: Record<string, number> = {
      'assessments': 10,
      'responses': 8,
      'gaps': 5,
      'entities': 20,
      'population': 1000
    };
    return baseValues[metric] || 10;
  }

  private calculateTrend(data: TrendData[]): { direction: string; changeRate: number } {
    if (data.length < 2) {
      return { direction: 'stable', changeRate: 0 };
    }

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const changeRate = ((lastValue - firstValue) / firstValue) * 100;

    let direction: string;
    if (Math.abs(changeRate) < 5) {
      direction = 'stable';
    } else if (changeRate > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return { direction, changeRate };
  }

  private generateForecast(historicalData: TrendData[], days: number): TrendData[] {
    const forecast: TrendData[] = [];
    const lastValue = historicalData.length > 0 
      ? historicalData[historicalData.length - 1].value 
      : 100;

    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Simple forecast with slight upward trend and randomness
      const predictedValue = lastValue * (1 + (i * 0.02)) + (Math.random() - 0.5) * lastValue * 0.1;

      forecast.push({
        timestamp: date.toISOString(),
        value: Math.max(0, predictedValue),
        label: date.toLocaleDateString(),
        metadata: { predicted: true }
      });
    }

    return forecast;
  }

  private generateDataForPeriod(start: Date, end: Date, baseValue: number): TrendData[] {
    const data: TrendData[] = [];
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const variation = (Math.random() - 0.5) * baseValue * 0.2;
      
      data.push({
        timestamp: date.toISOString(),
        value: Math.max(0, baseValue + variation),
        label: date.toLocaleDateString()
      });
    }

    return data;
  }
}

export const trendAnalysisService = new TrendAnalysisService();
```

---

## 🧪 Testing Requirements

### AI Recommendations Testing
1. **Recommendation Quality:**
   - [ ] Recommendations are relevant and actionable
   - [ ] Priority levels assigned correctly
   - [ ] Confidence scores are reasonable
   - [ ] Expected impact calculations are accurate

2. **Integration Testing:**
   - [ ] AI service integration works with fallbacks
   - [ ] Error handling for API failures
   - [ ] Performance acceptable with large datasets

### Collaboration Features Testing
1. **Real-time Functionality:**
   - [ ] User presence detection works correctly
   - [ ] Cursor position tracking updates in real-time
   - [ ] Handoff creation and acceptance flow works
   - [ ] WebSocket connection stability

2. **Multi-user Scenarios:**
   - [ ] Multiple users can collaborate simultaneously
   - [ ] Annotation system works across users
   - [ ] Conflict resolution for simultaneous edits
   - [ ] User permission levels enforced

### Trend Analysis Testing
1. **Data Accuracy:**
   - [ ] Trend calculations are mathematically correct
   - [ ] Forecast models produce reasonable results
   - [ ] Anomaly detection identifies actual anomalies
   - [ ] Comparison analysis provides meaningful insights

2. **Visualization Performance:**
   - [ ] Charts render quickly with large datasets
   - [ ] Interactive features respond smoothly
   - [ ] Mobile performance acceptable

---

## 🚨 Known Risks & Mitigations

### Technical Risks
1. **AI Service Availability:** External AI services may be unavailable
   - **Mitigation:** Comprehensive fallback systems and rule-based alternatives
2. **WebSocket Stability:** Real-time features may be unreliable
   - **Mitigation:** Automatic reconnection and graceful degradation
3. **Large Dataset Performance:** Analytics may be slow with historical data
   - **Mitigation:** Data pagination, caching, and background processing

### UX Risks
1. **AI Recommendation Overload:** Too many recommendations may overwhelm users
   - **Mitigation:** Smart prioritization and progressive disclosure
2. **Collaboration Complexity:** Multi-user features may confuse users
   - **Mitigation:** Clear UI patterns and contextual help
3. **Data Visualization Complexity:** Advanced charts may be hard to understand
   - **Mitigation:** Tooltips, legends, and educational content

### Implementation Risks
1. **Third-party Dependencies:** AI services and WebSocket infrastructure
   - **Mitigation:** Multiple provider options and local fallbacks
2. **State Management Complexity:** Real-time collaboration state
   - **Mitigation:** Clear state patterns and comprehensive testing
3. **Scalability Concerns:** Real-time features may not scale
   - **Mitigation:** Efficient data structures and load testing

---

## ✅ Acceptance Criteria

### Must Have
- [ ] AI-powered recommendations with actionable insights
- [ ] Real-time collaboration with user presence and handoffs
- [ ] Basic trend analysis with visualizations
- [ ] All features work offline with limited functionality
- [ ] Comprehensive error handling and fallbacks
- [ ] Mobile-responsive collaboration features

### Should Have
- [ ] Advanced predictive analytics and forecasting
- [ ] Scenario modeling capabilities
- [ ] Annotation system for collaborative analysis
- [ ] Performance optimization for large datasets
- [ ] Integration with existing task management

### Could Have
- [ ] Machine learning model training with user feedback
- [ ] Advanced conflict resolution for concurrent edits
- [ ] Customizable AI recommendation parameters
- [ ] Export of trend analysis reports

---

## 📚 References & Dependencies

### New Components to Create
- `src/components/analytics/RecommendationsPanel.tsx`
- `src/components/analytics/ScenarioModeling.tsx`
- `src/components/analytics/TrendAnalysisPanel.tsx`
- `src/components/collaboration/CollaborationPanel.tsx`
- `src/components/collaboration/UserCursors.tsx`

### Services and Utilities
- `src/lib/ai/recommendations.service.ts`
- `src/lib/collaboration/collaboration.service.ts`
- `src/lib/analytics/trendAnalysis.service.ts`

### External Dependencies
- WebSocket server for real-time collaboration
- AI/ML service integration (OpenAI, custom models)
- Chart libraries for advanced visualizations
- PDF generation for report exports

### Database Schema Updates
- Add collaboration tables (annotations, handoffs, user_sessions)
- Add analytics tables (trend_data, predictions, recommendations)
- Add user activity tracking tables

---

## 🎯 Success Metrics

### Quantitative
- **AI Recommendation Adoption:** 60% of critical recommendations accepted
- **Collaboration Engagement:** 80% of active users use collaboration features
- **Trend Analysis Usage:** 70% of coordinators view trend insights
- **Handoff Efficiency:** 50% reduction in coordination time
- **Predictive Accuracy:** 75% accuracy in trend predictions

### Qualitative
- **Decision Quality:** Improved decision-making with AI insights
- **Team Coordination:** Better collaboration and information sharing
- **Strategic Planning:** Enhanced ability to plan and predict outcomes
- **User Satisfaction:** Positive feedback on advanced features
- **Platform Maturity:** Enterprise-ready humanitarian coordination platform

This final phase transforms the dashboard into a sophisticated, enterprise-grade platform with AI-powered insights, real-time collaboration, and advanced analytics capabilities suitable for large-scale humanitarian response coordination.