# تشغيل Migration لإضافة deleted_at إلى جدول users

## المشكلة
العمود `deleted_at` غير موجود في جدول `users`، مما يسبب خطأ:
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'users.deleted_at' in 'where clause'
```

## الحل

### الطريقة 1: استخدام Laragon Terminal (مُوصى به)

1. افتح **Laragon**
2. اضغط على **Terminal** (أو اضغط `Ctrl + Alt + T`)
3. قم بتشغيل:

```bash
cd c:\laragon\www\dopave\ubercrm
php artisan migrate
```

### الطريقة 2: استخدام SQL مباشرة

إذا لم تستطع تشغيل Artisan، يمكنك تشغيل SQL مباشرة في قاعدة البيانات:

1. افتح **phpMyAdmin** أو أي أداة إدارة قاعدة البيانات
2. اختر قاعدة البيانات `ubercrm` (أو اسم قاعدة البيانات الخاصة بك)
3. افتح ملف `database/migrations/add_deleted_at_to_users_table.sql`
4. انسخ محتوى الملف وقم بتشغيله في SQL

أو قم بتشغيل هذا SQL مباشرة:

```sql
ALTER TABLE `users` ADD COLUMN `deleted_at` TIMESTAMP NULL DEFAULT NULL;
```

### الطريقة 3: استخدام CMD مع مسار كامل لـ PHP

```cmd
cd c:\laragon\www\dopave\ubercrm
c:\laragon\bin\php\php-8.2.28-Win32-vs16-x64\php.exe artisan migrate
```

(استبدل المسار بمسار PHP الخاص بك في Laragon)

## بعد تشغيل Migration

بعد تشغيل migration بنجاح:
- ✅ العمود `deleted_at` سيتم إضافته إلى جدول `users`
- ✅ لن تحدث أخطاء SQL عند استخدام SoftDeletes
- ✅ يمكن استخدام RecycleBin للمستخدمين المحذوفين

## التحقق من النجاح

بعد تشغيل migration، يمكنك التحقق من إضافة العمود:

```sql
DESCRIBE users;
```

يجب أن ترى العمود `deleted_at` في القائمة.
