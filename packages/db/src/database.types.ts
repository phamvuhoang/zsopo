
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "commerce": {
          Tables: {
            "idempotency_keys": {
                  Row: {
                    "created_at": string,"key": string,"request_hash": string,"result": Json | null,"scope": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"key": string,"request_hash": string,"result"?: Json | null,"scope": string
                  }
                  Update: {
                    "created_at"?: string,"key"?: string,"request_hash"?: string,"result"?: Json | null,"scope"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ledger_entries": {
                  Row: {
                    "account": string,"amount": number,"created_at": string,"entity_id": string,"event_id": string,"id": number,"recognition_date": string,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account": string,"amount": number,"created_at"?: string,"entity_id": string,"event_id": string,"id"?: never,"recognition_date"?: string,"source": string
                  }
                  Update: {
                    "account"?: string,"amount"?: number,"created_at"?: string,"entity_id"?: string,"event_id"?: string,"id"?: never,"recognition_date"?: string,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_entries_event_id_entity_id_fkey"
      columns: ["event_id","entity_id"]
isOneToOne: false
      referencedRelation: "ledger_events"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"ledger_events": {
                  Row: {
                    "created_at": string,"created_by": string | null,"entity_id": string,"id": string,"kind": string,"location_id": string | null,"order_id": string | null,"payment_id": string | null,"reversal_of": string | null,"source_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id": string,"id"?: string,"kind": string,"location_id"?: string | null,"order_id"?: string | null,"payment_id"?: string | null,"reversal_of"?: string | null,"source_key": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"id"?: string,"kind"?: string,"location_id"?: string | null,"order_id"?: string | null,"payment_id"?: string | null,"reversal_of"?: string | null,"source_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_events_order_id_entity_id_fkey"
      columns: ["order_id","entity_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","entity_id"]
    },{
      foreignKeyName: "ledger_events_reversal_of_fkey"
      columns: ["reversal_of"]
isOneToOne: false
      referencedRelation: "ledger_events"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "amount": number,"completed_at": string | null,"created_at": string,"created_by": string | null,"entity_id": string,"id": string,"item_id": string | null,"item_type": string,"order_id": string,"qty": number,"revenue_source": string | null,"reversal_of": string | null,"service_date": string | null,"snapshot": NonNullable<Json>,"status": string,"title": string,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"id"?: string,"item_id"?: string | null,"item_type": string,"order_id": string,"qty": number,"revenue_source"?: string | null,"reversal_of"?: string | null,"service_date"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"title"?: string,"unit_price": number
                  }
                  Update: {
                    "amount"?: number,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"id"?: string,"item_id"?: string | null,"item_type"?: string,"order_id"?: string,"qty"?: number,"revenue_source"?: string | null,"reversal_of"?: string | null,"service_date"?: string | null,"snapshot"?: NonNullable<Json>,"status"?: string,"title"?: string,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_entity_id_fkey"
      columns: ["order_id","entity_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","entity_id"]
    },{
      foreignKeyName: "order_items_reversal_of_fkey"
      columns: ["reversal_of"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "code": string,"collected_by": string | null,"contact_snapshot": NonNullable<Json>,"created_at": string,"created_by": string | null,"currency": string,"customer_id": string | null,"deposit_due": number,"discount": number,"due_at": string | null,"entity_id": string,"id": string,"kind": string,"location_id": string | null,"paid_amount": number,"payment_status": string,"policy_snapshot": NonNullable<Json>,"source": string,"status": string,"subtotal": number,"total": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string,"collected_by"?: string | null,"contact_snapshot"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"customer_id"?: string | null,"deposit_due"?: number,"discount"?: number,"due_at"?: string | null,"entity_id": string,"id"?: string,"kind": string,"location_id"?: string | null,"paid_amount"?: number,"payment_status"?: string,"policy_snapshot"?: NonNullable<Json>,"source"?: string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "code"?: string,"collected_by"?: string | null,"contact_snapshot"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"customer_id"?: string | null,"deposit_due"?: number,"discount"?: number,"due_at"?: string | null,"entity_id"?: string,"id"?: string,"kind"?: string,"location_id"?: string | null,"paid_amount"?: number,"payment_status"?: string,"policy_snapshot"?: NonNullable<Json>,"source"?: string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"payment_allocations": {
                  Row: {
                    "amount": number,"created_at": string,"entity_id": string,"id": string,"order_id": string,"payment_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"entity_id": string,"id"?: string,"order_id": string,"payment_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"entity_id"?: string,"id"?: string,"order_id"?: string,"payment_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_allocations_order_id_entity_id_fkey"
      columns: ["order_id","entity_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","entity_id"]
    },{
      foreignKeyName: "payment_allocations_payment_id_entity_id_fkey"
      columns: ["payment_id","entity_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"entity_id": string,"evidence_id": string | null,"evidence_note": string | null,"id": string,"provider": string,"provider_ref": string,"received_at": string,"recorded_by": string | null,"review_reason": string | null,"shift_id": string | null,"state": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"entity_id": string,"evidence_id"?: string | null,"evidence_note"?: string | null,"id"?: string,"provider": string,"provider_ref": string,"received_at": string,"recorded_by"?: string | null,"review_reason"?: string | null,"shift_id"?: string | null,"state"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"entity_id"?: string,"evidence_id"?: string | null,"evidence_note"?: string | null,"id"?: string,"provider"?: string,"provider_ref"?: string,"received_at"?: string,"recorded_by"?: string | null,"review_reason"?: string | null,"shift_id"?: string | null,"state"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"refund_requests": {
                  Row: {
                    "amount": number,"approved_at": string | null,"approved_by": string | null,"created_at": string,"entity_id": string,"evidence_id": string | null,"evidence_note": string | null,"id": string,"order_id": string,"reason": string,"requested_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"entity_id": string,"evidence_id"?: string | null,"evidence_note"?: string | null,"id"?: string,"order_id": string,"reason": string,"requested_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"entity_id"?: string,"evidence_id"?: string | null,"evidence_note"?: string | null,"id"?: string,"order_id"?: string,"reason"?: string,"requested_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "refund_requests_order_id_entity_id_fkey"
      columns: ["order_id","entity_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "idem_get":
{ Args: { "p_hash": string,"p_key": string,"p_scope": string }; Returns: Json
                           },
"idem_put":
{ Args: { "p_hash": string,"p_key": string,"p_result": Json,"p_scope": string }; Returns: Json
                           },
"post_ledger":
{ Args: { "p_entity": string,"p_kind": string,"p_lines": Json,"p_location": string,"p_order": string,"p_payment": string,"p_recognition"?: string,"p_reversal_of"?: string,"p_source_key": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"content": {
          Tables: {
            "pages": {
                  Row: {
                    "approved_by": string | null,"body_md": string,"created_at": string,"entity_id": string,"excerpt": string,"id": string,"kind": string,"published_at": string | null,"slug": string,"status": string,"title": string,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"body_md"?: string,"created_at"?: string,"entity_id": string,"excerpt"?: string,"id"?: string,"kind": string,"published_at"?: string | null,"slug": string,"status"?: string,"title": string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "approved_by"?: string | null,"body_md"?: string,"created_at"?: string,"entity_id"?: string,"excerpt"?: string,"id"?: string,"kind"?: string,"published_at"?: string | null,"slug"?: string,"status"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "policies_published":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"core": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"diff": NonNullable<Json>,"entity_id": string | null,"id": number,"reason": string | null,"subject_id": string | null,"subject_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"diff"?: NonNullable<Json>,"entity_id"?: string | null,"id"?: never,"reason"?: string | null,"subject_id"?: string | null,"subject_type": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"diff"?: NonNullable<Json>,"entity_id"?: string | null,"id"?: never,"reason"?: string | null,"subject_id"?: string | null,"subject_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    }
                  ]
                },"consent_records": {
                  Row: {
                    "accepted_at": string,"customer_id": string,"entity_id": string,"id": string,"purpose": string,"revoked_at": string | null,"source": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string,"customer_id": string,"entity_id": string,"id"?: string,"purpose": string,"revoked_at"?: string | null,"source"?: string,"version": string
                  }
                  Update: {
                    "accepted_at"?: string,"customer_id"?: string,"entity_id"?: string,"id"?: string,"purpose"?: string,"revoked_at"?: string | null,"source"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consent_records_customer_id_entity_id_fkey"
      columns: ["customer_id","entity_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"customer_contacts": {
                  Row: {
                    "created_at": string,"customer_id": string,"entity_id": string,"id": string,"kind": string,"normalized": string,"value": string,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id": string,"entity_id": string,"id"?: string,"kind": string,"normalized": string,"value": string,"verified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"entity_id"?: string,"id"?: string,"kind"?: string,"normalized"?: string,"value"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_contacts_customer_id_entity_id_fkey"
      columns: ["customer_id","entity_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"display_name": string,"entity_id": string,"id": string,"merged_into": string | null,"source": string,"updated_at": string,"user_id": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"entity_id": string,"id"?: string,"merged_into"?: string | null,"source"?: string,"updated_at"?: string,"user_id"?: string | null,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"entity_id"?: string,"id"?: string,"merged_into"?: string | null,"source"?: string,"updated_at"?: string,"user_id"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customers_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"energy_cards": {
                  Row: {
                    "bovis_reference": number | null,"chakras": (string)[],"created_at": string,"entity_id": string,"frequency": string | null,"id": string,"origin": string,"purpose": string,"ritual_video_url": string | null,"status": string,"stones": (string)[],"symbols": (string)[],"title": string,"updated_at": string,"usage": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "bovis_reference"?: number | null,"chakras"?: (string)[],"created_at"?: string,"entity_id": string,"frequency"?: string | null,"id"?: string,"origin": string,"purpose": string,"ritual_video_url"?: string | null,"status"?: string,"stones"?: (string)[],"symbols"?: (string)[],"title": string,"updated_at"?: string,"usage": string,"version"?: number
                  }
                  Update: {
                    "bovis_reference"?: number | null,"chakras"?: (string)[],"created_at"?: string,"entity_id"?: string,"frequency"?: string | null,"id"?: string,"origin"?: string,"purpose"?: string,"ritual_video_url"?: string | null,"status"?: string,"stones"?: (string)[],"symbols"?: (string)[],"title"?: string,"updated_at"?: string,"usage"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "energy_cards_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    }
                  ]
                },"entities": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"kind": string,"name": string,"parent_entity_id": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"kind": string,"name": string,"parent_entity_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"name"?: string,"parent_entity_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "entities_parent_entity_id_fkey"
      columns: ["parent_entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    }
                  ]
                },"guest_access_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"revoked_at": string | null,"scope": string,"subject_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"scope": string,"subject_id": string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"scope"?: string,"subject_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"locations": {
                  Row: {
                    "address": string | null,"check_in_time": string,"check_out_time": string,"created_at": string,"entity_id": string,"id": string,"name": string,"sellable_config": NonNullable<Json>,"slug": string,"status": string,"timezone": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"check_in_time"?: string,"check_out_time"?: string,"created_at"?: string,"entity_id": string,"id"?: string,"name": string,"sellable_config"?: NonNullable<Json>,"slug": string,"status"?: string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "address"?: string | null,"check_in_time"?: string,"check_out_time"?: string,"created_at"?: string,"entity_id"?: string,"id"?: string,"name"?: string,"sellable_config"?: NonNullable<Json>,"slug"?: string,"status"?: string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "locations_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    }
                  ]
                },"media": {
                  Row: {
                    "alt": string | null,"bucket": string,"bytes": number,"classification": string,"created_at": string,"entity_id": string,"expires_at": string | null,"id": string,"location_id": string | null,"mime": string,"owner_id": string | null,"path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string | null,"bucket": string,"bytes": number,"classification": string,"created_at"?: string,"entity_id": string,"expires_at"?: string | null,"id"?: string,"location_id"?: string | null,"mime": string,"owner_id"?: string | null,"path": string
                  }
                  Update: {
                    "alt"?: string | null,"bucket"?: string,"bytes"?: number,"classification"?: string,"created_at"?: string,"entity_id"?: string,"expires_at"?: string | null,"id"?: string,"location_id"?: string | null,"mime"?: string,"owner_id"?: string | null,"path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_location_id_entity_id_fkey"
      columns: ["location_id","entity_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"outbox": {
                  Row: {
                    "aggregate_id": string | null,"attempts": number,"created_at": string,"dedupe_key": string,"entity_id": string | null,"id": string,"kind": string,"last_error": string | null,"locked_until": string | null,"next_run_at": string,"payload": NonNullable<Json>,"provider_id": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aggregate_id"?: string | null,"attempts"?: number,"created_at"?: string,"dedupe_key": string,"entity_id"?: string | null,"id"?: string,"kind": string,"last_error"?: string | null,"locked_until"?: string | null,"next_run_at"?: string,"payload"?: NonNullable<Json>,"provider_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "aggregate_id"?: string | null,"attempts"?: number,"created_at"?: string,"dedupe_key"?: string,"entity_id"?: string | null,"id"?: string,"kind"?: string,"last_error"?: string | null,"locked_until"?: string | null,"next_run_at"?: string,"payload"?: NonNullable<Json>,"provider_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "outbox_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    }
                  ]
                },"privacy_requests": {
                  Row: {
                    "created_at": string,"customer_id": string | null,"due_at": string,"entity_id": string,"id": string,"kind": string,"notes": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_id"?: string | null,"due_at"?: string,"entity_id": string,"id"?: string,"kind": string,"notes"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string | null,"due_at"?: string,"entity_id"?: string,"id"?: string,"kind"?: string,"notes"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "privacy_requests_customer_id_entity_id_fkey"
      columns: ["customer_id","entity_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","entity_id"]
    },{
      foreignKeyName: "privacy_requests_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"disabled_at": string | null,"display_name": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"disabled_at"?: string | null,"display_name"?: string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"disabled_at"?: string | null,"display_name"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "action": string,"requires_aal2": boolean,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"requires_aal2"?: boolean,"role": string
                  }
                  Update: {
                    "action"?: string,"requires_aal2"?: boolean,"role"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"disabled_at": string | null,"entity_id": string | null,"granted_by": string | null,"id": string,"location_id": string | null,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"disabled_at"?: string | null,"entity_id"?: string | null,"granted_by"?: string | null,"id"?: string,"location_id"?: string | null,"role": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"disabled_at"?: string | null,"entity_id"?: string | null,"granted_by"?: string | null,"id"?: string,"location_id"?: string | null,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_entity_id_fkey"
      columns: ["entity_id"]
isOneToOne: false
      referencedRelation: "entities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_location_id_entity_id_fkey"
      columns: ["location_id","entity_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "audit":
{ Args: { "p_action": string,"p_diff"?: Json,"p_entity": string,"p_reason"?: string,"p_subject_id": string,"p_subject_type": string }; Returns: undefined
                           },
"auth_has_role":
{ Args: { "p_entity": string,"p_location"?: string,"p_role": string }; Returns: boolean
                           },
"disable_staff":
{ Args: { "p_reason": string,"p_user": string }; Returns: undefined
                           },
"enable_staff":
{ Args: { "p_reason": string,"p_user": string }; Returns: undefined
                           },
"enqueue":
{ Args: { "p_aggregate": string,"p_dedupe": string,"p_entity": string,"p_kind": string,"p_payload": Json,"p_run_at"?: string }; Returns: string
                           },
"forbid":
{ Args: { "p_msg"?: string }; Returns: undefined
                           },
"grant_role":
{ Args: { "p_entity": string,"p_location"?: string,"p_role": string,"p_user": string }; Returns: string
                           },
"has_permission":
{ Args: { "p_action": string,"p_entity": string,"p_location"?: string }; Returns: boolean
                           },
"is_staff_of":
{ Args: { "p_entity": string,"p_location"?: string }; Returns: boolean
                           },
"my_roles":
{ Args: Record<PropertyKey, never>; Returns: {
              "entity_id": string,"location_id": string,"role": string
            }[]
                           },
"permission_needs_mfa":
{ Args: { "p_action": string,"p_entity": string,"p_location"?: string }; Returns: boolean
                           },
"redact":
{ Args: { "p": Json }; Returns: Json
                           },
"revoke_role":
{ Args: { "p_reason": string,"p_role_id": string }; Returns: undefined
                           },
"staff_directory":
{ Args: Record<PropertyKey, never>; Returns: {
              "disabled_at": string,"display_name": string,"email": string,"roles": Json,"user_id": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"crm": {
          Tables: {
            [_ in never]: never
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
        },"ops_config": {
          Tables: {
            "runtime_settings": {
                  Row: {
                    "entity_id": string | null,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id"?: string | null,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>,"version"?: number
                  }
                  Update: {
                    "entity_id"?: string | null,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    
                  ]
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
        },"public": {
          Tables: {
            [_ in never]: never
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
        },"shop": {
          Tables: {
            "categories": {
                  Row: {
                    "description": string,"id": string,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"id"?: string,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "description"?: string,"id"?: string,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"inventory": {
                  Row: {
                    "entity_id": string,"on_hand": number,"reserved": number,"updated_at": string,"variant_id": string,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id": string,"on_hand"?: number,"reserved"?: number,"updated_at"?: string,"variant_id": string,"warehouse_id": string
                  }
                  Update: {
                    "entity_id"?: string,"on_hand"?: number,"reserved"?: number,"updated_at"?: string,"variant_id"?: string,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_variant_id_entity_id_fkey"
      columns: ["variant_id","entity_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id","entity_id"]
    },{
      foreignKeyName: "inventory_warehouse_id_entity_id_fkey"
      columns: ["warehouse_id","entity_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "active": boolean,"attrs": NonNullable<Json>,"created_at": string,"entity_id": string,"id": string,"name": string,"price": number,"product_id": string,"sku": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"attrs"?: NonNullable<Json>,"created_at"?: string,"entity_id": string,"id"?: string,"name": string,"price": number,"product_id": string,"sku": string
                  }
                  Update: {
                    "active"?: boolean,"attrs"?: NonNullable<Json>,"created_at"?: string,"entity_id"?: string,"id"?: string,"name"?: string,"price"?: number,"product_id"?: string,"sku"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_entity_id_fkey"
      columns: ["product_id","entity_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","entity_id"]
    }
                  ]
                },"products": {
                  Row: {
                    "category_id": string,"created_at": string,"description": string,"energy_card_id": string | null,"entity_id": string,"id": string,"name": string,"origin": string,"photo_ids": (string)[],"ritual_slug": string | null,"slug": string,"status": string,"summary": string,"updated_at": string,"usage": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"description"?: string,"energy_card_id"?: string | null,"entity_id": string,"id"?: string,"name": string,"origin"?: string,"photo_ids"?: (string)[],"ritual_slug"?: string | null,"slug": string,"status"?: string,"summary"?: string,"updated_at"?: string,"usage"?: string,"version"?: number
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"description"?: string,"energy_card_id"?: string | null,"entity_id"?: string,"id"?: string,"name"?: string,"origin"?: string,"photo_ids"?: (string)[],"ritual_slug"?: string | null,"slug"?: string,"status"?: string,"summary"?: string,"updated_at"?: string,"usage"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"warehouses": {
                  Row: {
                    "code": string,"entity_id": string,"id": string,"location_id": string | null,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"entity_id": string,"id"?: string,"location_id"?: string | null,"name": string
                  }
                  Update: {
                    "code"?: string,"entity_id"?: string,"id"?: string,"location_id"?: string | null,"name"?: string
                  }
                  Relationships: [
                    
                  ]
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
        },"stay": {
          Tables: {
            "rooms": {
                  Row: {
                    "amenities": (string)[],"area_m2": number | null,"capacity_adults": number,"capacity_children": number,"cleanliness": string,"code": string,"created_at": string,"description": string,"energy_card_id": string | null,"entity_id": string,"id": string,"location_id": string,"max_guests": number,"name": string,"occupancy": string,"photo_ids": (string)[],"room_type": string,"safety_block": boolean,"sellable": boolean,"slug": string,"sort": number,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amenities"?: (string)[],"area_m2"?: number | null,"capacity_adults": number,"capacity_children"?: number,"cleanliness"?: string,"code": string,"created_at"?: string,"description"?: string,"energy_card_id"?: string | null,"entity_id": string,"id"?: string,"location_id": string,"max_guests": number,"name": string,"occupancy"?: string,"photo_ids"?: (string)[],"room_type": string,"safety_block"?: boolean,"sellable"?: boolean,"slug": string,"sort"?: number,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "amenities"?: (string)[],"area_m2"?: number | null,"capacity_adults"?: number,"capacity_children"?: number,"cleanliness"?: string,"code"?: string,"created_at"?: string,"description"?: string,"energy_card_id"?: string | null,"entity_id"?: string,"id"?: string,"location_id"?: string,"max_guests"?: number,"name"?: string,"occupancy"?: string,"photo_ids"?: (string)[],"room_type"?: string,"safety_block"?: boolean,"sellable"?: boolean,"slug"?: string,"sort"?: number,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
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
  "commerce": {
          Enums: {
            
          }
        },"content": {
          Enums: {
            
          }
        },"core": {
          Enums: {
            
          }
        },"crm": {
          Enums: {
            
          }
        },"ops_config": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        },"shop": {
          Enums: {
            
          }
        },"stay": {
          Enums: {
            
          }
        }
} as const
