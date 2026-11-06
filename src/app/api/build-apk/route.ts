import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "natiBirhauz";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "VibeApp";
const GITHUB_PAT = process.env.GITHUB_PAT ?? "";

export async function POST(req: NextRequest) {
  const { projectId, userId, appName } = await req.json() as {
    projectId: string;
    userId: string;
    appName: string;
  };

  const supabase = createServiceClient();

  // Check balance (minimum 20 credits required)
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .single();

  if (!profile || profile.credits_balance < 20) {
    return NextResponse.json(
      { error: "נדרשים לפחות 20 קרדיטים לייצוא APK" },
      { status: 402 }
    );
  }

  // Fetch current code
  const { data: project } = await supabase
    .from("projects")
    .select("current_code")
    .eq("id", projectId)
    .single();

  if (!project?.current_code) {
    return NextResponse.json(
      { error: "אין קוד לבנייה. צור את האפליקציה תחילה." },
      { status: 400 }
    );
  }

  // Deduct 20 credits
  const { error: creditError } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: 20,
  });

  if (creditError) {
    return NextResponse.json({ error: "שגיאה בניכוי קרדיטים" }, { status: 402 });
  }

  // Base64 encode the App.tsx
  const appCodeBase64 = Buffer.from(project.current_code).toString("base64");

  // Trigger GitHub Actions workflow_dispatch
  const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/build-apk.yml/dispatches`;

  const dispatchRes = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: "main",
      inputs: {
        app_name: appName,
        app_code: appCodeBase64,
        project_id: projectId,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
    }),
  });

  if (!dispatchRes.ok) {
    const errText = await dispatchRes.text();
    console.error("GitHub dispatch failed:", errText);
    return NextResponse.json(
      { error: "שגיאה בהפעלת תהליך הבנייה" },
      { status: 500 }
    );
  }

  // Get the run ID (GitHub needs a moment to create it)
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

  // Save run ID to project
  await supabase
    .from("projects")
    .update({ status: "building", build_run_id: runId })
    .eq("id", projectId);

  return NextResponse.json({
    success: true,
    buildId: runId,
    estimatedSeconds: 75,
  });
}
