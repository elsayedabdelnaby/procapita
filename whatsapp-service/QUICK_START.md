# تشغيل خدمة WhatsApp بسرعة

## الطريقة السريعة (Windows)

### 1. انقر نقراً مزدوجاً على:
```
start-service.bat
```

### 2. اترك النافذة مفتوحة

### 3. جرّب Generate QR Code في المتصفح

---

## أو من Terminal:

```cmd
cd whatsapp-service
start-service.bat
```

---

## للتأكد من أن الخدمة تعمل:

افتح المتصفح واذهب إلى:
```
http://localhost:3001/api/whatsapp/2/status
```

يجب أن ترى:
```json
{"status":"disconnected","phone_number":null,"qr_code":null}
```

---

## إيقاف الخدمة:

اضغط `Ctrl+C` في نافذة الخدمة

