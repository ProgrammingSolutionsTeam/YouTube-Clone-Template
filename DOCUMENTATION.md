# LocalTube Documentation | توثيق LocalTube

## العربية

### 1. ما هو LocalTube؟
LocalTube تطبيق يسمح لك بتصفح مكتبة الصوتيات والفيديو الخاصة بك كأنك على YouTube، بشكل محلي. تبقى ملفات الوسائط والحسابات والإعدادات والصور المصغرة والسجل على جهازك، ويمكن إتاحة التطبيق للأجهزة الموجودة معك على نفس الشبكة الموثوقة عند تشغيله من خادم محلي.

### 2. المتطلبات
- حاسوب يعمل بنظام حديث.
- Chrome أو Edge حديث؛ الوصول المباشر للمجلدات قد لا يعمل في Firefox أو Safari.
- Node.js 18 أو أحدث للتشغيل من المصدر.
- مساحة تخزين في المتصفح للفهرس والصور المصغرة.

### 3. التثبيت والتشغيل
```bash
npm install
npm run dev
```
افتح `http://localhost:8080`. للتجهيز النهائي استخدم `npm run build` ثم قدّم محتويات `dist` عبر خادم ويب محلي.

### 4. الحساب المحلي
1. افتح صفحة الحساب.
2. أنشئ اسم مستخدم وبريدًا وكلمة مرور قوية.
3. أول حساب محلي يحصل على صلاحية المدير.
4. الحساب وبياناته مشفرة محليًا ولا تُرفع إلى خدمة خارجية.

### 5. إضافة مكتبة
1. انتقل إلى **الإعدادات ← الجذور**.
2. اضغط **استعراض مجلد** واختر مجلد مكتبتك.
3. اكتب مفتاحًا مختصرًا مثل `videos` أو `F`.
4. شغّل الفهرسة وانتظر اكتمالها.
5. يصبح أول مجلد داخل الجذر قناة، والمجلد المتداخل قائمة تشغيل.

لا تظهر المسارات الحقيقية في الروابط. يستخدم التطبيق متغيرات مثل `root=videos` و`c=channel` و`c1=playlist` و`v=id`.

### 6. الصور المصغرة والفهرسة
تظهر الصورة المحفوظة فورًا. إذا لم تكن موجودة، يضيف LocalTube الفيديو الظاهر إلى طابور خلفي خفيف، يلتقط إطارًا ويحفظه محليًا. اترك خيار **توليد الصور المصغرة** مفعلًا، وامنح المجلد الإذن مجددًا إذا طلب المتصفح ذلك.

### 7. المشغل
- تشغيل/إيقاف، السابق، التالي، الصوت، وشريط التقدم.
- سرعات من 0.25× إلى 3×.
- ترجمات جانبية وتحويلها محليًا إلى WebVTT.
- وضع المسرح، ملء الشاشة، وPicture-in-Picture.
- التشغيل التالي يتحرك بالتسلسل داخل المجلد ويتوقف عند آخر ملف.
- الملف الحالي مميز داخل قائمة التشغيل.

اختصارات مهمة: `Space/K` تشغيل، `J/L` رجوع/تقديم، `F` ملء الشاشة، `T` مسرح، `M` كتم، `C` ترجمة، و`Shift+N/P` التالي/السابق.

### 8. الصيغ القديمة
الصيغ التي يدعمها المتصفح تعمل مباشرة. عند وجود RM/RMVB/WMV/AVI أو ترميز قديم، يستخدم التطبيق FFmpeg WebAssembly الموجود ضمن حزمة التطبيق لإعادة التغليف أو التحويل على جهازك. الملفات الكبيرة أو الأجهزة الضعيفة قد تحتاج وقتًا وذاكرة أكبر.

### 9. المشاركة داخل الشبكة
شغّل نسخة الإنتاج على عنوان يستمع للشبكة المحلية، ثم افتح عنوان الحاسوب من جهاز آخر موثوق. صلاحية المجلد مرتبطة بالمتصفح والجهاز الذي منحها؛ لا يعني فتح الواجهة من جهاز آخر أن ذلك الجهاز يستطيع قراءة قرص الحاسوب المضيف تلقائيًا. المشاركة الكاملة للملفات عبر الشبكة تحتاج خادم LocalTube المرافق في المرحلة B.

### 10. الخصوصية والنسخ الاحتياطي
- لا ترفع الوسائط إلى الإنترنت.
- لا تشارك مجلدًا حساسًا أو تمنح إذنًا لمجلد النظام.
- استخدم **الإعدادات ← متقدم ← تصدير بياناتي** للنسخ الاحتياطي.
- مسح بيانات المتصفح يزيل الحساب المحلي والفهرس، لكنه لا يحذف ملفاتك الأصلية.

### 11. حل المشكلات
- **لا تظهر الملفات:** امنح الجذر الإذن ثم أعد الفهرسة.
- **لا تظهر صورة:** تأكد من تفعيل الصور المصغرة وانتظر بقاء البطاقة ظاهرة قليلًا.
- **ملف قديم بطيء:** انتظر التحويل المحلي، أغلق التطبيقات الثقيلة، أو حوّل الملف مسبقًا إلى MP4/H.264/AAC.
- **تعذر الوصول للمجلد:** استخدم Chrome/Edge عبر `localhost` أو اتصال HTTPS آمن.
- **التطبيق بطيء:** أوقف معاينات hover، قلل عدد العناصر في الصفحة، وأغلق PiP قبل التنقل إذا كان المتصفح قديمًا.

---

## English

### 1. What is LocalTube?
LocalTube lets you browse your private audio and video library with a YouTube-like experience. Media, accounts, settings, thumbnails, and history stay on your device. The interface can be served to trusted devices on the same network from a local host.

### 2. Requirements
- A modern desktop operating system.
- Current Chrome or Edge; direct folder access may not work in Firefox or Safari.
- Node.js 18+ when running from source.
- Browser storage for the index and thumbnail cache.

### 3. Install and run
```bash
npm install
npm run dev
```
Open `http://localhost:8080`. For production, run `npm run build` and serve the generated `dist` directory from a local web server.

### 4. Local account
1. Open the account page.
2. Create a username, email, and strong password.
3. The first local account becomes the administrator.
4. Account data is encrypted locally and is not uploaded to an external service.

### 5. Add a library
1. Go to **Settings → Roots**.
2. Select **Pick folder** and choose the library folder.
3. Enter a short key such as `videos` or `F`.
4. Start scanning and wait for completion.
5. A first-level folder becomes a channel; nested folders become playlists.

Real disk paths never appear in URLs. LocalTube uses variables such as `root=videos`, `c=channel`, `c1=playlist`, and `v=id`.

### 6. Indexing and thumbnails
Cached thumbnails appear immediately. When one is missing, a low-priority background queue captures a frame only for visible videos and stores it locally. Keep **Generate thumbnails** enabled and grant folder permission again when requested.

### 7. Player
- Play/pause, previous, next, volume, and seek controls.
- Playback speed from 0.25× to 3×.
- Sidecar subtitles converted locally to WebVTT.
- Theater, fullscreen, and Picture-in-Picture.
- Sequential autoplay within the current folder, stopping at the last item.
- Clear now-playing state in the playlist.

Key shortcuts: `Space/K` play, `J/L` seek, `F` fullscreen, `T` theater, `M` mute, `C` captions, and `Shift+N/P` next/previous.

### 8. Legacy formats
Browser-supported formats play directly. RM/RMVB/WMV/AVI and older codecs use the bundled FFmpeg WebAssembly engine for on-device remuxing or conversion. Large files and slower devices may require more time and memory.

### 9. Local network access
Serve the production build on a LAN address and open the host address from another trusted device. Folder permissions belong to the browser and device that granted them; opening the interface elsewhere does not automatically expose the host disk. Full network media sharing requires the planned LocalTube companion server in phase B.

### 10. Privacy and backup
- Media is not uploaded to the internet.
- Do not grant access to system or unrelated sensitive folders.
- Use **Settings → Advanced → Export my data** for backups.
- Clearing browser data removes local accounts and the index, but never deletes original media files.

### 11. Troubleshooting
- **No files:** grant root access and rescan.
- **No thumbnail:** enable thumbnails and keep the card visible briefly.
- **Slow legacy file:** allow local conversion to finish, close heavy apps, or pre-convert to MP4/H.264/AAC.
- **Folder access denied:** use Chrome/Edge on `localhost` or secure HTTPS.
- **Slow browsing:** disable hover previews, lower items per page, and close PiP on older browsers before navigating.