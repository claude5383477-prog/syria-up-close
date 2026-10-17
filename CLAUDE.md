# سوريا عن قرب — تعليمات الوكلاء

- اقرأ `SPEC.md` (المواصفات المعتمدة) و`PLAN.md` (المهام) قبل أي عمل. قائمة التأشير في `tasks/todo.md`.
- اقرأ `CONSTRAINTS.md` والتزم به. لا تخفّض أي عتبة ولا تضف suppression أو اختباراً متخطّى لتمرير تغيير؛ إن تعذّر الالتزام فتوقّف واسأل.
- شغّل `npm run check:task` قبل كل commit، و`npm run check:full` عند نقاط التحقق.
- ملفات `docs/source/` مرجعية ولا تُعدَّل.
- لا push ولا remote دون موافقة صاحب المشروع.
- أي تغيير على نموذج البيانات يحتاج migration: `npm run migrate:create -- <name>` ثم commit لملفات `src/migrations`. لا يوجد push تلقائي للمخطط.
- قاعدة التطوير المحلية: `npm run db` (embedded-postgres)، ثم `npm run migrate` و`npm run seed`.
