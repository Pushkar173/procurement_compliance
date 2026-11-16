export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'officer' | 'auditor'
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'officer' | 'auditor'
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'officer' | 'auditor'
        }
      }
      // Add other tables as needed for future tasks
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { user_id: string; required_role: 'admin' | 'officer' | 'auditor' }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'officer' | 'auditor'
      compliance_status: 'Pending' | 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Not Applicable'
    }
  }
}
