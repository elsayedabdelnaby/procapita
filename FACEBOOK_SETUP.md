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

### 3. إعداد OAuth Redirect URI

1. في القائمة الجانبية، اختر "Facebook Login" → "Settings"
2. في "Valid OAuth Redirect URIs"، أضف:
   ```
   http://127.0.0.1:8000/ridingcarcompanies/facebook/callback
   ```
   أو إذا كنت تستخدم localhost:
   ```
   http://localhost:8000/ridingcarcompanies/facebook/callback
   ```
3. اضغط "Save Changes"

### 4. الحصول على App ID و App Secret

1. في القائمة الجانبية، اختر "Settings" → "Basic"
2. انسخ **App ID**
3. انسخ **App Secret** (اضغط "Show" إذا كان مخفياً)

### 5. إضافة القيم في ملف .env

افتح ملف `.env` في جذر المشروع وأضف:

```env
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_REDIRECT_URI=http://127.0.0.1:8000/ridingcarcompanies/facebook/callback
```

**مثال:**
```env
FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890
FACEBOOK_REDIRECT_URI=http://127.0.0.1:8000/ridingcarcompanies/facebook/callback
```

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

إذا استمرت المشكلة:

1. تأكد من أن القيم موجودة في `.env` بدون مسافات
2. تأكد من تطابق Redirect URI مع Facebook App Settings
3. افتح Developer Console (F12) وافحص Network tab
4. تحقق من `storage/logs/laravel.log` للأخطاء

