# Alpha Vault - محفظة عملة AlphaCoin البرمجية الترفيهية 🪐

موقع ويب متكامل لإدارة وتحويل عملات **AlphaCoin** الترفيهية وحماية البيانات، وتكريم تجربة الربط البرمجي السلس للشرائح والمطورين وبوتات التليجرام.

---

## 🚀 دليل النشر على GitHub والربط مع Vercel

### أولاً: النشر على مستودع GitHub الخاص بك
لتتمكن من رفع جميع هذه الملفات بنجاح إلى مستودعك الجديد: `https://github.com/aialskrani-oss/Alpha-Vault.git`، يرجى تشغيل الأوامر التالية في محطة التحكم (Terminal) المحلية الخاصة بك:

```bash
# 1. تهيئة المستودع المحلي
git init

# 2. ربط المستودع بمستودع GitHub البعيد
git remote add origin https://github.com/aialskrani-oss/Alpha-Vault.git

# 3. إضافة جميع الملفات البرمجية المهيأة
git add .

# 4. تدوين النسخة الحالية
git commit -m "feat: Alpha Vault full-stack release for Vercel"

# 5. تحديد الفرع الرئيسي ودفع الكود
git branch -M main
git push -u origin main
```

---

### ثانياً: النشر على منصة Vercel للوظائف السحابية الخالية من المخاطر (Serverless)

تم إعداد المشروع وهيكلته بشكل تلقائي يدعم منصة **Vercel** من خلال ملف الاستجابة الذاتي ومداخل التوجيه `vercel.json` والملف البرمجي السحابي الموحد لملفات الـ API تحت المسار `api/index.ts`.

#### خطوات الربط المباشرة مع Vercel:
1. انتقل إلى لوحة تحكم منصة Vercel عبر: [vercel.com](https://vercel.com/) وسجل الدخول بحساب GitHub الخاص بك.
2. انقر على **"Add New"** ثم اختر **"Project"**.
3. قم باستيراد (Import) المشروع من مستودعك الخاص: `aialskrani-oss/Alpha-Vault`.
4. في نافذة الإعدادات الفرعية للمشروع، ستتم كتابة أوامر الإنشاء (Vite build) تلقائياً. كل ما عليك فعله هو إدخال المتغيرات البيئية السرية الخاصة بك (Environment Variables) في الحقل المخصص.

#### المتغيرات البيئية المطلوبة للتفعيل في Vercel:
يرجى إضافة المتغيرات التالية لضمان عمل قاعدة بيانات Firebase Firestore والمصادقة بكفاءة عالية:

| اسم المتغير في Vercel | شرح المتغير وقيمته |
| :--- | :--- |
| `FIREBASE_PROJECT_ID` | معرّف مشروع Firebase السحابي الخاص بك (يمكنك نسخه من ملف `firebase-applet-config.json` بالسطر `"projectId"`) |
| `FIREBASE_DATABASE_ID` | اسم معرّف قاعدة البيانات لـ Firestore الخاصة بك (من السطر `"firestoreDatabaseId"`) |
| `FIREBASE_SERVICE_ACCOUNT` | (اختياري / موصى به للوظائف الخلفية): ملف مفاتيح حساب الخدمة السحابي الخاص بك كاملاً كبنية JSON مشفرة، لتجاوز قيود المستندات وتعديل رصيد اللاعبين بسلاسة تامة. |

---

## ⚙️ المواصفات التقنية والنقاط البرمجية المعتمدة (APIs)

### 1. جلب رصيد المستخدم (Get User Balance)
*   **الطريقة:** `GET`
*   **المسار:** `/api/get-balance`
*   **الرؤوس المطلوبة (Headers):** `X-API-Key: YOUR_API_KEY`
*   **نماذج الاستدعاء البرمجي:**
    *   **عنوان URL مباشر ومختصر:**
        ```bash
        curl -X GET "https://alpha-vault-yourdomain.vercel.app/api/get-balance?api_key=AV-xxxxxxxxx"
        ```
    *   **مصفوفات ريجكس الاستجابة الناجحة:**
        ```json
        {
          "owner": "علي العسيري",
          "email": "ali00007gg@gmail.com",
          "alphaCoin": 100
        }
        ```

### 2. خصم وسحب الأرصدة الترفيهية (Deduct Token Balance)
*   **الطريقة:** `POST`
*   **المسار:** `/api/deduct`
*   **الرؤوس المطلوبة:** `Content-Type: application/json`
*   **جسم الطلب (JSON Request Body):**
    ```json
    {
      "api_key": "AV-your_secret_api_key_here",
      "amount": 15,
      "reason": "شراء سيف الأركان في عالم الألفا ⚔️"
    }
    ```
*   **تنسيق مصفوفة الرد الناجحة:**
    ```json
    {
      "success": true,
      "message": "Tokens deducted successfully",
      "deducted": 15,
      "newBalance": 85,
      "transactionId": "TX129847192847"
    }
    ```

---

🎉 **مبارك لك! موقعك ومحفظتك متطابقة بالكامل ومتوافقة مع معايير الرفع إلى GitHub والتشغيل الفوري والسريع على خوادم Vercel السحابية.**
