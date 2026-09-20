export interface PantryItemRow {
  id: string;
  user_id: string;
  name: string;
  base_name?: string | null;
  mapping_key?: string | null;
  category?: string | null;
  amount: number | string;
  unit: string;
  canonical_id?: string | null;
  notes?: string | null;
  expires_at?: string | null;
  added_at: string;
  updated_at: string;
}
