import Link from "next/link";
import { Check, Zap, ArrowRight } from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    nameHe: "מתחיל",
    credits: 50,
    price: 19,
    features: ["50 קרדיטים", "5 יצירות אפליקציה", "25 עריכות AI", "2 ייצואי APK"],
    color: "border-border",
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    nameHe: "מקצועי",
    credits: 150,
    price: 49,
    features: ["150 קרדיטים", "15 יצירות אפליקציה", "75 עריכות AI", "7 ייצואי APK"],
    color: "border-primary",
    badge: "פופולרי",
  },
  {
    id: "studio",
    name: "Studio",
    nameHe: "סטודיו",
    credits: 400,
    price: 99,
    features: ["400 קרדיטים", "40 יצירות אפליקציה", "200 עריכות AI", "20 ייצואי APK"],
    color: "border-border",
    badge: null,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background py-16 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">רכישת קרדיטים</h1>
          <p className="text-muted-foreground">
            קרדיטים לא פגים. שלם פעם אחת, השתמש מתי שרוצה.
          </p>
        </div>

        {/* Credit costs */}
        <div className="bg-muted/40 border border-border rounded-2xl p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-2">עלות קרדיטים:</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded-xl p-3">
              <p className="text-base font-bold text-foreground">10</p>
              <p>יצירת אפליקציה חדשה</p>
            </div>
            <div className="bg-background rounded-xl p-3">
              <p className="text-base font-bold text-foreground">2</p>
              <p>עריכה / איטרציה</p>
            </div>
            <div className="bg-background rounded-xl p-3">
              <p className="text-base font-bold text-foreground">20</p>
              <p>ייצוא APK</p>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-card border-2 ${plan.color} rounded-2xl p-6 flex flex-col gap-4`}
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
                <span className="text-muted-foreground mb-1">/ חבילה</span>
              </div>

              <div className="flex items-center gap-2 bg-primary/10 rounded-xl p-3">
                <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-bold text-primary">{plan.credits} קרדיטים</span>
              </div>

              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button className="mt-auto w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-xl py-3 font-semibold flex items-center justify-center gap-2">
                רכוש עכשיו
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
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
