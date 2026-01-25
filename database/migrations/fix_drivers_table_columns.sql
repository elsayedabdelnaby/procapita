-- Fix drivers table columns - Add missing columns if they don't exist
-- Run this SQL directly in your database to ensure all columns exist

-- Check and add car_or_scooter
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

-- Check and add duplicate
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'duplicate'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `duplicate` INT DEFAULT 0 AFTER `driver_num`',
    'SELECT "Column duplicate already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add confirm_duplicate
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'confirm_duplicate'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `confirm_duplicate` BOOLEAN DEFAULT FALSE AFTER `duplicate`',
    'SELECT "Column confirm_duplicate already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add last_assigned_time
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'last_assigned_time'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `last_assigned_time` DATETIME NULL AFTER `assigned_to`',
    'SELECT "Column last_assigned_time already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add worked_with_us_before
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'worked_with_us_before'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `worked_with_us_before` TEXT NULL AFTER `notes`',
    'SELECT "Column worked_with_us_before already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add vehicle_type_and_year
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'vehicle_type_and_year'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `vehicle_type_and_year` TEXT NULL AFTER `worked_with_us_before`',
    'SELECT "Column vehicle_type_and_year already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add city
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'city'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `city` VARCHAR(255) NULL AFTER `vehicle_type_and_year`',
    'SELECT "Column city already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add feedback_count
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'feedback_count'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `feedback_count` INT DEFAULT 0 AFTER `lead_status_comment`',
    'SELECT "Column feedback_count already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add vehicle_type
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'vehicle_type'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `vehicle_type` VARCHAR(255) NULL AFTER `feedback_count`',
    'SELECT "Column vehicle_type already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add has_worked_before
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'has_worked_before'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `has_worked_before` VARCHAR(255) NULL AFTER `vehicle_type`',
    'SELECT "Column has_worked_before already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add governorate
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'governorate'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `governorate` VARCHAR(255) NULL AFTER `has_worked_before`',
    'SELECT "Column governorate already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add team_leader_id
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'team_leader_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `team_leader_id` BIGINT UNSIGNED NULL AFTER `assigned_to`, ADD INDEX `drivers_team_leader_id_index` (`team_leader_id`), ADD CONSTRAINT `drivers_team_leader_id_foreign` FOREIGN KEY (`team_leader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "Column team_leader_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add account_manager_id
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'account_manager_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `account_manager_id` BIGINT UNSIGNED NULL AFTER `team_leader_id`, ADD INDEX `drivers_account_manager_id_index` (`account_manager_id`), ADD CONSTRAINT `drivers_account_manager_id_foreign` FOREIGN KEY (`account_manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "Column account_manager_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add resigned_leads
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'resigned_leads'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `resigned_leads` TEXT NULL AFTER `account_manager_id`',
    'SELECT "Column resigned_leads already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add assigned_time
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'assigned_time'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `assigned_time` DATETIME NULL AFTER `assigned_to`',
    'SELECT "Column assigned_time already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add last_assigned_by
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'last_assigned_by'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `last_assigned_by` BIGINT UNSIGNED NULL AFTER `assigned_time`, ADD INDEX `drivers_last_assigned_by_index` (`last_assigned_by`), ADD CONSTRAINT `drivers_last_assigned_by_foreign` FOREIGN KEY (`last_assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "Column last_assigned_by already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add cancel_reason
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'cancel_reason'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `cancel_reason` VARCHAR(255) NULL AFTER `notes`',
    'SELECT "Column cancel_reason already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add next_follow_up
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'next_follow_up'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `next_follow_up` DATETIME NULL AFTER `lead_status_comment`',
    'SELECT "Column next_follow_up already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add last_follow_up
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'last_follow_up'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `last_follow_up` DATETIME NULL AFTER `next_follow_up`',
    'SELECT "Column last_follow_up already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add driver_num
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'driver_num'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `driver_num` VARCHAR(255) NULL AFTER `id`, ADD INDEX `drivers_driver_num_index` (`driver_num`)',
    'SELECT "Column driver_num already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add lead_stage_id
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'lead_stage_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `lead_stage_id` BIGINT UNSIGNED NULL AFTER `lead_status_id`, ADD INDEX `drivers_lead_stage_id_index` (`lead_stage_id`)',
    'SELECT "Column lead_stage_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add lead_status_comment
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'lead_status_comment'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `lead_status_comment` TEXT NULL AFTER `lead_status_id`',
    'SELECT "Column lead_status_comment already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add next_time
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'drivers' 
    AND COLUMN_NAME = 'next_time'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drivers` ADD COLUMN `next_time` VARCHAR(10) NULL AFTER `next_follow_up`',
    'SELECT "Column next_time already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'All columns checked and added if needed!' AS result;
