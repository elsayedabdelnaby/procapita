# تشغيل Migration لإصلاح جدول Drivers

## تم إنشاء Migration شامل

تم إنشاء ملف migration جديد:
`Modules/Drivers/database/migrations/2026_01_21_000002_fix_all_drivers_table_columns.php`

هذا الملف يضيف جميع الأعمدة المفقودة تلقائياً.

## كيفية التشغيل

### الطريقة 1: استخدام Laragon Terminal (مُوصى به)

1. افتح Laragon
2. اضغط على Terminal
3. قم بتشغيل:

```bash
cd c:\laragon\www\dopave\ubercrm
php artisan migrate
```

### الطريقة 2: استخدام CMD

1. افتح CMD
2. قم بتشغيل:

```bash
cd c:\laragon\www\dopave\ubercrm
php artisan migrate
```

### الطريقة 3: استخدام PowerShell

```powershell
cd c:\laragon\www\dopave\ubercrm
php artisan migrate
```

## ما سيتم إضافته

سيتم التحقق من وإضافة جميع الأعمدة التالية إذا كانت مفقودة:

- ✅ car_or_scooter
- ✅ duplicate
- ✅ confirm_duplicate
- ✅ last_assigned_time
- ✅ worked_with_us_before
- ✅ vehicle_type_and_year
- ✅ city
- ✅ feedback_count
- ✅ vehicle_type
- ✅ has_worked_before
- ✅ governorate
- ✅ team_leader_id
- ✅ account_manager_id
- ✅ resigned_leads
- ✅ assigned_time
- ✅ last_assigned_by
- ✅ cancel_reason
- ✅ next_follow_up
- ✅ last_follow_up
- ✅ driver_num
- ✅ lead_stage_id
- ✅ lead_status_comment
- ✅ next_time

## ملاحظة

- Migration آمن: يتحقق من وجود الأعمدة قبل إضافتها
- لن يحذف أي بيانات موجودة
- يمكن تشغيله عدة مرات بأمان

## بعد التشغيل

بعد تشغيل migration بنجاح:
- ✅ لن تحدث أخطاء SQL عند Create
- ✅ لن تحدث أخطاء SQL عند Update
- ✅ جميع الأعمدة المطلوبة موجودة
- ✅ النظام محمي من الأعمدة المفقودة
