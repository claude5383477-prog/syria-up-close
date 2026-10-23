# SPEC: سوريا عن قرب | Syria Up Close — المرحلة 1 (الموقع + لوحة التحكم)

> الحالة: **معتمدة** في 2026-10-17، مع الإجابات المسجلة في القسم 10.
> المصادر: `docs/source/claude-code-prompt-phase1.md` (البرومبت)، و`docs/source/syria-up-close.html` (النموذج الأولي المعتمد)، و`docs/source/هوية سوريا عن قرب.pdf` (الهوية v0.1).
> ملف الهوية راجعه صاحب المشروع، وسلّم الخطوط فيه مطابق لجدول البرومبت. الانحرافات المعتمدة عن النموذج: ألوان شارتي pending وstale (القسم 5.1)، وأوزان الخط العربي (القسم 5.1، قرار 2026-10-18). ملفات `docs/source/` لا تُعدَّل.

---

## 0. خريطة الوحدات (Capability Map)

الطلب يضم عدة قدرات يمكن اختبار كل منها وحدها، لذلك نقسّمه إلى وحدات بمعرّفات ثابتة. كل وحدة تمرّ بـ plan ثم build ثم test ثم review بالترتيب.

| معرّف الوحدة | المسؤولية | تعتمد على |
| --- | --- | --- |
| `foundation` | هيكل Next.js + Payload، والاتصال بـ Postgres، والتوجيه حسب اللغة (`/` عربي، `/en` إنجليزي)، ومتغيرات الهوية والخطوط، والشعار، والمكوّنات الأساسية (الأزرار، والوسوم، وشارة التحديث، والبطاقات، والترويسة، والتذييل) | — |
| `content-model` | الـ Collections والـ Global، والأدوار والصلاحيات، وخطافات `verifiedBy`/`verifiedAt`، ومنطق الحداثة (`freshness`)، وسجل التدقيق، والبيانات الأولية (`npm run seed`)، وواجهة لوحة التحكم بالعربية | `foundation` |
| `public-site` | كل صفحات الموقع العامة بالعربية والإنجليزية، ولوحة "حال البلد اليوم"، وبطاقة "أين تقيم"، وإعادة البناء عند النشر | `content-model` |
| `correspondent-app` | صفحة `/correspondent` الخفيفة: الدخول، واختيار المدينة، والحالة، ورفع الصور مع الضغط في المتصفح، ومسودة تقرير الموسم، والحفظ دون اتصال | `content-model` |
| `seo-perf` | metadata، و`hreflang`، و`sitemap.xml`، و`robots.txt`، وصور OG، وschema.org، وميزانيات Lighthouse | `public-site` |
| `ops` | `Dockerfile`، و`docker-compose.yml`، و`.env.example`، والنسخ الاحتياطي، و`README.md` بالعربية | `foundation` (يُستكمل في النهاية) |

ترتيب البناء: `foundation` ← `content-model` ← (`public-site` و`correspondent-app` بالتوازي) ← `seo-perf` ← `ops`.

اقتراح: نبقي كل الوحدات في هذا الملف الواحد، لأن البرومبت يطلب `SPEC.md` واحداً. إن فضّلت ملفاً لكل وحدة (`SPEC-foundation.md` وغيرها) أقسّمه بعد الموافقة.

---

## 1. الهدف

"سوريا عن قرب" دليل سياحي **مستقل**، عربي أولاً، وهو مرصد حيّ لسوريا كما هي اليوم. كل معلومة عملية مؤرخة وتحمل اسم من تحقق منها، ويحدّثها مراسلون على الأرض. الإقامة عبر الشريك أهلين (ahleenbooking.com).

### المستخدمون

| المستخدم | ما يحتاجه |
| --- | --- |
| زائر "جوّا سوريا" | مشاوير نهاية الأسبوع، ومصايف، وبيوت ريفية، وتقارير الموسم. **عربي فقط**، بلهجة قريبة. |
| زائر "جاي من برّا" | دليل أول زيارة، والمدن، وخطط الرحلات لاحقاً. عربي وإنجليزي. |
| المراسل | يحدّث حال مدينته من الهاتف وباتصال ضعيف، في أقل عدد من النقرات. |
| المحرر | يراجع وينشر كل المحتوى. |
| المدير (admin) | يدير المستخدمين والإعدادات. |

### قواعد المحتوى (تُفرض في الكود)

| # | القاعدة | كيف تُفرض |
| --- | --- | --- |
| ق1 | لا شيء يوحي بأننا جهة رسمية | نص ثابت في التذييل وصفحة "من نحن". لا شعارات حكومية ولا كلمة "رسمي" في أسماء الأقسام. مراجعة يدوية. |
| ق2 | لا بيانات مخترعة | الـ seed لا يُنشئ `statusItems` ولا تقارير ولا صور ولا تفصيلة يوم. كل قسم فارغ يعرض حالة "بانتظار أول تحقق" أو حالة فارغة واضحة. |
| ق3 | كل معلومة عملية تحمل `verifiedAt` و`verifiedBy`، وتظهر شارة "قد تكون قديمة" تلقائياً | خطاف `beforeChange` على الخادم، والحقلان للقراءة فقط لكل الأدوار. دالة `freshness()` مختبرة. |
| ق4 | لا حقول أسعار ولا ادعاءات أمان | اختبار يفحص كل حقول كل Collection ويفشل إذا ظهر اسم حقل يطابق `price|cost|fee|safe|safety|secure` (القائمة قابلة للمراجعة). |
| ق5 | أزرار الحجز عبر أهلين تظهر فقط حيث يحتاج القارئ إقامة: صفحات المدن و"جوّا سوريا" و"جاي من برّا"، ومعها سطر إفصاح. **تحديث بقرار صاحب المشروع (2026-10-23):** تذييل كل صفحة يحمل رابط أهلين مع شعاره، والفندق غير المدرج في أهلين يُعرض بلا رابط. | الروابط تُبنى من `siteSettings` (`ahleenBaseUrl`، `partnerLinkRel`) أو من `stays.ahleenUrl` (فارغ أو صفحة على ahleenbooking.com فقط). اختبار e2e يتأكد أن روابط أهلين داخل `main` لا تظهر إلا في `/cities/[slug]` و`/inside` و`/outside`، وأن في التذييل رابطاً واحداً. |

---

## 2. التقنية

| البند | الاختيار | ملاحظات |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | المثبت محلياً v24.18.0 |
| الإطار | Next.js 16 (App Router) + TypeScript (strict) | آخر إصدار حالياً 16.4.2. Payload 3.91 يدعم `>=16.3.3 <17` |
| CMS | Payload 3.91.0 داخل تطبيق Next نفسه (`@payloadcms/next`) | أثبّت الإصدار بدقة في `package.json` |
| قاعدة البيانات | PostgreSQL 16 عبر `@payloadcms/db-postgres` | migrations عبر `payload migrate` |
| الصور | `sharp` لتوليد المقاسات، و`@payloadcms/storage-s3` للتخزين | يُفعَّل S3 عند وجود متغيراته، وإلا تخزين محلي على volume. راجع س-3 |
| المحرر | `@payloadcms/richtext-lexical` | لجسم تقارير الموسم و"عن قرب" وصفحات أول زيارة |
| التوطين | Payload localization بلغتين `ar` (افتراضي، RTL) و`en`، وواجهة اللوحة عربية عبر `@payloadcms/translations` | |
| الخطوط | العربي: IBM Plex Sans Arabic مستضاف ذاتياً من `@ibm/plex-sans-arabic` (OFL)، ومقصوص إلى WOFF2 في `public/fonts` عبر `npm run fonts:subset` (fonttools، أداة تطوير). الإنجليزي: IBM Plex Sans عبر `next/font` | العربي 400/600/700 (preload لـ 400 فقط، `font-display: swap`، وخط بديل بـ size-adjust). الإنجليزي 400/500/600 |
| الاختبارات | Vitest (وحدة وتكامل)، وPlaywright (e2e)، و`@axe-core/playwright`، و`@lhci/cli` | |
| النشر | `Dockerfile` (Next standalone) و`docker-compose.yml` (app + postgres) | |

**مبدأ source-driven:** قبل كتابة كود كل وحدة أراجع الوثائق الرسمية لـ Next.js 16 وPayload 3.91. من الأمثلة: في Next 16 صار اسم `middleware.ts` هو `proxy.ts`، وسأتحقق من ذلك في الوثائق قبل الاعتماد عليه، وكذلك من طريقة تثبيت Payload في مشروع Next قائم.

---

## 3. الأوامر

```bash
npm install                 # تثبيت الحزم
npm run dev                 # تشغيل التطوير: الموقع على / ولوحة التحكم على /admin
npm run build               # بناء الإنتاج (يشغّل payload migrate ثم next build)
npm run start               # تشغيل نسخة الإنتاج
npm run seed                # البيانات الأولية (آمن للتكرار: لا يكرر السجلات)
npm run generate:types      # payload generate:types → src/payload-types.ts
npm run migrate:create      # payload migrate:create
npm run lint                # eslint . --max-warnings 0
npm run typecheck           # tsc --noEmit
npm test                    # vitest run (وحدة + تكامل)
npm run test:e2e            # playwright test
npm run lhci                # lhci autorun على نسخة الإنتاج
docker compose up --build   # الموقع + اللوحة + Postgres
```

---

## 4. هيكل المشروع

```
src/
  app/
    (frontend)/
      [locale]/                 → ar (افتراضي بلا بادئة عبر rewrite) و en تحت /en
        page.tsx                → /
        inside/                 → عربي فقط
        outside/first-visit/[topic]/
        cities/[slug]/
        seasons/[slug]/         → عربي فقط
        about/
      correspondent/            → صفحة المراسل (عربي فقط، بلا بادئة لغة)
      sitemap.ts, robots.ts, opengraph-image.tsx
    (payload)/admin/...         → لوحة Payload (ملفات يولّدها Payload)
    (payload)/api/...           → REST/GraphQL الخاص بـ Payload
  collections/                  → ملف لكل Collection
  globals/SiteSettings.ts
  access/                       → دوال الصلاحيات (isAdmin, isEditorOrAdmin, ownsCity …)
  hooks/                        → stampVerification, auditLog, revalidate …
  lib/freshness.ts              → حساب الحالة: pending / fresh / stale
  lib/i18n.ts                   → القاموس الثابت ar/en ومساعدات اللغة
  components/                   → Header, Footer, Logo, Stamp, Chip, Card, StayCard, StatusBoard …
  styles/tokens.css             → متغيرات الهوية + الوضع الداكن
  seed/                         → index.ts + بيانات النموذج الأولي
  payload.config.ts
tests/
  unit/                         → freshness, access, schema-rules, contrast
  int/                          → Payload Local API على Postgres حقيقي
e2e/                            → Playwright: المسارات والمراسل والصلاحيات والمقاسات
docs/source/                    → الملفات المرجعية الثلاثة (لا تُعدَّل)
SPEC.md  PLAN.md  CONSTRAINTS.md  README.md
Dockerfile  docker-compose.yml  .env.example
```

---

## 5. تفاصيل الوحدات

### 5.1 `foundation`

- **التوجيه حسب اللغة:** العربية على المسارات بلا بادئة (`/cities/damascus`)، والإنجليزية تحت `/en/...`. ينفّذ `proxy.ts` ذلك بإعادة كتابة داخلية (rewrite) إلى `[locale]`، ويستثني `/admin` و`/api` و`/correspondent` والملفات الثابتة.
- **`<html lang dir>`** يُضبط من اللغة: `ar` يعني `rtl`، و`en` يعني `ltr`.
- **الصفحات العربية فقط** (`/inside` و`/seasons`): نسختها تحت `/en/...` تعرض المحتوى العربي مع رسالة إنجليزية "This section is for people inside Syria and is in Arabic only."، كما في النموذج، ويُعطَّل زر تبديل اللغة فيها.
- **الهوية:** `tokens.css` ينقل متغيرات `:root` من النموذج كما هي، بما فيها الوضع الداكن عبر `prefers-color-scheme` و`[data-theme]`. لا ألوان مكتوبة مباشرة خارج هذا الملف، باستثناء نحاسي الشعار.
- **الشعار A:** مكوّن React يولّد SVG بنفس خوارزمية `mark()` في النموذج (72 علامة، ومؤشر نحاسي مائل −38°، ونقطة مركز نحاسية)، ويُرسم على الخادم.
- **المكوّنات:** نفس أسماء الأصناف في النموذج (`.btn`، و`.chip.city/.cat/.aud`، و`.stamp`، و`.card`، و`.stay`، و`.board`) لضمان المطابقة البصرية. CSS عادي (CSS Modules أو ملف عام)، بلا Tailwind.
- **سلّم الخطوط العربي (انحراف معتمد، 2026-10-18):** ثلاثة أوزان فقط: 400 و600 و700. الـ Caption العربي 13/1.6 · **400** بدل 500، وأي طلب لوزن 500 بالعربية يُعرض بـ 400 حسب قواعد مطابقة الخطوط في CSS. باقي السلّم كما هو، والسلّم الإنجليزي بلا تغيير (Caption 12/1.4 · 500).
- **شارة التحديث** بثلاث حالات:
  - `fresh`: "آخر تحديث: {التاريخ}". كما في النموذج: حد Sand-300، ونقطة خضراء `#3E7A55`.
  - `stale`: "آخر تحديث: {التاريخ} · قد تكون قديمة". النمط الكهرماني من النموذج: خلفية `#F1E6C4`، ونص `#6B5212`، ونقطة `#B08A1E`. في الوضع الداكن: `#3A3315` و`#E3CF8A`.
  - `pending`: "بانتظار أول تحقق". **انحراف معتمد عن النموذج:** نمط محايد بخلفية Sand-100 `#F3ECE0`، وحد متقطع Sand-300 `#D9C8AC`، ونص Ink-500 `#645A4E`، ونقطة مفرغة (حد فقط بلا تعبئة). في الوضع الداكن تُستخدم المقابلات من متغيرات الوضع الداكن (`--bg`، و`--line`، و`--ink2`).

### 5.2 `content-model`

#### الـ Collections

| Collection | الحقول | localized | Drafts / Versions | ملاحظات |
| --- | --- | --- | --- | --- |
| `users` | name، email، role (`admin`/`editor`/`correspondent`)، assignedCities (relation → cities, hasMany) | — | — | auth. لا يغيّر `role` و`assignedCities` إلا admin. `maxLoginAttempts: 5`، `lockTime: 15 دقيقة` |
| `cities` | slug (فريد)، name، tag، lede، eat، coverImage → media، coverShotNote | name، tag، lede، eat، coverShotNote | — | ندمج `cityFood` في حقل `eat` داخل `cities`، كما يسمح البرومبت |
| `places` | city، title، description، image، order | title، description | — | "ماذا ترى" |
| `statusItems` | city، type (`electricity`/`internet`/`roads`/`weather`/`events`)، value، sourceUrl، verifiedBy (→ users)، verifiedAt | value | versions (السجل التاريخي)، بلا drafts | فريد على (city, type). يُنشر فوراً |
| `seasonReports` | slug، city، title، body (lexical)، photos (→ media)، fieldDate، author (→ users، تلقائي) | لا (عربي فقط) | drafts | المراسل ينشئ مسودات فقط |
| `firstVisitPages` | topic (فريد: `visa`/`arrival`/`money`/`connectivity`/`transport`)، title، body، officialSourceUrl، lastVerifiedAt، lastVerifiedBy | title، body | drafts | النشر ممنوع بلا `officialSourceUrl` |
| `stories` | slug، title، body، photos، city، tags | title، body | drafts | **نموذج فقط في المرحلة 1**: لا صفحة عامة له في جدول الصفحات. راجع س-6 |
| `dailyDetail` | date (فريد)، photo، sentence، place، city | sentence، place | — | الرئيسية تعرض أحدث تفصيلة تاريخها ≤ اليوم |
| `stays` | city، title، description، image، ahleenUrl | title، description | — | بلا حقل سعر |
| `dayTrips` | fromCity، title، description، order | لا (عربي فقط) | — | **إضافة مقترحة**: النموذج يعرض "مشاوير نهاية الأسبوع" ولا يوجد Collection لها. راجع س-5 |
| `media` | upload، alt (إلزامي)، credit، shotDate، uploadedBy (تلقائي) | alt | — | مقاسات: 400 و800 و1600 بصيغة WebP، وأصل مضغوط |
| `auditLog` | user، collection، docId، operation (`create`/`update`/`delete`/`confirm`)، changedFields، at | — | — | يكتبه الخادم فقط. يقرؤه admin. لا تعديل ولا حذف لأي دور |

**Global `siteSettings`:** ahleenBaseUrl (افتراضي `https://ahleenbooking.com`)، partnerLinkRel (افتراضي `sponsored noopener`، قابل للتعديل)، disclosureText (localized)، staleness.statusDays = 7، staleness.firstVisitDays = 30. لا يعدّله إلا admin.

#### الصلاحيات

كل قاعدة في هذا الجدول تُكتب اختباراً قبل تنفيذها (TDD).

| | admin | editor | correspondent |
| --- | --- | --- | --- |
| users | كل شيء | قراءة | قراءة نفسه فقط، وتعديل اسمه وكلمة سره فقط |
| siteSettings | كل شيء | قراءة | — |
| cities / places / stays / dayTrips / dailyDetail / stories | كل شيء | كل شيء | قراءة فقط |
| statusItems | كل شيء | كل شيء | إنشاء وتعديل حيث `city ∈ assignedCities` فقط |
| seasonReports | كل شيء | كل شيء + نشر | إنشاء مسودة لمدنه، وتعديل مسوداته هو قبل النشر. لا نشر |
| firstVisitPages | كل شيء | كل شيء + نشر | قراءة فقط (راجع س-4) |
| media | كل شيء | كل شيء | رفع، وتعديل وحذف ما رفعه هو فقط |
| auditLog | قراءة | — | — |

- **الفرض على مستوى الخادم:** دوال `access` في Payload وفلاتر `where` للقراءة والتعديل، وليس عبر إخفاء عناصر الواجهة.
- **`verifiedBy`/`verifiedAt`/`author`/`uploadedBy`/`lastVerifiedBy`/`lastVerifiedAt`:** صلاحية `update` على مستوى الحقل `false` للجميع. خطاف `beforeChange` يملؤها من `req.user` و`new Date()`، ويتجاهل أي قيمة تأتي من العميل.
- **"لا تغيير، تم التحقق اليوم":** endpoint مخصص `POST /api/status-items/:id/confirm` يجدّد `verifiedAt` و`verifiedBy` فقط، ويطبّق نفس صلاحية المدينة، ويُسجَّل في `auditLog` كعملية `confirm`.
- **النشر بلا مصدر:** خطاف `beforeValidate` على `firstVisitPages` يرفض أي حفظ بحالة `_status: 'published'` إذا كان `officialSourceUrl` فارغاً أو ليس `https://`. عند النشر يملأ الخادم `lastVerifiedAt` و`lastVerifiedBy`.

#### منطق الحداثة

```ts
freshness(verifiedAt: Date | null, now: Date, maxAgeDays: number): 'pending' | 'fresh' | 'stale'
```

- `pending` إذا لم يكن هناك تاريخ تحقق.
- `stale` إذا كان `now − verifiedAt > maxAgeDays`.
- `fresh` في غير ذلك.

#### البيانات الأولية (`npm run seed`)

- **ينشئ:**
  - المدن الأربع بنصوصها العربية والإنجليزية، و"ماذا ترى" و"ماذا تأكل" منقولة حرفياً من النموذج.
  - 5 صفحات `firstVisitPages` كمسودات فارغة.
  - `dayTrips` من النموذج، إن وافقت على س-5.
  - مستخدم admin من `SEED_ADMIN_EMAIL` و`SEED_ADMIN_PASSWORD`.
  - مراسل تجريبي معيّن على دمشق من `SEED_CORRESPONDENT_EMAIL` و`SEED_CORRESPONDENT_PASSWORD`.
- **لا ينشئ:** أي `statusItems`، ولا تقارير موسم، ولا صور، ولا `dailyDetail`، ولا `stays`.
- **آمن للتكرار:** يعتمد upsert على slug والبريد.

### 5.3 `public-site`

الصفحات كما في جدول البرومبت، وتطابق النموذج في البنية والنصوص.

| الحالة | ما يعرضه الموقع |
| --- | --- |
| لا يوجد `statusItem` لبند ما | سطر النموذج "ينشر مراسل {المدينة} الحالة هنا…" مع شارة `pending` |
| يوجد `statusItem` | القيمة، و"تحقق منه {الاسم}"، والتاريخ، ورابط المصدر إن وُجد، وشارة `fresh` أو `stale` |
| لا توجد `dailyDetail` | قسم "تفصيلة اليوم" يعرض حالة فارغة مؤرخة. النص المكتوب في النموذج ("لكلّ باب مقبض…") لا يُنشر لأنه محتوى مثال (ق2) |
| لا توجد تقارير موسم | حالة فارغة: "أول تقرير بموسمه" كما في النموذج، بلا عناوين تقارير مخترعة |
| لا توجد `stays` لمدينة | بطاقة "أين تقيم" العامة كما في النموذج، تربط بـ `ahleenBaseUrl` مع سطر الإفصاح |
| صور المدن والأماكن غير موجودة | خلفية "hatch" مع نص وصف اللقطة، كما في النموذج |

- **إعادة البناء:**
  - خطافات `afterChange` تستدعي `revalidatePath` للصفحات المتأثرة، بالعربية والإنجليزية.
  - صفحات المدن تستخدم أيضاً `revalidate = 3600`، فتنقلب الشارة إلى "قد تكون قديمة" خلال ساعة على الأكثر من تجاوز المهلة حتى لو لم ينشر أحد شيئاً.
- **روابط أهلين:** `target="_blank"` و`rel` من `siteSettings`.
- **المحتوى الإنجليزي غير المترجم:** أي حقل localized بلا قيمة `en` يُعرض بقيمته العربية داخل عنصر يحمل `lang="ar" dir="rtl"`. إذا كان المحتوى الرئيسي للصفحة الإنجليزية غير مترجم بالكامل، تأخذ الصفحة `robots: noindex` وتُستبعد من `sitemap.xml` ومن `hreflang` حتى تُترجم.

### 5.4 `correspondent-app`

- **المسار:** `/correspondent`. عربي، وRTL.
- **التقنية:** صفحات Next خفيفة، و**server actions** تستدعي Payload Local API مع `overrideAccess: false` و`user` المستخدم الحالي. بهذا تبقى الصلاحيات في مكان واحد. لا تُحمَّل حزمة لوحة Payload.
- **الدخول:** بالبريد وكلمة السر عبر مصادقة Payload (cookie `payload-token`، بإعداد `httpOnly` و`secure` و`sameSite=lax`).
- **الشاشات:**
  1. الدخول.
  2. اختيار المدينة. تُتخطّى الشاشة إن كانت للمراسل مدينة واحدة.
  3. نموذج الحالة: 5 بنود، لكل بند نص قصير (حد 280 حرفاً)، ورابط مصدر اختياري (يُقبل `https` فقط)، وزر "لا تغيير، تم التحقق اليوم".
  4. رفع صورة: ضغط في المتصفح عبر `canvas` حتى 2000px بجودة 0.8 وبصيغة WebP أو JPEG، بلا مكتبة خارجية. مع حقل وصف اللقطة (alt إلزامي) وتاريخ اللقطة.
  5. "إرسال تقرير موسم": عنوان، ونص، وصور، ثم يُنشئ مسودة.
- **دون اتصال:**
  - الحقول النصية تُحفظ تلقائياً في `localStorage`، والصور المضغوطة في IndexedDB.
  - عند عودة الاتصال تظهر رسالة "عندك مسودة غير مرسلة" مع زر إرسال. لا إرسال تلقائي مخفي.
- **رسائل الخطأ:** عربية وواضحة لكل حالة:
  - كلمة سر خطأ.
  - حساب مقفل.
  - لا اتصال.
  - صورة كبيرة جداً.
  - لا صلاحية لهذه المدينة.
- **الميزانية:**
  - أقل من 150KB نقل مضغوط للتحميل الأول، بدون الخطوط.
  - تعمل على عرض 360px بلا تمرير أفقي.
  - راجع س-8.

### 5.5 `seo-perf`

- `generateMetadata` لكل صفحة، مع `alternates.languages` لـ `ar` و`en` و`x-default`. الصفحات العربية فقط لها `ar` فقط.
- `sitemap.xml` من المدن والتقارير المنشورة وصفحات أول زيارة المنشورة، و`robots.txt` يمنع `/admin` و`/api` و`/correspondent`.
- صور OG عبر `ImageResponse` بالهوية: خلفية خضراء، والشعار، والعنوان.
- JSON-LD: `TouristDestination` لكل مدينة، و`Article` لكل تقرير موسم.

### 5.6 `ops`

- `Dockerfile` متعدد المراحل يبني Next بنمط standalone ويشغّله كمستخدم غير root.
- `docker-compose.yml` يحتوي `app` و`postgres:16`، مع volume لقاعدة البيانات وvolume للصور المحلية، و`healthcheck`.
- `.env.example` فيه كل المتغيرات: `DATABASE_URL`، و`PAYLOAD_SECRET`، و`NEXT_PUBLIC_SITE_URL`، و`S3_*`، و`SEED_*`.
- `README.md` بالعربية يشرح:
  - التشغيل والنشر على VPS.
  - إضافة مراسل وتعيين مدنه.
  - النسخ الاحتياطي عبر `pg_dump` والاستعادة، ونسخ الصور.

---

## 6. أسلوب الكود

- TypeScript `strict`. لا `any` ولا `@ts-ignore` ولا `eslint-disable` إلا بتعليق يشرح السبب وموافقتك.
- أسماء الملفات: Collections بـ PascalCase (`StatusItems.ts`)، والدوال والمساعدات بـ camelCase. معرّفات الـ Collections بـ camelCase (`statusItems`) كما في البرومبت.
- التعليقات قليلة وبالإنجليزية في الكود. النصوص الظاهرة للمستخدم في `lib/i18n.ts` أو في Payload، وليست مبعثرة في المكوّنات.
- مثال على الأسلوب:

```ts
// src/access/cityScoped.ts
import type { Access } from 'payload'

export const cityScoped: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'editor') return true
  const ids = (user.assignedCities ?? []).map((c) => (typeof c === 'object' ? c.id : c))
  return ids.length ? { city: { in: ids } } : false
}
```

---

## 7. استراتيجية الاختبار

| المستوى | الأداة | ماذا يغطي |
| --- | --- | --- |
| وحدة | Vitest | `freshness()`، ودوال الصلاحيات، وقاعدة "لا أسعار ولا أمان" (ق4)، وتباين ألوان الهوية AA لكل زوج نص وخلفية مستخدم في الوضعين |
| تكامل | Vitest + Payload Local API + Postgres حقيقي | كل صف في جدول الصلاحيات، وتجاهل قيم `verifiedBy`/`verifiedAt` المرسلة من العميل، والنشر بلا مصدر، وسجل التدقيق، والسجل التاريخي لـ `statusItems`، وتكرار الـ seed بأمان |
| e2e | Playwright (360×800 و1280×800، فاتح وداكن، ar وen) | المسارات، والتنقل، وتعطيل زر اللغة في الصفحات العربية فقط، وسيناريو المراسل الكامل (معيار القبول 3)، ومنع مراسل دمشق من حلب (معيار 4) |
| وصول | `@axe-core/playwright` | لا مخالفات serious أو critical في كل صفحة |
| أداء | Lighthouse CI | Performance ≥ 90 على الهاتف، وAccessibility ≥ 95 |
| بصري | لقطات Playwright للنموذج والموقع جنباً إلى جنب | للمراجعة اليدوية. المحتوى مختلف لأن الموقع لا يعرض بيانات مخترعة، لذا لا نقارن البكسلات آلياً |

- الهدف للتغطية: 90% أو أكثر للأسطر في `src/access` و`src/hooks` و`src/lib`. لا هدف رقمي للمكوّنات.
- اختبارات الصلاحيات و"آخر تحقق" تُكتب **قبل** التنفيذ (red ثم green).

---

## 8. الحدود

**دائماً:**
- الاختبار قبل كل commit (`lint` و`typecheck` و`test`).
- commit صغير لكل مهمة.
- مراجعة الوثائق الرسمية قبل استخدام أي API من Next أو Payload.
- فرض قواعد المحتوى (ق1 إلى ق5) في الكود.
- كل نص ظاهر للمستخدم بالعربية أولاً.

**اسأل أولاً:**
- إضافة أي حزمة غير مذكورة في قسم التقنية.
- تغيير نموذج البيانات بعد اعتماده.
- أي انحراف بصري عن النموذج.
- تخفيض أي عتبة في `CONSTRAINTS.md`.
- النشر على خادم حقيقي.
- أي push إلى remote.

**لا تفعل أبداً:**
- اختراع بيانات (حالة، أو صور، أو تقارير، أو أسعار).
- إضافة حقل سعر أو ادعاء أمان.
- كتابة أسرار في المستودع.
- تعطيل اختبار أو تخطّيه لتمرير البناء.
- تعديل الملفات في `docs/source/`.
- السماح للعميل بتعيين `verifiedBy` أو `verifiedAt`.

---

## 9. معايير النجاح (قابلة للاختبار)

1. `docker compose up --build` يشغّل الموقع على `:3000` واللوحة على `/admin`، و`docker compose exec app npm run seed` يملأ البيانات، وتكراره لا يكرر السجلات.
2. لقطات Playwright على 360px و1280px، فاتح وداكن، ar وen، لكل صفحة، تُراجَع جنباً إلى جنب مع النموذج وتُعتمد منك.
3. مراسل دمشق يحدّث "الكهرباء" من `/correspondent` على viewport هاتف، فتظهر القيمة في `/cities/damascus` خلال 5 ثوانٍ أو أقل، باسمه وتاريخ اليوم (اختبار e2e).
4. مراسل دمشق يحاول تعديل حلب أو نشر صفحة أول زيارة، فيُرفض الطلب من الخادم (اختبارات تكامل + e2e).
5. `statusItem` بتاريخ `verifiedAt` أقدم من 7 أيام تظهر عليه شارة "قد تكون قديمة" دون أي تدخل (اختبار وحدة + اختبار e2e بتاريخ مزروع).
6. محاولة نشر `firstVisitPage` بلا `officialSourceUrl` تفشل برسالة عربية واضحة (اختبار تكامل).
7. Lighthouse على `/` و`/cities/damascus` و`/correspondent`: Performance ≥ 90 (هاتف)، وAccessibility ≥ 95، واختبار التباين AA يمرّ.
8. `README.md` بالعربية يغطي التشغيل والنشر وإضافة مراسل والنسخ الاحتياطي، وكل أمر فيه جُرّب فعلاً.

---

## 10. القرارات (إجابات الأسئلة المفتوحة، 2026-10-17)

| # | الموضوع | القرار |
| --- | --- | --- |
| س-1 | ملف الهوية | لا حاجة لـ `pypdf`. سلّم الخطوط مطابق للبرومبت. ألوان شارتي `stale` و`pending` كما في القسم 5.1 |
| س-2 | Postgres محلياً | صاحب المشروع يثبّت Docker Desktop. إلى أن يجهز، تُنفَّذ المهام التي لا تحتاج قاعدة بيانات أولاً: tokens، والشعار، والمكوّنات، و`freshness` واختباراته |
| س-3 | تخزين الصور | قرص محلي على volume الآن، مع جاهزية S3 عبر المتغيرات. المرشّح لاحقاً Cloudflare R2 |
| س-4 | المراسل وصفحات أول زيارة | قراءة فقط |
| س-5 | مشاوير نهاية الأسبوع | يُضاف `dayTrips` ويُملأ من النموذج |
| س-6 | `stories` | النموذج فقط في المرحلة 1 |
| س-7 | `rel` روابط أهلين | `sponsored noopener` افتراضياً، قابل للتعديل من الإعدادات |
| س-8 | ميزانية صفحة المراسل | 150KB |
| س-9 | المحتوى غير المترجم | fallback إلى العربي مع `lang="ar"`، و`noindex` للصفحة الإنجليزية غير المترجمة بالكامل (القسم 5.3) |
| س-10 | مكان المشروع | `C:\dev\syria-up-close`، خارج OneDrive لأن مزامنته لا تصلح لـ `node_modules` وgit وملفات Postgres. المشروع في جذره مباشرة مع `docs/source`. git محلي بلا remote، ولا push دون موافقة |

بنية الوثيقة: كل الوحدات تبقى في `SPEC.md` واحد.

## 11. قرار الأداء والخط (2026-10-18)

| البند | القرار |
| --- | --- |
| مصدر الخط العربي | `@ibm/plex-sans-arabic` مستضاف ذاتياً بدل Google Fonts، ومقصوص: الكتلة العربية كاملة (الحروف، والتشكيل، وعلامات الترقيم العربية، والأرقام العربية والهندية) + Latin Basic + رموز الواجهة القليلة. اختبار `tests/unit/font-coverage.test.ts` يتأكد أن كل حرف مستخدم في نصوص الموقع والـ seed موجود |
| الأوزان | 400 و600 و700 للعربي. Caption العربي 400 |
| التحميل | preload لوزن 400 فقط، و`font-display: swap`، وخط بديل محلي بـ size-adjust وascent/descent-override |
| صور المشاركة | بخط الهوية نفسه (ملفات TTF مقصوصة في `src/og/fonts`) |
| ميزانية المراسل | اختبار e2e يفشل إن تجاوزت صفحة المراسل 150KB |
| Lighthouse | العتبة تبقى 0.90. إن لم تتحقق محلياً تُسجَّل في CONSTRAINTS.md كبند يُعاد قياسه على خادم الإنتاج |


## تحديث 2026-10-23: إعادة التصميم (البروتوتايب المعتمد)

بقرار صاحب المشروع، نُقل البروتوتايب "سوريا عن قرب — البروتوتايب الجديد" إلى الموقع:

- **الرئيسية:** خريطة ثلاثية الأبعاد لسوريا (حدود Natural Earth) بنقطة لكل مدينة، وقسم "جوعان؟" بصورة حقيقية معالجة بطبقات، وقسم المدونة.
- **صفحة المدينة:** نقش وشكل قوس من عمارة المدينة (`lib/cityTheme.ts`)، وأقسام جديدة: العمارة، وأسرار ونهفات وأمثال (`cityLore`)، ومطاعم وكافيهات وحدائق (`venues`)، ومعرض صور (`cityPhotos`)، وفنادق المدينة (مدرجة في أهلين برابط، وغير مدرجة بلا رابط).
- **جوّا سوريا:** مشاوير نهاية الأسبوع مع فلتر بالمدن، ومشاوير جديدة من أماكن المدن نفسها (migration محتوى).
- **جاي من برّا:** أداة "خطّط مشوارك" التوضيحية، وقسم "احجز فندقك عن طريق أهلين".
- **من نحن:** عدسة تفاعلية، وبطاقات الوعود، وخطوات التحقق، وتجربة صابون الغار.
- **المدونة** `/blog` و`/blog/[slug]`: القصص (`stories`) بتصنيف، مع تقارير الموسم.

القواعد كما هي: لا محتوى مخترع (الأقسام الجديدة فارغة حتى يملأها إنسان، وتقول من سيملؤها)، ولا أسعار ولا ادعاءات أمان، والأسرار والنكات يرويها أهل المدينة بأسمائهم بلا تنميط.
