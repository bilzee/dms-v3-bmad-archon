# Backend Fix Required: Rejected Response Resubmission

## **Issue Summary**
Currently, when editing and resubmitting rejected responses, the backend doesn't properly handle status transitions and rejection reason clearing due to incorrect status checking logic.

## **Problem Description**

### **Current Data Model**
Rejected responses in the database have:
- `status: 'DELIVERED'` (from ResponseStatus enum: PLANNED, DELIVERED)  
- `verificationStatus: 'REJECTED'` (from VerificationStatus enum: DRAFT, SUBMITTED, VERIFIED, AUTO_VERIFIED, REJECTED)

### **Backend Logic Issue**
The `updatePlannedResponse` method in `src/lib/services/response.service.ts` checks:
```typescript
if (existingResponse.status !== 'PLANNED' && existingResponse.status !== 'REJECTED') {
  throw new Error('Only planned or rejected responses can be updated')
}

// Later in the method:
if (existingResponse.status === 'REJECTED') {
  updateData.status = 'PLANNED'
  updateData.rejectionReason = null
}
```

**Problem**: There is no `status: 'REJECTED'` in the ResponseStatus enum. Rejected responses have `status: 'DELIVERED'` and `verificationStatus: 'REJECTED'`.

### **Current Workaround**
The frontend now only updates allowed fields (`type`, `priority`, `description`, `items`, `timeline`) to avoid validation errors, but rejection status and reason are not automatically cleared.

## **Required Backend Changes**

### **1. Fix Status Checking Logic**
**File**: `src/lib/services/response.service.ts`  
**Method**: `updatePlannedResponse`

**Current Code**:
```typescript
// Can only update responses in PLANNED or REJECTED status
if (existingResponse.status !== 'PLANNED' && existingResponse.status !== 'REJECTED') {
  throw new Error('Only planned or rejected responses can be updated')
}
```

**Should be**:
```typescript
// Can only update responses in PLANNED status or with REJECTED verification status
if (existingResponse.status !== 'PLANNED' && existingResponse.verificationStatus !== 'REJECTED') {
  throw new Error('Only planned responses or rejected deliveries can be updated')
}
```

### **2. Fix Rejection Clearing Logic**
**Current Code**:
```typescript
if (existingResponse.status === 'REJECTED') {
  updateData.status = 'PLANNED'
  updateData.rejectionReason = null
}
```

**Should be**:
```typescript
if (existingResponse.verificationStatus === 'REJECTED') {
  updateData.status = 'DELIVERED'  // Keep as delivered
  updateData.verificationStatus = 'SUBMITTED'  // Resubmit for verification
  updateData.rejectionReason = null  // Clear rejection reason
  updateData.verifiedAt = null  // Clear previous verification timestamp
}
```

### **3. Update Validation Schema (Optional Enhancement)**
**File**: `src/lib/validation/response.ts`

Consider creating a separate schema for resubmission that allows updating status fields:
```typescript
export const ResubmitRejectedResponseSchema = z.object({
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  description: z.string().optional(),
  items: z.array(ResponseItemSchema).optional(),
  timeline: z.record(z.any()).optional(),
  // Allow status updates for resubmission
  verificationStatus: z.literal('SUBMITTED').optional(),
  rejectionReason: z.literal(null).optional()
})
```

### **4. Add Dedicated Resubmit Endpoint (Alternative Approach)**
**File**: `src/app/api/v1/responses/[id]/resubmit/route.ts`

Create a dedicated endpoint for resubmitting rejected responses:
```typescript
export const POST = withAuth(async (request, context, { params }) => {
  // Validate that response is rejected
  // Update response details
  // Clear rejection reason and set status to SUBMITTED
  // Return updated response
})
```

## **Testing Requirements**
After implementing the fix:

1. **Test rejected response editing**:
   - Edit a rejected response
   - Verify rejection reason is cleared
   - Verify verification status changes to SUBMITTED
   - Verify response appears in "Awaiting Verification" filter

2. **Test edge cases**:
   - Attempt to edit non-rejected responses (should still work for PLANNED)
   - Verify proper permissions enforcement
   - Test with invalid data

## **User Experience Impact**
**Before Fix**: Users can edit rejected responses but status doesn't change and rejection reason persists  
**After Fix**: Users can edit rejected responses and they're automatically resubmitted for coordinator review

## **Priority**
**Medium** - Current workaround allows editing functionality, but full resubmission workflow is incomplete without proper status management.

## **Related Files**
- `src/lib/services/response.service.ts` (main fix needed)
- `src/app/api/v1/responses/[id]/route.ts` (uses the service)
- `src/lib/validation/response.ts` (optional schema enhancement)
- `src/components/forms/response/ResponsePlanningForm.tsx` (frontend implementation)

---
**Created**: December 15, 2025  
**Status**: Backend enhancement required  
**Frontend Workaround**: Implemented ✅