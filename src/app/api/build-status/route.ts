import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "natiBirhauz";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "VibeApp";
const GITHUB_PAT = process.env.GITHUB_PAT ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buildId = searchParams.get("buildId");
  const projectId = searchParams.get("projectId");

  if (!buildId) {
    return NextResponse.json({ error: "buildId required" }, { status: 400 });
  }

  const runRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${buildId}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    }
  );

  if (!runRes.ok) {
    return NextResponse.json({ status: "unknown" });
  }

  const run = await runRes.json();
  const status: "queued" | "in_progress" | "completed" | "failed" =
    run.conclusion === "failure"
      ? "failed"
      : run.status === "completed"
      ? "completed"
      : run.status === "in_progress"
      ? "in_progress"
      : "queued";

  let apkUrl: string | null = null;

  if (status === "completed" && projectId) {
    const supabase = createServiceClient();

    // The APK URL follows the convention set by the workflow
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/apks/${projectId}.apk`;
    apkUrl = url;

    // Save to project record
    await supabase
      .from("projects")
      .update({ status: "ready", apk_url: url })
      .eq("id", projectId);
  }

  return NextResponse.json({ status, apkUrl });
}
