-- Add name column to driver_stages table
ALTER TABLE `driver_stages` 
ADD COLUMN IF NOT EXISTS `name` VARCHAR(255) NULL AFTER `id`;

-- Add riding_company_ids column to driver_stages table
ALTER TABLE `driver_stages` 
ADD COLUMN IF NOT EXISTS `riding_company_ids` JSON NULL AFTER `riding_company_id`;
