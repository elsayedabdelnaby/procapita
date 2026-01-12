# تشغيل Migration لجدول document_names

## المشكلة
الجدول `document_names` غير موجود في قاعدة البيانات.

## الحل

### الطريقة 1: استخدام Laravel Artisan (مُوصى به)

افتح Terminal في مجلد المشروع وقم بتشغيل:

```bash
php artisan migrate
```

أو إذا كنت تستخدم Laragon:

```bash
# افتح Laragon Terminal
# ثم قم بتشغيل:
php artisan migrate
```

### الطريقة 2: استخدام SQL مباشرة

إذا لم تستطع تشغيل Artisan، يمكنك تشغيل SQL مباشرة في قاعدة البيانات:

1. افتح phpMyAdmin أو أي أداة إدارة قاعدة البيانات
2. اختر قاعدة البيانات `ubercrm`
3. افتح ملف `database/migrations/create_document_names_table.sql`
4. انسخ محتوى الملف وقم بتشغيله في SQL

### الطريقة 3: استخدام Composer

```bash
composer run-script post-autoload-dump
php artisan migrate
```

## بعد تشغيل Migration

بعد تشغيل migration بنجاح، سيعمل النظام بشكل طبيعي:
- Document Name سيكون unique (واحد فقط)
- يمكن إضافة عدة Riding Companies لكل Document Name

