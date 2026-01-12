-- Create document_names table
CREATE TABLE IF NOT EXISTS `document_names` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `riding_company_ids` JSON NOT NULL,
    `type` VARCHAR(255) NOT NULL DEFAULT 'file',
    `required` TINYINT(1) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `document_names_name_unique` (`name`),
    KEY `document_names_name_index` (`name`),
    KEY `document_names_active_index` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add document_name_id to driver_documents table (only if column doesn't exist)
SET @dbname = DATABASE();
SET @tablename = "driver_documents";
SET @columnname = "document_name_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BIGINT UNSIGNED NULL AFTER `id`")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index if it doesn't exist
SET @indexname = "driver_documents_document_name_id_index";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  "SELECT 'Index already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD KEY ", @indexname, " (`document_name_id`)")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key if it doesn't exist
SET @fkname = "driver_documents_document_name_id_foreign";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (constraint_name = @fkname)
  ) > 0,
  "SELECT 'Foreign key already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (`document_name_id`) REFERENCES `document_names` (`id`) ON DELETE CASCADE")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

