-- VibeApp Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- profiles: one per auth user, holds credit balance
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text NOT NULL,
  credits_balance integer NOT NULL DEFAULT 15,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- projects: each app the user is building
CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'האפליקציה שלי',
  current_code  text,
  versions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'draft',  -- draft | building | ready | failed
  apk_url       text,
  build_run_id  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- transactions: payment/credit history
CREATE TABLE IF NOT EXISTS public.transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paid   numeric(10,2) NOT NULL DEFAULT 0,
  credits_added integer NOT NULL,
  payment_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- profiles: users see only their own row
CREATE POLICY "profiles: own row only"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

-- projects: users see only their own projects
CREATE POLICY "projects: own projects only"
  ON public.projects
  FOR ALL
  USING (auth.uid() = user_id);

-- transactions: users see only their own transactions
CREATE POLICY "transactions: own transactions only"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits_balance)
  VALUES (
    NEW.id,
    NEW.email,
    15  -- 15 free credits on signup
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPC: deduct_credits
-- Deducts credits atomically. Raises exception if insufficient.
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id uuid,
  p_amount  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT credits_balance INTO current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance - p_amount
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- RPC: add_credits
-- Adds credits to a user's balance.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount  integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
