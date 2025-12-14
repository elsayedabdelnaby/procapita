# WhatsApp Integration Setup Guide

## الخطوات المطلوبة لتشغيل WhatsApp Integration

### 1. تثبيت Node.js Service

افتح terminal في مجلد المشروع واكتب:

**Windows (PowerShell):**
```powershell
cd whatsapp-service
npm install
```

**أو استخدم ملف التشغيل:**
```powershell
.\whatsapp-service\start.ps1
```

**Windows (CMD):**
```cmd
cd whatsapp-service
npm install
```

**أو استخدم ملف التشغيل:**
```cmd
whatsapp-service\start.bat
```

### 2. تشغيل WhatsApp Service

**يجب تشغيل الخدمة في terminal منفصل:**

**Windows (PowerShell):**
```powershell
cd whatsapp-service
npm start
```

**أو:**
```powershell
.\whatsapp-service\start.ps1
```

**Windows (CMD):**
```cmd
cd whatsapp-service
npm start
```

**أو:**
```cmd
whatsapp-service\start.bat
```

**للتطوير (مع auto-reload):**
```bash
npm run dev
```

**الخدمة ستعمل على `http://localhost:3001`**

⚠️ **مهم**: يجب أن تبقى هذه النافذة مفتوحة دائماً!

### 3. إضافة متغيرات البيئة

أضف إلى ملف `.env` في Laravel:

```env
WHATSAPP_SERVICE_URL=http://localhost:3001
```

### 4. استخدام النظام

1. اذهب إلى **Companies** → اختر شركة → تبويب **WhatsApp Link Device**
2. اضغط على **Generate QR Code**
3. افتح WhatsApp على هاتفك
4. اذهب إلى **Settings** → **Linked Devices** → **Link a Device**
5. امسح QR Code

### ملاحظات مهمة

- يجب أن تكون خدمة Node.js تعمل دائماً
- كل شركة لها جلسة WhatsApp منفصلة
- الجلسات تُحفظ في `storage/app/whatsapp/sessions/company_{id}/`
- QR Code ينتهي بعد 5 دقائق

### استكشاف الأخطاء

إذا ظهرت رسالة خطأ "Failed to generate QR code":
- تأكد من أن خدمة Node.js تعمل
- تحقق من `WHATSAPP_SERVICE_URL` في `.env`
- تحقق من logs في terminal الخاص بخدمة Node.js

