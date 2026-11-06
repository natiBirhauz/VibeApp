"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Smartphone, Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isSupabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project.supabase.co")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("נא למלא כתובת אימייל וסיסמה");
      return;
    }

    if (!isSupabaseReady) {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("החשבון נוצר בהצלחה. 15 קרדיטים נוספו ליתרתך.");
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("התחברת בהצלחה");
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה באימות הפרטים";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-foreground text-background rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </Link>
          <h1 className="text-xl font-bold text-foreground font-rubik">
            {isSignUp ? "פתיחת חשבון ב-VibeApp" : "התחברות ל-VibeApp"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isSignUp
              ? "הרשמה מהירה כוללת 15 קרדיטים להתנסות מיידית"
              : "הזן את פרטי הגישה שלך כדי להמשיך לסביבת העבודה"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              כתובת אימייל
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-input bg-background pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              סיסמה
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full rounded-lg border border-input bg-background pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 font-semibold text-sm gap-2 rounded-lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? "יצירת חשבון" : "כניסה לחשבון"}
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
          {isSignUp ? "כבר רשום במערכת?" : "משתמש חדש?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp((v) => !v)}
            className="text-primary font-semibold hover:underline mr-1"
          >
            {isSignUp ? "מעבר להתחברות" : "פתיחת חשבון חינם"}
          </button>
        </div>
      </div>
    </main>
  );
}
