# GEO-AUDIT — ما تراه الزواحف قبل JavaScript

> `npm run geo:audit -- http://localhost:3100` · 2026-10-31 · 7 صفحات × 6 زواحف

## الخلاصة

- طلبات لم ترجع 200 أو رجعت صفحة تحدٍّ/حجب: **0** من 42
- مشكلات في المحتوى الأولي: **0**

## الوصول لكل زاحف

| الصفحة | Googlebot | Bingbot | OAI-SearchBot | GPTBot | ChatGPT-User | PerplexityBot |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | 200 | 200 | 200 | 200 | 200 |
| `/cities/damascus` | 200 | 200 | 200 | 200 | 200 | 200 |
| `/cities/aleppo` | 200 | 200 | 200 | 200 | 200 | 200 |
| `/cities/homs` | 200 | 200 | 200 | 200 | 200 | 200 |
| `/en/cities/damascus` | 200 | 200 | 200 | 200 | 200 | 200 |
| `/inside/bloudan` | 200 | 200 | 200 | 200 | 200 | 200 |
| `/seasons/hama-2026-10-21` | 200 | 200 | 200 | 200 | 200 | 200 |

## المحتوى في HTML الأولي

| الصفحة | H1 | باختصار | قبل الخريطة | المصادر | `<time>` | تواريخ في النص (منها بعد تسمية) | FAQ ظاهر/schema | نصوص بعد JS فقط | الكلمات | JSON-LD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | ✅ | — | — | — | 3 | 0 (0) | 0/0 | 0 | 558 | WebSite, Organization |
| `/cities/damascus` | ✅ | ✅ | ✅ | ✅ | 6 | 3 (0) | 6/6 | 0 | 3201 | WebPage, TouristDestination, FAQPage, BreadcrumbList |
| `/cities/aleppo` | ✅ | ✅ | ✅ | ✅ | 6 | 2 (0) | 6/6 | 0 | 2179 | WebPage, TouristDestination, FAQPage, BreadcrumbList |
| `/cities/homs` | ✅ | ✅ | ✅ | ✅ | 6 | 2 (0) | 5/5 | 0 | 1923 | WebPage, TouristDestination, FAQPage, BreadcrumbList |
| `/en/cities/damascus` | ✅ | — | — | — | 5 | 3 (0) | 0/0 | 0 | 2704 | WebPage, TouristDestination, BreadcrumbList |
| `/inside/bloudan` | ✅ | ✅ | ✅ | ✅ | 1 | 2 (0) | 5/5 | 0 | 985 | WebPage, TouristDestination, FAQPage, BreadcrumbList |
| `/seasons/hama-2026-10-21` | ✅ | — | — | — | 1 | 0 (0) | 0/0 | 0 | 161 | Article, BreadcrumbList |

## المشكلات

لا شيء.

## نصوص لا تظهر إلا بعد JavaScript (عيّنة لكل صفحة)

