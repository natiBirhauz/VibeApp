import Link from "next/link";
import {
  Smartphone,
  Terminal,
  Download,
  ArrowLeft,
  Layers,
  CheckCircle2,
  Cpu,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* ── Top Navigation Bar ── */}
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-foreground text-background rounded-lg flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground font-rubik">
              VibeApp
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border">
              Studio
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              תמחור
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              התחברות
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg px-4 py-2 font-semibold text-xs sm:text-sm shadow-sm"
            >
              סביבת פיתוח
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <main className="flex-1 flex flex-col justify-center">
        <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            מנוע React Native &amp; Android APK בענן
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground font-rubik leading-[1.15]">
            פיתוח וייצוא אפליקציות אנדרואיד
            <br />
            <span className="text-primary">ישירות מהדפדפן.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-muted-foreground text-base sm:text-lg leading-relaxed">
            סביבת עבודה מקצועית לבניית אפליקציות מובייל בעברית. הגדר את מבנה המסכים והנתונים, בדוק בסימולטור חי, וייצא קובץ התקנה חתום (APK) למכשיר.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all rounded-lg px-7 py-3.5 text-base font-semibold shadow-sm"
            >
              פתח פרויקט חדש
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:bg-secondary/60 transition-colors rounded-lg px-7 py-3.5 text-base font-medium"
            >
              צפה בחבילות קרדיטים
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              15 קרדיטים להתנסות בהרשמה
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              תמיכה מלאה ב-RTL ועברית
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              קובץ APK חתום ומוכן להתקנה
            </span>
          </div>
        </section>

        {/* ── Architecture / Features Grid ── */}
        <section className="border-t border-border bg-card/40 py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            <div className="bg-card border border-border rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center border border-border">
                <Cpu className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                אפיון וארכיטקטורה אוטומטית
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                המערכת מנתחת את הדרישות שלך, בונה מודל נתונים מקומי (AsyncStorage) ומייצרת קוד React Native תקני ונקי.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center border border-border">
                <Layers className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                סימולטור מובייל בזמן אמת
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                בדיקה מיידית של כל מסך ואינטראקציה בתוך הדפדפן, כולל ניהול היסטוריית גרסאות ושחזור בלחיצת כפתור.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-3 shadow-sm">
              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center border border-border">
                <Download className="w-5 h-5 text-foreground" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                קומפילציית Cloud APK
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                תהליך בנייה אוטומטי בענן המייצר קובץ אנדרואיד חתום לצד ברקוד QR לסריקה והתקנה ישירה במכשיר.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-6 px-4 sm:px-6 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span>VibeApp Studio — פלטפורמה לפיתוח אפליקציות מובייל</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:text-foreground">
              סביבת עבודה
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              תמחור
            </Link>
            <Link href="/login" className="hover:text-foreground">
              חשבון
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
