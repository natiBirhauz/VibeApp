import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";
import { getHealingPrompt, stripMarkdown } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 30;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CODER_MODEL = process.env.CODER_MODEL ?? "gpt-4o";

export async function POST(req: NextRequest) {
  const { brokenCode, errorMessage, userId } = await req.json() as {
    brokenCode: string;
    errorMessage: string;
    userId: string;
  };

  const supabase = createServiceClient();

  // Deduct 2 credits for healing
  const { error: creditError } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: 2,
  });

  if (creditError) {
    return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
  }

  const systemPrompt = getHealingPrompt(brokenCode, errorMessage);

  const response = await openai.chat.completions.create({
    model: CODER_MODEL,
    messages: [{ role: "user", content: systemPrompt }],
    max_tokens: 4096,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const fixedCode = stripMarkdown(raw);

  return NextResponse.json({ fixedCode });
}
