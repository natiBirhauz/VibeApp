import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getArchitectPrompt,
  getCoderPrompt,
  stripMarkdown,
} from "@/lib/ai/prompts";
import {
  CREDIT_COSTS,
  LIMITS,
  checkRateLimit,
  getVerifiedUserId,
  isOpenAIConfigured,
  isSupabaseConfigured,
} from "@/lib/credits-guard";
import { STARTER_TEMPLATES } from "@/lib/templates/starters";

export const runtime = "nodejs";
export const maxDuration = 60;

const FAST_MODEL = process.env.FAST_MODEL ?? "gpt-4o-mini";
const CODER_MODEL = process.env.CODER_MODEL ?? "gpt-4o";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    message,
    phase,
    userId: clientUserId,
    projectId,
    userDescription,
    answers,
    currentCode,
  } = body as {
    message: string;
    phase: "architect" | "coder";
    userId: string;
    projectId?: string;
    userDescription?: string;
    answers?: string;
    currentCode?: string;
  };

  // Verify user session (prevents ID spoofing in production)
  const userId = await getVerifiedUserId(clientUserId);
  if (!userId) {
    return NextResponse.json(
      { error: "יש להתחבר לחשבון כדי להשתמש ב-AI." },
      { status: 401 }
    );
  }

  // 1. Validate input length to prevent token abuse
  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: "הודעה ריקה" }, { status: 400 });
  }
  if (message.length > LIMITS.MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      {
        error: `ההודעה ארוכה מדי (מקסימום ${LIMITS.MAX_PROMPT_LENGTH} תווים כדי לשמור על מהירות ודיוק).`,
      },
      { status: 400 }
    );
  }

  // 2. Rate limiting per user / IP
  const ip = req.headers.get("x-forwarded-for") ?? userId ?? "anon";
  const rateLimit = checkRateLimit(`chat:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `יותר מדי בקשות. נסה שוב בעוד ${rateLimit.retryAfterSec} שניות.` },
      { status: 429 }
    );
  }

  // 3. Determine exact credit cost:
  //    - Initial build (architect phase): 10 credits (covers Phase 1 questions + Phase 2 initial build)
  //    - Phase 2 initial generation right after architect (no existing code): 0 additional credits (already paid in Phase 1!)
  //    - Iteration on existing code: 2 credits
  const isInitialCoderAfterArchitect = phase === "coder" && !currentCode;
  const creditCost =
    phase === "architect"
      ? CREDIT_COSTS.INITIAL_BUILD
      : isInitialCoderAfterArchitect
      ? 0
      : CREDIT_COSTS.ITERATION;

  const hasSupabase = isSupabaseConfigured();
  const hasOpenAI = isOpenAIConfigured();
  const supabase = hasSupabase ? createServiceClient() : null;

  let newBalance: number | null = null;

  // 4. Deduct credits in Supabase if configured and cost > 0
  if (supabase && creditCost > 0) {
    const { error: creditError } = await supabase.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: creditCost,
    });

    if (creditError) {
      const isInsufficient = creditError.message?.includes("insufficient_credits");
      return NextResponse.json(
        {
          error: isInsufficient
            ? "אין מספיק קרדיטים. רכוש חבילת קרדיטים כדי להמשיך."
            : "שגיאה באימות יתרת קרדיטים.",
        },
        { status: 402 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    newBalance = profile?.credits_balance ?? null;
  }

  const encoder = new TextEncoder();

  // 5. Fallback / Demo Mode if OpenAI key is not configured yet
  if (!hasOpenAI) {
    const demoText =
      phase === "architect"
        ? "מעולה! לפני שאני בונה את האפליקציה, הנה 3 שאלות קצרות לדיוק:\n1. אילו מסכים מרכזיים תרצה באפליקציה (למשל: מסך ראשי, טופס הוספה, היסטוריה)?\n2. אילו נתונים חשוב לשמור בזיכרון הטלפון?\n3. איזה סגנון עיצוב וצבעים אתה מעדיף (מודרני כהה, בהיר ונקי, או צבעוני)?"
        : selectBestTemplateCode(userDescription || message, currentCode);

    const readable = new ReadableStream({
      async start(controller) {
        const chunkSize = phase === "coder" ? 120 : 25;
        for (let i = 0; i < demoText.length; i += chunkSize) {
          const delta = demoText.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
          );
          await new Promise((r) => setTimeout(r, 15));
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              newBalance,
              creditCost,
            })}\n\n`
          )
        );
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // 6. Real OpenAI Stream with automatic credit refund on failure
  const safeCurrentCode = currentCode
    ? currentCode.slice(0, LIMITS.MAX_CODE_LENGTH)
    : undefined;

  const systemPrompt =
    phase === "architect"
      ? getArchitectPrompt()
      : getCoderPrompt(userDescription ?? "", answers ?? message, safeCurrentCode);

  const model = phase === "architect" ? FAST_MODEL : CODER_MODEL;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: phase === "coder" ? 4096 : 600,
      temperature: phase === "coder" ? 0.25 : 0.6,
    });

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            fullText += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
          }

          if (phase === "coder" && projectId && supabase) {
            const cleanCode = stripMarkdown(fullText);
            await supabase
              .from("projects")
              .update({ current_code: cleanCode, status: "ready" })
              .eq("id", projectId);
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                newBalance,
                creditCost,
              })}\n\n`
            )
          );
          controller.close();
        } catch (streamErr) {
          console.error("Stream interrupted, refunding credits:", streamErr);
          if (supabase && creditCost > 0) {
            await supabase.rpc("add_credits", {
              p_user_id: userId,
              p_amount: creditCost,
            });
          }
          controller.error(streamErr);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("OpenAI API failed, refunding credits:", err);
    if (supabase && creditCost > 0) {
      await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_amount: creditCost,
      });
    }
    return NextResponse.json(
      { error: "שגיאה בתקשורת עם מנוע ה-AI. הקרדיטים לא חויבו." },
      { status: 500 }
    );
  }
}

function selectBestTemplateCode(query: string, existingCode?: string): string {
  if (existingCode) return existingCode;
  const q = query.toLowerCase();
  if (q.includes("מחשבון") || q.includes("הצעת") || q.includes("מחיר")) {
    return STARTER_TEMPLATES[0].code;
  }
  if (q.includes("כרטיס") || q.includes("פגיש") || q.includes("תור")) {
    return STARTER_TEMPLATES[1].code;
  }
  if (q.includes("אימון") || q.includes("כושר") || q.includes("משקל")) {
    return STARTER_TEMPLATES[3].code;
  }
  if (q.includes("חנות") || q.includes("קטלוג") || q.includes("וואטסאפ") || q.includes("מוצר")) {
    return STARTER_TEMPLATES[4].code;
  }
  return STARTER_TEMPLATES[2].code;
}
