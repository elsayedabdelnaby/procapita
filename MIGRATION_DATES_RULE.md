# ⚠️ قاعدة مهمة: تواريخ Migrations

## المشكلة التي حدثت

عند إنشاء migrations جديدة، يجب **دائماً** التحقق من:

1. **التاريخ**: يجب أن يكون التاريخ صحيحاً وليس قبل أو بعد migrations أخرى
2. **الترتيب**: migrations يجب أن تكون مرتبة حسب التاريخ بشكل صحيح
3. **الفحص**: دائماً أضف `Schema::hasTable()` و `Schema::hasColumn()` لجميع migrations

## القاعدة الذهبية

### ✅ قبل إنشاء أي migration جديد:

1. **تحقق من آخر migration في نفس المجلد**:
   ```bash
   # ابحث عن آخر migration
   ls -lt Modules/Drivers/database/migrations/ | head -5
   ```

2. **استخدم تاريخ صحيح**:
   - إذا آخر migration هو `2026_01_22_000001`
   - Migration الجديد يجب أن يكون `2026_01_22_000002` أو `2026_01_23_000001`
   - **لا تستخدم تاريخ قبل آخر migration!**

3. **دائماً أضف فحص**:
   ```php
   // للجداول
   if (!Schema::hasTable('table_name')) {
       Schema::create('table_name', function (Blueprint $table) {
           // ...
       });
   }
   
   // للأعمدة
   if (!Schema::hasColumn('table_name', 'column_name')) {
       $table->string('column_name')->nullable();
   }
   ```

## أمثلة على الأخطاء الشائعة

### ❌ خطأ: تاريخ قبل آخر migration
```
آخر migration: 2026_01_22_000001
Migration جديد: 2026_01_12_000001  ← خطأ! قبل آخر migration
```

### ✅ صحيح: تاريخ بعد آخر migration
```
آخر migration: 2026_01_22_000001
Migration جديد: 2026_01_22_000002  ← صحيح
أو
Migration جديد: 2026_01_23_000001  ← صحيح
```

## Checklist قبل إنشاء Migration

- [ ] تحققت من آخر migration في نفس المجلد
- [ ] استخدمت تاريخ صحيح (بعد آخر migration)
- [ ] أضفت `Schema::hasTable()` للجداول
- [ ] أضفت `Schema::hasColumn()` للأعمدة
- [ ] اختبرت الـ migration على بيئة development

## ملاحظة مهمة

**هذه القاعدة يجب تطبيقها دائماً** - لا تنسى التحقق من التواريخ قبل إنشاء أي migration جديد!

---

**تاريخ إنشاء القاعدة**: 22 يناير 2026  
**الأولوية**: ⚠️ عالية جداً - لا تنسى أبداً!
