-- Add car_or_scooter column to drivers table if it doesn't exist
-- Run this SQL directly in your database if migration doesn't work

SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'car_or_scooter'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `car_or_scooter` VARCHAR(255) NULL AFTER `vehicle_type`',
    'SELECT "Column car_or_scooter already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
