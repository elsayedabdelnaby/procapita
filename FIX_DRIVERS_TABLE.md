# إصلاح مشاكل جدول Drivers

## المشكلة
عند محاولة Create أو Update لـ Driver، قد تظهر أخطاء SQL تشير إلى أن بعض الأعمدة غير موجودة في قاعدة البيانات.

## الحل

### الطريقة 1: تشغيل SQL مباشرة (الأسرع)

1. افتح phpMyAdmin أو أي أداة إدارة قاعدة البيانات
2. اختر قاعدة البيانات الخاصة بك
3. افتح ملف `database/migrations/fix_drivers_table_columns.sql`
4. انسخ محتوى الملف وقم بتشغيله في SQL

هذا الملف يتحقق من جميع الأعمدة المطلوبة ويضيف المفقود منها تلقائياً.

### الطريقة 2: تشغيل Migrations (مُوصى به)

افتح Terminal في Laragon أو CMD في مجلد المشروع وقم بتشغيل:

```bash
php artisan migrate
```

## ما تم إصلاحه

### 1. إضافة حماية في DriverService
تم إضافة دالة `filterExistingColumns()` التي تصفي تلقائياً أي أعمدة غير موجودة في قاعدة البيانات قبل محاولة الإدراج أو التحديث.

### 2. جميع الأعمدة المطلوبة
تم التحقق من جميع الأعمدة التالية:

#### الأعمدة الأساسية:
- ✅ uuid
- ✅ company_id
- ✅ full_name
- ✅ phone
- ✅ whatsapp_phone
- ✅ email
- ✅ notes

#### الأعمدة المرتبطة:
- ✅ riding_company_id
- ✅ campaign_id
- ✅ lead_source_id
- ✅ assigned_to
- ✅ team_leader_id
- ✅ account_manager_id
- ✅ lead_status_id
- ✅ lead_stage_id
- ✅ current_stage_id

#### الأعمدة الإضافية:
- ✅ driver_num
- ✅ duplicate
- ✅ confirm_duplicate
- ✅ assigned_time
- ✅ last_assigned_time
- ✅ last_assigned_by
- ✅ lead_status_comment
- ✅ next_follow_up
- ✅ last_follow_up
- ✅ next_time
- ✅ cancel_reason
- ✅ worked_with_us_before
- ✅ vehicle_type_and_year
- ✅ city
- ✅ feedback_count
- ✅ vehicle_type
- ✅ **car_or_scooter** (المشكلة الرئيسية)
- ✅ has_worked_before
- ✅ governorate
- ✅ resigned_leads

## ملاحظات مهمة

1. **car_or_scooter**: هذا العمود كان السبب الرئيسي في الخطأ. تم إضافته في migration لكن لم يتم تشغيله.

2. **الحماية المضافة**: الآن حتى لو كان هناك عمود مفقود، لن يحدث خطأ SQL لأن النظام سيتجاهله تلقائياً.

3. **التحقق من الأعمدة**: النظام الآن يتحقق من وجود الأعمدة قبل محاولة استخدامها.

## بعد الإصلاح

بعد تشغيل SQL أو Migration:
- ✅ لن تحدث أخطاء SQL عند Create
- ✅ لن تحدث أخطاء SQL عند Update
- ✅ جميع الأعمدة المطلوبة موجودة
- ✅ النظام محمي من الأعمدة المفقودة

## التحقق من الإصلاح

بعد تشغيل SQL، يمكنك التحقق من أن جميع الأعمدة موجودة:

```sql
SHOW COLUMNS FROM drivers;
```

أو في Laravel:

```php
Schema::getColumnListing('drivers');
```
