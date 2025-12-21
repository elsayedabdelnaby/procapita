# Users Module - General Guideline

## قاعدة عامة: موديول Users موحد

**مهم جداً:** موديول Users هو موديول واحد موحد في النظام. أي تغييرات أو إضافات في Users ستؤثر على جميع الأماكن التالية:

### الأماكن التي تستخدم Users Module:

1. **Company Users** - في صفحة Company Show (تبويب Users)
   - المسار: `/core/companies/{id}` → تبويب Users
   - الملف: `resources/js/pages/Core/Companies/Show.tsx`

2. **Riding Company Users** - في صفحة Riding Company Show (تبويب Users)
   - المسار: `/ridingcarcompanies/riding-companies/{id}` → تبويب Users
   - الملف: `resources/js/pages/RidingCarCompanies/RidingCompanies/Show.tsx`

3. **Users Index** - صفحة قائمة المستخدمين الرئيسية
   - المسار: `/core/users`
   - الملف: `resources/js/pages/Core/Users/Index.tsx`

4. **User Create/Edit** - صفحات إنشاء وتعديل المستخدمين
   - المسار: `/core/users/create` و `/core/users/{id}/edit`
   - الملفات: `resources/js/pages/Core/Users/Create.tsx` و `resources/js/pages/Core/Users/Edit.tsx`

### عند إضافة حقل جديد في Users:

عند إضافة أي حقل جديد في Users (مثل Mobile 1, Mobile 2, أو أي حقول أخرى)، يجب تحديث:

1. ✅ **Migration** - إضافة الحقل في جدول `users`
2. ✅ **Model** - إضافة الحقل في `$fillable` في `app/Models/User.php`
3. ✅ **Controller** - إرسال الحقل في جميع Controllers التي ترجع Users:
   - `Modules/Core/app/Http/Controllers/CompanyController.php` (Company Users)
   - `Modules/RidingCarCompanies/app/Http/Controllers/RidingCompanyController.php` (Riding Company Users)
   - `Modules/Core/app/Http/Controllers/UserController.php` (Users Index)
4. ✅ **Validation** - إضافة validation rules في:
   - `Modules/Core/app/Http/Requests/UserStoreRequest.php`
   - `Modules/Core/app/Http/Requests/UserUpdateRequest.php`
5. ✅ **Frontend - Types** - تحديث `resources/js/types/core.d.ts` (CoreUser interface)
6. ✅ **Frontend - Tables** - إضافة الحقل في جميع الجداول:
   - `resources/js/pages/Core/Companies/Show.tsx` (Company Users table)
   - `resources/js/pages/RidingCarCompanies/RidingCompanies/Show.tsx` (Riding Company Users table)
   - `resources/js/pages/Core/Users/Index.tsx` (Users Index table)
7. ✅ **Frontend - Forms** - إضافة الحقل في:
   - `resources/js/pages/Core/Users/Create.tsx`
   - `resources/js/pages/Core/Users/Edit.tsx`

### مثال: إضافة Mobile 1 و Mobile 2

عند إضافة Mobile 1 (إجباري) و Mobile 2 (اختياري):

1. ✅ Migration: تحديث `mobile1` ليكون `required` (غير nullable)
2. ✅ Model: الحقول موجودة بالفعل في `$fillable`
3. ✅ Controllers: إرسال `mobile1` و `mobile2` في جميع Controllers
4. ✅ Validation: 
   - `mobile1`: `required|string|max:255`
   - `mobile2`: `nullable|string|max:255`
5. ✅ Frontend Types: إضافة `mobile1?: string` و `mobile2?: string` في CoreUser
6. ✅ Frontend Tables: إضافة أعمدة Mobile 1 و Mobile 2 في جميع الجداول
7. ✅ Frontend Forms: إضافة حقول Mobile 1 و Mobile 2 في Create/Edit forms

---

**تذكر دائماً:** أي تغيير في Users = تحديث في جميع الأماكن المذكورة أعلاه!

