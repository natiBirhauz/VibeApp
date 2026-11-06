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
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  QrCode,
  ShieldCheck,
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

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_PROJECT_ID = "00000000-0000-0000-0000-000000000002";

export default function DashboardPage() {
  const { theme, setTheme } = useTheme();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "שלום! אני כאן לעזור לך לבנות אפליקציה לאנדרואיד. 📱\n\nתאר לי מה האפליקציה שלך עושה — או בחר תבנית מוכנה בחינם מלמעלה — ונצא לדרך!",
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

  // Credits (persisted in localStorage when running without DB)
  const [credits, setCredits] = useState(15);

  // UI panels
  const [showVersions, setShowVersions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved credits on mount
  useEffect(() => {
    const saved = localStorage.getItem("vibeapp_credits");
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) setCredits(parsed);
    }
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
          `/api/build-status?buildId=${buildId}&projectId=${MOCK_PROJECT_ID}`
        );
        const data = await res.json();

        if (data.status === "completed" && data.apkUrl) {
          setApkUrl(data.apkUrl);
          setBuildStatus("ready");
          setShowApkModal(true);
          clearInterval(pollingRef.current!);
          toast.success("האפליקציה מוכנה להורדה! 🎉");
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
  }, [buildStatus, buildId]);

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

    // Determine phase and credit cost before sending
    let nextPhase: Phase;
    let expectedCost = 0;

    if (phase === "idle") {
      nextPhase = "architect";
      expectedCost = 10; // Initial app creation (covers questions + first code build)
    } else if (phase === "architect") {
      nextPhase = "coder";
      expectedCost = 0; // Already paid in phase 1!
    } else {
      nextPhase = "coder";
      expectedCost = 2; // Iteration on existing code
    }

    if (credits < expectedCost) {
      toast.error(
        `אין מספיק קרדיטים לפעולה זו (נדרשים ${expectedCost} קרדיטים, יתרה: ${credits}).`
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
          userId: MOCK_USER_ID,
          projectId: MOCK_PROJECT_ID,
          userDescription: phase === "idle" ? trimmed : userDescription,
          answers: trimmed,
          currentCode: currentCode || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "שגיאה בביצוע הפעולה. הקרדיטים לא חויבו.");
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
              // Don't flood chat bubble with raw code during coder phase
              const displayContent =
                nextPhase === "coder"
                  ? "⚙️ כותב ומקמפל את קוד האפליקציה לסימולטור..."
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

              // If coder phase — extract and render code
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
                              "✅ האפליקציה מוכנה ומוצגת בסימולטור!\n\nאפשר לבדוק אותה עכשיו, לבקש שינויים (2 קרדיטים לעריכה), או ללחוץ על **ייצא APK** להורדה לטלפון.",
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
      toast.error("שגיאה בשליחת ההודעה. הקרדיטים שלך שמורים.");
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
    userDescription,
    currentCode,
    saveSnapshot,
    updateCredits,
  ]);

  // ── Handle Enter key ──────────────────────────────────────────────────────────

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
          content: `טענתי את התבנית **${tmpl.nameHe}** בחינם! 🎉\n\nהיא פועלת כעת בסימולטור. תוכל לבקש כל שינוי או התאמה אישית בעלות של 2 קרדיטים בלבד, או לייצא ל-APK.`,
        },
      ]);
    },
    [saveSnapshot]
  );

  // ── Restore snapshot ──────────────────────────────────────────────────────────

  const restoreSnapshot = useCallback((snap: VersionSnapshot) => {
    setCurrentCode(snap.code);
    setCurrentVersion(snap.version);
    toast.success(`שוחזרה גרסה ${snap.version} (ללא עלות קרדיטים)`);
  }, []);

  // ── Auto-heal (Free — never charges user credits) ─────────────────────────────

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
            userId: MOCK_USER_ID,
          }),
        });
        if (res.ok) {
          const { fixedCode } = await res.json();
          setCurrentCode(fixedCode);
          toast.info("הקוד תוקן אוטומטית (ללא חיוב קרדיטים) ✨");
        }
      } catch {
        toast.error("לא ניתן לתקן אוטומטית");
      } finally {
        setIsHealing(false);
      }
    },
    [isHealing]
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
          projectId: MOCK_PROJECT_ID,
          userId: MOCK_USER_ID,
          appName: "VibeApp",
          appCode: currentCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בהפעלת הבנייה (לא חויבו קרדיטים)");
        setBuildStatus("idle");
        return;
      }
      if (data.newBalance !== null && data.newBalance !== undefined) {
        updateCredits(data.newBalance);
      } else {
        updateCredits(Math.max(0, credits - 20));
      }
      setBuildId(data.buildId);
      toast.info("הבנייה בענן התחילה! ~75 שניות...");
    } catch {
      toast.error("שגיאת רשת — הקרדיטים לא חויבו");
      setBuildStatus("idle");
    }
  }, [currentCode, buildStatus, credits, updateCredits]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" dir="rtl">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-1 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Credits */}
          <Link href="/pricing" className="flex items-center gap-1.5 group">
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer group-hover:bg-primary/20 transition-colors"
            >
              <Zap className="w-3 h-3 text-primary" />
              <span className="font-bold">{credits}</span>
              <span className="text-muted-foreground font-normal">קרדיטים</span>
            </Badge>
            <span className="text-xs text-primary font-medium opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block">
              + טען קרדיטים
            </span>
          </Link>
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground text-lg">VibeApp</span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
          aria-label="החלף ערכת נושא"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: Phone simulator ── */}
        <div
          className="hidden lg:flex flex-col items-center justify-start gap-4 p-6 border-l border-border bg-muted/20 overflow-y-auto flex-shrink-0"
          style={{ width: 440 }}
        >
          <PhoneSimulator
            code={currentCode}
            onError={handleSimulatorError}
            isHealing={isHealing}
          />

          {/* Build button */}
          {currentCode && (
            <div className="flex flex-col items-center gap-2 w-full max-w-sm">
              {buildStatus === "idle" && (
                <Button onClick={buildApk} className="w-full gap-2" size="lg">
                  <Download className="w-5 h-5" />
                  ייצא APK לטלפון
                  <Badge variant="secondary" className="text-xs">
                    20 קרדיטים
                  </Badge>
                </Button>
              )}

              {buildStatus === "building" && (
                <div className="w-full bg-muted rounded-xl p-4 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    מקמפל וחותם קובץ APK בענן...
                  </p>
                  <p className="text-xs text-muted-foreground">~75 שניות</p>
                </div>
              )}

              {buildStatus === "ready" && apkUrl && (
                <div className="w-full flex flex-col gap-2">
                  <Button
                    onClick={() => setShowApkModal(true)}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <QrCode className="w-5 h-5" />
                    הורד APK / סרוק QR
                  </Button>
                </div>
              )}

              {buildStatus === "failed" && (
                <div className="w-full flex flex-col gap-2">
                  <p className="text-sm text-destructive text-center">
                    הבנייה נכשלה
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setBuildStatus("idle")}
                    className="w-full gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    נסה שוב
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right panel: Chat ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60 flex-shrink-0">
            <Button
              variant={showTemplates ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => {
                setShowTemplates((v) => !v);
                setShowVersions(false);
              }}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              תבניות מוכנות (חינם)
            </Button>

            {snapshots.length > 0 && (
              <Button
                variant={showVersions ? "default" : "ghost"}
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => {
                  setShowVersions((v) => !v);
                  setShowTemplates(false);
                }}
              >
                <History className="w-3.5 h-3.5" />
                גרסאות ({snapshots.length})
                {showVersions ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            )}

            <div className="mr-auto hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>הגנת קרדיטים פעילה</span>
            </div>
          </div>

          {/* Panels */}
          {showTemplates && (
            <div className="border-b border-border bg-card/40">
              <TemplatesPanel onSelect={loadTemplate} />
            </div>
          )}
          {showVersions && (
            <div className="border-b border-border bg-card/40">
              <VersionHistory
                snapshots={snapshots}
                currentVersion={currentVersion}
                onRestore={restoreSnapshot}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" &&
                    msg.id !== "welcome" &&
                    msg.content === "" && (
                      <span className="inline-flex gap-0.5">
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

          {/* Mobile: Phone + Build button */}
          <div className="lg:hidden flex flex-col items-center gap-3 p-3 border-t border-border bg-card/40">
            {currentCode ? (
              <div className="w-full flex flex-col gap-2">
                {buildStatus === "idle" && (
                  <Button onClick={buildApk} className="w-full gap-2" size="sm">
                    <Download className="w-4 h-4" />
                    ייצא APK
                    <Badge variant="secondary" className="text-xs">
                      20 קרדיטים
                    </Badge>
                  </Button>
                )}
                {buildStatus === "building" && (
                  <div className="flex items-center justify-center gap-2 p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      בונה... ~75 שניות
                    </span>
                  </div>
                )}
                {buildStatus === "ready" && apkUrl && (
                  <Button
                    onClick={() => setShowApkModal(true)}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <QrCode className="w-4 h-4" />
                    הורד APK / QR
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                תאר אפליקציה או בחר תבנית לתצוגה מקדימה
              </p>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-border bg-card flex-shrink-0 items-center">
            <Button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              size="icon"
              className="flex-shrink-0 h-10 w-10"
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
                  ? "תאר את האפליקציה שלך (10 קרדיטים ליצירה מלאה)..."
                  : phase === "architect"
                  ? "ענה על שאלות ה-AI כדי לבנות את האפליקציה (כלול במחיר)..."
                  : "בקש שינוי או תוספת (2 קרדיטים לעריכה)..."
              }
              className="resize-none min-h-0 h-10 py-2.5 flex-1"
              disabled={isStreaming}
              rows={1}
            />
          </div>
        </div>
      </div>

      {/* ── QR & APK Download Modal ── */}
      <Dialog open={showApkModal} onOpenChange={setShowApkModal}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              🎉 ה-APK שלך מוכן להתקנה!
            </DialogTitle>
            <DialogDescription>
              סרוק את הברקוד עם מצלמת הטלפון או לחץ על כפתור ההורדה הישירה.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 py-4">
            {apkUrl && (
              <div className="bg-white p-4 rounded-2xl border shadow-sm">
                <QRCodeSVG value={apkUrl} size={180} />
              </div>
            )}

            {apkUrl && (
              <a
                href={apkUrl}
                download="vibeapp-release.apk"
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                הורד קובץ APK ישירות
              </a>
            )}

            <div className="w-full bg-muted/60 rounded-xl p-4 text-xs space-y-2 text-foreground">
              <p className="font-bold text-sm">איך מתקינים באנדרואיד (3 שלבים):</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>סרוק את ה-QR או לחץ על כפתור ההורדה בטלפון.</li>
                <li>פתח את הקובץ שירד ואשר &quot;התקנה ממקור לא מוכר&quot; במידה ונשאל.</li>
                <li>לחץ &quot;התקן&quot; — והאפליקציה שלך תופיע על מסך הבית!</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
