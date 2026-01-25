# إنشاء Quick Edit و Edit Permissions

تم إنشاء migration لإنشاء `quick-edit` و `edit` permissions إذا لم تكونا موجودتين.

## تشغيل Migration

```bash
php artisan migrate
```

أو إذا كنت تريد تشغيل migration محدد:

```bash
php artisan migrate --path=database/migrations/2026_01_22_000002_create_quick_edit_and_edit_permissions.php
```

## التحقق

بعد تشغيل الـ migration، يجب أن يظهر:
- **Quick Edit** في صفحة Edit Role تحت Drivers Module → drivers entity
- **Edit** في صفحة Edit Role تحت Drivers Module → drivers entity

## ملاحظة

- `update` سيظهر كـ `Edit` (من خلال formatPermissionAction)
- `edit` سيظهر كـ `Edit` (من خلال formatPermissionAction)
- `quick-edit` سيظهر كـ `Quick Edit` (من خلال formatPermissionAction)

يمكنك الآن:
- منح مستخدم `quick-edit` فقط (سيستطيع Quick Edit فقط)
- منح مستخدم `edit` فقط (سيستطيع Edit العادي فقط)
- منح المستخدم كليهما أو لا شيء
