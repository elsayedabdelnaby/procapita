-- Add riding_company_id column to whatsapp_sessions table
-- Run this SQL directly in your database if migration doesn't work

ALTER TABLE `whatsapp_sessions` 
ADD COLUMN `riding_company_id` BIGINT UNSIGNED NULL AFTER `company_id`;

ALTER TABLE `whatsapp_sessions` 
ADD CONSTRAINT `whatsapp_sessions_riding_company_id_foreign` 
FOREIGN KEY (`riding_company_id`) REFERENCES `riding_companies` (`id`) ON DELETE CASCADE;

