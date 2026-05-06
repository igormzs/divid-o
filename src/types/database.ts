export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // supabase-js v2.99 / postgrest-js v1.x require PostgrestVersion "12"
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      expense_splits: {
        Row: {
          amount_owed: number
          expense_id: string
          user_id: string
        }
        Insert: {
          amount_owed: number
          expense_id: string
          user_id: string
        }
        Update: {
          amount_owed?: number
          expense_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_splits_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_splits_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string
          group_id: string
          id: string
          paid_by: string
          receipt_url: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description: string
          group_id: string
          id?: string
          paid_by: string
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string
          group_id?: string
          id?: string
          paid_by?: string
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_paid_by_fkey'
            columns: ['paid_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      groups: {
        Row: {
          cover_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          created_at: string | null
          group_id: string
          id: string
          paid_by: string
          paid_to: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          group_id: string
          id?: string
          paid_by: string
          paid_to: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          group_id?: string
          id?: string
          paid_by?: string
          paid_to?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'settlements_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_paid_by_fkey'
            columns: ['paid_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'settlements_paid_to_fkey'
            columns: ['paid_to']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          username: string | null
          first_name: string | null
          id: string
          last_name: string | null
          preferred_currency: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          username?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          preferred_currency?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          username?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_currency?: string | null
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
