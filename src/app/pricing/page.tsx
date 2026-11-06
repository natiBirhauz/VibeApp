"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    nameHe: "חבילת בסיס",
    credits: 50,
    price: 19,
    description: "מתאים לבניית אפליקציה ראשונה ובדיקת היתכנות.",
    features: [
      "50 קרדיטים בחשבון (ללא תאריך תפוגה)",
      "עד 5 פרויקטים מלאים מאפס",
      "25 סבבי עריכה ושיפורים",
      "2 ייצואי קובץ APK חתום",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Professional",
    nameHe: "חבילה מקצועית",
    credits: 150,
    price: 49,
    description: "לעסקים ויוצרים הבונים מספר אפליקציות וגרסאות.",
    features: [
      "150 קרדיטים בחשבון (ללא תאריך תפוגה)",
      "עד 15 פרויקטים מלאים מאפס",
      "75 סבבי עריכה ושיפורים",
      "7 ייצואי קובץ APK חתום",
    ],
    highlighted: true,
    badge: "מומלץ",
  },
  {
    id: "studio",
    name: "Agency / Studio",
    nameHe: "חבילת סטודיו",
    credits: 400,
    price: 99,
    description: "לסוכנויות ומפתחים המייצרים אפליקציות עבור לקוחות.",
    features: [
      "400 קרדיטים בחשבון (ללא תאריך תפוגה)",
      "עד 40 פרויקטים מלאים מאפס",
      "200 סבבי עריכה ושיפורים",
      "20 ייצואי קובץ APK חתום",
    ],
    highlighted: false,
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
            "שער הסליקה טרם חובר במשתני הסביבה ב-Vercel (PayPlus / Grow / Morning)."
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
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground text-background rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="font-bold text-foreground">VibeApp</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            חזרה לסביבת העבודה ←
          </Link>
        </div>
      </header>

      <main className="flex-1 py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-rubik">
              תמחור שקוף לפי שימוש
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              תשלום חד-פעמי ללא מנוי חודשי מתחדש. הקרדיטים נשמרים בחשבונך ללא הגבלת זמן.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isLoading = loadingPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-card rounded-xl p-6 flex flex-col justify-between border transition-all ${
                    plan.highlighted
                      ? "border-primary shadow-md ring-1 ring-primary/20"
                      : "border-border shadow-sm"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {plan.name}
                      </p>
                      <h2 className="text-xl font-bold text-foreground mt-0.5">
                        {plan.nameHe}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1.5 pb-4 border-b border-border">
                      <span className="text-4xl font-extrabold text-foreground tracking-tight">
                        ₪{plan.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / תשלום חד-פעמי ({plan.credits} קרדיטים)
                      </span>
                    </div>

                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-sm text-foreground"
                        >
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`mt-8 w-full rounded-lg py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        רכישת חבילה
                        <ArrowLeft className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Credit Usage Breakdown Table */}
          <div className="bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-foreground mb-4">
              טבלת תעריפי פעולות במערכת
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3.5 rounded-lg bg-secondary/40 border border-border">
                <div className="font-bold text-foreground text-base">
                  10 קרדיטים
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  אפיון ובניית אפליקציה חדשה
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-secondary/40 border border-border">
                <div className="font-bold text-foreground text-base">
                  2 קרדיטים
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  עדכון עיצוב או הוספת פיצ&apos;ר
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-secondary/40 border border-border">
                <div className="font-bold text-foreground text-base">
                  20 קרדיטים
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  קומפילציית Cloud APK חתום
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
