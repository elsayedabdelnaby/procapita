# إعداد Facebook Integration

## ⚠️ هل يمكن تخطي إنشاء Facebook App؟

**لا، لا يمكن تخطي هذه الخطوة!**

Facebook OAuth **يتطلب** App ID و App Secret للعمل. هذا مطلوب من Facebook نفسها، وليس من النظام.

**لماذا؟**
- Facebook يحتاج App ID لمعرفة من أنت (تطبيقك)
- Facebook يحتاج App Secret للتحقق من أن الطلب صحيح
- بدونهم، Facebook لن يسمح بالـ OAuth

**لكن الخبر الجيد:**
- ✅ **Facebook App واحد فقط** - مرة واحدة للمشروع كله
- ✅ **أي مستخدم** يمكنه استخدامه لتسجيل الدخول بحسابه الخاص
- ✅ **لا تحتاج إنشاء App لكل مستخدم** - App واحد للكل!

## 🎯 User Delegated Access

هذا النظام يستخدم **User Delegated Access** - المستخدم يسجل دخول بـ Facebook ويوافق على الصلاحيات.

**المزايا:**
- ✅ لا يحتاج إعدادات معقدة في Facebook Developer
- ✅ كل مستخدم يوافق على صلاحياته الخاصة
- ✅ أكثر أماناً
- ✅ أسهل في الإعداد

**الصلاحيات المستخدمة:**
- `pages_show_list` - لعرض قائمة صفحات المستخدم
- `pages_read_engagement` - لقراءة تفاعل الصفحات
- `leads_retrieval` - لاسترجاع اللييدز من Facebook Lead Ads

**⚠️ ملاحظة مهمة:** بعض الصلاحيات قد تتطلب **App Review** من Facebook للاستخدام في الإنتاج. في وضع التطوير (Development Mode)، يمكنك استخدامها بدون مراجعة.

## الخطوات المطلوبة (مرة واحدة فقط):

### 1. إنشاء Facebook App

1. اذهب إلى: https://developers.facebook.com/apps/
2. اضغط على "Create App"
3. اختر "Business" أو "Other"
4. أدخل اسم التطبيق (مثلاً: "UberCRM")
5. اضغط "Create App"

### 2. إضافة Facebook Login

1. في Dashboard، اضغط "Add Product"
2. اختر "Facebook Login"
3. اضغط "Set Up"

### 3. إعداد OAuth Redirect URI ⚠️ **مهم جداً!**

**هذه الخطوة ضرورية جداً!** بدونها ستحصل على خطأ "Can't load URL" من Facebook.

1. في القائمة الجانبية، اختر "Facebook Login" → "Settings"
2. في "Valid OAuth Redirect URIs"، أضف **جميع** URIs التالية (لكل بيئة):
   
   **للإنتاج (Production):**
   ```
   https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
   ```
   
   **للتطوير المحلي (Local Development):**
   ```
   http://127.0.0.1:8000/ridingcarcompanies/facebook/callback
   http://localhost:8000/ridingcarcompanies/facebook/callback
   ```
   
   **مثال كامل:**
   ```
   https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
   http://127.0.0.1:8000/ridingcarcompanies/facebook/callback
   http://localhost:8000/ridingcarcompanies/facebook/callback
   ```

3. **⚠️ تأكد من:**
   - إضافة **جميع** URIs أعلاه (واحد في كل سطر)
   - **لا تضع مسافات** قبل أو بعد الـ URI
   - **تأكد من استخدام `https://` للإنتاج و `http://` للتطوير**
   - **تأكد من أن المسار `/ridingcarcompanies/facebook/callback` صحيح تماماً**

4. اضغط "Save Changes"

**ملاحظة:** إذا كنت تستخدم domain آخر، استبدل `ubercrm.dopave.com` بـ domain الخاص بك.

### 4. الحصول على App ID و App Secret

1. في القائمة الجانبية، اختر "Settings" → "Basic"
2. انسخ **App ID**
3. انسخ **App Secret** (اضغط "Show" إذا كان مخفياً)

### 5. إضافة القيم في ملف .env

افتح ملف `.env` في جذر المشروع وأضف:

**للإنتاج (Production):**
```env
FACEBOOK_APP_ID=1511323160996629
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
```

**للتطوير المحلي (Local Development):**
```env
FACEBOOK_APP_ID=1511323160996629
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://127.0.0.1:8000/ridingcarcompanies/facebook/callback
```

**⚠️ مهم جداً:**
- استخدم `https://` للإنتاج و `http://` للتطوير
- تأكد من تطابق `FACEBOOK_REDIRECT_URI` مع ما أضفته في Facebook App Settings
- **لا تضع مسافات** قبل أو بعد القيم
- **لا تضع علامات اقتباس** حول القيم

### 6. مسح Laravel Cache

بعد إضافة القيم، شغّل:

```bash
php artisan config:clear
php artisan cache:clear
```

### 7. إعادة تشغيل Laravel Server

أعد تشغيل Laravel server (إذا كان يعمل).

### 8. الاختبار

1. اذهب إلى أي Riding Company → Integrations tab
2. اضغط "Connect Facebook Account"
3. يجب أن يفتح popup مع Facebook OAuth
4. **سجل دخول بأي Facebook account** (يمكنك استخدام حسابك الشخصي)
5. بعد الموافقة، سيتم حفظ Facebook integration لهذا Riding Company
6. **أي مستخدم آخر يمكنه فعل نفس الشيء بحسابه الخاص!**

## 🔥 المزايا:

- ✅ **Facebook App واحد فقط** - لا تحتاج إنشاء App لكل مستخدم
- ✅ **أي مستخدم في العالم** يمكنه تسجيل الدخول بحسابه الخاص
- ✅ **كل مستخدم يرى فقط صفحاته ولييدزه** - أمان كامل
- ✅ **كل Riding Company له Facebook integration منفصل**
- ✅ **لا تحتاج إعدادات معقدة** - فقط App ID و Secret

## ملاحظات مهمة:

- **Facebook App واحد فقط للمشروع** - كل المستخدمين يستخدمونه
- **كل مستخدم يسجل دخول بحسابه الخاص** - User Delegated Access
- **تأكد من تطابق `FACEBOOK_REDIRECT_URI` مع ما في Facebook App Settings**
- **لا تضع مسافات قبل أو بعد القيم في `.env`**
- **لا تضع علامات اقتباس حول القيم**

## استكشاف الأخطاء:

### خطأ "Can't load URL" من Facebook

**هذا الخطأ يعني أن Redirect URI غير مسموح به في Facebook App Settings.**

**الحل:**
1. اذهب إلى Facebook App → "Facebook Login" → "Settings"
2. في "Valid OAuth Redirect URIs"، تأكد من إضافة:
   ```
   https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
   ```
3. تأكد من:
   - ✅ الـ URI مطابق **تماماً** (حرف بحرف)
   - ✅ استخدام `https://` للإنتاج
   - ✅ لا توجد مسافات إضافية
   - ✅ المسار `/ridingcarcompanies/facebook/callback` صحيح
4. اضغط "Save Changes"
5. انتظر دقيقة أو دقيقتين (Facebook يحتاج وقت لتحديث الإعدادات)
6. جرب مرة أخرى

**إذا استمر الخطأ:**
1. تأكد من أن القيم موجودة في `.env` بدون مسافات:
   ```env
   FACEBOOK_APP_ID=1511323160996629
   FACEBOOK_APP_SECRET=your_secret_here
   FACEBOOK_REDIRECT_URI=https://ubercrm.dopave.com/ridingcarcompanies/facebook/callback
   ```
2. شغّل:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```
3. تأكد من تطابق Redirect URI في `.env` مع ما في Facebook App Settings
4. افتح Developer Console (F12) وافحص Network tab للأخطاء
5. تحقق من `storage/logs/laravel.log` للأخطاء
6. تأكد من أن App في وضع "Development" أو "Live" (إذا كان Live، تأكد من Business Verification)

### أخطاء أخرى:

1. **"Invalid App ID"**: تأكد من أن `FACEBOOK_APP_ID` في `.env` صحيح
2. **"Invalid App Secret"**: تأكد من أن `FACEBOOK_APP_SECRET` في `.env` صحيح
3. **"Redirect URI mismatch"**: تأكد من تطابق Redirect URI في `.env` مع Facebook App Settings
4. **"App not in Live mode"**: إذا كان App في Development mode، تأكد من إضافة المستخدم كـ Test User

