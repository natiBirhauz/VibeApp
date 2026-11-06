import Link from "next/link";
import { Smartphone, Zap, Download } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground font-rubik">
            VibeApp
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-2xl font-semibold text-foreground">
          תאר אפליקציה — קבל APK
        </p>
        <p className="text-muted-foreground text-lg leading-relaxed">
          תאר בעברית או אנגלית מה האפליקציה שלך עושה, תקבל תצוגה חיה בדפדפן,
          ותוריד קובץ APK ישירות לטלפון שלך.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">תיאור בעברית</h3>
            <p className="text-sm text-muted-foreground">
              AI מבין את הצרכים שלך ושואל שאלות חכמות
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">תצוגה חיה</h3>
            <p className="text-sm text-muted-foreground">
              רואה את האפליקציה רצה בדפדפן בזמן אמת
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">הורד APK</h3>
            <p className="text-sm text-muted-foreground">
              קובץ APK מוכן להתקנה ישירה על הטלפון
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl px-8 py-4 text-lg font-semibold"
          >
            <Zap className="w-5 h-5" />
            התחל עכשיו — חינם
          </Link>
          <p className="text-sm text-muted-foreground">
            15 קרדיטים חינם בהרשמה • אין צורך בכרטיס אשראי
          </p>
        </div>
      </div>
    </main>
  );
}
