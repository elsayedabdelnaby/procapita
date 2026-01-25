# تشغيل Migrations لإصلاح جدول driver_stages

## المشاكل
1. العمودان `name` و `riding_company_ids` غير موجودان في جدول `driver_stages`.
2. العمود `driver_id` مطلوب (NOT NULL) لكن Driver Stages أصبحت templates عامة.

## الحل

### الطريقة 1: استخدام Laravel Artisan (مُوصى به)

افتح Terminal في مجلد المشروع وقم بتشغيل:

```bash
php artisan migrate
```

أو إذا كنت تستخدم Laragon Terminal:

```bash
cd c:\laragon\www\dopave\ubercrm
php artisan migrate
```

### الطريقة 2: استخدام SQL مباشرة

إذا لم تستطع تشغيل Artisan، يمكنك تشغيل SQL مباشرة في قاعدة البيانات:

1. افتح phpMyAdmin أو أي أداة إدارة قاعدة البيانات
2. اختر قاعدة البيانات `ubercrm` (أو اسم قاعدة البيانات الخاصة بك)
3. افتح ملف `Modules/Drivers/database/migrations/add_name_and_riding_company_ids_to_driver_stages.sql`
4. انسخ محتوى الملف وقم بتشغيله في SQL

أو قم بتشغيل هذا SQL مباشرة:

```sql
-- 1. Add name column to driver_stages table
ALTER TABLE `driver_stages` 
ADD COLUMN IF NOT EXISTS `name` VARCHAR(255) NULL AFTER `id`;

-- 2. Add riding_company_ids column to driver_stages table
ALTER TABLE `driver_stages` 
ADD COLUMN IF NOT EXISTS `riding_company_ids` JSON NULL AFTER `riding_company_id`;

-- 3. Make driver_id nullable (Driver Stages are now templates)
-- First, drop foreign key if exists
SET @dbname = DATABASE();
SET @tablename = "driver_stages";
SET @columnname = "driver_id";

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
```

**ملاحظة:** إذا كان MySQL لا يدعم `IF NOT EXISTS` في `ALTER TABLE`, استخدم هذا بدلاً منه:

```sql
-- Add name column (if it doesn't exist)
SET @dbname = DATABASE();
SET @tablename = "driver_stages";
SET @columnname = "name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(255) NULL AFTER `id`")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add riding_company_ids column (if it doesn't exist)
SET @columnname = "riding_company_ids";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " JSON NULL AFTER `riding_company_id`")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
```

## بعد تشغيل Migration

بعد تشغيل migration بنجاح، سيعمل النظام بشكل طبيعي:
- ✅ يمكن إضافة Driver Stage Name
- ✅ يمكن اختيار عدة Riding Companies لكل Driver Stage
- ✅ لن تحدث أخطاء SQL عند Create/Update Driver Stages

## الملفات المُنشأة

1. `Modules/Drivers/database/migrations/2026_01_24_000001_add_name_to_driver_stages_table.php` - إضافة `name`
2. `Modules/Drivers/database/migrations/2026_01_24_000002_add_riding_company_ids_to_driver_stages_table.php` - إضافة `riding_company_ids`
3. `Modules/Drivers/database/migrations/2026_01_24_000003_make_driver_id_nullable_in_driver_stages_table.php` - جعل `driver_id` nullable
4. `Modules/Drivers/database/migrations/add_name_and_riding_company_ids_to_driver_stages.sql` (SQL مباشر)
5. `Modules/Drivers/database/migrations/make_driver_id_nullable_in_driver_stages.sql` (SQL مباشر)
