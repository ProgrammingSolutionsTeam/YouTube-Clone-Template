# LocalTube — دليل المشروع الكامل / Full project reference

> هذا الملف مكتوب ليُسلَّم كما هو لأي مبرمج أو ذكاء اصطناعي: يشرح الهدف، القرارات المعمارية، بنية الملفات، نموذج البيانات، الأمان، وكل قاعدة يجب احترامها عند التطوير.
> This file is written to be handed as-is to any developer or AI agent: goals, architecture decisions, file layout, data model, security, and every rule to respect while developing.

---

## 1. الفكرة / The idea

LocalTube منصة فيديو **محلية** تحاكي تجربة YouTube، لكن المحتوى هو ملفات الفيديو والصوت الموجودة فعليًا على جهاز المستخدم داخل مجلدات يحددها هو. لا سحابة، لا رفع ملفات، لا خدمات خارجية، ولا اتصال بالإنترنت مطلوب للتشغيل.

LocalTube is a **local** video platform that mimics the YouTube experience while the content is the user's own video/audio files inside folders they choose. No cloud, no uploads, no third-party services, and no internet connection required at runtime.

المبادئ الثابتة / Invariants:

1. **Offline-first**: كل خط وأيقونة وصورة وملف WASM يُقدَّم من داخل المشروع. لا طلب HTTP خارجي أبدًا.
2. **Local-only data**: الحسابات والإعدادات والسجل والمفضلة والفهرس داخل IndexedDB، مشفّرة.
3. **No real paths in URLs**: الروابط تستخدم مفاتيح مستعارة (`root=videos&c=aj+&c1=s01&v=<id>`)، لا مسارات القرص.
4. **Arabic RTL first**, مع إنجليزي LTR كامل التكافؤ.
5. **Never freeze the UI**: كل عمل ثقيل (فهرسة، صور مصغرة، تحويل) في Worker أو طوابير بأجزاء صغيرة.

---

## 2. المكدّس التقني / Tech stack

| الطبقة | التقنية |
| --- | --- |
| الواجهة | React 18 + TypeScript 5 + Vite 5 |
| التنسيق | Tailwind CSS v3 + shadcn/ui (Radix) + رموز تصميم HSL في `src/index.css` |
| التوجيه | react-router-dom |
| الأيقونات | lucide-react (مضمّنة في الحزمة، ليست من الإنترنت) |
| الخط | Cairo، ملفات woff2 في `public/assets/fonts/` |
| التخزين | IndexedDB (قاعدتان: `medialib-vault` و`medialib-index`) |
| التشفير | WebCrypto: PBKDF2-SHA256 + AES-GCM + AES-KW |
| الوسائط | HTMLMediaElement، MediaSource، Picture-in-Picture، `@ffmpeg/ffmpeg` (WASM محلي) |
| الوصول للملفات | File System Access API، وبديل `<input type="file" webkitdirectory>` |

لا يوجد أي خادم. المشروع تطبيق متصفح بالكامل (Path A). خادم Node محلي اختياري هو المرحلة B المستقبلية (بث الملفات لأجهزة الشبكة وFFmpeg أصلي).

---

## 3. قاعدة الموارد المحلية / Local asset rule

كل مورد يُطلب عادة من الإنترنت يجب أن يُنزَّل ويُوضع داخل `public/assets/`:

```
public/
  favicon.png                  أيقونة الموقع (مولّدة محليًا)
  assets/
    fonts/    cairo-400.woff2, cairo-600.woff2, cairo-700.woff2
    icons/    localtube-192.png, localtube-512.png
    images/   صور واجهة ثابتة
    css/      أي ورقة أنماط خارجية تم تنزيلها
    js/       أي مكتبة JS خارجية تم تنزيلها
    scripts/  ffmpeg-core.js / ffmpeg-core.wasm (يقدّمها إضافة Vite من node_modules)
    others/   manifest.webmanifest وملفات متنوعة
```

قواعد صارمة:

- يُمنع `fonts.googleapis.com` أو أي CDN أو `unpkg` أو رابط صورة خارجي.
- FFmpeg WASM لا يُحمَّل من CDN؛ الإضافة `localFfmpegCore()` في `vite.config.ts` تقدّمه على `/assets/scripts/ffmpeg-core.js` و`.wasm` في التطوير وتنسخه في البناء.
- أي مورد جديد: أنشئ مجلدًا مناسبًا داخل `public/assets/` وأشر إليه بمسار مطلق يبدأ بـ `/assets/...`.
- للتحقق: `rg -n "https?://" src/ index.html public/` يجب ألا يُظهر إلا تعليقات.

---

## 4. بنية المجلدات / Source layout

```
src/
  main.tsx, App.tsx                 نقطة الدخول والمسارات
  index.css                         رموز التصميم، @font-face، أدوات أداء
  context/SessionProvider.tsx       الجلسة، الحساب، الإعدادات، المفضلة، السجل، الترجمة
  lib/
    core/
      crypto-free helpers
      types.ts        نموذج البيانات المشترك
      ids.ts          معرفات عامة حتمية (10 أحرف) من هاش المسار
      formats.ts      كشف الصيغ، MIME، هل يستطيع المتصفح التشغيل مباشرة
      languages.ts    تحليل أسماء ملفات الترجمة (lang, forced, sdh)
      subtitles.ts    تحويل SRT/ASS/SUB إلى WebVTT محليًا
      paths.ts        بناء/تحليل روابط root= c= c1= v=
      filesystem.ts   File System Access: اختيار، أذونات، حل المسارات بأمان
      indexdb.ts      قاعدة الفهرس: roots, items, channels, playlists, thumbs, blobs, logs
      logger.ts       سجل تشخيصي محلي
    vault/
      crypto.ts       PBKDF2 / AES-GCM / AES-KW، seal/open، تصدير واستيراد المفتاح
      vault.ts        قاعدة الخزنة: users, files (مشفّرة), session
      settings.ts     شكل الإعدادات + القيم الافتراضية + 10 ألوان تمييز
    scanner/
      scanner.ts            واجهة الفهرسة + إدارة الـ Worker + تقدم
      scanner.worker.ts     المسح الشجري الفعلي خارج الخيط الرئيسي
      fileListScanner.ts    بديل المتصفحات: فهرسة من File[] عبر webkitRelativePath
    media/
      library.ts        استعلامات الفهرس: قوائم، قنوات، بحث، ترتيب، الجار التالي/السابق
      mediaService.ts   جسر الملف الفعلي (handle أو blob مخزَّن) → Object URL
      transcoder.ts     FFmpeg WASM: إعادة تغليف/تحويل الصيغ القديمة
      thumbnailQueue.ts طابور خلفي منخفض الأولوية لتوليد الصور المصغرة
    i18n.ts           قاموس عربي/إنجليزي + اتجاه الصفحة
  components/
    layout/   AppLayout, Header (بحث فوري), Sidebar, MobileNav, nav-items
    media/    Player.tsx (مشغل كامل), MediaCard.tsx, MediaGrid.tsx
    ui/       shadcn
  pages/
    Index, Browse, Search, Watch, Library, Channels, Subscriptions, Trending,
    Settings, Auth, NotFound
public/assets/...                   كل الموارد المحلية
DOCUMENTATION.md                    دليل المستخدم النهائي (عربي + إنجليزي)
```

---

## 5. نموذج البيانات / Data model

مصدر الحقيقة: `src/lib/core/types.ts`.

- **RootRecord**: جذر مكتبة. `name` هو المفتاح في الروابط (`root=F`)، `displayPath` وصفي فقط، `source` إما `handle` (File System Access) أو `files` (بديل المتصفحات)، و`handle` هو الإذن المخزَّن.
- **MediaItem**: عنصر وسائط واحد. يحمل `id` عامًا مبهمًا، `dirPath` (مقاطع نسبية تبقى محلية)، `channel`/`channelId` (المجلد الأول داخل الجذر)، `playlist`/`playlistId` (مجلد متداخل)، معلومات الصيغة والحجم والمدة، `directPlay`، `subtitles`، و`search` كحقل بحث موحّد.
- **ChannelRecord / PlaylistRecord**: تجميعات مشتقة من الشجرة أثناء الفهرسة.
- **ScanProgress / ScanIssue**: حالة الفهرسة الحيّة المعروضة في الإعدادات.

قواعد الاشتقاق:

```
<root>/<channel>/                 → قناة
<root>/<channel>/<a>/<b>/         → قائمة تشغيل (اسمها آخر مقطع)
اسم الملف                          → العنوان (تنظيف . و _ والشرطات)
<video>.ar.srt / .forced / .sdh   → مسار ترجمة مرفق بلغته ووسمه
```

---

## 6. الخزنة والحسابات / Vault and accounts

قاعدة `medialib-vault` فيها ثلاثة مخازن: `users`، `files` (كل صف مشفّر)، `session`.

بنية المجلدات المنطقية داخل `files`:

```
default/                 إعدادات المصنع، مفتوحة بمفتاح الجهاز
sessions/<sessionId>/     زائر لم يسجل الدخول
users/<slug>/             حساب حقيقي (تُنقل إليه مجلدات الزائر عند التسجيل)
unlock/<slug>/dek.json    مفتاح المجلد مغلّف بمفتاح الجهاز (لاستعادة الجلسة بعد التحديث)
```

خط التشفير:

1. كلمة المرور → **KEK** عبر PBKDF2-SHA256 (250,000 تكرار) → `AES-KW`.
2. لكل مجلد **DEK** عشوائي `AES-GCM 256`، مغلّف بالـ KEK ومخزَّن كـ `wrappedDek`.
3. كل ملف يُختم بـ AES-GCM مع IV جديد 96 بت (`seal` / `open`).
4. كلمة المرور نفسها لا تُخزَّن؛ يُخزَّن `verifier` مستقل (PBKDF2، 310,000 تكرار) ويُقارن بزمن ثابت.
5. تغيير كلمة المرور يعيد تغليف الـ DEK فقط، فتبقى الملفات صالحة.
6. مفتاح الجهاز: سر عشوائي في `localStorage` + PBKDF2، يفتح مجلد الزائر وملف `unlock`.

الأدوار: أول حساب يُنشأ على الجهاز يصبح `admin`، والبقية `user`. الأدوار محفوظة في سجل الحساب داخل الخزنة (لا يوجد خادم لترقية الصلاحيات).

ثبات الجلسة: بعد تسجيل الدخول يُخزَّن الـ DEK **مشفّرًا بمفتاح الجهاز**، لذا تحديث الصفحة لا يُخرج المستخدم. تسجيل الخروج يمحو ذلك الملف فورًا. لأن IndexedDB معزولة لكل متصفح، الحساب يُنشأ/يُستخدم في كل متصفح على حدة، والانتقال بين المتصفحات يتم عبر **الإعدادات ← متقدم ← تصدير بياناتي**.

---

## 7. الفهرسة / Indexing

قاعدة `medialib-index` (الإصدار 2) بمخازن: `roots`, `items`, `channels`, `playlists`, `thumbs`, `blobs`, `logs`.

مسارَان:

- **Worker** (`scanner.worker.ts`): للجذور من نوع `handle`. يمشي الشجرة، يكشف الصيغ، يبني القنوات وقوائم التشغيل، ويبلّغ التقدم دوريًا. مسح كامل أو تزايدي.
- **Fallback** (`fileListScanner.ts`): للجذور من نوع `files`. يستلم `File[]` من `<input webkitdirectory>`، يجمّعها بحسب `webkitRelativePath`، يفهرسها على دفعات 120 عنصرًا مع إعطاء المتصفح فرصة للرسم، ويحفظ كائنات `File` في مخزن `blobs` ليبقى التشغيل ممكنًا بعد التحديث.

المعرفات: `publicId(namespace, pathSegments)` في `ids.ts` يعطي معرفًا حتميًا من 10 أحرف. النتيجة: نفس الملف يحصل على نفس المعرف عند إعادة الفهرسة، والمسار الحقيقي لا يمكن استنتاجه من المعرف.

الصور المصغرة: `thumbnailQueue.ts` طابور بأولوية منخفضة، يعمل فقط للبطاقات الظاهرة فعلًا، يلتقط إطارًا واحدًا ويخزنه في `thumbs`، ويحرر كل Object URL بعد الاستخدام (كان تسريبها سبب التعليق سابقًا).

---

## 8. المشغل / Player

`src/components/media/Player.tsx`:

- تشغيل/إيقاف، تقديم/ترجيع، صوت، شريط تقدم مع معاينة، السابق/التالي.
- سرعات 0.25× → 3×، تكرار، ملء الشاشة، وضع المسرح، Picture-in-Picture.
- استئناف من آخر موضع (إن كان مسموحًا في الخصوصية).
- ترجمات جانبية تُحوَّل محليًا إلى WebVTT قبل عرضها.
- تشغيل تلقائي متسلسل داخل نفس المجلد عبر `playbackOrder` و`adjacentItems` في `library.ts`، مع تمييز العنصر الحالي في القائمة.
- تنظيف صارم: إغلاق PiP، إيقاف العنصر القديم، وتحرير الـ Object URL عند تغيير الملف أو الخروج، فلا يُشتغل ملفان معًا.
- الصيغ القديمة (RM/RMVB/WMV/AVI وترميزات قديمة): `transcoder.ts` يعيد التغليف أو يحوّل بـ FFmpeg WASM محليًا، مع بث مقطعي عبر MediaSource عندما يكون ذلك ممكنًا.

اختصارات: `Space/K` تشغيل، `J/L` ترجيع/تقديم، `←/→` ٥ ثوان، `F` ملء الشاشة، `T` مسرح، `M` كتم، `C` ترجمة، `Shift+N/P` التالي/السابق، `0-9` قفزة نسبية.

---

## 9. التوجيه والروابط / Routes and links

| المسار | الوصف |
| --- | --- |
| `/` | الرئيسية: أحدث ما فُهرس ومتابعة المشاهدة |
| `/browse?root=…&c=…&c1=…` | تصفح شجري: القنوات والمجلدات والعناصر |
| `/watch?root=…&c=…&v=…` | صفحة المشغل مع القائمة الجانبية وزر الرجوع |
| `/search?q=…` | نتائج البحث الكاملة |
| `/library`, `/channels`, `/subscriptions`, `/trending` | السجل والمفضلة والمشاهدة لاحقًا والقنوات المثبتة والأكثر مشاهدة |
| `/settings` | سبع تبويبات: عام، الجذور، المشغل، المكتبة، الخصوصية، الحساب، متقدم |
| `/auth` | إنشاء حساب محلي / تسجيل الدخول |

بناء الروابط وتحليلها حصريًا عبر `src/lib/core/paths.ts` (`buildQuery`, `parseQuery`, `browseHref`, `watchHref`). لا تكتب استعلامات يدويًا في المكوّنات.

البحث الفوري: حقل البحث في `Header.tsx` يستدعي `searchLibrary` بتأخير 140ms، يعرض حتى 8 اقتراحات مع تنقّل بالأسهم و`Enter`، وسطرًا أخيرًا لعرض كل النتائج.

---

## 10. التصميم والتوطين / Design and localization

- كل الألوان والتدرجات والظلال رموز HSL في `src/index.css`؛ يُمنع `text-white` أو `bg-[#...]` في المكوّنات.
- الوضع الفاتح والداكن و«تبع النظام»، مع 10 ألوان تمييز يبدّلها المستخدم من الإعدادات (تُكتب على `--primary` و`--youtube-red` و`--ring`).
- حجم الخط قابل للتكبير (`fontScale`)، وخيار تقليل الحركة يُفرض عبر `.reduce-motion`.
- الاتجاه يتغير تلقائيًا (`dir` على `<html>`) بحسب اللغة؛ استخدم دائمًا `ms-*`/`me-*`/`ps-*`/`pe-*` وليس `ml-*`/`mr-*`.
- الترجمة عبر `t("key")` من `useSession()`، والمفاتيح في `src/lib/i18n.ts` (عربي + إنجليزي معًا، لا نص ثابت في JSX).
- متجاوب من 320px: شريط سفلي للهاتف، قائمة جانبية قابلة للطي، شبكات تتكيف حتى الشاشات الكبيرة.

---

## 11. الأداء / Performance rules

- الفهرسة والتحويل والصور المصغرة كلها خارج الخيط الرئيسي أو على دفعات مع `await yield`.
- `content-visibility: auto` للصور والفيديو، وتحميل متأخر للبطاقات.
- تحرير كل `URL.createObjectURL` في دالة التنظيف؛ أي تسريب يظهر كتجمّد بعد دقائق.
- ذاكرة مؤقتة للفهرس في `library.ts` تُبطَل عبر `invalidateLibrary()` بعد أي تعديل على الجذور أو الفهرس.
- لا استعلام IndexedDB داخل حلقة رسم؛ اجمع الاستعلامات ثم اعرض.

---

## 12. الأمان / Security model

- لا شيء يخرج من الجهاز: لا تحليلات، لا تتبّع، لا طلبات شبكة.
- منع اجتياز المسارات هيكليًا: `assertSafeSegment` يرفض `..` و`/` و`\` والبادئة `C:` و`\0`، وكل وصول يمرّ بـ `resolveDirectory` من الجذر الممنوح فقط.
- الروابط لا تحمل مسارات حقيقية، والمعرفات مبهمة وغير قابلة للعكس.
- كلمات المرور لا تُخزَّن، والمقارنة بزمن ثابت، والمفاتيح غير قابلة للتصدير إلا في مسار استعادة الجلسة المشفّر.
- «تصفير التطبيق» يمحو الخزنة والفهرس ولا يلمس ملفات المستخدم الأصلية إطلاقًا.

---

## 13. التشغيل / Running

```bash
npm install
npm run dev     # http://localhost:8080
npm run build   # ثم قدّم مجلد dist من أي خادم ملفات محلي
```

- Chrome/Edge يمنحان أفضل تجربة (File System Access API + إذن دائم).
- Firefox/Safari يعملان عبر بديل اختيار المجلد (يُعاد اختيار المجلد للتحديث).
- الوصول من أجهزة الشبكة يعرض الواجهة، لكن إذن المجلد يبقى مرتبطًا بالمتصفح الذي منحه؛ البث الكامل للأجهزة الأخرى هو هدف المرحلة B.

---

## 14. خطوات إضافة ميزة / How to extend

1. أضف/عدّل الأنواع في `src/lib/core/types.ts` أولًا.
2. إن لمست التخزين، ارفع إصدار IndexedDB في `indexdb.ts` واكتب الترقية.
3. ضع منطق الاستعلام في `lib/media/library.ts`، لا في المكوّنات.
4. أضف نصوص الواجهة إلى `src/lib/i18n.ts` باللغتين.
5. استخدم رموز التصميم فقط، واحترم RTL بأدوات `ms/me`.
6. أي مورد جديد → `public/assets/<مجلد مناسب>/` بمسار `/assets/...`.
7. راجع الأداء: هل العمل ثقيل؟ انقله إلى Worker أو طابور بدفعات.

---

## 15. المرحلة B (مخطط مستقبلي) / Phase B roadmap

خادم Node محلي مرافق يقدّم: قراءة المسارات مباشرة بدون إذن متصفح، بث بـ Range requests لأجهزة الشبكة، FFmpeg أصلي أسرع من WASM، ومزامنة الفهرس بين الأجهزة. الواجهة الحالية مصممة لتتصل به دون إعادة كتابة: طبقات `mediaService` و`scanner` و`library` هي نقاط التبديل الوحيدة.

---

دليل المستخدم النهائي بالعربية والإنجليزية في [DOCUMENTATION.md](./DOCUMENTATION.md).
