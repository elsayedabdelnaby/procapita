# Facebook Integration Quick Fix - "Can't load URL" Error

## 🔴 المشكلة:
عند الضغط على "Connect Facebook Account" تحصل على خطأ "Can't load URL" من Facebook.

## ✅ الحل السريع:

### الخطوة 1: إضافة Redirect URI في Facebook App Settings

1. اذهب إلى: https://developers.facebook.com/apps/1511323160996629/
2. في القائمة الجانبية، اختر **"Facebook Login"** → **"Settings"**
3. في قسم **"Valid OAuth Redirect URIs"**، أضف:
   ```
   https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
   ```
4. **⚠️ مهم جداً:**
   - تأكد من استخدام `https://` (وليس `http://`)
   - تأكد من أن المسار `/ridingcarcompanies/facebook/callback` صحيح تماماً
   - لا تضع مسافات قبل أو بعد
5. اضغط **"Save Changes"**
6. انتظر دقيقة أو دقيقتين (Facebook يحتاج وقت لتحديث الإعدادات)

### الخطوة 2: تحديث ملف .env

افتح ملف `.env` في جذر المشروع وتأكد من وجود:

```env
FACEBOOK_APP_ID=1511323160996629
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
```

**⚠️ تأكد من:**
- استخدام `https://` (وليس `http://`)
- لا توجد مسافات قبل أو بعد القيم
- لا توجد علامات اقتباس حول القيم

### الخطوة 3: مسح Cache

شغّل هذه الأوامر:

```bash
php artisan config:clear
php artisan cache:clear
```

### الخطوة 4: الاختبار

1. اذهب إلى Riding Company → Integrations tab
2. اضغط "Connect Facebook Account"
3. يجب أن يعمل الآن! ✅

## 🔍 أخطاء أخرى شائعة:

### خطأ "Invalid Scopes: manage_pages, read_insights"

**المشكلة:** Facebook لم يعد يدعم هذه الصلاحيات (deprecated).

**الحل:** ✅ تم تحديث الكود تلقائياً. الصلاحيات المستخدمة الآن:
- `pages_show_list` - لعرض قائمة الصفحات
- `pages_read_engagement` - لقراءة تفاعل الصفحات
- `leads_retrieval` - لاسترجاع اللييدز

**ملاحظة:** بعض الصلاحيات قد تتطلب **App Review** من Facebook للاستخدام في الإنتاج. في وضع التطوير (Development Mode)، يمكنك استخدامها بدون مراجعة.

### إذا استمرت المشكلة:

1. **تحقق من Facebook App Settings:**
   - تأكد من أن Redirect URI موجود في "Valid OAuth Redirect URIs"
   - تأكد من تطابق الـ URI حرف بحرف

2. **تحقق من ملف .env:**
   - تأكد من أن `FACEBOOK_REDIRECT_URI` موجود
   - تأكد من استخدام `https://` للإنتاج

3. **تحقق من Logs:**
   - افتح `storage/logs/laravel.log`
   - ابحث عن أخطاء Facebook

4. **تحقق من App Mode:**
   - إذا كان App في "Development" mode، تأكد من إضافة المستخدم كـ Test User
   - أو حول App إلى "Live" mode (يتطلب Business Verification)

## 📝 ملاحظات:

- **Redirect URI يجب أن يكون مطابق تماماً** في Facebook App Settings و `.env`
- **استخدم `https://` للإنتاج** و `http://` للتطوير المحلي فقط
- **Facebook يحتاج وقت (1-2 دقيقة)** لتحديث الإعدادات بعد الحفظ

