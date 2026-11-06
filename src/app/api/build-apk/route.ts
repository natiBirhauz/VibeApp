import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  CREDIT_COSTS,
  checkRateLimit,
  getVerifiedUserId,
  isSupabaseConfigured,
} from "@/lib/credits-guard";

export const runtime = "nodejs";

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "natiBirhauz";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "VibeApp";
const GITHUB_PAT = process.env.GITHUB_PAT ?? "";

export async function POST(req: NextRequest) {
  const { projectId, userId: clientUserId, appName, appCode } = (await req.json()) as {
    projectId: string;
    userId: string;
    appName: string;
    appCode?: string;
  };

  const userId = await getVerifiedUserId(clientUserId);
  if (!userId) {
    return NextResponse.json(
      { error: "יש להתחבר לחשבון כדי לייצא קובץ APK." },
      { status: 401 }
    );
  }

  // Rate limit build triggers
  const ip = req.headers.get("x-forwarded-for") ?? userId ?? "anon";
  const rateLimit = checkRateLimit(`build:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "יותר מדי בקשות בנייה. אנא המתן דקה." },
      { status: 429 }
    );
  }

  const hasSupabase = isSupabaseConfigured();
  const supabase = hasSupabase ? createServiceClient() : null;

  let codeToBuild = appCode ?? "";
  let newBalance: number | null = null;

  if (supabase) {
    // Check balance (minimum 20 credits required)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    if (!profile || profile.credits_balance < CREDIT_COSTS.APK_EXPORT) {
      return NextResponse.json(
        { error: `נדרשים לפחות ${CREDIT_COSTS.APK_EXPORT} קרדיטים לייצוא APK.` },
        { status: 402 }
      );
    }

    if (!codeToBuild) {
      const { data: project } = await supabase
        .from("projects")
        .select("current_code")
        .eq("id", projectId)
        .single();
      codeToBuild = project?.current_code ?? "";
    }

    if (!codeToBuild) {
      return NextResponse.json(
        { error: "אין קוד לבנייה. צור את האפליקציה תחילה." },
        { status: 400 }
      );
    }

    // Deduct 20 credits atomically
    const { error: creditError } = await supabase.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: CREDIT_COSTS.APK_EXPORT,
    });

    if (creditError) {
      return NextResponse.json({ error: "שגיאה בניכוי קרדיטים" }, { status: 402 });
    }

    newBalance = profile.credits_balance - CREDIT_COSTS.APK_EXPORT;
  } else if (!codeToBuild) {
    return NextResponse.json(
      { error: "אין קוד לבנייה. צור את האפליקציה תחילה." },
      { status: 400 }
    );
  }

  // If GitHub PAT is not configured, simulate local build preview or refund
  if (!GITHUB_PAT || GITHUB_PAT === "ghp_...") {
    if (supabase) {
      await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_amount: CREDIT_COSTS.APK_EXPORT,
      });
    }
    return NextResponse.json(
      {
        error:
          "חסר מפתח GITHUB_PAT בקובץ הסביבה להפעלת בניית הענן (הקרדיטים לא חויבו).",
      },
      { status: 503 }
    );
  }

  // Base64 encode the App.tsx
  const appCodeBase64 = Buffer.from(codeToBuild).toString("base64");

  // Trigger GitHub Actions workflow_dispatch
  const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/build-apk.yml/dispatches`;

  try {
    const dispatchRes = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "master",
        inputs: {
          app_name: appName || "VibeApp",
          app_code: appCodeBase64,
          project_id: projectId,
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
      }),
    });

    if (!dispatchRes.ok) {
      const errText = await dispatchRes.text();
      console.error("GitHub dispatch failed, refunding credits:", errText);
      if (supabase) {
        await supabase.rpc("add_credits", {
          p_user_id: userId,
          p_amount: CREDIT_COSTS.APK_EXPORT,
        });
      }
      return NextResponse.json(
        { error: "שגיאה בהפעלת תהליך הבנייה בענן. הקרדיטים הוחזרו לחשבונך." },
        { status: 500 }
      );
    }

    // Wait briefly for GitHub to register the workflow run
    await new Promise((r) => setTimeout(r, 3000));

    const runsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?event=workflow_dispatch&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const runsData = await runsRes.json();
    const runId = runsData?.workflow_runs?.[0]?.id?.toString() ?? null;

    if (supabase) {
      await supabase
        .from("projects")
        .update({ status: "building", build_run_id: runId })
        .eq("id", projectId);
    }

    return NextResponse.json({
      success: true,
      buildId: runId,
      newBalance,
      estimatedSeconds: 75,
    });
  } catch (err) {
    console.error("Build trigger error, refunding credits:", err);
    if (supabase) {
      await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_amount: CREDIT_COSTS.APK_EXPORT,
      });
    }
    return NextResponse.json(
      { error: "שגיאת תקשורת מול שרת הבנייה. הקרדיטים הוחזרו לחשבונך." },
      { status: 500 }
    );
  }
}
