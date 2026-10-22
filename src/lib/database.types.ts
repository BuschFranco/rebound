
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categories": {
                  Row: {
                    "complements": (string)[],"image_url": string,"label": string,"size_guide": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "complements"?: (string)[],"image_url": string,"label": string,"size_guide"?: string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "complements"?: (string)[],"image_url"?: string,"label"?: string,"size_guide"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"inventory_movements": {
                  Row: {
                    "color": string,"created_at": string,"happened_at": string,"id": number,"kind": string,"note": string | null,"product_id": string,"quantity": number,"sale_id": number | null,"size": string,"unit_cost": number | null
                  }
                  Insert: {
                    "color": string,"created_at"?: string,"happened_at"?: string,"id"?: never,"kind": string,"note"?: string | null,"product_id": string,"quantity": number,"sale_id"?: number | null,"size": string,"unit_cost"?: number | null
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"happened_at"?: string,"id"?: never,"kind"?: string,"note"?: string | null,"product_id"?: string,"quantity"?: number,"sale_id"?: number | null,"size"?: string,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    }
                  ]
                },"order_intents": {
                  Row: {
                    "created_at": string,"discount": number | null,"id": number,"items": NonNullable<Json>,"partido": string | null,"promo_label": string | null,"sale_id": number | null,"shipping": number | null,"status": string,"subtotal": number | null,"total": number,"units": number,"zone_name": string | null
                  }
                  Insert: {
                    "created_at"?: string,"discount"?: number | null,"id"?: never,"items": NonNullable<Json>,"partido"?: string | null,"promo_label"?: string | null,"sale_id"?: number | null,"shipping"?: number | null,"status"?: string,"subtotal"?: number | null,"total": number,"units": number,"zone_name"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"discount"?: number | null,"id"?: never,"items"?: NonNullable<Json>,"partido"?: string | null,"promo_label"?: string | null,"sale_id"?: number | null,"shipping"?: number | null,"status"?: string,"subtotal"?: number | null,"total"?: number,"units"?: number,"zone_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_intents_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"category_slug": string,"colors": NonNullable<Json>,"compare_at_price": number | null,"created_at": string,"description": string,"highlights": (string)[],"id": string,"images": (string)[],"name": string,"price": number,"published_at": string,"sizes": (string)[],"slug": string,"sold_out_sizes": (string)[],"sort_order": number,"stock_status": NonNullable<Json>,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"category_slug": string,"colors": NonNullable<Json>,"compare_at_price"?: number | null,"created_at"?: string,"description"?: string,"highlights"?: (string)[],"id"?: string,"images": (string)[],"name": string,"price": number,"published_at"?: string,"sizes": (string)[],"slug": string,"sold_out_sizes"?: (string)[],"sort_order"?: number,"stock_status"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"category_slug"?: string,"colors"?: NonNullable<Json>,"compare_at_price"?: number | null,"created_at"?: string,"description"?: string,"highlights"?: (string)[],"id"?: string,"images"?: (string)[],"name"?: string,"price"?: number,"published_at"?: string,"sizes"?: (string)[],"slug"?: string,"sold_out_sizes"?: (string)[],"sort_order"?: number,"stock_status"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["slug"]
    }
                  ]
                },"promotions": {
                  Row: {
                    "active": boolean,"banner_cta": string | null,"banner_eyebrow": string | null,"banner_image_url": string | null,"banner_text": string | null,"banner_title": string | null,"buy": number | null,"category_slugs": (string)[],"created_at": string,"ends_at": string,"id": string,"kind": string,"label": string,"min_amount": number | null,"min_units": number | null,"nth": number | null,"pay": number | null,"percent": number | null,"product_ids": (string)[],"scope": string | null,"shipping_rule": string | null,"starts_at": string
                  }
                  Insert: {
                    "active"?: boolean,"banner_cta"?: string | null,"banner_eyebrow"?: string | null,"banner_image_url"?: string | null,"banner_text"?: string | null,"banner_title"?: string | null,"buy"?: number | null,"category_slugs"?: (string)[],"created_at"?: string,"ends_at": string,"id": string,"kind"?: string,"label": string,"min_amount"?: number | null,"min_units"?: number | null,"nth"?: number | null,"pay"?: number | null,"percent"?: number | null,"product_ids"?: (string)[],"scope"?: string | null,"shipping_rule"?: string | null,"starts_at": string
                  }
                  Update: {
                    "active"?: boolean,"banner_cta"?: string | null,"banner_eyebrow"?: string | null,"banner_image_url"?: string | null,"banner_text"?: string | null,"banner_title"?: string | null,"buy"?: number | null,"category_slugs"?: (string)[],"created_at"?: string,"ends_at"?: string,"id"?: string,"kind"?: string,"label"?: string,"min_amount"?: number | null,"min_units"?: number | null,"nth"?: number | null,"pay"?: number | null,"percent"?: number | null,"product_ids"?: (string)[],"scope"?: string | null,"shipping_rule"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sales": {
                  Row: {
                    "cancelled_at": string | null,"cost": number,"created_at": string,"id": number,"items": NonNullable<Json>,"note": string | null,"order_intent_id": number | null,"revenue": number,"sold_at": string,"source": string
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"cost": number,"created_at"?: string,"id"?: never,"items": NonNullable<Json>,"note"?: string | null,"order_intent_id"?: number | null,"revenue": number,"sold_at"?: string,"source": string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"cost"?: number,"created_at"?: string,"id"?: never,"items"?: NonNullable<Json>,"note"?: string | null,"order_intent_id"?: number | null,"revenue"?: number,"sold_at"?: string,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_order_intent_id_fkey"
      columns: ["order_intent_id"]
isOneToOne: false
      referencedRelation: "order_intents"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_zone_areas": {
                  Row: {
                    "departamento_id": string | null,"id": number,"provincia_id": string,"zone_id": string
                  }
                  Insert: {
                    "departamento_id"?: string | null,"id"?: never,"provincia_id": string,"zone_id": string
                  }
                  Update: {
                    "departamento_id"?: string | null,"id"?: never,"provincia_id"?: string,"zone_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipping_zone_areas_zone_id_fkey"
      columns: ["zone_id"]
isOneToOne: false
      referencedRelation: "shipping_zones"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_zones": {
                  Row: {
                    "active": boolean,"eta_label": string,"free_from": number | null,"id": string,"name": string,"price": number,"sort_order": number
                  }
                  Insert: {
                    "active"?: boolean,"eta_label": string,"free_from"?: number | null,"id": string,"name": string,"price": number,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"eta_label"?: string,"free_from"?: number | null,"id"?: string,"name"?: string,"price"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"site_banners": {
                  Row: {
                    "cta": string | null,"eyebrow": string | null,"id": string,"image_url": string | null,"text": string | null,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "cta"?: string | null,"eyebrow"?: string | null,"id": string,"image_url"?: string | null,"text"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "cta"?: string | null,"eyebrow"?: string | null,"id"?: string,"image_url"?: string | null,"text"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "adjust_stock":
{ Args: { "p": Json }; Returns: undefined
                           },
"best_sellers":
{ Args: Record<PropertyKey, never>; Returns: {
              "product_id": string
            }[]
                           },
"cancel_sale":
{ Args: { "p_id": number }; Returns: undefined
                           },
"compute_stock_status":
{ Args: { "p_colors": Json,"p_id": string,"p_sizes": (string)[] }; Returns: Json
                           },
"log_order_intent":
{ Args: { "p_discount"?: number,"p_items": Json,"p_partido"?: string,"p_promo_label"?: string,"p_shipping"?: number,"p_subtotal"?: number,"p_total": number,"p_zone_name"?: string }; Returns: undefined
                           },
"record_purchase":
{ Args: { "p": Json }; Returns: undefined
                           },
"record_sale":
{ Args: { "p": Json }; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
