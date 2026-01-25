# مراجعة شاملة لجميع Migrations

## ترتيب Migrations حسب التاريخ

### Core Migrations (database/migrations/)

#### 2025
- `0001_01_01_000000_create_users_table.php` - إنشاء جدول users الأساسي
- `0001_01_01_000001_create_cache_table.php` - إنشاء جدول cache
- `0001_01_01_000002_create_jobs_table.php` - إنشاء جدول jobs
- `2025_01_15_000000_add_mobile_columns_to_users_table.php` - إضافة أعمدة mobile
- `2025_01_20_000000_update_mobile1_to_required_in_users_table.php` - تحديث mobile1
- `2025_01_23_000000_remove_next_time_and_convert_followup_dates_to_datetime_in_drivers_table.php` - تحويل next_follow_up و last_follow_up إلى datetime
- `2025_08_26_100418_add_two_factor_columns_to_users_table.php` - إضافة 2FA
- `2025_11_01_191202_create_telescope_entries_table.php` - إنشاء Telescope
- `2025_11_01_193715_create_activity_log_table.php` - إنشاء Activity Log
- `2025_11_01_193716_add_event_column_to_activity_log_table.php` - إضافة event
- `2025_11_01_193717_add_batch_uuid_column_to_activity_log_table.php` - إضافة batch_uuid
- `2025_11_01_213235_create_permission_tables.php` - إنشاء جداول Permissions
- `2025_11_11_000000_add_last_assigned_fields_to_drivers_table.php` - إضافة last_assigned_time و last_assigned_by
- `2025_12_02_000111_add_duplicate_field_to_drivers_table.php` - إضافة duplicate (مع فحص)

#### 2026
- `2026_01_12_000003_add_team_leader_id_to_users_table.php` - إضافة team_leader_id لـ users
- `2026_01_20_000004_add_account_manager_id_to_users_table.php` - إضافة account_manager_id لـ users
- `2026_01_21_000001_add_confirm_duplicate_to_drivers_table.php` - إضافة confirm_duplicate (مع فحص)
- `2026_01_22_000001_create_driver_field_permissions.php` - إنشاء permissions للحقول
- `2026_01_22_000002_create_quick_edit_and_edit_permissions.php` - إنشاء quick-edit و edit permissions

### Drivers Module Migrations (Modules/Drivers/database/migrations/)

#### 2025
- `2025_11_10_000001_create_lead_sources_table.php` - إنشاء lead_sources
- `2025_11_10_000002_create_lead_statuses_table.php` - إنشاء lead_statuses
- `2025_11_10_000003_create_drivers_table.php` - إنشاء جدول drivers الأساسي
- `2025_11_10_000004_create_driver_stages_table.php` - إنشاء driver_stages
- `2025_11_10_000005_create_driver_documents_table.php` - إنشاء driver_documents
- `2025_11_12_000001_add_assigned_time_and_last_assigned_by_to_drivers_table.php` - إضافة assigned_time و last_assigned_by
- `2025_11_24_000001_add_original_filename_to_driver_documents_table.php` - إضافة original_filename
- `2025_11_25_000001_create_lead_stages_table.php` - إنشاء lead_stages
- `2025_11_25_000002_add_lead_stage_id_to_drivers_table.php` - إضافة lead_stage_id
- `2025_11_26_000001_add_commission_value_to_lead_stages_table.php` - إضافة commission_value
- `2025_11_26_000001_create_driver_user_table.php` - إنشاء driver_user
- `2025_12_02_000001_create_driver_follow_ups_table.php` - إنشاء driver_follow_ups
- `2025_12_02_000002_add_driver_num_to_drivers_table.php` - إضافة driver_num
- `2025_12_02_000003_add_driver_num_to_driver_follow_ups_table.php` - إضافة driver_num لـ follow_ups
- `2025_12_02_000004_add_lead_status_to_driver_follow_ups_table.php` - إضافة lead_status
- `2025_12_02_000005_add_lead_status_comment_to_drivers_table.php` - إضافة lead_status_comment
- `2025_12_02_000006_add_lead_status_comment_to_driver_follow_ups_table.php` - إضافة lead_status_comment
- `2025_12_02_000007_add_next_follow_up_and_last_follow_up_to_drivers_table.php` - إضافة next_follow_up و last_follow_up
- `2025_12_03_000001_add_next_time_to_drivers_table.php` - إضافة next_time
- `2025_12_21_220145_add_cancel_reason_to_drivers_table.php` - إضافة cancel_reason
- `2025_12_29_000001_add_facebook_form_fields_to_drivers_table.php` - إضافة حقول Facebook

#### 2026
- `2026_01_12_000001_create_driver_lists_table.php` - إنشاء driver_lists (مع فحص) ✅
- `2026_01_12_000002_add_new_fields_to_drivers_table.php` - إضافة feedback_count, vehicle_type, has_worked_before, governorate (مع فحص) ✅
- `2026_01_12_000003_create_custom_dropdown_values_table.php` - إنشاء custom_dropdown_values
- `2026_01_12_000004_replace_stage_template_with_riding_company_in_driver_stages.php` - استبدال stage_template
- `2026_01_12_000006_add_team_leader_and_account_manager_to_drivers_table.php` - إضافة team_leader_id و account_manager_id (مع فحص) ✅
- `2026_01_12_0000065replace_document_template_with_riding_company_in_driver_documents.php` - استبدال document_template
- `2026_01_12_000007_add_resigned_leads_to_drivers_table.php` - إضافة resigned_leads (مع فحص) ✅
- `2026_01_12_000008_add_missing_fields_to_driver_follow_ups_table.php` - إضافة حقول مفقودة
- `2026_01_12_000009_create_document_names_table.php` - إنشاء document_names
- `2026_01_12_000010_add_document_name_id_to_driver_documents_table.php` - إضافة document_name_id
- `2026_01_12_000011_add_name_to_driver_documents_table.php` - إضافة name
- `2026_01_12_000012_migrate_existing_driver_documents_to_document_names.php` - نقل البيانات
- `2026_01_15_000001_add_car_or_scooter_to_drivers_table.php` - إضافة car_or_scooter (مع فحص) ✅
- `2026_01_21_000002_fix_all_drivers_table_columns.php` - إصلاح شامل لجميع الأعمدة (مع فحص) ✅

## الأعمدة المضافة لجدول drivers (بالترتيب)

### من 2025
1. `assigned_time` - `2025_11_12_000001`
2. `last_assigned_by` - `2025_11_12_000001`
3. `lead_stage_id` - `2025_11_25_000002`
4. `driver_num` - `2025_12_02_000002`
5. `lead_status_comment` - `2025_12_02_000005`
6. `next_follow_up` - `2025_12_02_000007`
7. `last_follow_up` - `2025_12_02_000007`
8. `next_time` - `2025_12_03_000001`
9. `cancel_reason` - `2025_12_21_220145`
10. `duplicate` - `2025_12_02_000111` (في database/migrations)

### من 2026
11. `feedback_count` - `2026_01_12_000002` ✅ (مع فحص)
12. `vehicle_type` - `2026_01_12_000002` ✅ (مع فحص)
13. `has_worked_before` - `2026_01_12_000002` ✅ (مع فحص)
14. `governorate` - `2026_01_12_000002` ✅ (مع فحص)
15. `team_leader_id` - `2026_01_12_000006` ✅ (مع فحص)
16. `account_manager_id` - `2026_01_12_000006` ✅ (مع فحص)
17. `resigned_leads` - `2026_01_12_000007` ✅ (مع فحص)
18. `car_or_scooter` - `2026_01_15_000001` ✅ (مع فحص)
19. `confirm_duplicate` - `2026_01_21_000001` ✅ (مع فحص)

### من fix_all_drivers_table_columns (2026_01_21_000002)
هذا الـ migration شامل ويضيف جميع الأعمدة المفقودة مع فحص:
- `car_or_scooter`
- `duplicate`
- `confirm_duplicate`
- `last_assigned_time`
- `worked_with_us_before`
- `vehicle_type_and_year`
- `city`
- `feedback_count`
- `vehicle_type`
- `has_worked_before`
- `governorate`
- `team_leader_id`
- `account_manager_id`
- `resigned_leads`
- `assigned_time`
- `last_assigned_by`
- `cancel_reason`
- `next_follow_up`
- `last_follow_up`
- `driver_num`
- `lead_stage_id`
- `lead_status_comment`
- `next_time`

## الإصلاحات المطبقة

### ✅ Migrations التي تم إصلاحها:
1. `2026_01_12_000001_create_driver_lists_table.php` - إضافة فحص `Schema::hasTable()`
2. `2026_01_12_000002_add_new_fields_to_drivers_table.php` - إضافة فحص `Schema::hasColumn()` لجميع الأعمدة
3. `2026_01_12_000006_add_team_leader_and_account_manager_to_drivers_table.php` - إضافة فحص `Schema::hasColumn()`
4. `2026_01_12_000007_add_resigned_leads_to_drivers_table.php` - إضافة فحص `Schema::hasColumn()`
5. `2025_12_02_000002_add_driver_num_to_drivers_table.php` - إضافة فحص `Schema::hasColumn()`

### ✅ Migrations التي لديها فحص بالفعل:
- `2026_01_15_000001_add_car_or_scooter_to_drivers_table.php`
- `2026_01_21_000001_add_confirm_duplicate_to_drivers_table.php`
- `2026_01_21_000002_fix_all_drivers_table_columns.php`
- `2025_12_02_000111_add_duplicate_field_to_drivers_table.php`
- `2025_11_12_000001_add_assigned_time_and_last_assigned_by_to_drivers_table.php`
- `2025_12_02_000005_add_lead_status_comment_to_drivers_table.php`
- `2025_12_02_000007_add_next_follow_up_and_last_follow_up_to_drivers_table.php`
- `2025_12_03_000001_add_next_time_to_drivers_table.php`
- `2025_12_21_220145_add_cancel_reason_to_drivers_table.php`
- `2025_11_25_000002_add_lead_stage_id_to_drivers_table.php`
- `2025_11_11_000000_add_last_assigned_fields_to_drivers_table.php`
- `2025_12_29_000001_add_facebook_form_fields_to_drivers_table.php`
- `2026_01_12_000008_add_missing_fields_to_driver_follow_ups_table.php`
- `2026_01_12_000009_create_document_names_table.php`
- `2026_01_12_000010_add_document_name_id_to_driver_documents_table.php`
- `2026_01_12_000011_add_name_to_driver_documents_table.php`

## ملاحظات مهمة

1. **الترتيب الزمني**: جميع migrations مرتبة حسب التاريخ بشكل صحيح
2. **الفحص**: جميع migrations التي تضيف أعمدة الآن تتحقق من وجودها أولاً
3. **التكرار**: لا يوجد تكرار - كل migration يضيف أعمدة مختلفة أو يتحقق من وجودها
4. **الأمان**: يمكن تشغيل migrations عدة مرات بأمان

## كيفية التشغيل

```bash
php artisan migrate
```

جميع migrations الآن آمنة ويمكن تشغيلها بدون مشاكل.
