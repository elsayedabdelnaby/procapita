# إنشاء Quick Edit و Edit Permissions

تم إنشاء migration و command و script لإنشاء `quick-edit` و `edit` permissions.

## الطريقة 1: استخدام السكريبت المباشر (الأسهل والأسرع) ⭐

```bash
php create_quick_edit_permission.php
```

## الطريقة 2: استخدام Artisan Command

```bash
php artisan permissions:create-quick-edit
```

## الطريقة 3: استخدام Migration

```bash
php artisan migrate
```

أو migration محدد:

```bash
php artisan migrate --path=database/migrations/2026_01_22_000002_create_quick_edit_and_edit_permissions.php
```

## الطريقة 4: استخدام Seeder

```bash
php artisan db:seed --class=Modules\\Drivers\\database\\seeders\\DriversPermissionsSeeder
```

## التحقق

بعد إنشاء الـ permissions، يجب أن يظهر في صفحة Edit Role:

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

## ملاحظات

- `update` سيظهر كـ `Edit` (من خلال formatPermissionAction)
- `edit` سيظهر كـ `Edit` (من خلال formatPermissionAction) - permission منفصل
- `quick-edit` سيظهر كـ `Quick Edit` (من خلال formatPermissionAction)

يمكنك الآن:
- منح مستخدم `quick-edit` فقط (سيستطيع Quick Edit فقط)
- منح مستخدم `edit` فقط (سيستطيع Edit العادي فقط)
- منح المستخدم كليهما أو لا شيء
