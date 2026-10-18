# سوريا عن قرب | Syria Up Close

دليل سفر مستقل عن سوريا، بالعربية أولاً ثم الإنجليزية، مع لوحة تحرير وصفحة خفيفة للمراسلين على الأرض.
المواصفات المعتمدة في [`SPEC.md`](SPEC.md)، والمهام في [`PLAN.md`](PLAN.md)، وعقد الجودة في [`CONSTRAINTS.md`](CONSTRAINTS.md).

- الموقع العام: Next.js 16 (App Router)، ويُعاد توليد الصفحات كل ساعة وعند كل نشر.
- لوحة التحرير: Payload CMS 3 على `/admin`.
- صفحة المراسل: `/correspondent`، وحجمها أقل من 150KB على الهاتف.
- قاعدة البيانات: PostgreSQL.
- الصور: على القرص (`MEDIA_DIR`)، أو على تخزين متوافق مع S3 مثل Cloudflare R2 إن ضُبط `S3_BUCKET`.

## المتطلبات

- Node.js 24 (انظر `.nvmrc`).
- لا تحتاج Docker ولا PostgreSQL مثبتاً للتطوير: `npm run db` يشغّل قاعدة مضمّنة (embedded-postgres).
- Python 3 فقط إن أردت إعادة قصّ الخط (`npm run fonts:subset`). ملفات الخط الناتجة محفوظة في المستودع.

## التشغيل المحلي

```bash
npm ci
cp .env.example .env
```

املأ `PAYLOAD_SECRET` وحسابات الـ seed في `.env`، ثم شغّل القاعدة في نافذة طرفية مستقلة واتركها تعمل:

```bash
npm run db
```

وفي نافذة أخرى:

```bash
npm run migrate
npm run seed
npm run dev
```

- الموقع: <http://localhost:3000>، والإنجليزية على `/en`.
- اللوحة: <http://localhost:3000/admin>.
- صفحة المراسل: <http://localhost:3000/correspondent/login>.

أي تغيير في نموذج البيانات يحتاج migration تُحفظ في المستودع:

```bash
npm run migrate:create -- اسم-التغيير
```

## الفحوص

| الأمر | ماذا يفحص | متى |
| --- | --- | --- |
| `npm run check:fast` | الأنواع وlint والحارس (لا suppressions ولا اختبارات متخطّاة) | أثناء العمل |
| `npm run check:task` | ما سبق، واختبارات الوحدة مع التغطية | قبل كل commit |
| `npm run check:full` | ما سبق، واختبارات التكامل على Postgres، والبناء، وPlaywright (بما فيها axe وميزانية 150KB) | عند نقاط التحقق |
| `npm run lhci` | Lighthouse على `/` و`/cities/damascus` و`/correspondent/login` | قبل الإطلاق |

لا تُخفَّض أي عتبة في `CONSTRAINTS.md` لتمرير تغيير.

## النشر بـ Docker على خادم واحد

الصورة تُبنى **دون قاعدة بيانات**. عند الإقلاع تجري ثلاث خطوات:

1. تطبّق الـ migrations (`payload migrate`).
2. تشغّل الخادم.
3. تحدّث كل الصفحات العامة من القاعدة (`scripts/docker/start.mjs`).

لذلك يعمل البناء على أي منصة، حتى التي لا تصل إلى القاعدة أثناء البناء.

على الخادم، وفيه Docker مع Compose:

```bash
cp .env.example .env
```

املأ في `.env`:

- `PAYLOAD_SECRET`: سلسلة عشوائية طويلة، مثلاً `openssl rand -hex 32`.
- `NEXT_PUBLIC_SITE_URL`: رابط الموقع النهائي بلا `/` في آخره. يُثبَّت داخل الصورة، فأعد البناء إن غيّرته.
- `POSTGRES_PASSWORD`.
- حسابات الـ seed بكلمات مرور قوية.

ثم:

```bash
docker compose up -d --build
```

أول مرة فقط، أدخل المحتوى الأولي ثم حدّث الصفحات لتظهر فوراً:

```bash
docker compose exec app npm run seed
```

```bash
docker compose exec app npm run revalidate
```

- البيانات في volume `pgdata`، والصور في volume `media`، وتبقيان بعد إعادة البناء.
- الموقع على المنفذ `APP_PORT` (افتراضياً 3000). ضع أمامه خادماً عكسياً بشهادة HTTPS، مثل Caddy أو Nginx.
- كل `docker compose up -d --build` لاحق يطبّق أي migration جديدة تلقائياً عند الإقلاع.

> **حالة التحقق:** Docker غير مثبت على جهاز التطوير، لذلك لم تُبنَ الصورة فعلياً بعد. ما جُرّب حتى الآن، على Windows دون Docker:
> - مرحلة البناء نفسها على نسخة مطابقة لسياق Docker.
> - الإقلاع الكامل على قاعدة جديدة: migrate، ثم seed، ثم `start.mjs`. أظهر المحتوى الحقيقي بعد التحديث.
>
> يُختبر `Dockerfile` كاملاً عبر بناء منصة النشر بعد اختيارها.

## الاستضافة: Vercel Hobby وNeon وCloudflare R2 (قرار 2026-10-18)

الموقع مستضاف مجاناً على ثلاث خدمات:

- **Vercel (Hobby):** الموقع واللوحة، في منطقة `fra1`.
- **Neon (الخطة المجانية):** قاعدة البيانات.
  - الإنتاج: المشروع `syria-up-close-prod` في `aws-eu-central-1`، الفرع `production`.
  - التطوير والاختبار والمعاينة (Preview): المشروع القديم في أوهايو (Ohio). هذا يُبقي حصة الحوسبة المجانية للإنتاج وحده.
- **Cloudflare R2 (المجاني):** الصور.

كل نشر على `main` يذهب إلى الإنتاج، وأي فرع آخر يصبح Preview. أمر البناء (`npm run vercel-build` في `vercel.json`) ينفّذ:

1. المهاجرات على الاتصال المباشر.
2. بناء الصفحات من بيانات الفرع نفسه.

إن فشلت مهاجرة فشل النشر كله، ويبقى الإصدار السابق يعمل.

### إعداد Neon

1. **مشروع الإنتاج:** أنشئ مشروعاً باسم `syria-up-close-prod`.
   - المنطقة: AWS Frankfurt (`aws-eu-central-1`).
   - إصدار Postgres: 17، مثل التطوير المحلي.
2. **اسم الفرع:** إن كان الفرع الافتراضي باسم `main`، أعد تسميته إلى `production`.
3. **حجم الحوسبة:** في فرع `production` ← **Computes** ← **Edit**، اجعل الحجم الأدنى والأعلى 0.25 CU. التوقف بعد 5 دقائق خمول ثابت في الخطة المجانية.
4. **فرع المعاينة:** في مشروع أوهايو أنشئ فرعاً باسم `preview`، واجعل حجمه 0.25 CU أيضاً.
5. **لا تفعّل تكامل Neon مع Vercel:** إنه ينشئ متغيراته وفروعه بنفسه. نُدخل المتغيرات يدوياً كما في الجدول أدناه.

لكل فرع سلسلتا اتصال، من **Connect** مع اختيار الفرع:

- **مع** Connection pooling: هذه `DATABASE_URL`.
- **بدون** Connection pooling: هذه `DATABASE_URL_UNPOOLED`.

يجب أن تكون السلسلتان للفرع نفسه، وإلا رفض البناء أن يعمل.

### إعداد Cloudflare R2

1. **الـ buckets:** من **R2** أنشئ اثنين، مع Location hint: Eastern Europe:
   - `syria-up-close-media` للإنتاج.
   - `syria-up-close-media-preview` للمعاينة.
2. **مفتاح الوصول:** **R2** ← **Manage API tokens** ← **Create API token**.
   - الصلاحية: Object Read & Write.
   - النطاق: الـ bucketان فقط.
   - انسخ Access Key ID وSecret Access Key إلى Vercel مباشرة.
3. **معرّف الحساب:** Account ID يظهر في صفحة R2 الرئيسية، ومنه `S3_ENDPOINT`.
4. **CORS:** في كل bucket ← **Settings** ← **CORS policy**، لأن رفع اللوحة يذهب من المتصفح إلى الـ bucket مباشرة.
   - للإنتاج، ضع رابط الموقع الفعلي:

```json
[{ "AllowedOrigins": ["https://<اسم-المشروع>.vercel.app"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type", "if-none-match"], "MaxAgeSeconds": 3600 }]
```

   - لـ bucket المعاينة يكفي `"AllowedOrigins": ["*"]`، لأنه لا يحوي إلا صور اختبار.
5. **الوصول العام:** يبقى **معطّلاً** الآن، والصور تمرّ عبر Payload.
   - بعد شراء النطاق: فعّل Custom Domain للـ bucket، وضع رابطه في `R2_PUBLIC_URL` (Production)، ثم أعد النشر. لا تغيير في الكود.

### متغيرات Vercel

أدخلها من **Project** ← **Settings** ← **Environment Variables**. اختر لكل متغير بيئته (Production أو Preview)، وفعّل **Sensitive** للأسرار.

| المتغير | Production | Preview | من أين |
|---|---|---|---|
| `DATABASE_URL` | فرع `production` في `syria-up-close-prod`، **مع** pooling | فرع `preview` في مشروع أوهايو، **مع** pooling | Neon ← Connect |
| `DATABASE_URL_UNPOOLED` | الفرع نفسه، **بدون** pooling | الفرع نفسه، **بدون** pooling | Neon ← Connect |
| `PAYLOAD_SECRET` 🔒 | قيمة عشوائية جديدة: `openssl rand -hex 32` | قيمة مختلفة | تولّدها أنت |
| `NEXT_PUBLIC_SITE_URL` | `https://<اسم-المشروع>.vercel.app`، ثم النطاق لاحقاً | **لا تضعه**: المعاينة تستخدم عنوانها تلقائياً | Vercel ← Domains |
| `S3_BUCKET` | `syria-up-close-media` | `syria-up-close-media-preview` | R2 |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | نفسه | R2 ← Account ID |
| `S3_REGION` | `auto` | `auto` | ثابت |
| `S3_ACCESS_KEY_ID` 🔒 | من مفتاح R2 | نفسه | R2 ← API token |
| `S3_SECRET_ACCESS_KEY` 🔒 | من مفتاح R2 | نفسه | R2 ← API token |
| `R2_PUBLIC_URL` | فارغ الآن | فارغ | بعد شراء النطاق |

إعدادات المشروع في Vercel:

- **Node.js Version:** 24.x، من **Settings** ← **Build and Deployment**.
- **Framework:** Next.js.
- **أمر البناء والمنطقة:** يأتيان من `vercel.json`، فلا تغيّرهما.

**لا** توضع `SEED_*` في Vercel؛ لا تلزم إلا للـ seed من الجهاز.

### الـ seed على الإنتاج (مرة واحدة)

أنشئ على جهازك ملف `.env.production.local`، وهو مستثنى من git، وفيه:

- `DATABASE_URL` و`DATABASE_URL_UNPOOLED` لفرع `production`.
- `PAYLOAD_SECRET` نفسه الموجود في Vercel.
- `NEXT_PUBLIC_SITE_URL`.
- `SEED_*` بكلمات مرور قوية.

ثم:

```bash
npm run seed:remote -- .env.production.local
```

السكربت لا يطبع أي قيمة، ويرفض العمل إذا:

- نقص متغير؛
- أو كانت القاعدة محلية؛
- أو اختلف الفرعان.

بعد الـ seed يحدّث صفحات الموقع المنشور. القياس بعدها:

```bash
npm run lhci -- https://<اسم-المشروع>.vercel.app
```

### شرط الاستخدام غير التجاري

خطة Vercel Hobby للاستخدام الشخصي وغير التجاري فقط. المشروع غير تجاري:

- الشراكة مع أهلين غير مدفوعة.
- لا يحصل أي مشارك على عمولة أو دفعة أو إعلان.

**إن بدأ أي دخل أو عمولة أو إعلان مرتبط بالموقع: ترقية فورية إلى Vercel Pro أو الانتقال إلى Fly.io عبر Dockerfile.**

## إضافة مراسل وتعيين مدنه

1. ادخل اللوحة `/admin` بحساب مدير.
2. **المستخدمون** ← **إنشاء جديد**.
3. املأ الاسم والبريد وكلمة مرور مؤقتة.
4. اجعل **الدور** = «مراسل»، واختر مدينته أو مدنه في **المدن المعيّنة**، ثم احفظ.
5. أرسل له رابط `/correspondent/login` وكلمة المرور المؤقتة عبر قناة خاصة.

صفحة `/correspondent` مصمّمة للمراسل على الهاتف. يستطيع فتح `/admin` أيضاً، لكن صلاحياته هناك وهنا محصورة في مدنه:

- يحدّث «حال البلد».
- يؤكّد أن معلومة ما زالت صحيحة.
- يرسل تقرير موسم مع صور، فيذهب للمراجعة قبل النشر.

لإيقاف مراسل: احذف مدنه من **المدن المعيّنة**، أو احذف حسابه. كل تغيير يُسجَّل في سجل التدقيق.

## النسخ الاحتياطي

لم يُنجز بعد (المهمة T34). يُكتب `scripts/backup.sh` و`scripts/restore.sh` (`pg_dump` مع أرشيف الصور) بعد اختيار المنصة، لأن بعض المنصات تقدّم نسخاً احتياطية للـ volumes. لا يُوثَّق هنا أمر لم يُجرَّب فعلاً.

## الخط

IBM Plex Sans Arabic (رخصة OFL) مستضاف ذاتياً ومقصوص إلى:

- الحروف العربية.
- الأرقام العربية والهندية.
- علامات الترقيم العربية.
- اللاتينية الأساسية.

ملفات الخط في `public/fonts`، ونسخ صور المشاركة في `src/og/fonts`. لإعادة القصّ:

```bash
npm run fonts:subset
```

الاختبار `tests/unit/font-coverage.test.ts` يفشل إن استُخدم في النصوص حرف غير موجود في الخط المقصوص.

## قواعد المستودع

- لا push ولا remote دون موافقة صاحب المشروع.
- ملفات `docs/source/` مرجعية ولا تُعدَّل.
- لا تُحفظ أي أسرار في المستودع. `.env` مستثنى من git ومن صورة Docker.
