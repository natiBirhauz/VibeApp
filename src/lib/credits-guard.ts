/**
 * Credit Guard & Anti-Abuse System
 * Ensures the platform owner never gets burned on AI/Build costs,
 * and users never lose credits on failed API calls.
 */

export const CREDIT_COSTS = {
  INITIAL_BUILD: 10, // Phase 1 (Architect) + Phase 2 (Initial Coder)
  ITERATION: 2,      // Modifying existing code
  HEAL: 2,           // Auto-fixing broken code
  APK_EXPORT: 20,    // Cloud APK compilation
} as const;

export const LIMITS = {
  MAX_PROMPT_LENGTH: 1500,        // Max characters per user message
  MAX_CODE_LENGTH: 35000,         // Max characters for App.tsx context
  RATE_LIMIT_WINDOW_MS: 60_000,   // 1 minute window
  MAX_REQUESTS_PER_MINUTE: 10,    // Max 10 AI calls per minute per IP/User
} as const;

// Simple in-memory sliding window rate limiter for serverless/node runtime
const requestLog = new Map<string, number[]>();

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowStart = now - LIMITS.RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(identifier) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= LIMITS.MAX_REQUESTS_PER_MINUTE) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.ceil((oldest + LIMITS.RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  timestamps.push(now);
  requestLog.set(identifier, timestamps);
  return { allowed: true };
}

import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user ID from Supabase session cookies.
 * In production (when Supabase is configured), it strictly requires a valid session
 * and ignores any client-supplied userId to prevent ID spoofing!
 * In local demo mode (when Supabase is not configured), it falls back to the demo user ID.
 */
export async function getVerifiedUserId(fallbackUserId?: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return fallbackUserId || "00000000-0000-0000-0000-000000000001";
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project.supabase.co") &&
      !key.includes("your-service-role-key")
  );
}

export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.startsWith("sk-") && key !== "sk-...");
}

