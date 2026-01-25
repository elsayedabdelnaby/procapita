# تشغيل Script لإنشاء Quick Edit Permission

## الطريقة الأسهل: استخدام Laragon Terminal

1. افتح **Laragon Terminal** (من قائمة Laragon)
2. انتقل إلى مجلد المشروع:
   ```bash
   cd c:\laragon\www\dopave\ubercrm
   ```
3. شغل السكريبت:
   ```bash
   php create_quick_edit_permission.php
   ```

## أو استخدم Artisan Command

```bash
php artisan permissions:create-quick-edit
```

## أو استخدم Migration

```bash
php artisan migrate
```

## أو استخدم Seeder

```bash
php artisan db:seed --class=Modules\\Drivers\\database\\seeders\\DriversPermissionsSeeder
```

## بعد التشغيل

1. **حدّث الصفحة** (F5 أو Ctrl+R) في صفحة Edit Role
2. **افتح Drivers Module** → **drivers entity**
3. يجب أن ترى **Quick Edit** في قائمة الـ permissions

## التحقق

بعد إنشاء الـ permission، يجب أن يظهر في صفحة Edit Role:

**Drivers Module** → **drivers** entity:
- ✓ Create
- ✓ Read
- ✓ Edit (من update)
- ✓ Edit (من edit - permission منفصل)
- ✓ **Quick Edit** ← هذا ما تبحث عنه
- ✓ Delete
- ✓ Assign
- ✓ View Documents
- ✓ View Stages
- ✓ ... إلخ

## ملاحظة

إذا لم يظهر الـ permission بعد التشغيل:
1. تأكد من أن الـ script تم تشغيله بنجاح (لا توجد أخطاء)
2. حدّث الصفحة (F5)
3. تأكد من أنك في صفحة Edit Role الصحيحة
4. تأكد من أن Drivers Module مفتوح و drivers entity مفتوح
