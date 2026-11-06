"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Send,
  Loader2,
  Download,
  Smartphone,
  Moon,
  Sun,
  History,
  LayoutTemplate,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  QrCode,
  CreditCard,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import VersionHistory from "@/components/VersionHistory";
import TemplatesPanel from "@/components/TemplatesPanel";
import { stripMarkdown } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/client";
import type { VersionSnapshot } from "@/lib/supabase/types";
import type { StarterTemplate } from "@/lib/templates/starters";

// Dynamically import PhoneSimulator (heavy Sandpack bundle)
const PhoneSimulator = dynamic(() => import("@/components/PhoneSimulator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "architect" | "coder" | "done";
type BuildStatus = "idle" | "building" | "ready" | "failed";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_PROJECT_ID = "00000000-0000-0000-0000-000000000002";

export default function DashboardPage() {
  const { theme, setTheme } = useTheme();

  // Auth & User state
  const [userId, setUserId] = useState<string>(DEFAULT_USER_ID);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>(DEFAULT_PROJECT_ID);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "ברוך הבא ל-VibeApp Studio.\nתאר את האפליקציה שתרצה לפתח או בחר תבנית מוכנה מסרגל הכלים העליון.",
    },
  ]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userDescription, setUserDescription] = useState("");

  // App code & versions
  const [currentCode, setCurrentCode] = useState("");
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);

  // Build state
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [showApkModal, setShowApkModal] = useState(false);

  // Credits
  const [credits, setCredits] = useState(15);

  // UI panels
  const [showVersions, setShowVersions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load user & credits from Supabase or localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vibeapp_credits");
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) setCredits(parsed);
    }

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project.supabase.co")
    );

    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("id", user.id)
        .maybeSingle();

      const profile = profileData as { credits_balance: number } | null;
      if (profile && typeof profile.credits_balance === "number") {
        setCredits(profile.credits_balance);
      }

      const { data: projectData } = await supabase
        .from("projects")
        .select("id, current_code")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingProject = projectData as { id: string; current_code: string | null } | null;
      if (existingProject) {
        setProjectId(existingProject.id);
        if (existingProject.current_code) {
          setCurrentCode(existingProject.current_code);
          setPhase("done");
        }
      }
    });
  }, []);

  const updateCredits = useCallback((nextBalance: number) => {
    setCredits(nextBalance);
    localStorage.setItem("vibeapp_credits", String(nextBalance));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build status polling
  useEffect(() => {
    if (buildStatus !== "building" || !buildId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/build-status?buildId=${buildId}&projectId=${projectId}`
        );
        const data = await res.json();

        if (data.status === "completed" && data.apkUrl) {
          setApkUrl(data.apkUrl);
          setBuildStatus("ready");
          setShowApkModal(true);
          clearInterval(pollingRef.current!);
          toast.success("בניית ה-APK הושלמה בהצלחה");
        } else if (data.status === "failed") {
          setBuildStatus("failed");
          clearInterval(pollingRef.current!);
          toast.error("הבנייה נכשלה. נסה שוב.");
        }
      } catch {
        // silent
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [buildStatus, buildId, projectId]);

  // ── Save snapshot ────────────────────────────────────────────────────────────

  const saveSnapshot = useCallback(
    (code: string, description: string) => {
      const newVersion = snapshots.length + 1;
      const snap: VersionSnapshot = {
        version: newVersion,
        code,
        description,
        timestamp: new Date().toISOString(),
      };
      setSnapshots((prev) => [...prev, snap]);
      setCurrentVersion(newVersion);
    },
    [snapshots.length]
  );

  // ── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    let nextPhase: Phase;
    let expectedCost = 0;

    if (phase === "idle") {
      nextPhase = "architect";
      expectedCost = 10;
    } else if (phase === "architect") {
      nextPhase = "coder";
      expectedCost = 0;
    } else {
      nextPhase = "coder";
      expectedCost = 2;
    }

    if (credits < expectedCost) {
      toast.error(
        `יתרת הקרדיטים אינה מספיקה לפעולה זו (נדרשים ${expectedCost} קרדיטים).`
      );
      return;
    }

    setInput("");
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);

    if (phase === "idle") {
      setUserDescription(trimmed);
    }

    const previousPhase = phase;
    setPhase(nextPhase);
    setIsStreaming(true);

    const assistantMsgId = Date.now().toString() + "_ai";
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          phase: nextPhase === "coder" ? "coder" : "architect",
          userId,
          projectId,
          userDescription: phase === "idle" ? trimmed : userDescription,
          answers: trimmed,
          currentCode: currentCode || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "שגיאה בביצוע הבקשה");
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        setPhase(previousPhase);
        return;
      }

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const parsed = JSON.parse(json);

            if (parsed.delta) {
              fullText += parsed.delta;
              const displayContent =
                nextPhase === "coder"
                  ? "בונה את רכיבי האפליקציה ומעדכן את הסימולטור..."
                  : fullText;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: displayContent }
                    : m
                )
              );
            }

            if (parsed.done) {
              if (parsed.newBalance !== null && parsed.newBalance !== undefined) {
                updateCredits(parsed.newBalance);
              } else if (expectedCost > 0) {
                updateCredits(Math.max(0, credits - expectedCost));
              }

              if (nextPhase === "coder") {
                const code = stripMarkdown(fullText);
                if (code.includes("export default")) {
                  setCurrentCode(code);
                  saveSnapshot(code, trimmed.slice(0, 40));
                  setPhase("done");
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content:
                              "הגרסה החדשה מוכנה ומוצגת בסימולטור.\nניתן להמשיך לעדכן את האפליקציה או לייצא קובץ APK למכשיר.",
                          }
                        : m
                    )
                  );
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: fullText } : m
                    )
                  );
                }
              } else {
                setPhase("architect");
              }
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch {
      toast.error("שגיאה בשליחת ההודעה");
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      setPhase(previousPhase);
    } finally {
      setIsStreaming(false);
    }
  }, [
    input,
    isStreaming,
    phase,
    credits,
    userId,
    projectId,
    userDescription,
    currentCode,
    saveSnapshot,
    updateCredits,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Load template ─────────────────────────────────────────────────────────────

  const loadTemplate = useCallback(
    (tmpl: StarterTemplate) => {
      setCurrentCode(tmpl.code);
      saveSnapshot(tmpl.code, tmpl.nameHe);
      setUserDescription(tmpl.nameHe + " - " + tmpl.description);
      setPhase("done");
      setShowTemplates(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `התבנית "${tmpl.nameHe}" נטענה לסימולטור.\nניתן לבקש שינויים והתאמות בצ'אט או לייצא קובץ APK.`,
        },
      ]);
    },
    [saveSnapshot]
  );

  // ── Restore snapshot ──────────────────────────────────────────────────────────

  const restoreSnapshot = useCallback((snap: VersionSnapshot) => {
    setCurrentCode(snap.code);
    setCurrentVersion(snap.version);
    toast.success(`שוחזרה גרסה ${snap.version}`);
  }, []);

  // ── Auto-heal ─────────────────────────────────────────────────────────────────

  const handleSimulatorError = useCallback(
    async (error: string, code: string) => {
      if (isHealing) return;
      setIsHealing(true);
      try {
        const res = await fetch("/api/heal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brokenCode: code,
            errorMessage: error,
            userId,
          }),
        });
        if (res.ok) {
          const { fixedCode } = await res.json();
          setCurrentCode(fixedCode);
          toast.info("שגיאת קומפילציה תוקנה אוטומטית");
        }
      } catch {
        toast.error("לא ניתן לתקן אוטומטית");
      } finally {
        setIsHealing(false);
      }
    },
    [isHealing, userId]
  );

  // ── Trigger APK build ─────────────────────────────────────────────────────────

  const buildApk = useCallback(async () => {
    if (!currentCode || buildStatus === "building") return;
    if (credits < 20) {
      toast.error("נדרשים לפחות 20 קרדיטים לייצוא קובץ APK.");
      return;
    }

    setBuildStatus("building");
    setApkUrl(null);
    try {
      const res = await fetch("/api/build-apk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          userId,
          appName: "VibeApp",
          appCode: currentCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בהפעלת הבנייה");
        setBuildStatus("idle");
        return;
      }
      if (data.newBalance !== null && data.newBalance !== undefined) {
        updateCredits(data.newBalance);
      } else {
        updateCredits(Math.max(0, credits - 20));
      }
      setBuildId(data.buildId);
      toast.info("תהליך בניית ה-APK החל (~75 שניות)");
    } catch {
      toast.error("שגיאת רשת מול שרת הבנייה");
      setBuildStatus("idle");
    }
  }, [currentCode, buildStatus, credits, projectId, userId, updateCredits]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" dir="rtl">
      {/* ── Top Studio Header ── */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card flex-shrink-0">
        {/* Right side: Brand */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-foreground text-background rounded-md flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="font-bold text-foreground text-base tracking-tight">
              VibeApp
            </span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border hidden sm:inline-block">
              Studio
            </span>
          </Link>
        </div>

        {/* Left side: Balance, Account & Theme */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors text-xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">יתרה:</span>
            <span className="font-bold text-foreground">{credits}</span>
            <span className="text-primary font-semibold mr-1">+ טעינה</span>
          </Link>

          <Link
            href="/login"
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title={userEmail ?? "התחברות לחשבון"}
          >
            <User className="w-4 h-4" />
          </Link>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="החלף ערכת נושא"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* ── Main Split Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Column: Device Preview Canvas ── */}
        <div
          className="hidden lg:flex flex-col items-center justify-start gap-4 p-6 border-l border-border studio-grid overflow-y-auto flex-shrink-0"
          style={{ width: 440 }}
        >
          <PhoneSimulator
            code={currentCode}
            onError={handleSimulatorError}
            isHealing={isHealing}
          />

          {/* Build Controls */}
          {currentCode && (
            <div className="flex flex-col items-center gap-2 w-full max-w-[375px]">
              {buildStatus === "idle" && (
                <Button
                  onClick={buildApk}
                  className="w-full justify-between px-4 h-11 font-semibold shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    בנה וייצא קובץ APK
                  </span>
                  <span className="text-xs opacity-85 font-normal">
                    20 קרדיטים
                  </span>
                </Button>
              )}

              {buildStatus === "building" && (
                <div className="w-full bg-card border border-border rounded-xl p-4 text-center space-y-2 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    מקמפל קובץ אנדרואיד בענן...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    זמן משוער: כ-75 שניות
                  </p>
                </div>
              )}

              {buildStatus === "ready" && apkUrl && (
                <Button
                  onClick={() => setShowApkModal(true)}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-semibold"
                >
                  <QrCode className="w-4 h-4" />
                  הורד APK / סרוק ברקוד
                </Button>
              )}

              {buildStatus === "failed" && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-xs text-destructive text-center">
                    תהליך הבנייה נכשל
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setBuildStatus("idle")}
                    className="w-full gap-2 h-10"
                  >
                    <RotateCcw className="w-4 h-4" />
                    נסה שוב
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Specification & Editor Chat ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
          {/* Sub-header Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
            <Button
              variant={showTemplates ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs h-8 font-medium"
              onClick={() => {
                setShowTemplates((v) => !v);
                setShowVersions(false);
              }}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              תבניות מוכנות
            </Button>

            {snapshots.length > 0 && (
              <Button
                variant={showVersions ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs h-8 font-medium"
                onClick={() => {
                  setShowVersions((v) => !v);
                  setShowTemplates(false);
                }}
              >
                <History className="w-3.5 h-3.5" />
                היסטוריית גרסאות ({snapshots.length})
                {showVersions ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>

          {/* Expandable Drawers */}
          {showTemplates && (
            <div className="border-b border-border bg-card">
              <TemplatesPanel onSelect={loadTemplate} />
            </div>
          )}
          {showVersions && (
            <div className="border-b border-border bg-card">
              <VersionHistory
                snapshots={snapshots}
                currentVersion={currentVersion}
                onRestore={restoreSnapshot}
              />
            </div>
          )}

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words border ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border shadow-sm"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" &&
                    msg.id !== "welcome" &&
                    msg.content === "" && (
                      <span className="inline-flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                      </span>
                    )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile Action Bar */}
          <div className="lg:hidden flex flex-col items-center gap-2 p-3 border-t border-border bg-card/60">
            {currentCode ? (
              <div className="w-full flex flex-col gap-2">
                {buildStatus === "idle" && (
                  <Button onClick={buildApk} className="w-full gap-2" size="sm">
                    <Download className="w-4 h-4" />
                    ייצא APK (20 קרדיטים)
                  </Button>
                )}
                {buildStatus === "building" && (
                  <div className="flex items-center justify-center gap-2 p-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      מקמפל APK... ~75 שניות
                    </span>
                  </div>
                )}
                {buildStatus === "ready" && apkUrl && (
                  <Button
                    onClick={() => setShowApkModal(true)}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    <QrCode className="w-4 h-4" />
                    הורד APK / QR
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                הזן מפרט אפליקציה או בחר תבנית מוכנה
              </p>
            )}
          </div>

          {/* Prompt Composer */}
          <div className="p-3 sm:p-4 border-t border-border bg-card flex-shrink-0">
            <div className="max-w-4xl mx-auto flex gap-2 items-center">
              <Button
                onClick={sendMessage}
                disabled={isStreaming || !input.trim()}
                size="icon"
                className="flex-shrink-0 h-10 w-10 rounded-lg"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1500}
                placeholder={
                  phase === "idle"
                    ? "תאר את האפליקציה שברצונך לפתח..."
                    : phase === "architect"
                    ? "הזן את תשובותיך לשאלות האפיון..."
                    : "תאר שינוי או פיצ'ר נוסף לעדכון באפליקציה..."
                }
                className="resize-none min-h-0 h-10 py-2.5 flex-1 rounded-lg"
                disabled={isStreaming}
                rows={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── QR & APK Download Modal ── */}
      <Dialog open={showApkModal} onOpenChange={setShowApkModal}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              קובץ ההתקנה (APK) מוכן
            </DialogTitle>
            <DialogDescription>
              סרוק את קוד ה-QR באמצעות מצלמת המכשיר או הורד את הקובץ ישירות.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 py-3">
            {apkUrl && (
              <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                <QRCodeSVG value={apkUrl} size={176} />
              </div>
            )}

            {apkUrl && (
              <a
                href={apkUrl}
                download="vibeapp-release.apk"
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-2.5 px-4 font-semibold text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                הורדת קובץ APK
              </a>
            )}

            <div className="w-full bg-secondary/50 border border-border rounded-lg p-3.5 text-xs space-y-1.5 text-foreground">
              <p className="font-semibold">הנחיות התקנה באנדרואיד:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>הורד את הקובץ למכשיר הנייד ופתח אותו.</li>
                <li>אם מופיעה הודעת אבטחה, אשר &quot;התקנה ממקור זה&quot;.</li>
                <li>לחץ על &quot;התקן&quot; להשלמת ההתקנה.</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
