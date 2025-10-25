-- Schema Migration Script: Story 4.1 Compatibility
-- This script migrates existing data to work with the corrected schema
-- 
-- IMPORTANT: This script handles backward compatibility for existing Stories 3.1-3.3 data

-- Migration Steps:
-- 1. Add new columns to rapid_responses table
-- 2. Migrate existing data to new schema structure
-- 3. Update enum values
-- 4. Create new tables for donors and media attachments
-- 5. Handle foreign key constraints

-- Step 1: Add new columns to rapid_responses (with proper defaults)
ALTER TABLE rapid_responses 
ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES donors(id),
ADD COLUMN IF NOT EXISTS planned_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_feedback TEXT,
ADD COLUMN IF NOT EXISTS offline_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'LOCAL';

-- Step 2: Migrate existing status values from old enum to new enum
-- Map: PLANNED -> PLANNED, IN_PROGRESS -> PLANNED, COMPLETED -> DELIVERED, CANCELLED -> (keep as exception)
UPDATE rapid_responses 
SET status = CASE 
    WHEN status IN ('PLANNED', 'IN_PROGRESS') THEN 'PLANNED'
    WHEN status = 'COMPLETED' THEN 'DELIVERED'
    ELSE status
END,
response_date = CASE 
    WHEN status = 'COMPLETED' THEN updated_at
    ELSE NULL
END;

-- Step 3: Migrate resources field to items field (for backward compatibility)
-- Convert existing resources JSON to items format if needed
UPDATE rapid_responses 
SET items = CASE 
    WHEN resources IS NOT NULL AND json_typeof(resources) = 'array' THEN resources
    WHEN resources IS NOT NULL AND json_typeof(resources) = 'object' THEN json_build_array(resources)
    ELSE '[]'::jsonb
END
WHERE items = '[]'::jsonb OR items IS NULL;

-- Step 4: Create donor table
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

-- Step 5: Create donation table
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES donors(id),
    description TEXT NOT NULL,
    commitment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_date TIMESTAMP,
    status VARCHAR DEFAULT 'COMMITTED',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    value DECIMAL(10,2),
    currency VARCHAR DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create media_attachments table
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

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rapid_responses_donor_id ON rapid_responses(donor_id);
CREATE INDEX IF NOT EXISTS idx_rapid_responses_planned_date ON rapid_responses(planned_date);
CREATE INDEX IF NOT EXISTS idx_rapid_responses_sync_status ON rapid_responses(sync_status);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_response_id ON media_attachments(response_id);

-- Step 8: Update verification status defaults (align with existing data)
UPDATE rapid_responses 
SET verification_status = CASE 
    WHEN verification_status = 'PENDING' THEN 'DRAFT'
    ELSE verification_status
END
WHERE verification_status = 'PENDING';

-- Step 9: Set NOT NULL constraints for required fields
-- This is done after data migration to avoid conflicts
ALTER TABLE rapid_responses 
ALTER COLUMN assessment_id SET NOT NULL,
ALTER COLUMN planned_date SET NOT NULL,
ALTER COLUMN items SET NOT NULL;

-- Step 10: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Data validation
-- Verify all critical migrations completed successfully
DO $$
DECLARE
    missing_assessments INTEGER;
    invalid_statuses INTEGER;
BEGIN
    -- Check for responses without assessments
    SELECT COUNT(*) INTO missing_assessments 
    FROM rapid_responses 
    WHERE assessment_id IS NULL;
    
    -- Check for invalid statuses
    SELECT COUNT(*) INTO invalid_statuses 
    FROM rapid_responses 
    WHERE status NOT IN ('PLANNED', 'DELIVERED');
    
    IF missing_assessments > 0 THEN
        RAISE EXCEPTION 'Found % responses without assessment_id', missing_assessments;
    END IF;
    
    IF invalid_statuses > 0 THEN
        RAISE EXCEPTION 'Found % responses with invalid status', invalid_statuses;
    END IF;
    
    RAISE NOTICE 'Migration validation completed successfully';
END $$;

-- Summary of changes:
-- ✓ Added donor_id, planned_date, response_date, items fields
-- ✓ Migrated status enum values (COMPLETED → DELIVERED)
-- ✓ Created donors, donations, media_attachments tables
-- ✓ Added proper indexes and constraints
-- ✓ Migrated resources field to items format
-- ✓ Updated verification status values
-- ✓ Added triggers for updated_at columns
-- ✓ Validated data integrity