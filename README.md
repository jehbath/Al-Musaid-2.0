# Al-Musaid 2.0

An Arabic AI banking assistant. Users can ask about their accounts, balances, transactions and spending, get general banking answers, find nearby branches and ATMs, and check currency exchange rates. It replies in the user's own Arabic dialect.

**Tech stack**

| Part | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | React, Vite, Leaflet (maps) |
| AI model | Google Gemini |
| Tools | MCP servers: core banking, currency, location |
| Knowledge base | RAG with `sentence-transformers` |
| Auth | JWT + Argon2 password hashing |
| Database | SQLite |

> [Arabic version below ↓](#المساعد-20)

---

## 1. Requirements

- **Windows 10 or 11**
- **Python 3.11 or newer**: <https://www.python.org/downloads/>
  > ⚠️ On the first install screen, tick **"Add python.exe to PATH"**.
- **Node.js (LTS)**: <https://nodejs.org/>
- **Internet connection**: about 1 GB is downloaded during installation, and the assistant needs the internet while running.

Check both are installed:

```bash
python --version
node --version
```

## Environment configuration (.env)

Before starting the installation, make sure that a file named .env exists in the root project folder (the same folder as main.py).

Open the .env file and add the following lines:

GEMINI_API_KEY= THE_KEY_WILL_BE_FOUND_IN_THE_PROJECT_EMAIL
JWT_SECRET_KEY=aa9f9cf1a4188ef42ec054ea27ec1a9525966fc4923a8907a61cc786c6c522c2

Save the file as .env (not .env.txt).

The frontend/.env file is also required and should remain in the frontend folder.

## 2. Installation (one time only)

Open **Command Prompt (CMD)** in the project folder: open the folder, click the address bar, type `cmd`, and press Enter. Use CMD, not PowerShell.

Run these commands in order, waiting for each to finish:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
npm --prefix frontend install
```

After the second command, `(.venv)` appears at the start of the line.

If `pip` fails with `Read timed out` (slow internet), run instead:

```bash
pip install --default-timeout=300 -r requirements.txt
```

## 3. Running (every time)

Open **two** Command Prompt windows in the project folder and keep both open.

**Window 1 — backend** (port 8000):

```bash
.venv\Scripts\activate
python -m uvicorn main:app --port 8000
```

Wait for `Application startup complete`.

**Window 2 — frontend** (port 5173):

```bash
npm --prefix frontend run dev
```

Then open **<http://localhost:5173>** in the browser. To stop, press `Ctrl + C` in each window.

> **First message:** the first message you send downloads a search model (about 500 MB), so the first reply can take several minutes. Later replies are fast. `Warning` / `UserWarning` lines about `HF_TOKEN` or symlinks are normal.

## 4. Demo accounts

| Email | Password |
|---|---|
| mohamed@example.com | `Mohamed@2026` |
| sara@example.com | `Demo@2026` |
| khalid@example.com | `Demo@2026` |

More accounts and expected results: [`database/DEMO_USERS.md`](database/DEMO_USERS.md). The assistant can also be used as a guest without logging in.

## 5. Troubleshooting

| Problem | Solution |
|---|---|
| `'python' is not recognized` | Python is not on PATH. Reinstall it with **"Add python.exe to PATH"** ticked. |
| `ModuleNotFoundError` when starting the backend | The environment is not activated. Run `.venv\Scripts\activate` and start again. |
| `GEMINI_API_KEY is not set` or `JWT_SECRET_KEY is not configured` | The `.env` file is missing from the project folder. |
| `[Errno 10048] ... ('127.0.0.1', 8000)` | The backend is already running in another window. Close it or press `Ctrl + C` there. |
| The page opens but the assistant does not reply | Make sure the backend window is still running without errors. |

---

<div dir="rtl">

# المساعد 2.0

مساعد بنكي ذكي باللغة العربية. يستطيع المستخدم السؤال عن حساباته وأرصدته ومعاملاته ومصروفاته، والحصول على إجابات عن الخدمات البنكية العامة، ومعرفة أقرب الفروع والصرافات، وأسعار صرف العملات. ويرد المساعد بلهجة المستخدم نفسها.

**التقنيات المستخدمة**

| الجزء | التقنية |
|---|---|
| الخادم | Python و FastAPI |
| الواجهة | React و Vite و Leaflet (الخرائط) |
| نموذج الذكاء الاصطناعي | Google Gemini |
| الأدوات | خوادم MCP: الخدمات البنكية، العملات، المواقع |
| قاعدة المعرفة | RAG باستخدام sentence-transformers |
| تسجيل الدخول | JWT مع تشفير كلمات المرور بـ Argon2 |
| قاعدة البيانات | SQLite |

## 1. المتطلبات

- **نظام Windows 10 أو 11**
- **Python إصدار 3.11 أو أحدث**: <https://www.python.org/downloads/>
  > ⚠️ في أول شاشة من التثبيت ضع علامة على **"Add python.exe to PATH"**.
- **Node.js (نسخة LTS)**: <https://nodejs.org/>
- **اتصال بالإنترنت**: يُحمَّل حوالي 1 جيجابايت أثناء التثبيت، والمساعد يحتاج الإنترنت أثناء العمل.

للتأكد من التثبيت:

</div>

```bash
python --version
node --version
```

<div dir="rtl">

## إعداد ملف البيئة (.env)
قبل البدء بالتثبيت، تأكد من وجود ملف باسم .env داخل المجلد الرئيسي للمشروع (بجانب ملف main.py).

افتح الملف وأضف إليه الأسطر التالية:
</div>
GEMINI_API_KEY= المفتاح موجود في البريد المرسل من قبل طلاب المشروع
JWT_SECRET_KEY=aa9f9cf1a4188ef42ec054ea27ec1a9525966fc4923a8907a61cc786c6c522c2
<div dir="rtl">

احفظ الملف باسم .env وليس .env.txt.

تأكد أيضاً من وجود ملف frontend/.env داخل مجلد الواجهة الأمامية.

## 2. التثبيت (مرة واحدة فقط)

افتح **موجه الأوامر (CMD)** داخل مجلد المشروع: افتح المجلد، اضغط على شريط العنوان أعلى النافذة، اكتب `cmd` واضغط Enter. استخدم CMD وليس PowerShell.

نفّذ الأوامر بالترتيب، وانتظر انتهاء كل أمر قبل الذي بعده:

</div>

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
npm --prefix frontend install
```

<div dir="rtl">

بعد الأمر الثاني يظهر `(.venv)` في بداية السطر.

إذا فشل `pip` برسالة `Read timed out` (إنترنت بطيء) استخدم بدلًا منه:

</div>

```bash
pip install --default-timeout=300 -r requirements.txt
```

<div dir="rtl">

## 3. التشغيل (في كل مرة)

افتح **نافذتي** موجه أوامر داخل مجلد المشروع واتركهما مفتوحتين.

**النافذة الأولى — الخادم** (المنفذ 8000):

</div>

```bash
.venv\Scripts\activate
python -m uvicorn main:app --port 8000
```

<div dir="rtl">

انتظر ظهور `Application startup complete`.

**النافذة الثانية — الواجهة** (المنفذ 5173):

</div>

```bash
npm --prefix frontend run dev
```

<div dir="rtl">

ثم افتح في المتصفح **<http://localhost:5173>**. للإيقاف اضغط `Ctrl + C` في كل نافذة.

> **أول رسالة:** أول رسالة ترسلها تحمّل نموذج البحث (حوالي 500 ميجابايت)، فقد يتأخر الرد الأول عدة دقائق، وبعدها تكون الردود سريعة. رسائل `Warning` أو `UserWarning` عن `HF_TOKEN` أو symlinks طبيعية ولا تؤثر.

## 4. حسابات للتجربة

| البريد الإلكتروني | كلمة المرور |
|---|---|
| mohamed@example.com | `Mohamed@2026` |
| sara@example.com | `Demo@2026` |
| khalid@example.com | `Demo@2026` |

بقية الحسابات والنتائج المتوقعة في: [`database/DEMO_USERS.md`](database/DEMO_USERS.md). ويمكن استخدام المساعد كزائر بدون تسجيل دخول.

## 5. حل المشاكل الشائعة

| المشكلة | الحل |
|---|---|
| `'python' is not recognized` | Python غير مضاف إلى PATH. أعد تثبيته مع تفعيل **"Add python.exe to PATH"**. |
| `ModuleNotFoundError` عند تشغيل الخادم | البيئة غير مفعّلة. نفّذ `.venv\Scripts\activate` ثم أعد التشغيل. |
| `GEMINI_API_KEY is not set` أو `JWT_SECRET_KEY is not configured` | ملف `.env` غير موجود في مجلد المشروع. |
| `[Errno 10048] ... ('127.0.0.1', 8000)` | الخادم يعمل مسبقًا في نافذة أخرى. أغلقها أو اضغط `Ctrl + C` فيها. |
| الصفحة تفتح لكن المساعد لا يرد | تأكد أن نافذة الخادم ما زالت تعمل بدون أخطاء. |

</div>
