/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          file_name: string
          id: string
          is_requested: boolean | null
          loan_id: string | null
          requested_by: string | null
          type: string
          uploaded_at: string | null
          uri: string
          user_id: string
        }
        Insert: {
          file_name: string
          id: string
          is_requested?: boolean | null
          loan_id?: string | null
          requested_by?: string | null
          type: string
          uploaded_at?: string | null
          uri: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          is_requested?: boolean | null
          loan_id?: string | null
          requested_by?: string | null
          type?: string
          uploaded_at?: string | null
          uri?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string | null
          disbursed_at: string | null
          due_date: string | null
          id: string
          interest_rate: number
          is_overdue: boolean | null
          is_rollover: boolean | null
          last_reminder_at: string | null
          late_payment_penalty: number | null
          loan_type: string
          monthly_payment: number
          payment_acknowledged: boolean | null
          payment_proof_uploaded: boolean | null
          purpose: string
          rejected_at: string | null
          remaining_balance: number | null
          reminders_sent: number | null
          repayment_period: number
          rollover_id: string | null
          security_docs_requested: boolean | null
          security_docs_submitted: boolean | null
          status: string
          total_paid_so_far: number | null
          total_payable: number
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          due_date?: string | null
          id: string
          interest_rate: number
          is_overdue?: boolean | null
          is_rollover?: boolean | null
          last_reminder_at?: string | null
          late_payment_penalty?: number | null
          loan_type: string
          monthly_payment: number
          payment_acknowledged?: boolean | null
          payment_proof_uploaded?: boolean | null
          purpose?: string
          rejected_at?: string | null
          remaining_balance?: number | null
          reminders_sent?: number | null
          repayment_period: number
          rollover_id?: string | null
          security_docs_requested?: boolean | null
          security_docs_submitted?: boolean | null
          status?: string
          total_paid_so_far?: number | null
          total_payable: number
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number
          is_overdue?: boolean | null
          is_rollover?: boolean | null
          last_reminder_at?: string | null
          late_payment_penalty?: number | null
          loan_type?: string
          monthly_payment?: number
          payment_acknowledged?: boolean | null
          payment_proof_uploaded?: boolean | null
          purpose?: string
          rejected_at?: string | null
          remaining_balance?: number | null
          reminders_sent?: number | null
          repayment_period?: number
          rollover_id?: string | null
          security_docs_requested?: boolean | null
          security_docs_submitted?: boolean | null
          status?: string
          total_paid_so_far?: number | null
          total_payable?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          loan_id: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          loan_id?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          loan_id?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }

      payment_records: {
        Row: {
          amount: number
          id: string
          is_partial: boolean | null
          loan_id: string
          paid_at: string | null
          proof_file_name: string | null
          proof_uri: string | null
          remaining_after: number | null
          rollover_calculated: boolean | null
          rollover_due_date: string | null
          rollover_interest: number | null
          rollover_remaining: number | null
          rollover_total_payable: number | null
          user_id: string
        }
        Insert: {
          amount: number
          id: string
          is_partial?: boolean | null
          loan_id: string
          paid_at?: string | null
          proof_file_name?: string | null
          proof_uri?: string | null
          remaining_after?: number | null
          rollover_calculated?: boolean | null
          rollover_due_date?: string | null
          rollover_interest?: number | null
          rollover_remaining?: number | null
          rollover_total_payable?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          is_partial?: boolean | null
          loan_id?: string
          paid_at?: string | null
          proof_file_name?: string | null
          proof_uri?: string | null
          remaining_after?: number | null
          rollover_calculated?: boolean | null
          rollover_due_date?: string | null
          rollover_interest?: number | null
          rollover_remaining?: number | null
          rollover_total_payable?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          invited_by: string | null
          name: string
          notification_preferences: Json | null
          phone: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          invited_by?: string | null
          name?: string
          notification_preferences?: Json | null
          phone?: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          name?: string
          notification_preferences?: Json | null
          phone?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repayment_schedules: {
        Row: {
          loan_id: string
          next_payment_date: string | null
          paid_months: Json
          schedule: Json
          total_paid: number | null
        }
        Insert: {
          loan_id: string
          next_payment_date?: string | null
          paid_months?: Json
          schedule?: Json
          total_paid?: number | null
        }
        Update: {
          loan_id?: string
          next_payment_date?: string | null
          paid_months?: Json
          schedule?: Json
          total_paid?: number | null
        }
        Relationships: []
      }
      rollover_loans: {
        Row: {
          calculated_at: string | null
          original_amount: number
          original_loan_id: string
          paid_amount: number
          reason: string
          remaining_principal: number
          rollover_interest: number
          rollover_loan_id: string
          rollover_monthly_payment: number
          rollover_period: number
          rollover_total_payable: number
        }
        Insert: {
          calculated_at?: string | null
          original_amount: number
          original_loan_id: string
          paid_amount: number
          reason?: string
          remaining_principal: number
          rollover_interest: number
          rollover_loan_id: string
          rollover_monthly_payment: number
          rollover_period: number
          rollover_total_payable: number
        }
        Update: {
          calculated_at?: string | null
          original_amount?: number
          original_loan_id?: string
          paid_amount?: number
          reason?: string
          remaining_principal?: number
          rollover_interest?: number
          rollover_loan_id?: string
          rollover_monthly_payment?: number
          rollover_period?: number
          rollover_total_payable?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
