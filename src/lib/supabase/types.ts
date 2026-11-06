export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          credits_balance: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          credits_balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          credits_balance?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          current_code: string | null;
          versions: Json;
          status: string;
          apk_url: string | null;
          build_run_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          current_code?: string | null;
          versions?: Json;
          status?: string;
          apk_url?: string | null;
          build_run_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          current_code?: string | null;
          versions?: Json;
          status?: string;
          apk_url?: string | null;
          build_run_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount_paid: number;
          credits_added: number;
          payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_paid: number;
          credits_added: number;
          payment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_paid?: number;
          credits_added?: number;
          payment_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      deduct_credits: {
        Args: { p_user_id: string; p_amount: number };
        Returns: undefined;
      };
      add_credits: {
        Args: { p_user_id: string; p_amount: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export interface VersionSnapshot {
  version: number;
  code: string;
  description: string;
  timestamp: string;
}
