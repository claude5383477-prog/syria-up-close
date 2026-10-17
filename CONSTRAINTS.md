# CONSTRAINTS — سوريا عن قرب

> عقد الجودة للمشروع. العتبات مأخوذة من `SPEC.md` (§7 و§9 و§10) المعتمدة في 2026-10-17.
> **لا يُخفَّض أي رقم هنا ولا يُضاف استثناء دون موافقة صاحب المشروع.** أي تغيير على هذا الملف يُذكر صراحة في رسالة الـ commit.

## الأوامر

| الأمر | ماذا يشغّل | متى | الزمن التقريبي |
| --- | --- | --- | --- |
| `npm run check:fast` | typecheck + lint + guard | أثناء التحرير وقبل كل commit | ثوانٍ |
| `npm run check:task` | `check:fast` + اختبارات الوحدة مع التغطية | نهاية كل مهمة | < 90 ثانية |
| `npm run check:full` | `check:task` + build + e2e | نقاط التحقق ونهاية كل مرحلة | دقائق |

## الحد الأدنى (Floor) — يفشل البناء دائماً

| القاعدة | الأمر | السبب |
| --- | --- | --- |
| TypeScript strict بلا أخطاء | `tsc --noEmit` | SPEC §6 |
| ESLint بلا أخطاء ولا تحذيرات، وتعليقات التعطيل غير المستخدمة خطأ | `eslint . --max-warnings 0` | SPEC §6 |
| لا `@ts-ignore` ولا `@ts-nocheck`، ولا `@ts-expect-error` بلا سبب مكتوب، ولا `eslint-disable` | `node scripts/check-guard.mjs` | SPEC §6: أي suppression يحتاج موافقة، فيُسجَّل في جدول الاستثناءات |
| لا اختبار متخطّى أو مركّز (`.skip`، و`.only`، و`.todo`، و`xit`) | `node scripts/check-guard.mjs` | SPEC §8: لا تعطيل اختبار لتمرير البناء |
| لا stubs بصيغة `throw new Error('not implemented')` | `node scripts/check-guard.mjs` | لا كود ناقص يُعدّ منجزاً |
| لا حذف لاختبار قائم دون ذكره وسببه في رسالة الـ commit | مراجعة الـ diff (`/constraints guard`) | SPEC §8 |

## العتبات المفروضة

| البُعد | العتبة | الأداة والأمر | المرحلة التي يُفعَّل فيها | السبب |
| --- | --- | --- | --- | --- |
| تغطية المنطق | ≥ 90% أسطر في `src/lib` و`src/access` و`src/hooks` | `vitest run --coverage` (thresholds في `vitest.config.ts`) | الآن | SPEC §7 |
| تغطية `freshness.ts` | 100% | نفس الأمر | T5 | منطق "آخر تحقق" قاعدة محتوى (ق3) |
| تباين الألوان | AA: 4.5:1 للنص العادي، و3:1 للكبير، في الوضعين | `tests/unit/contrast.test.ts` | T3 | SPEC §9 بند 7 |
| قواعد المحتوى ق4 (لا أسعار ولا أمان) | لا اسم حقل يطابق `price|cost|fee|safe|safety|secure` | `tests/unit/schema-rules.test.ts` | T17 | SPEC §1 |
| قواعد المحتوى ق5 (أهلين) | روابط أهلين فقط في `/cities/*` و`/inside` | `e2e/ahleen-placement.spec.ts` | T24 | SPEC §1 |
| إمكانية الوصول | لا مخالفات axe بدرجة serious أو critical | `@axe-core/playwright` داخل e2e | المرحلة C | SPEC §7 |
| Lighthouse | Performance ≥ 90 (هاتف)، Accessibility ≥ 95 على `/` و`/cities/damascus` و`/correspondent` | `@lhci/cli` (`npm run lhci`) | T32 | SPEC §9 بند 7 |
| حجم صفحة المراسل | ≤ 150KB مضغوطاً للتحميل الأول، بلا الخطوط | فحص آلي في e2e | T29 | SPEC §10 س-8 |

العتبات التي "تُفعَّل" في مرحلة لاحقة تحتاج صفحة أو بيانات غير موجودة بعد. تُضاف أداتها وأمرها في نفس المهمة، ولا تُعدّ مفروضة قبل ذلك.

## مُقاس فقط (لا يُفشل البناء)

| المقياس | القيمة اليوم | ملاحظات |
| --- | --- | --- |
| زمن `npm run build` | ~10 ثوانٍ (هيكل فارغ، 2026-10-17) | للمتابعة فقط |

## غير مفعّل بعد (يحتاج موافقة على تثبيت أداة)

| البُعد | الأداة المقترحة | السبب في عدم التفعيل الآن |
| --- | --- | --- |
| فحص الأسرار | `gitleaks detect --redact` | أداة خارجية غير مثبتة. SPEC §8 يتطلب موافقة لإضافة أدوات |
| ثغرات الحزم | `osv-scanner` أو `npm audit --omit=dev` | يُقترح تفعيله في `security-and-hardening` بعد نقطة تحقق B |

## الاستثناءات

| الملف/القاعدة | السبب | المالك | تاريخ الانتهاء |
| --- | --- | --- | --- |
| — | — | — | — |
