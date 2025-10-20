-- Targeted Schema Update: Add Story 4.1 Compatibility
-- This script adds only the missing Story 4.1 components while preserving existing data

-- Step 1: Add missing fields to RapidResponse table for Story 4.1
ALTER TABLE rapid_responses 
ADD COLUMN IF NOT EXISTS donor_id UUID,
ADD COLUMN IF NOT EXISTS planned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS response_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_feedback TEXT,
ADD COLUMN IF NOT EXISTS offline_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'LOCAL';

-- Step 2: Create donors table for Story 4.1
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

-- Step 3: Create media_attachments table for Story 4.1
CREATE TABLE IF NOT EXISTS media_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR NOT NULL,
    thumbnail_path VARCHAR,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR NOT NULL
);

-- Step 4: Add foreign key constraints for new fields
ALTER TABLE rapid_responses 
ADD CONSTRAINT fk_rapid_responses_donor 
    FOREIGN KEY (donor_id) REFERENCES donors(id);

ALTER TABLE rapid_responses 
ADD CONSTRAINT fk_rapid_responses_assessment_not_null 
    CHECK (assessment_id IS NOT NULL);

-- Step 5: Add indexes for Story 4.1 performance
CREATE INDEX IF NOT EXISTS idx_rapid_responses_donor_id ON rapid_responses(donor_id);
CREATE INDEX IF NOT EXISTS idx_rapid_responses_planned_date ON rapid_responses(planned_date);
CREATE INDEX IF NOT EXISTS idx_rapid_responses_sync_status ON rapid_responses(sync_status);
CREATE INDEX IF NOT EXISTS idx_media_attachments_response_id ON media_attachments(response_id);

-- Step 6: Add responseId column to sync_conflicts for Story 4.1 conflict tracking
ALTER TABLE sync_conflicts 
ADD COLUMN IF NOT EXISTS response_id UUID;

ALTER TABLE sync_conflicts 
ADD CONSTRAINT fk_sync_conflicts_response 
    FOREIGN KEY (response_id) REFERENCES rapid_responses(id);

-- Step 7: Create trigger for updated_at on donors table
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

-- Step 8: Create trigger for updated_at on media_attachments table
DROP TRIGGER IF EXISTS update_media_attachments_updated_at ON media_attachments;
CREATE TRIGGER update_media_attachments_updated_at BEFORE UPDATE ON media_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Data validation
DO $$
DECLARE
    total_records INTEGER;
BEGIN
    -- Count total records in key tables
    SELECT COUNT(*) INTO total_records FROM users;
    RAISE NOTICE 'Users: % records', total_records;
    
    SELECT COUNT(*) INTO total_records FROM rapid_assessments;
    RAISE NOTICE 'Rapid Assessments: % records', total_records;
    
    SELECT COUNT(*) INTO total_records FROM rapid_responses;
    RAISE NOTICE 'Rapid Responses: % records', total_records;
    
    RAISE NOTICE 'Story 4.1 compatibility update completed successfully!';
END $$;