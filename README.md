# VibeApp — פלטפורמת Text-to-APK

> תאר אפליקציה אנדרואיד בעברית → קבל תצוגה חיה → הורד APK

## מבנה הפרויקט

```
VibeApp/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (RTL, fonts, theme)
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Main split-screen dashboard
│   │   ├── pricing/
│   │   │   └── page.tsx        # Credit packages
│   │   └── api/
│   │       ├── chat/route.ts          # AI streaming chat (Phase 1 + 2)
│   │       ├── heal/route.ts          # Auto-healing for broken code
│   │       ├── build-apk/route.ts     # Trigger GitHub Actions build
│   │       ├── build-status/route.ts  # Poll APK build status
│   │       ├── checkout/route.ts      # Payment checkout session
│   │       └── webhooks/
│   │           └── payment/route.ts   # Payment webhook handler
│   ├── components/
│   │   ├── PhoneSimulator.tsx   # Sandpack-based live preview
│   │   ├── VersionHistory.tsx   # Snapshot history panel
│   │   ├── TemplatesPanel.tsx   # Starter templates grid
│   │   ├── ThemeProvider.tsx    # next-themes wrapper
│   │   └── ui/                  # Shadcn UI components
│   └── lib/
│       ├── ai/prompts.ts        # Phase 1 + Phase 2 system prompts
│       ├── supabase/            # Supabase client + types
│       ├── templates/starters.ts # 5 Hebrew starter apps
│       ├── payments/provider.ts  # Payment gateway abstraction
│       └── utils.ts
├── templates/
│   └── expo-base/              # Base Expo project for APK building
│       ├── App.tsx
│       ├── app.json
│       └── package.json
├── supabase/
│   └── schema.sql              # Full DB schema + RLS + RPCs
└── .github/
    └── workflows/
        └── build-apk.yml       # GitHub Actions APK builder
```

## התקנה

```bash
# 1. Clone
git clone https://github.com/natiBirhauz/VibeApp.git
cd VibeApp

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.local.example .env.local
# Edit .env.local with your keys

# 4. Setup Supabase
# Run supabase/schema.sql in your Supabase SQL Editor

# 5. Run dev server
npm run dev
```

## משתני סביבה

ראה `.env.local.example` לרשימה המלאה.

## Credit System

| פעולה | עלות |
|--------|------|
| יצירת אפליקציה חדשה | 10 קרדיטים |
| עריכה / איטרציה | 2 קרדיטים |
| ייצוא APK | 20 קרדיטים |
| הרשמה חינמית | +15 קרדיטים |

## APK Build

ה-APK נבנה דרך GitHub Actions:
1. לחץ "ייצא APK" בדשבורד
2. API שולח `workflow_dispatch` עם הקוד ב-base64
3. GitHub Actions: checkout → inject App.tsx → prebuild → Gradle → sign → upload to Supabase Storage
4. הדשבורד מבצע polling כל 5 שניות
5. כשמוכן — כפתור "הורד APK" מופיע

### GitHub Secrets נדרשים

```
KEYSTORE_BASE64      # Base64-encoded .keystore file
KEYSTORE_ALIAS       # Key alias
KEYSTORE_PASSWORD    # Keystore password
KEY_PASSWORD         # Key password
```
