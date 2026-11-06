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
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

// ─── Mock user (replace with Supabase auth) ───────────────────────────────────
const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_PROJECT_ID = "00000000-0000-0000-0000-000000000002";

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { theme, setTheme } = useTheme();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "שלום! אני כאן לעזור לך לבנות אפליקציה אנדרואיד. 📱\n\nתאר לי מה האפליקציה שלך עושה — בכמה משפטים בעברית — ואתחיל לשאול אותך כמה שאלות.",
    },
  ]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userDescription, setUserDescription] = useState("");
  const [architectAnswers, setArchitectAnswers] = useState("");

  // App code & versions
  const [currentCode, setCurrentCode] = useState("");
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);

  // Build state
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  // Credits
  const [credits, setCredits] = useState(15);

  // UI panels
  const [showVersions, setShowVersions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

    setInput("");
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Determine phase
    let nextPhase: Phase;
    if (phase === "idle") {
      nextPhase = "architect";
      setUserDescription(trimmed);
    } else if (phase === "architect") {
      nextPhase = "coder";
      setArchitectAnswers(trimmed);
    } else {
      nextPhase = "coder"; // iteration
    }
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
          userDescription,
          answers: trimmed,
        }),
      });

      if (res.status === 402) {
        const err = await res.json();
        toast.error(err.error ?? "אין מספיק קרדיטים");
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
        setPhase(phase); // revert
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: fullText }
                    : m
                )
              );
            }

            if (parsed.done) {
              if (parsed.newBalance !== null && parsed.newBalance !== undefined) {
                setCredits(parsed.newBalance);
              }

              // If coder phase — extract and render code
              if (nextPhase === "coder") {
                const code = stripMarkdown(fullText);
                if (code.includes("export default")) {
                  setCurrentCode(code);
                  saveSnapshot(code, trimmed.slice(0, 40));
                  setPhase("done");
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
    } catch (err) {
      toast.error("שגיאה בשליחת ההודעה. נסה שוב.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, phase, userDescription, saveSnapshot]);

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
      setPhase("done");
      setShowTemplates(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `טענתי את התבנית **${tmpl.nameHe}** 🎉\n\nהיא מופיעה בסימולטור. תוכל לבקש עריכות — כל שינוי עולה 2 קרדיטים בלבד.`,
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
            userId: MOCK_USER_ID,
          }),
        });
        if (res.ok) {
          const { fixedCode } = await res.json();
          setCurrentCode(fixedCode);
          toast.info("קוד תוקן אוטומטית ✨");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "שגיאה בהפעלת הבנייה");
        setBuildStatus("idle");
        return;
      }
      setBuildId(data.buildId);
      toast.info("הבנייה התחילה! ~75 שניות...");
    } catch {
      toast.error("שגיאת רשת");
      setBuildStatus("idle");
    }
  }, [currentCode, buildStatus]);

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
            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              + הוסף
            </span>
          </Link>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground text-lg">VibeApp</span>
        </div>

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
        <div className="hidden lg:flex flex-col items-center justify-start gap-4 p-6 border-l border-border bg-muted/20 overflow-y-auto flex-shrink-0"
          style={{ width: 440 }}>
          <PhoneSimulator
            code={currentCode}
            onError={handleSimulatorError}
            isHealing={isHealing}
          />

          {/* Build button */}
          {currentCode && (
            <div className="flex flex-col items-center gap-2 w-full max-w-sm">
              {buildStatus === "idle" && (
                <Button
                  onClick={buildApk}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Download className="w-5 h-5" />
                  ייצא APK
                  <Badge variant="secondary" className="text-xs">20 קרדיטים</Badge>
                </Button>
              )}

              {buildStatus === "building" && (
                <div className="w-full bg-muted rounded-xl p-4 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium text-foreground">
                    בונה את האפליקציה שלך...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ~75 שניות
                  </p>
                </div>
              )}

              {buildStatus === "ready" && apkUrl && (
                <div className="w-full flex flex-col gap-2">
                  <a
                    href={apkUrl}
                    download="my-app.apk"
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    הורד APK
                  </a>
                  <p className="text-xs text-center text-muted-foreground leading-relaxed">
                    פתח את הקובץ בטלפון ← אשר התקנה ← האפליקציה מוכנה
                  </p>
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
              תבניות
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

            {/* Mobile simulator toggle */}
            <div className="lg:hidden mr-auto">
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="w-3 h-3 text-primary" />
                {credits}
              </Badge>
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
                className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
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
                    <Badge variant="secondary" className="text-xs">20 קרדיטים</Badge>
                  </Button>
                )}
                {buildStatus === "building" && (
                  <div className="flex items-center justify-center gap-2 p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">בונה... ~75 שניות</span>
                  </div>
                )}
                {buildStatus === "ready" && apkUrl && (
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={apkUrl}
                      download="my-app.apk"
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 px-4 font-semibold text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      הורד APK
                    </a>
                    <p className="text-xs text-center text-muted-foreground">
                      פתח בטלפון ← אשר ← מוכן!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                תאר אפליקציה לראות תצוגה מקדימה
              </p>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-border bg-card flex-shrink-0">
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
              placeholder={
                phase === "idle"
                  ? "תאר את האפליקציה שלך..."
                  : phase === "architect"
                  ? "ענה על שאלות ה-AI..."
                  : "בקש שינוי או עריכה..."
              }
              className="resize-none min-h-0 h-10 py-2.5 flex-1"
              disabled={isStreaming}
              rows={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
