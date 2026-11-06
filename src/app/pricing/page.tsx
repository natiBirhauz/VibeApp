"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Zap, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    nameHe: "מתחיל",
    credits: 50,
    price: 19,
    features: [
      "50 קרדיטים (ללא תוקף)",
      "5 יצירות אפליקציה מלאות",
      "25 עריכות ושיפורי AI",
      "2 ייצואי APK חתומים לאנדרואיד",
    ],
    color: "border-border",
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    nameHe: "מקצועי",
    credits: 150,
    price: 49,
    features: [
      "150 קרדיטים (חיסכון של 15%)",
      "15 יצירות אפליקציה מלאות",
      "75 עריכות ושיפורי AI",
      "7 ייצואי APK חתומים לאנדרואיד",
    ],
    color: "border-primary",
    badge: "הכי משתלם",
  },
  {
    id: "studio",
    name: "Studio",
    nameHe: "סטודיו",
    credits: 400,
    price: 99,
    features: [
      "400 קרדיטים (חיסכון של 35%)",
      "40 יצירות אפליקציה מלאות",
      "200 עריכות ושיפורי AI",
      "20 ייצואי APK חתומים לאנדרואיד",
    ],
    color: "border-border",
    badge: null,
  },
];

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: planId,
          userId: MOCK_USER_ID,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(
          data.error ??
            "שער התשלום טרם הוגדר בקובץ הסביבה (.env.local). הגדר מפתח Stripe/PayPlus להפעלת סליקה."
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("שגיאת תקשורת מול שרת התשלומים");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-background py-16 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">רכישת קרדיטים</h1>
          <p className="text-muted-foreground">
            קרדיטים לא פגים לעולם. שלם פעם אחת (ללא מנוי מתחדש), השתמש מתי שתרצה.
          </p>
        </div>

        {/* Fair-Charge Guarantee Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 text-sm">
          <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground">
              הגנת קרדיטים מלאה (Fair-Use Guarantee)
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              תיקוני באגים אוטומטיים (Auto-Heal) הם בחינם לגמרי. אם בנייה או קריאת AI נכשלת — הקרדיטים מוחזרים לחשבונך אוטומטית.
            </p>
          </div>
        </div>

        {/* Credit costs */}
        <div className="bg-muted/40 border border-border rounded-2xl p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-2">מחירון פעולות שקוף:</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded-xl p-3">
              <p className="text-base font-bold text-foreground">10</p>
              <p>יצירת אפליקציה חדשה (כולל אפיון + קוד)</p>
            </div>
            <div className="bg-background rounded-xl p-3">
              <p className="text-base font-bold text-foreground">2</p>
              <p>עריכה / הוספת פיצ&apos;ר</p>
            </div>
            <div className="bg-background rounded-xl p-3">
              <p className="text-base font-bold text-foreground">20</p>
              <p>ייצוא קובץ APK חתום</p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isLoading = loadingPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative bg-card border-2 ${plan.color} rounded-2xl p-6 flex flex-col gap-4 shadow-sm`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 right-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">{plan.name}</p>
                  <h2 className="text-2xl font-bold text-foreground">
                    {plan.nameHe}
                  </h2>
                </div>

                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-foreground">
                    ₪{plan.price}
                  </span>
                  <span className="text-muted-foreground mb-1">/ חד פעמי</span>
                </div>

                <div className="flex items-center gap-2 bg-primary/10 rounded-xl p-3">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-bold text-primary">
                    {plan.credits} קרדיטים
                  </span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className="mt-auto w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      רכוש עכשיו
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← חזור לדשבורד
          </Link>
        </div>
      </div>
    </main>
  );
}
