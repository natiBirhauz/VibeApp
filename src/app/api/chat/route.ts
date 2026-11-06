import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getArchitectPrompt,
  getCoderPrompt,
  stripMarkdown,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FAST_MODEL = process.env.FAST_MODEL ?? "gpt-4o-mini";
const CODER_MODEL = process.env.CODER_MODEL ?? "gpt-4o";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, phase, userId, projectId, userDescription, answers } = body as {
    message: string;
    phase: "architect" | "coder";
    userId: string;
    projectId?: string;
    userDescription?: string;
    answers?: string;
  };

  const supabase = createServiceClient();

  // Determine credit cost
  const creditCost = phase === "architect" ? 10 : 2;

  // Deduct credits
  const { error: creditError } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: creditCost,
  });

  if (creditError) {
    const isInsufficient = creditError.message?.includes("insufficient_credits");
    return NextResponse.json(
      {
        error: isInsufficient
          ? "אין מספיק קרדיטים. רכוש קרדיטים נוספים."
          : "שגיאה בניכוי קרדיטים",
      },
      { status: 402 }
    );
  }

  // Fetch updated balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .single();

  // Build messages array
  const systemPrompt =
    phase === "architect"
      ? getArchitectPrompt()
      : getCoderPrompt(userDescription ?? "", answers ?? "");

  const model = phase === "architect" ? FAST_MODEL : CODER_MODEL;

  // Stream response
  const stream = await openai.chat.completions.create({
    model,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    max_tokens: phase === "coder" ? 4096 : 1024,
    temperature: phase === "coder" ? 0.3 : 0.7,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        fullText += delta;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
      }

      // For coder phase: save to project
      if (phase === "coder" && projectId) {
        const cleanCode = stripMarkdown(fullText);
        await supabase
          .from("projects")
          .update({ current_code: cleanCode, status: "ready" })
          .eq("id", projectId);
      }

      // Send completion event with new balance
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            done: true,
            newBalance: profile?.credits_balance ?? null,
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
