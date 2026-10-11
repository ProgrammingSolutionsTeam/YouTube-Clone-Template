# LocalTube — تطبيق أندرويد / Android build

الإعدادات جاهزة داخل المشروع: `capacitor.config.ts` (الاسم LocalTube، المعرّف، الألوان، شاشة البداية)،
`resources/` (الأيقونة وشاشة البداية)، `scripts/android-setup.mjs` (الصلاحيات، الإصدار، الوصف).
الإصدار يُقرأ من `version` في `package.json` (حاليًا 1.0.0).

## المتطلبات
Node 20+، Android Studio (مع JDK 17+ وAndroid SDK)، Git.

## أوامر التحويل (مرة واحدة)
```bash
git clone <رابط مستودعك على GitHub> localtube && cd localtube
npm install
npm run build
npx cap add android
npm run cap:setup                       # صلاحيات الملفات + الإصدار + الوصف
npx capacitor-assets generate --android # الأيقونة وشاشة البداية من resources/
npx cap sync android
npx cap open android                    # ثم Run ▶ أو Build > Build APK
```
أو مباشرة على هاتف موصول: `npx cap run android`.

## بعد كل تحديث
```bash
git pull && npm install && npm run cap:android && npx cap run android
```

## إصدار APK/AAB للنشر
في Android Studio: Build > Generate Signed Bundle / APK. لرفع الإصدار عدّل `version` في package.json ثم `npm run cap:setup`.

## الوصول للملفات
- عند الضغط على "اختيار ملفات من الهاتف" في الإعدادات > الجذور يطلب التطبيق إذن الوسائط/التخزين ثم يفتح منتقي الملفات (اختر عدة فيديوهات أو مجلدًا كاملاً).
- الصلاحيات: READ_MEDIA_VIDEO/AUDIO/IMAGES (أندرويد 13+)، READ_EXTERNAL_STORAGE (12 وأقدم)، MANAGE_EXTERNAL_STORAGE (اختياري: الإعدادات > التطبيقات > LocalTube > السماح بإدارة كل الملفات)، وتشغيل في الخلفية.
- التطبيق يعمل بدون إنترنت لأن كل الملفات مضمّنة من `dist/`. للتطوير المباشر من المعاينة: `CAP_LIVE_RELOAD=1 npx cap sync android`.

## English
Same commands as above. Permissions, version and description are applied by `npm run cap:setup`; icons by `npx capacitor-assets generate --android`.

Guide: https://lovable.dev/blog/mobile-app-development-with-capacitor
