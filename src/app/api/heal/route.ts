import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";
import { getHealingPrompt, stripMarkdown } from "@/lib/ai/prompts";
import {
  LIMITS,
  checkRateLimit,
  isOpenAIConfigured,
  isSupabaseConfigured,
} from "@/lib/credits-guard";

export const runtime = "nodejs";
export const maxDuration = 30;

const CODER_MODEL = process.env.CODER_MODEL ?? "gpt-4o";

export async function POST(req: NextRequest) {
  const { brokenCode, errorMessage, userId } = (await req.json()) as {
    brokenCode: string;
    errorMessage: string;
    userId: string;
  };

  if (!brokenCode || !errorMessage) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Rate limit healing to prevent infinite auto-heal loops burning OpenAI tokens!
  const ip = req.headers.get("x-forwarded-for") ?? userId ?? "anon";
  const rateLimit = checkRateLimit(`heal:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for auto-heal" },
      { status: 429 }
    );
  }

  // Verify user has a valid account (if Supabase is active), but DO NOT charge the user
  // for fixing our own AI's syntax error — fair UX!
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ fixedCode: stripMarkdown(brokenCode) });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const safeCode = brokenCode.slice(0, LIMITS.MAX_CODE_LENGTH);
  const safeError = errorMessage.slice(0, 1000);
  const systemPrompt = getHealingPrompt(safeCode, safeError);

  try {
    const response = await openai.chat.completions.create({
      model: CODER_MODEL,
      messages: [{ role: "user", content: systemPrompt }],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const fixedCode = stripMarkdown(raw);

    return NextResponse.json({ fixedCode });
  } catch (err) {
    console.error("Auto-heal failed:", err);
    return NextResponse.json({ error: "Auto-heal failed" }, { status: 500 });
  }
}
