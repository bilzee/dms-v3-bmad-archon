-- Minimal Schema Migration: Stories 1.1-4.1 Only
-- This script migrates from the full schema to a minimal schema with only implemented story models

-- Step 1: Drop tables that belong to unimplemented stories
-- These models were from future epics and are not needed yet

DROP TABLE IF EXISTS donations CASCADE; -- Donation model removed (not in Stories 1.1-4.1)

-- Step 2: Update RapidResponse table to match Story 4.1 requirements
-- Add missing columns for Story 4.1 implementation

ALTER TABLE rapid_responses 
ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES donors(id),
ADD COLUMN IF NOT EXISTS planned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_feedback TEXT,
ADD COLUMN IF NOT EXISTS offline_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'LOCAL';

-- Step 3: Update ResponseStatus enum to match Story 4.1
-- Convert from old enum values to new PLANNED/DELIVERED values

UPDATE rapid_responses 
SET status = CASE 
    WHEN status IN ('PLANNED', 'IN_PROGRESS') THEN 'PLANNED'
    WHEN status = 'COMPLETED' THEN 'DELIVERED'
    WHEN status = 'CANCELLED' THEN 'PLANNED' -- Reset cancelled to planned
    ELSE 'PLANNED'
END,
response_date = CASE 
    WHEN status = 'COMPLETED' THEN updated_at
    ELSE NULL
END;

-- Step 4: Update verification status to align with existing data
UPDATE rapid_responses 
SET verification_status = CASE 
    WHEN verification_status = 'PENDING' THEN 'DRAFT'
    ELSE verification_status
END
WHERE verification_status = 'PENDING';

-- Step 5: Add proper constraints for Story 4.1 requirements
ALTER TABLE rapid_responses 
ALTER COLUMN assessment_id SET NOT NULL,
ALTER COLUMN planned_date SET NOT NULL,
ALTER COLUMN items SET NOT NULL;

-- Step 6: Create donors table for Story 4.1 (if it doesn't exist)
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    type VARCHAR DEFAULT 'ORGANIZATION',
    contact_email VARCHAR,
    contact_phone VARCHAR,
    organization VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Create media_attachments table for Story 4.1 (if it doesn't exist)
CREATE TABLE IF NOT EXISTS media_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES rapid_responses(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR NOT NULL,
    thumbnail_path VARCHAR,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR NOT NULL
);

-- Step 8: Create indexes for Story 4.1 performance
CREATE INDEX IF NOT EXISTS idx_rapid_responses_donor_id ON rapid_responses(donor_id);
CREATE INDEX IF NOT EXISTS idx_rapid_responses_planned_date ON rapid_responses(planned_date);
CREATE INDEX IF NOT EXISTS idx_rapid_responses_sync_status ON rapid_responses(sync_status);
CREATE INDEX IF NOT EXISTS idx_media_attachments_response_id ON media_attachments(response_id);

-- Step 9: Add responseId column to sync_conflicts for Story 4.1 conflict tracking
ALTER TABLE sync_conflicts 
ADD COLUMN IF NOT EXISTS response_id UUID REFERENCES rapid_responses(id);

-- Step 10: Create trigger for updated_at on donors table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_donors_updated_at ON donors;
CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Data validation for Stories 1.1-4.1 compatibility
DO $$
DECLARE
    missing_assessments INTEGER;
    invalid_statuses INTEGER;
    invalid_sync_statuses INTEGER;
BEGIN
    -- Check for responses without assessments (Story 4.1 requirement)
    SELECT COUNT(*) INTO missing_assessments 
    FROM rapid_responses 
    WHERE assessment_id IS NULL;
    
    -- Check for invalid response statuses
    SELECT COUNT(*) INTO invalid_statuses 
    FROM rapid_responses 
    WHERE status NOT IN ('PLANNED', 'DELIVERED');
    
    -- Check for invalid sync statuses
    SELECT COUNT(*) INTO invalid_sync_statuses 
    FROM rapid_responses 
    WHERE sync_status NOT IN ('LOCAL', 'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT');
    
    IF missing_assessments > 0 THEN
        RAISE EXCEPTION 'Found % responses without assessment_id (Story 4.1 requirement)', missing_assessments;
    END IF;
    
    IF invalid_statuses > 0 THEN
        RAISE EXCEPTION 'Found % responses with invalid status (expected: PLANNED, DELIVERED)', invalid_statuses;
    END IF;
    
    IF invalid_sync_statuses > 0 THEN
        RAISE EXCEPTION 'Found % responses with invalid sync_status', invalid_sync_statuses;
    END IF;
    
    RAISE NOTICE 'Migration validation completed successfully - Stories 1.1-4.1 compatible';
END $$;

-- Step 12: Summary report
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE '✅ Migrated to Stories 1.1-4.1 minimal schema';
    RAISE NOTICE '✅ Added Story 4.1 RapidResponse fields (donorId, items, plannedDate)';
    RAISE NOTICE '✅ Updated ResponseStatus enum to PLANNED/DELIVERED';
    RAISE NOTICE '✅ Created donors and media_attachments tables';
    RAISE NOTICE '✅ Added proper indexes and constraints';
    RAISE NOTICE '✅ Data validation passed';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for Story 4.1 implementation!';
END $$;