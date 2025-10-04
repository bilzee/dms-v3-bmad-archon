# 13. Offline Strategy

### 13.1 IndexedDB Schema with Dexie

```typescript
// lib/db/offline.ts

import Dexie, { Table } from 'dexie';
import {
  RapidAssessment,
  RapidResponse,
  AffectedEntity,
  OfflineQueueItem,
} from '@/types/entities';

export class OfflineDatabase extends Dexie {
  assessments!: Table<RapidAssessment, string>;
  responses!: Table<RapidResponse, string>;
  entities!: Table<AffectedEntity, string>;
  syncQueue!: Table<OfflineQueueItem, string>;
  
  constructor() {
    super('DisasterManagementDB');
    
    this.version(1).stores({
      assessments: 'id, offlineId, entityId, assessmentType, verificationStatus, syncStatus, createdAt',
      responses: 'id, offlineId, entityId, assessmentId, status, verificationStatus, syncStatus, createdAt',
      entities: 'id, type, lga, ward, [locationLat+locationLng]',
      syncQueue: '++id, type, action, priority, createdAt, retryCount',
    });
  }
  
  // Encryption helper (uses Web Crypto API)
  async encryptData(data: any): Promise<string> {
    const key = await this.getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  async decryptData(encrypted: string): Promise<any> {
    const key = await this.getOrCreateKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
  
  private async getOrCreateKey(): Promise<CryptoKey> {
    let keyData = localStorage.getItem('encryptionKey');
    
    if (!keyData) {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('jwk', key);
      localStorage.setItem('encryptionKey', JSON.stringify(exported));
      return key;
    }
    
    return crypto.subtle.importKey(
      'jwk',
      JSON.parse(keyData),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

export const db = new OfflineDatabase();

// Initialize database on app startup
export async function initializeOfflineDB() {
  try {
    await db.open();
    console.log('Offline database initialized');
    
    // Clean up old queue items (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldItems = await db.syncQueue
      .where('createdAt')
      .below(sevenDaysAgo)
      .toArray();
    
    if (oldItems.length > 0) {
      await db.syncQueue.bulkDelete(oldItems.map(i => i.id));
      console.log(`Cleaned up ${oldItems.length} old queue items`);
    }
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
  }
}
```

### 13.2 Custom Hooks for Offline Operations

#### useOffline Hook

```typescript
// hooks/useOffline.ts

import { useEffect } from 'react';
import { useOfflineStore } from '@/stores/offline.store';

export function useOffline() {
  const {
    isOffline,
    queueSize,
    syncInProgress,
    lastSyncTime,
    setOfflineStatus,
    queueItem,
    startSync,
    loadQueue,
  } = useOfflineStore();
  
  // Initialize queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);
  
  // Auto-sync when coming online
  useEffect(() => {
    if (!isOffline && queueSize > 0 && !syncInProgress) {
      const timer = setTimeout(() => {
        startSync();
      }, 1000); // Wait 1 second after coming online
      
      return () => clearTimeout(timer);
    }
  }, [isOffline, queueSize, syncInProgress, startSync]);
  
  return {
    isOffline,
    queueSize,
    syncInProgress,
    lastSyncTime,
    queueItem,
    startSync,
  };
}
```

#### useGPS Hook

```typescript
// hooks/useGPS.ts

import { useState } from 'react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  captureMethod: 'GPS' | 'MANUAL';
}

export function useGPS() {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const captureGPS = async (): Promise<GPSCoordinates> => {
    setIsCapturing(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }
      
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        }
      );
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
        captureMethod: 'GPS',
      };
    } catch (error) {
      console.error('GPS capture failed:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  };
  
  return {
    captureGPS,
    isCapturing,
  };
}
```

### 13.3 Service Worker Configuration

```javascript
// public/sw.js

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// API Routes - NetworkFirst with short timeout
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Entities - StaleWhileRevalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/entities'),
  new StaleWhileRevalidate({
    cacheName: 'entities-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Images - CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Offline fallback page
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await fetch(event.request);
    } catch (error) {
      const cache = await caches.open('offline-fallback');
      return cache.match('/offline.html');
    }
  }
);

// Background sync for assessments and responses
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // This would trigger the sync process
  // In practice, the app handles sync through Zustand store
  console.log('Background sync triggered');
}
```

### 13.4 PWA Configuration

```javascript
// next.config.js

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\..*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  swcMinify: true,
});
```

### 13.5 Manifest Configuration

```json
// public/manifest.json

{
  "name": "Disaster Management System - Borno State",
  "short_name": "DMS Borno",
  "description": "Offline-first disaster management for humanitarian operations",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "New Assessment",
      "short_name": "Assess",
      "description": "Create new rapid assessment",
      "url": "/assessor/assessments/new",
      "icons": [{ "src": "/icons/assess-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Sync Queue",
      "short_name": "Sync",
      "description": "View sync queue",
      "url": "/assessor/sync",
      "icons": [{ "src": "/icons/sync-96.png", "sizes": "96x96" }]
    }
  ]
}
```

### 13.6 Realtime Updates with Supabase

#### Realtime Subscription Pattern
```typescript
// hooks/useRealtimeQueue.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/db/supabase';

export function useRealtimeQueue(
  table: 'rapid_assessments' | 'rapid_responses'
) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: 'verification_status=eq.PENDING',
        },
        (payload) => {
          console.log(`${table} changed:`, payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({
            queryKey: ['verification-queue'],
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]);
}

#### Usage in Dashboard

```typescript
// In any dashboard component
export function VerificationQueue() {
  const { data } = useQuery({
    queryKey: ['verification-queue'],
    queryFn: fetchQueue,
    // No refetchInterval needed!
  });
  
  // Subscribe to realtime changes
  useRealtimeQueue('rapid_assessments');
  useRealtimeQueue('rapid_responses');
  
  return (
    // ... render queue
  );
}
```

---

## 14. Form Systems

### 14.1 Assessment Form Template

```typescript
// components/forms/assessment/HealthAssessmentForm.tsx

'use client';

import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { BooleanField } from '@/components/forms/fields/BooleanField';
import { GPSField } from '@/components/forms/fields/GPSField';
import { MediaField } from '@/components/forms/fields/MediaField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOffline } from '@/hooks/useOffline';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db/offline';

const HealthAssessmentSchema = z.object({
  // Gap-indicating boolean fields
  hasFunctionalClinic: z.boolean(),
  hasEmergencyServices: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasTrainedStaff: z.boolean(),
  
  // Quantity fields
  numberHealthFacilities: z.number().int().nonnegative(),
  healthFacilityTypes: z.array(z.string()),
  qualifiedHealthWorkers: z.number().int().nonnegative(),
  commonHealthIssues: z.array(z.string()),
  
  // Additional
  hasMaternalChildServices: z.boolean(),
  additionalDetails: z.string().optional(),
  
  // Metadata
  gpsCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    timestamp: z.date(),
    captureMethod: z.enum(['GPS', 'MANUAL']),
  }),
  photos: z.array(z.any()).optional(),
});

type HealthAssessmentFormData = z.infer<typeof HealthAssessmentSchema>;

interface HealthAssessmentFormProps {
  entityId: string;
  incidentId: string;
  onComplete?: () => void;
}

export const HealthAssessmentForm: FC<HealthAssessmentFormProps> = ({
  entityId,
  incidentId,
  onComplete,
}) => {
  const router = useRouter();
  const { isOffline, queueItem } = useOffline();
  
  const form = useForm<HealthAssessmentFormData>({
    resolver: zodResolver(HealthAssessmentSchema),
    defaultValues: {
      hasFunctionalClinic: false,
      hasEmergencyServices: false,
      hasMedicalSupplies: false,
      hasTrainedStaff: false,
      numberHealthFacilities: 0,
      healthFacilityTypes: [],
      qualifiedHealthWorkers: 0,
      commonHealthIssues: [],
      hasMaternalChildServices: false,
    },
  });
  
  const onSubmit = async (data: HealthAssessmentFormData) => {
    try {
      const assessment = {
        id: crypto.randomUUID(),
        entityId,
        incidentId,
        assessmentType: 'HEALTH',
        assessmentDate: new Date(),
        assessmentData: {
          hasFunctionalClinic: data.hasFunctionalClinic,
          hasEmergencyServices: data.hasEmergencyServices,
          hasMedicalSupplies: data.hasMedicalSupplies,
          hasTrainedStaff: data.hasTrainedStaff,
          numberHealthFacilities: data.numberHealthFacilities,
          healthFacilityTypes: data.healthFacilityTypes,
          qualifiedHealthWorkers: data.qualifiedHealthWorkers,
          commonHealthIssues: data.commonHealthIssues,
          hasMaternalChildServices: data.hasMaternalChildServices,
          additionalDetails: data.additionalDetails,
        },
        verificationStatus: 'DRAFT',
        syncStatus: 'LOCAL',
        offlineId: crypto.randomUUID(),
        versionNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Save to IndexedDB
      await db.assessments.add(assessment);
      
      // Queue for sync
      await queueItem({
        type: 'assessment',
        action: 'create',
        data: assessment,
        offlineId: assessment.offlineId,
        priority: 'NORMAL',
      });
      
      // Show success message
      if (isOffline) {
        alert('Assessment saved offline. Will sync when connection is restored.');
      } else {
        alert('Assessment submitted for verification.');
      }
      
      onComplete?.();
      router.push('/assessor/dashboard');
    } catch (error) {
      console.error('Failed to save assessment:', error);
      alert('Failed to save assessment. Please try again.');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Health Assessment</h2>
          
          {/* Gap-indicating boolean fields */}
          <BooleanField
            name="hasFunctionalClinic"
            label="Functional Clinic Available"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          <BooleanField
            name="hasEmergencyServices"
            label="Emergency Services Available"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          <BooleanField
            name="hasMedicalSupplies"
            label="Adequate Medical Supplies"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          <BooleanField
            name="hasTrainedStaff"
            label="Trained Health Staff Present"
            description="Gap exists if FALSE"
            showGapIndicator
            gapWhenFalse
          />
          
          {/* Quantity fields */}
          <div>
            <Label>Number of Health Facilities</Label>
            <Input
              type="number"
              min="0"
              {...form.register('numberHealthFacilities', { valueAsNumber: true })}
            />
          </div>
          
          <div>
            <Label>Qualified Health Workers</Label>
            <Input
              type="number"
              min="0"
              {...form.register('qualifiedHealthWorkers', { valueAsNumber: true })}
            />
          </div>
          
          {/* Additional boolean */}
          <BooleanField
            name="hasMaternalChildServices"
            label="Maternal & Child Health Services Available"
          />
          
          {/* Text area */}
          <div>
            <Label>Additional Details</Label>
            <Textarea
              placeholder="Any additional health-related observations..."
              {...form.register('additionalDetails')}
            />
          </div>
          
          {/* GPS Capture */}
          <GPSField name="gpsCoordinates" />
          
          {/* Photo Capture */}
          <MediaField name="photos" label="Health Facility Photos" maxFiles={5} />
        </div>
        
        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {isOffline ? 'Save Offline' : 'Submit Assessment'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

### 14.2 Response Form Pattern

```typescript
// components/forms/response/ResponsePlanningForm.tsx

'use client';

import { FC, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { db } from '@/lib/db/offline';

const ResponseItemSchema = z.object({
  name: z.string().min(1, 'Item name required'),
  unit: z.string().min(1, 'Unit required'),
  quantity: z.number().positive('Quantity must be positive'),
  donorName: z.string().optional(),
  donorCommitmentId: z.string().optional(),
});

const ResponsePlanningSchema = z.object({
  assessmentId: z.string().uuid(),
  plannedDate: z.date(),
  items: z.array(ResponseItemSchema).min(1, 'At least one item required'),
});

type ResponsePlanningFormData = z.infer<typeof ResponsePlanningSchema>;

interface ResponsePlanningFormProps {
  assessmentId: string;
  entityId: string;
  onComplete?: () => void;
}

export const ResponsePlanningForm: FC<ResponsePlanningFormProps> = ({
  assessmentId,
  entityId,
  onComplete,
}) => {
  const { queueItem } = useOffline();
  
  const form = useForm<ResponsePlanningFormData>({
    resolver: zodResolver(ResponsePlanningSchema),
    defaultValues: {
      assessmentId,
      plannedDate: new Date(),
      items: [{ name: '', unit: '', quantity: 0 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const onSubmit = async (data: ResponsePlanningFormData) => {
    try {
      const response = {
        id: crypto.randomUUID(),
        assessmentId: data.assessmentId,
        entityId,
        status: 'PLANNED',
        plannedDate: data.plannedDate,
        items: data.items,
        verificationStatus: 'DRAFT',
        syncStatus: 'LOCAL',
        offlineId: crypto.randomUUID(),
        versionNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.responses.add(response);
      
      await queueItem({
        type: 'response',
        action: 'create',
        data: response,
        offlineId: response.offlineId,
        priority: 'NORMAL',
      });
      
      alert('Response plan saved successfully');
      onComplete?.();
    } catch (error) {
      console.error('Failed to save response:', error);
      alert('Failed to save response plan');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Plan Response</h2>
          
          <div>
            <Label>Planned Delivery Date</Label>
            <Input
              type="date"
              {...form.register('plannedDate', { valueAsDate: true })}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Response Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', unit: '', quantity: 0 })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Item Name</Label>
                    <Input
                      {...form.register(`items.${index}.name`)}
                      placeholder="e.g., Water bottles"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Input
                      {...form.register(`items.${index}.unit`)}
                      placeholder="e.g., bottles"
                    />
                  </div>
                </div>
                
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          <Button type="submit">Save Plan</Button>
          <Button type="button" variant="outline" onClick={() => onComplete?.()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
```

---

## Part 4B Summary

This completes Part 4 of the architecture document, covering:
- Complete component architecture with layouts and shared components
- State management with Zustand (Auth, Offline, Entity stores)
- Offline strategy with IndexedDB/Dexie
- Custom hooks for offline operations and GPS
- Service worker and PWA configuration
- Form systems with complete examples


# Part 5: Dashboard Specifications, Security & Deployment

---

## 15. Dashboard Specifications

### 15.1 Crisis Management Dashboard (Coordinator)

#### Layout Structure

```typescript
// app/(auth)/coordinator/dashboard/page.tsx

'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/db/supabase';

export default function CrisisDashboard() {
  const { data, refetch } = useQuery({
    queryKey: ['crisis-dashboard'],
    queryFn: fetchDashboardData,
    // Remove refetchInterval - use realtime instead
  });
  
  // Add realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('crisis-updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rapid_assessments',
          filter: 'verification_status=eq.PENDING'
        },
        () => {
          refetch(); // Update on any change to pending assessments
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'rapid_responses',
          filter: 'verification_status=eq.PENDING'
        },
        () => {
          refetch();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);
  
  // ... rest of component
}
```

#### Verification Queue Component

```typescript
// components/dashboards/crisis/VerificationQueue.tsx

'use client';

import { FC, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VerificationQueueProps {
  assessments: any[];
  responses: any[];
  onVerify: () => void;
}

export const VerificationQueue: FC<VerificationQueueProps> = ({
  assessments,
  responses,
  onVerify,
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [rejectingItem, setRejectingItem] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  
  const handleVerify = async (id: string, type: 'assessment' | 'response', action: 'approve' | 'reject') => {
    try {
      const endpoint = type === 'assessment' 
        ? `/api/v1/assessments/${id}/verify`
        : `/api/v1/responses/${id}/verify`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action,
          ...(action === 'reject' && {
            reason: 'INSUFFICIENT_DATA',
            feedback: rejectionFeedback,
          }),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Verification failed');
      }
      
      setRejectingItem(null);
      setRejectionFeedback('');
      onVerify();
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to verify item');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="assessments">
          <TabsList className="w-full">
            <TabsTrigger value="assessments" className="flex-1">
              Assessments ({assessments.length})
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex-1">
              Responses ({responses.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assessments" className="space-y-2">
            {assessments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending assessments
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{assessment.affectedEntity.name}</p>
                      <p className="text-sm text-gray-500">
                        {assessment.assessmentType} - {new Date(assessment.assessmentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedItem(expandedItem === assessment.id ? null : assessment.id)}
                    >
                      {expandedItem === assessment.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {expandedItem === assessment.id && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="text-sm">
                        <p className="font-medium">Assessor: {assessment.assessor.name}</p>
                        <p className="text-gray-600 mt-1">
                          Assessment Data:
                        </p>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(assessment.assessmentData, null, 2)}
                        </pre>
                      </div>
                      
                      {rejectingItem === assessment.id ? (
                        <div className="space-y-2">
                          <Label>Rejection Feedback</Label>
                          <Textarea
                            value={rejectionFeedback}
                            onChange={(e) => setRejectionFeedback(e.target.value)}
                            placeholder="Explain why this assessment is being rejected..."
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVerify(assessment.id, 'assessment', 'reject')}
                            >
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectingItem(null);
                                setRejectionFeedback('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleVerify(assessment.id, 'assessment', 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => setRejectingItem(assessment.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="responses" className="space-y-2">
            {responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending responses
              </div>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{response.affectedEntity.name}</p>
                      <p className="text-sm text-gray-500">
                        {response.items.length} items - {new Date(response.responseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedItem(expandedItem === response.id ? null : response.id)}
                    >
                      {expandedItem === response.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {expandedItem === response.id && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="text-sm">
                        <p className="font-medium">Responder: {response.responder.name}</p>
                        {response.donorName && (
                          <p className="text-gray-600">Donor: {response.donorName}</p>
                        )}
                        <p className="text-gray-600 mt-1">Items:</p>
                        <ul className="list-disc list-inside">
                          {response.items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.quantity} {item.unit} of {item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleVerify(response.id, 'response', 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleVerify(response.id, 'response', 'reject')}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
```

### 15.2 Situation Awareness Dashboard

```typescript
// app/(auth)/coordinator/monitoring/page.tsx

'use client';

import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GapAnalysisPanel } from '@/components/dashboards/situation/GapAnalysisPanel';
import { EntityMapPanel } from '@/components/dashboards/situation/EntityMapPanel';
import { AssessmentSummaryPanel } from '@/components/dashboards/situation/AssessmentSummaryPanel';

export default function SituationAwarenessDashboard() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  
  // Fetch incidents
  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const response = await fetch('/api/v1/incidents?status=ACTIVE', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return response.json();
    },
  });
  
  // Fetch situation data for selected incident
  const { data: situationData } = useQuery({
    queryKey: ['situation', selectedIncidentId, selectedEntityId],
    queryFn: async () => {
      if (!selectedIncidentId) return null;
      
      const response = await fetch(
        `/api/v1/dashboard/situation?incidentId=${selectedIncidentId}${selectedEntityId !== 'all' ? `&entityId=${selectedEntityId}` : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      return response.json();
    },
    enabled: !!selectedIncidentId,
    refetchInterval: 30000,
  });
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Situation Awareness Dashboard</h1>
        <p className="text-gray-600">Comprehensive disaster monitoring</p>
      </div>
      
      {/* Three-Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Panel: Incident Overview */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Incident Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="text-sm font-medium">Select Incident</label>
              <Select value={selectedIncidentId} onValueChange={setSelectedIncidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select incident..." />
                </SelectTrigger>
                <SelectContent>
                  {incidents?.data.map((incident: any) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      {incident.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {situationData?.data.incident && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Declaration Date</p>
                  <p className="font-medium">
                    {new Date(situationData.data.incident.declarationDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {Math.ceil(
                      (new Date().getTime() - new Date(situationData.data.incident.declarationDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )} days
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Affected Population</p>
                  <p className="font-medium">
                    {situationData.data.populationMetrics.totalPopulation.toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    {situationData.data.incident.status}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Center Panel: Entity Assessment & Map */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
            <div>
              <label className="text-sm font-medium">Select Entity</label>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {situationData?.data.entities.map((entity: any) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AssessmentSummaryPanel
                assessments={situationData?.data.assessments || {}}
                entityId={selectedEntityId}
              />
            </div>
            
            <div className="h-64 border rounded-lg">
              <EntityMapPanel
                entities={situationData?.data.entities || []}
                selectedEntityId={selectedEntityId === 'all' ? null : selectedEntityId}
                gapAnalysis={situationData?.data.gapAnalysis || []}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Right Panel: Gap Analysis */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <GapAnalysisPanel
              gapAnalysis={situationData?.data.gapAnalysis || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---


## 16. Security Architecture

### 16.1 Authentication Implementation

```typescript
// lib/auth/config.ts

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db/client';
import { AuthService } from './service';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        });
        
        if (!user || !user.isActive) {
          return null;
        }
        
        const isValid = await AuthService.comparePassword(
          credentials.password,
          user.passwordHash
        );
        
        if (!isValid) {
          return null;
        }
        
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map(ur => ur.role.name),
          permissions: user.roles.flatMap(ur =>
            ur.role.permissions.map(p => p.code)
          ),
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};
```

### 16.2 API Security Middleware

```typescript
// lib/middleware/security.ts

import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';

// Rate limiting configuration
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

// Security headers middleware
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );
  
  return response;
}

// CORS middleware
export function withCORS(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
}
```

### 16.3 Data Encryption

```typescript
// lib/security/encryption.ts

import crypto from 'crypto';

export class EncryptionService {
  private static ALGORITHM = 'aes-256-gcm';
  private static KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  
  static encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }
  
  static decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.KEY,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## 17. Deployment Architecture

### 17.1 Environment Configuration

```bash