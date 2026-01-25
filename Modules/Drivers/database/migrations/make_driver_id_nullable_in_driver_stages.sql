-- Make driver_id nullable in driver_stages table
-- This allows Driver Stages to be templates (without specific driver)

-- First, drop foreign key if exists
SET @dbname = DATABASE();
SET @tablename = "driver_stages";
SET @columnname = "driver_id";

-- Find and drop foreign key
SET @fk_name = (
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
    AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @drop_fk = IF(@fk_name IS NOT NULL, 
    CONCAT('ALTER TABLE `', @tablename, '` DROP FOREIGN KEY `', @fk_name, '`'),
    'SELECT 1'
);

PREPARE stmt FROM @drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make driver_id nullable
ALTER TABLE `driver_stages` 
MODIFY COLUMN `driver_id` BIGINT UNSIGNED NULL;
