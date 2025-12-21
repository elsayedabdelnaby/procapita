-- Step 1: Delete all existing WhatsApp sessions
DELETE FROM `whatsapp_sessions`;

-- Step 2: Add riding_company_id column to whatsapp_sessions table
-- Check if column exists first
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'whatsapp_sessions' 
    AND COLUMN_NAME = 'riding_company_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `whatsapp_sessions` ADD COLUMN `riding_company_id` BIGINT UNSIGNED NULL AFTER `company_id`',
    'SELECT "Column riding_company_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Add foreign key constraint if it doesn't exist
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'whatsapp_sessions' 
    AND CONSTRAINT_NAME = 'whatsapp_sessions_riding_company_id_foreign'
);

SET @sql_fk = IF(@fk_exists = 0,
    'ALTER TABLE `whatsapp_sessions` ADD CONSTRAINT `whatsapp_sessions_riding_company_id_foreign` FOREIGN KEY (`riding_company_id`) REFERENCES `riding_companies` (`id`) ON DELETE CASCADE',
    'SELECT "Foreign key already exists" AS message'
);

PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

