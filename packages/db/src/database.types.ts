
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "commerce": {
          Tables: {
            "cash_movements": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"entity_id": string,"evidence_id": string | null,"id": string,"kind": string,"note": string | null,"payment_id": string | null,"shift_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"evidence_id"?: string | null,"id"?: string,"kind": string,"note"?: string | null,"payment_id"?: string | null,"shift_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"evidence_id"?: string | null,"id"?: string,"kind"?: string,"note"?: string | null,"payment_id"?: string | null,"shift_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_movements_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: true
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"idempotency_keys": {
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
                    "cod_overdue_at": string | null,"code": string,"collected_by": string | null,"contact_snapshot": NonNullable<Json>,"created_at": string,"created_by": string | null,"currency": string,"customer_id": string | null,"deposit_due": number,"discount": number,"due_at": string | null,"entity_id": string,"fulfillment_status": string | null,"id": string,"kind": string,"location_id": string | null,"paid_amount": number,"payment_method": string | null,"payment_status": string,"policy_snapshot": NonNullable<Json>,"ritual_required": boolean,"ritual_started_at": string | null,"shipping_fee": number,"source": string,"status": string,"subtotal": number,"total": number,"updated_at": string,"version": number,"can_record_payment": boolean | null
                  }
                  ComputedFields: "can_record_payment"
                  Insert: {
                    "cod_overdue_at"?: string | null,"code"?: string,"collected_by"?: string | null,"contact_snapshot"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"customer_id"?: string | null,"deposit_due"?: number,"discount"?: number,"due_at"?: string | null,"entity_id": string,"fulfillment_status"?: string | null,"id"?: string,"kind": string,"location_id"?: string | null,"paid_amount"?: number,"payment_method"?: string | null,"payment_status"?: string,"policy_snapshot"?: NonNullable<Json>,"ritual_required"?: boolean,"ritual_started_at"?: string | null,"shipping_fee"?: number,"source"?: string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "cod_overdue_at"?: string | null,"code"?: string,"collected_by"?: string | null,"contact_snapshot"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"customer_id"?: string | null,"deposit_due"?: number,"discount"?: number,"due_at"?: string | null,"entity_id"?: string,"fulfillment_status"?: string | null,"id"?: string,"kind"?: string,"location_id"?: string | null,"paid_amount"?: number,"payment_method"?: string | null,"payment_status"?: string,"policy_snapshot"?: NonNullable<Json>,"ritual_required"?: boolean,"ritual_started_at"?: string | null,"shipping_fee"?: number,"source"?: string,"status"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"version"?: number
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
                },"payment_claims": {
                  Row: {
                    "entity_id": string,"id": string,"order_id": string,"reported_at": string,"resolved_at": string | null,"resolved_by": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id": string,"id"?: string,"order_id": string,"reported_at"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Update: {
                    "entity_id"?: string,"id"?: string,"order_id"?: string,"reported_at"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_claims_order_id_entity_id_fkey"
      columns: ["order_id","entity_id"]
isOneToOne: false
      referencedRelation: "orders"
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
            "apply_review_payments":
{ Args: { "p_order": string }; Returns: number
                           },
"approve_refund":
{ Args: { "p_evidence_note": string,"p_method"?: string,"p_provider_ref": string,"p_refund": string }; Returns: undefined
                           },
"can_record_payment":
{ Args: { "o": Omit<Database["commerce"]['Tables']["orders"]['Row'], Database["commerce"]['Tables']["orders"]['ComputedFields']> }; Returns: boolean
                           },
"claim_order":
{ Args: { "p_token": string }; Returns: undefined
                           },
"exchange_guest_token":
{ Args: { "p_token": string }; Returns: Json
                           },
"export_ledger":
{ Args: { "p_account"?: string,"p_entity": string }; Returns: Json
                           },
"get_guest_receipt":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_guest_receipt_v2":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_guest_receipt_v3":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_location_metrics":
{ Args: { "p_entity": string,"p_from": string,"p_location": string,"p_to": string }; Returns: Json
                           },
"idem_get":
{ Args: { "p_hash": string,"p_key": string,"p_scope": string }; Returns: Json
                           },
"idem_put":
{ Args: { "p_hash": string,"p_key": string,"p_result": Json,"p_scope": string }; Returns: Json
                           },
"orders_to_settle":
{ Args: { "p_limit"?: number }; Returns: {
              "booking_id": string,"booking_state": string,"code": string,"contact_snapshot": Json,"created_at": string,"deposit_due": number,"due_at": string,"fulfillment_status": string,"id": string,"kind": string,"paid_amount": number,"payment_status": string,"refundable": number,"status": string,"total": number
            }[]
                           },
"post_ledger":
{ Args: { "p_entity": string,"p_kind": string,"p_lines": Json,"p_location": string,"p_order": string,"p_payment": string,"p_recognition"?: string,"p_reversal_of"?: string,"p_source_key": string }; Returns: string
                           },
"record_manual_sale":
{ Args: { "p_amount": number,"p_evidence_note": string,"p_location": string,"p_provider": string,"p_revenue_source": string,"p_title": string }; Returns: string
                           },
"record_payment_atomic":
{ Args: { "p_amount": number,"p_evidence_id"?: string,"p_evidence_note"?: string,"p_idempotency"?: string,"p_order": string,"p_provider": string,"p_provider_ref": string,"p_received_at": string,"p_shift"?: string }; Returns: Json
                           },
"refundable":
{ Args: { "p_order": string }; Returns: number
                           },
"report_transfer":
{ Args: { "p_token": string }; Returns: Json
                           },
"request_refund":
{ Args: { "p_amount": number,"p_order": string,"p_reason": string }; Returns: string
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
            "campaign_calendar": {
                  Row: {
                    "channel": string,"created_at": string,"entity_id": string,"id": string,"owner": string | null,"post_id": string | null,"status": string,"topic": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"created_at"?: string,"entity_id": string,"id"?: string,"owner"?: string | null,"post_id"?: string | null,"status"?: string,"topic": string,"week_start": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"entity_id"?: string,"id"?: string,"owner"?: string | null,"post_id"?: string | null,"status"?: string,"topic"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_calendar_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
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
                },"contact_leads": {
                  Row: {
                    "consent_at": string,"created_at": string,"email": string | null,"entity_id": string,"handled_at": string | null,"id": string,"message": string,"name": string,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at": string,"created_at"?: string,"email"?: string | null,"entity_id": string,"handled_at"?: string | null,"id"?: string,"message": string,"name": string,"phone"?: string | null
                  }
                  Update: {
                    "consent_at"?: string,"created_at"?: string,"email"?: string | null,"entity_id"?: string,"handled_at"?: string | null,"id"?: string,"message"?: string,"name"?: string,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"newsletter_subscriptions": {
                  Row: {
                    "consent_version": string,"email": string,"entity_id": string,"id": string,"status": string,"subscribed_at": string,"unsubscribed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_version"?: string,"email": string,"entity_id": string,"id"?: string,"status"?: string,"subscribed_at"?: string,"unsubscribed_at"?: string | null
                  }
                  Update: {
                    "consent_version"?: string,"email"?: string,"entity_id"?: string,"id"?: string,"status"?: string,"subscribed_at"?: string,"unsubscribed_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"newsletter_tokens": {
                  Row: {
                    "created_at": string,"subscription_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"subscription_id": string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"subscription_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "newsletter_tokens_subscription_id_fkey"
      columns: ["subscription_id"]
isOneToOne: false
      referencedRelation: "newsletter_subscriptions"
      referencedColumns: ["id"]
    }
                  ]
                },"page_drafts": {
                  Row: {
                    "body_md": string,"excerpt": string,"page_id": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body_md": string,"excerpt": string,"page_id": string,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body_md"?: string,"excerpt"?: string,"page_id"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "page_drafts_page_id_fkey"
      columns: ["page_id"]
isOneToOne: true
      referencedRelation: "pages"
      referencedColumns: ["id"]
    }
                  ]
                },"page_revisions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"page_id": string,"snapshot": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"page_id": string,"snapshot": NonNullable<Json>,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"page_id"?: string,"snapshot"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "page_revisions_page_id_fkey"
      columns: ["page_id"]
isOneToOne: false
      referencedRelation: "pages"
      referencedColumns: ["id"]
    }
                  ]
                },"pages": {
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
                },"post_drafts": {
                  Row: {
                    "post_id": string,"snapshot": NonNullable<Json>,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "post_id": string,"snapshot": NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "post_id"?: string,"snapshot"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_drafts_post_id_fkey"
      columns: ["post_id"]
isOneToOne: true
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_revisions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"post_id": string,"snapshot": NonNullable<Json>,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"post_id": string,"snapshot": NonNullable<Json>,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"post_id"?: string,"snapshot"?: NonNullable<Json>,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_revisions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string | null,"author_name": string,"body_md": string,"category_id": string | null,"cover_media_id": string | null,"created_at": string,"cta": Json | null,"entity_id": string,"excerpt": string,"id": string,"published_at": string | null,"reading_minutes": number,"scheduled_at": string | null,"search_tsv": unknown,"seo": NonNullable<Json>,"slug": string,"status": string,"title": string,"updated_at": string,"updated_by": string | null,"version": number,"snapshot_post": Json | null
                  }
                  ComputedFields: "snapshot_post"
                  Insert: {
                    "author_id"?: string | null,"author_name"?: string,"body_md"?: string,"category_id"?: string | null,"cover_media_id"?: string | null,"created_at"?: string,"cta"?: Json | null,"entity_id": string,"excerpt"?: string,"id"?: string,"published_at"?: string | null,"reading_minutes"?: number,"scheduled_at"?: string | null,"search_tsv"?: unknown,"seo"?: NonNullable<Json>,"slug": string,"status"?: string,"title": string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "author_id"?: string | null,"author_name"?: string,"body_md"?: string,"category_id"?: string | null,"cover_media_id"?: string | null,"created_at"?: string,"cta"?: Json | null,"entity_id"?: string,"excerpt"?: string,"id"?: string,"published_at"?: string | null,"reading_minutes"?: number,"scheduled_at"?: string | null,"search_tsv"?: unknown,"seo"?: NonNullable<Json>,"slug"?: string,"status"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"redirects": {
                  Row: {
                    "created_at": string,"from_path": string,"to_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_path": string,"to_path": string
                  }
                  Update: {
                    "created_at"?: string,"from_path"?: string,"to_path"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_snapshot":
{ Args: { "p_post": string,"p_status"?: string,"s": Json }; Returns: undefined
                           },
"archive_post":
{ Args: { "p_post": string }; Returns: undefined
                           },
"confirm_newsletter":
{ Args: { "p_token": string }; Returns: undefined
                           },
"policies_published":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"publish_content":
{ Args: { "p_expected_version": number,"p_post": string,"p_scheduled_at"?: string }; Returns: Json
                           },
"publish_due":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"restore_revision":
{ Args: { "p_post": string,"p_revision": string }; Returns: number
                           },
"save_page":
{ Args: { "p_body": string,"p_excerpt": string,"p_expected_version": number,"p_page": string,"p_publish": boolean,"p_title": string }; Returns: number
                           },
"save_post":
{ Args: { "p": Json }; Returns: string
                           },
"search_public":
{ Args: { "p_kinds"?: (string)[],"p_page"?: number,"p_query": string }; Returns: {
              "excerpt": string,"kind": string,"rank": number,"title": string,"url": string
            }[]
                           },
"snapshot_post":
{ Args: { "p": Omit<Database["content"]['Tables']["posts"]['Row'], Database["content"]['Tables']["posts"]['ComputedFields']> }; Returns: Json
                           },
"stage_post":
{ Args: { "cur": Omit<Database["content"]['Tables']["posts"]['Row'], Database["content"]['Tables']["posts"]['ComputedFields']>,"s": Json }; Returns: undefined
                           },
"submit_contact":
{ Args: { "p_consent": boolean,"p_email": string,"p_message": string,"p_name": string,"p_phone": string }; Returns: string
                           },
"submit_review":
{ Args: { "p_post": string }; Returns: undefined
                           },
"subscribe_newsletter":
{ Args: { "p_consent": boolean,"p_email": string }; Returns: undefined
                           },
"unsubscribe_newsletter":
{ Args: { "p_token": string }; Returns: undefined
                           },
"vn_tsv":
{ Args: { "p": string }; Returns: unknown
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
                },"rate_limits": {
                  Row: {
                    "bucket": string,"hits": number,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"hits"?: number,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"hits"?: number,"window_start"?: string
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
"claim_outbox":
{ Args: { "p_lease": string,"p_limit": number,"p_worker": string }; Returns: {
              "aggregate_id": string | null,
"attempts": number,
"created_at": string,
"dedupe_key": string,
"entity_id": string | null,
"id": string,
"kind": string,
"last_error": string | null,
"locked_until": string | null,
"next_run_at": string,
"payload": NonNullable<Json>,
"provider_id": string | null,
"status": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "outbox"
        isOneToOne: false
        isSetofReturn: true
      } },
"complete_outbox":
{ Args: { "p_error": string,"p_id": string,"p_provider_id": string,"p_status": string }; Returns: undefined
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
"fail":
{ Args: { "p_code": string,"p_detail"?: string }; Returns: undefined
                           },
"forbid":
{ Args: { "p_msg"?: string }; Returns: undefined
                           },
"grant_role":
{ Args: { "p_entity": string,"p_location"?: string,"p_role": string,"p_user": string }; Returns: string
                           },
"guest_subject":
{ Args: { "p_scope": string,"p_token": string }; Returns: string
                           },
"has_permission":
{ Args: { "p_action": string,"p_entity": string,"p_location"?: string }; Returns: boolean
                           },
"is_staff_of":
{ Args: { "p_entity": string,"p_location"?: string }; Returns: boolean
                           },
"issue_guest_token":
{ Args: { "p_expires": string,"p_scope": string,"p_subject": string }; Returns: string
                           },
"kick_ical_sync":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"kick_identity_purge":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"kick_notify":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"log_delivery":
{ Args: { "p_channel": string,"p_error": string,"p_outbox": string,"p_provider": string,"p_provider_id": string,"p_recipient": string,"p_status": string }; Returns: undefined
                           },
"my_roles":
{ Args: Record<PropertyKey, never>; Returns: {
              "entity_id": string,"location_id": string,"role": string
            }[]
                           },
"normalize_phone":
{ Args: { "p": string }; Returns: string
                           },
"permission_needs_mfa":
{ Args: { "p_action": string,"p_entity": string,"p_location"?: string }; Returns: boolean
                           },
"rate_limit":
{ Args: { "p_bucket": string,"p_max": number,"p_window"?: string }; Returns: undefined
                           },
"redact":
{ Args: { "p": Json }; Returns: Json
                           },
"render_outbox":
{ Args: { "p_id": string }; Returns: Json
                           },
"retry_outbox":
{ Args: { "p_id": string }; Returns: undefined
                           },
"revoke_role":
{ Args: { "p_reason": string,"p_role_id": string }; Returns: undefined
                           },
"staff_directory":
{ Args: Record<PropertyKey, never>; Returns: {
              "disabled_at": string,"display_name": string,"email": string,"roles": Json,"user_id": string
            }[]
                           },
"upsert_guest_customer":
{ Args: { "p_consents": Json,"p_entity": string,"p_guest": Json,"p_source": string }; Returns: string
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
            "campaign_recipients": {
                  Row: {
                    "campaign_id": string,"customer_id": string,"email": string,"id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"customer_id": string,"email": string,"id"?: string,"status"?: string
                  }
                  Update: {
                    "campaign_id"?: string,"customer_id"?: string,"email"?: string,"id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_recipients_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    }
                  ]
                },"campaigns": {
                  Row: {
                    "body": string,"channel": string,"created_at": string,"created_by": string | null,"entity_id": string,"id": string,"name": string,"segment_id": string | null,"sent_at": string | null,"sent_by": string | null,"status": string,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"channel"?: string,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"id"?: string,"name": string,"segment_id"?: string | null,"sent_at"?: string | null,"sent_by"?: string | null,"status"?: string,"subject": string
                  }
                  Update: {
                    "body"?: string,"channel"?: string,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"id"?: string,"name"?: string,"segment_id"?: string | null,"sent_at"?: string | null,"sent_by"?: string | null,"status"?: string,"subject"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaigns_segment_id_fkey"
      columns: ["segment_id"]
isOneToOne: false
      referencedRelation: "segments"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_merge_events": {
                  Row: {
                    "created_at": string,"entity_id": string,"id": string,"merged_id": string,"reason": string,"snapshot": NonNullable<Json>,"survivor_id": string,"verified_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entity_id": string,"id"?: string,"merged_id": string,"reason": string,"snapshot": NonNullable<Json>,"survivor_id": string,"verified_by": string
                  }
                  Update: {
                    "created_at"?: string,"entity_id"?: string,"id"?: string,"merged_id"?: string,"reason"?: string,"snapshot"?: NonNullable<Json>,"survivor_id"?: string,"verified_by"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customer_notes": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"customer_id": string,"entity_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"entity_id": string,"id"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"entity_id"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customer_tags": {
                  Row: {
                    "customer_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "customer_id": string,"tag_id": string
                  }
                  Update: {
                    "customer_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"segments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"entity_id": string,"filter_json": NonNullable<Json>,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id": string,"filter_json"?: NonNullable<Json>,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"filter_json"?: NonNullable<Json>,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"suppressions": {
                  Row: {
                    "created_at": string,"email": string,"entity_id": string,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"entity_id": string,"reason": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"entity_id"?: string,"reason"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tags": {
                  Row: {
                    "entity_id": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id": string,"id"?: string,"name": string
                  }
                  Update: {
                    "entity_id"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_note":
{ Args: { "p_body": string,"p_customer": string }; Returns: undefined
                           },
"customer_timeline":
{ Args: { "p_customer": string }; Returns: {
              "at": string,"detail": Json,"kind": string,"title": string
            }[]
                           },
"duplicate_suggestions":
{ Args: { "p_entity": string }; Returns: {
              "customer_ids": (string)[],"kind": string,"normalized": string
            }[]
                           },
"export_segment":
{ Args: { "p_entity": string,"p_filter": Json }; Returns: Json
                           },
"has_marketing_consent":
{ Args: { "p_customer": string }; Returns: boolean
                           },
"merge_customers":
{ Args: { "p_merged": string,"p_reason": string,"p_survivor": string,"p_verified": boolean }; Returns: undefined
                           },
"segment_count":
{ Args: { "p_entity": string,"p_filter": Json }; Returns: number
                           },
"segment_ids":
{ Args: { "p_entity": string,"p_filter": Json }; Returns: string[]
                           },
"segment_list":
{ Args: { "p_entity": string,"p_filter": Json,"p_limit"?: number,"p_offset"?: number }; Returns: {
              "created_at": string,"display_name": string,"email": string,"id": string,"marketing": boolean,"phone": string,"source": string
            }[]
                           },
"segment_rows":
{ Args: { "p_entity": string,"p_filter": Json }; Returns: {
              "created_at": string,"display_name": string,"email": string,"id": string,"marketing": boolean,"phone": string,"source": string
            }[]
                           },
"send_campaign":
{ Args: { "p_campaign": string }; Returns: number
                           },
"snapshot_campaign":
{ Args: { "p_campaign": string }; Returns: number
                           },
"tag_customer":
{ Args: { "p_customer": string,"p_tag": string }; Returns: undefined
                           },
"unsubscribe":
{ Args: { "p_token": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"ops_config": {
          Tables: {
            "delivery_logs": {
                  Row: {
                    "channel": string,"created_at": string,"entity_id": string | null,"error": string | null,"id": number,"outbox_id": string,"provider": string,"provider_id": string | null,"recipient_masked": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"created_at"?: string,"entity_id"?: string | null,"error"?: string | null,"id"?: never,"outbox_id": string,"provider": string,"provider_id"?: string | null,"recipient_masked"?: string | null,"status": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"entity_id"?: string | null,"error"?: string | null,"id"?: never,"outbox_id"?: string,"provider"?: string,"provider_id"?: string | null,"recipient_masked"?: string | null,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"incident_records": {
                  Row: {
                    "entity_id": string,"id": string,"location_id": string | null,"opened_at": string,"opened_by": string | null,"resolution": string | null,"resolved_at": string | null,"runbook": string | null,"severity": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id": string,"id"?: string,"location_id"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"runbook"?: string | null,"severity": string,"status"?: string,"title": string
                  }
                  Update: {
                    "entity_id"?: string,"id"?: string,"location_id"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"runbook"?: string | null,"severity"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"job_runs": {
                  Row: {
                    "detail": NonNullable<Json>,"entity_id": string | null,"finished_at": string | null,"id": number,"job": string,"started_at": string,"status": string,"subject_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "detail"?: NonNullable<Json>,"entity_id"?: string | null,"finished_at"?: string | null,"id"?: never,"job": string,"started_at"?: string,"status": string,"subject_id"?: string | null
                  }
                  Update: {
                    "detail"?: NonNullable<Json>,"entity_id"?: string | null,"finished_at"?: string | null,"id"?: never,"job"?: string,"started_at"?: string,"status"?: string,"subject_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"notification_templates": {
                  Row: {
                    "active": boolean,"allowed_vars": (string)[],"body": string,"channel": string,"entity_id": string,"id": string,"key": string,"subject": string,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"allowed_vars": (string)[],"body": string,"channel": string,"entity_id": string,"id"?: string,"key": string,"subject"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"allowed_vars"?: (string)[],"body"?: string,"channel"?: string,"entity_id"?: string,"id"?: string,"key"?: string,"subject"?: string,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"policy_versions": {
                  Row: {
                    "approved_by": string | null,"created_at": string,"created_by": string | null,"effective_from": string,"entity_id": string,"id": string,"kind": string,"location_id": string | null,"params": NonNullable<Json>,"summary_md": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"effective_from"?: string,"entity_id": string,"id"?: string,"kind": string,"location_id"?: string | null,"params": NonNullable<Json>,"summary_md"?: string,"version": number
                  }
                  Update: {
                    "approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"effective_from"?: string,"entity_id"?: string,"id"?: string,"kind"?: string,"location_id"?: string | null,"params"?: NonNullable<Json>,"summary_md"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"runtime_settings": {
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
            "current_policy":
{ Args: { "p_kind": string,"p_location": string }; Returns: {
              "approved_by": string | null,
"created_at": string,
"created_by": string | null,
"effective_from": string,
"entity_id": string,
"id": string,
"kind": string,
"location_id": string | null,
"params": NonNullable<Json>,
"summary_md": string,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "policy_versions"
        isOneToOne: true
        isSetofReturn: false
      } },
"health_summary":
{ Args: { "p_entity": string }; Returns: Json
                           },
"open_incident":
{ Args: { "p_location": string,"p_runbook"?: string,"p_severity": string,"p_title": string }; Returns: string
                           },
"publish_stay_policy":
{ Args: { "p_location": string,"p_params": Json,"p_summary": string }; Returns: string
                           },
"resolve_incident":
{ Args: { "p_incident": string,"p_resolution": string }; Returns: undefined
                           },
"set_setting":
{ Args: { "p_key": string,"p_public": boolean,"p_value": Json }; Returns: undefined
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
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "tests_as":
{ Args: { "p_user": string }; Returns: undefined
                           },
"tests_as_aal2":
{ Args: { "p_user": string }; Returns: undefined
                           },
"tests_make_order":
{ Args: { "p_location"?: string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"shop": {
          Tables: {
            "back_in_stock_requests": {
                  Row: {
                    "consent_at": string,"created_at": string,"email": string,"entity_id": string,"id": string,"notified_at": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_at": string,"created_at"?: string,"email": string,"entity_id": string,"id"?: string,"notified_at"?: string | null,"variant_id": string
                  }
                  Update: {
                    "consent_at"?: string,"created_at"?: string,"email"?: string,"entity_id"?: string,"id"?: string,"notified_at"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "back_in_stock_requests_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"cart_items": {
                  Row: {
                    "cart_id": string,"qty": number,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cart_id": string,"qty": number,"variant_id": string
                  }
                  Update: {
                    "cart_id"?: string,"qty"?: number,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cart_items_cart_id_fkey"
      columns: ["cart_id"]
isOneToOne: false
      referencedRelation: "carts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cart_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"carts": {
                  Row: {
                    "id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
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
                },"fulfillment_events": {
                  Row: {
                    "actor": string | null,"created_at": string,"from_status": string | null,"id": number,"note": string | null,"order_id": string,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"order_id": string,"to_status": string
                  }
                  Update: {
                    "actor"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"order_id"?: string,"to_status"?: string
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
                    "category_id": string,"created_at": string,"description": string,"energy_card_id": string | null,"entity_id": string,"id": string,"name": string,"origin": string,"photo_ids": (string)[],"requires_ritual": boolean,"ritual_slug": string | null,"slug": string,"status": string,"summary": string,"updated_at": string,"usage": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"description"?: string,"energy_card_id"?: string | null,"entity_id": string,"id"?: string,"name": string,"origin"?: string,"photo_ids"?: (string)[],"requires_ritual"?: boolean,"ritual_slug"?: string | null,"slug": string,"status"?: string,"summary"?: string,"updated_at"?: string,"usage"?: string,"version"?: number
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"description"?: string,"energy_card_id"?: string | null,"entity_id"?: string,"id"?: string,"name"?: string,"origin"?: string,"photo_ids"?: (string)[],"requires_ritual"?: boolean,"ritual_slug"?: string | null,"slug"?: string,"status"?: string,"summary"?: string,"updated_at"?: string,"usage"?: string,"version"?: number
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
                },"regions": {
                  Row: {
                    "active": boolean,"code": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"name": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ritual_contents": {
                  Row: {
                    "entity_id": string,"id": string,"intro": string,"slug": string,"status": string,"steps": NonNullable<Json>,"title": string,"updated_at": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "entity_id": string,"id"?: string,"intro"?: string,"slug": string,"status"?: string,"steps"?: NonNullable<Json>,"title": string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Update: {
                    "entity_id"?: string,"id"?: string,"intro"?: string,"slug"?: string,"status"?: string,"steps"?: NonNullable<Json>,"title"?: string,"updated_at"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"shipments": {
                  Row: {
                    "address": NonNullable<Json>,"carrier": string | null,"delivered_at": string | null,"entity_id": string,"id": string,"order_id": string,"shipped_at": string | null,"tracking": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address": NonNullable<Json>,"carrier"?: string | null,"delivered_at"?: string | null,"entity_id": string,"id"?: string,"order_id": string,"shipped_at"?: string | null,"tracking"?: string | null
                  }
                  Update: {
                    "address"?: NonNullable<Json>,"carrier"?: string | null,"delivered_at"?: string | null,"entity_id"?: string,"id"?: string,"order_id"?: string,"shipped_at"?: string | null,"tracking"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"shipping_rules": {
                  Row: {
                    "active": boolean,"entity_id": string,"fee": number,"free_threshold": number | null,"id": string,"region_code": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"entity_id": string,"fee": number,"free_threshold"?: number | null,"id"?: string,"region_code": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"entity_id"?: string,"fee"?: number,"free_threshold"?: number | null,"id"?: string,"region_code"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"stock_movements": {
                  Row: {
                    "actor": string | null,"created_at": string,"id": number,"kind": string,"note": string | null,"qty": number,"ref_id": string | null,"variant_id": string,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"created_at"?: string,"id"?: never,"kind": string,"note"?: string | null,"qty": number,"ref_id"?: string | null,"variant_id": string,"warehouse_id": string
                  }
                  Update: {
                    "actor"?: string | null,"created_at"?: string,"id"?: never,"kind"?: string,"note"?: string | null,"qty"?: number,"ref_id"?: string | null,"variant_id"?: string,"warehouse_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stock_reservations": {
                  Row: {
                    "created_at": string,"entity_id": string,"expires_at": string | null,"id": string,"order_id": string,"qty": number,"state": string,"variant_id": string,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entity_id": string,"expires_at"?: string | null,"id"?: string,"order_id": string,"qty": number,"state"?: string,"variant_id": string,"warehouse_id": string
                  }
                  Update: {
                    "created_at"?: string,"entity_id"?: string,"expires_at"?: string | null,"id"?: string,"order_id"?: string,"qty"?: number,"state"?: string,"variant_id"?: string,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_reservations_variant_id_warehouse_id_fkey"
      columns: ["variant_id","warehouse_id"]
isOneToOne: false
      referencedRelation: "inventory"
      referencedColumns: ["variant_id","warehouse_id"]
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
            "create_product":
{ Args: { "p": Json }; Returns: string
                           },
"create_shop_order":
{ Args: { "p_address": Json,"p_consents": Json,"p_email": string,"p_idempotency": string,"p_lines": Json,"p_method": string,"p_notes"?: string }; Returns: Json
                           },
"expire_unpaid_orders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"flag_overdue_cod":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"merge_cart":
{ Args: { "p_lines": Json }; Returns: Json
                           },
"price_cart":
{ Args: { "p_lines": Json,"p_region"?: string }; Returns: Json
                           },
"publish_product":
{ Args: { "p_product": string }; Returns: undefined
                           },
"receive_stock":
{ Args: { "p_note": string,"p_qty": number,"p_variant": string,"p_warehouse": string }; Returns: undefined
                           },
"release_reservation":
{ Args: { "p_reservation": string }; Returns: undefined
                           },
"request_back_in_stock":
{ Args: { "p_consent": boolean,"p_email": string,"p_variant": string }; Returns: undefined
                           },
"reserve_stock":
{ Args: { "p_expires": string,"p_order": string,"p_qty": number,"p_variant": string }; Returns: string
                           },
"restock_return":
{ Args: { "p_inspection_note": string,"p_order": string,"p_qty": number,"p_variant": string }; Returns: undefined
                           },
"rule_for":
{ Args: { "p_entity": string,"p_region": string }; Returns: {
              "active": boolean,
"entity_id": string,
"fee": number,
"free_threshold": number | null,
"id": string,
"region_code": string,
"updated_at": string,
"updated_by": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "shipping_rules"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_cart":
{ Args: { "p_lines": Json }; Returns: undefined
                           },
"ship_reservation":
{ Args: { "p_reservation": string }; Returns: undefined
                           },
"transition_fulfillment":
{ Args: { "p_expected_version": number,"p_note"?: string,"p_order": string,"p_to": string,"p_tracking"?: string }; Returns: Json
                           },
"variant_availability":
{ Args: { "p_variants": (string)[] }; Returns: {
              "in_stock": boolean,"variant_id": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"stay": {
          Tables: {
            "bookings": {
                  Row: {
                    "adults": number,"arrival": string,"arrival_time": string | null,"children_ages": (number)[],"created_at": string,"created_by": string | null,"departure": string,"entity_id": string,"held_until": string | null,"id": string,"location_id": string,"notes": string | null,"order_id": string,"policy_snapshot": NonNullable<Json>,"quote_id": string | null,"room_id": string,"source": string,"state": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adults": number,"arrival": string,"arrival_time"?: string | null,"children_ages"?: (number)[],"created_at"?: string,"created_by"?: string | null,"departure": string,"entity_id": string,"held_until"?: string | null,"id"?: string,"location_id": string,"notes"?: string | null,"order_id": string,"policy_snapshot"?: NonNullable<Json>,"quote_id"?: string | null,"room_id": string,"source"?: string,"state": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "adults"?: number,"arrival"?: string,"arrival_time"?: string | null,"children_ages"?: (number)[],"created_at"?: string,"created_by"?: string | null,"departure"?: string,"entity_id"?: string,"held_until"?: string | null,"id"?: string,"location_id"?: string,"notes"?: string | null,"order_id"?: string,"policy_snapshot"?: NonNullable<Json>,"quote_id"?: string | null,"room_id"?: string,"source"?: string,"state"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_room_id_entity_id_location_id_fkey"
      columns: ["room_id","entity_id","location_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","entity_id","location_id"]
    }
                  ]
                },"calendar_blocks": {
                  Row: {
                    "ends_on": string,"external_uid": string,"feed_id": string,"first_seen_at": string,"id": string,"last_seen_at": string,"removed_at": string | null,"room_id": string,"source_payload_hash": string,"starts_on": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_on": string,"external_uid": string,"feed_id": string,"first_seen_at"?: string,"id"?: string,"last_seen_at"?: string,"removed_at"?: string | null,"room_id": string,"source_payload_hash": string,"starts_on": string,"status"?: string
                  }
                  Update: {
                    "ends_on"?: string,"external_uid"?: string,"feed_id"?: string,"first_seen_at"?: string,"id"?: string,"last_seen_at"?: string,"removed_at"?: string | null,"room_id"?: string,"source_payload_hash"?: string,"starts_on"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_blocks_feed_id_fkey"
      columns: ["feed_id"]
isOneToOne: false
      referencedRelation: "calendar_feeds"
      referencedColumns: ["id"]
    }
                  ]
                },"calendar_conflicts": {
                  Row: {
                    "block_id": string,"booking_id": string | null,"detected_at": string,"entity_id": string,"feed_id": string,"id": string,"location_id": string,"night": string,"resolution": string | null,"resolved_at": string | null,"resolved_by": string | null,"room_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "block_id": string,"booking_id"?: string | null,"detected_at"?: string,"entity_id": string,"feed_id": string,"id"?: string,"location_id": string,"night": string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"room_id": string,"status"?: string
                  }
                  Update: {
                    "block_id"?: string,"booking_id"?: string | null,"detected_at"?: string,"entity_id"?: string,"feed_id"?: string,"id"?: string,"location_id"?: string,"night"?: string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"room_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_conflicts_block_id_fkey"
      columns: ["block_id"]
isOneToOne: false
      referencedRelation: "calendar_blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_conflicts_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calendar_conflicts_feed_id_fkey"
      columns: ["feed_id"]
isOneToOne: false
      referencedRelation: "calendar_feeds"
      referencedColumns: ["id"]
    }
                  ]
                },"calendar_feeds": {
                  Row: {
                    "active": boolean,"consecutive_failures": number,"created_at": string,"created_by": string | null,"entity_id": string,"export_token_hash": string | null,"export_token_hint": string | null,"horizon_days": number,"id": string,"import_url": string | null,"last_attempt_at": string | null,"last_error": string | null,"last_success_at": string | null,"location_id": string,"provider": string,"room_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"consecutive_failures"?: number,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"export_token_hash"?: string | null,"export_token_hint"?: string | null,"horizon_days"?: number,"id"?: string,"import_url"?: string | null,"last_attempt_at"?: string | null,"last_error"?: string | null,"last_success_at"?: string | null,"location_id": string,"provider": string,"room_id": string
                  }
                  Update: {
                    "active"?: boolean,"consecutive_failures"?: number,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"export_token_hash"?: string | null,"export_token_hint"?: string | null,"horizon_days"?: number,"id"?: string,"import_url"?: string | null,"last_attempt_at"?: string | null,"last_error"?: string | null,"last_success_at"?: string | null,"location_id"?: string,"provider"?: string,"room_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_feeds_room_id_entity_id_location_id_fkey"
      columns: ["room_id","entity_id","location_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","entity_id","location_id"]
    }
                  ]
                },"checklist_results": {
                  Row: {
                    "actor": string,"created_at": string,"device": string | null,"id": string,"item_code": string,"media_ids": (string)[],"note": string | null,"operation_id": string,"result": string,"task_id": string,"task_version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"created_at"?: string,"device"?: string | null,"id"?: string,"item_code": string,"media_ids"?: (string)[],"note"?: string | null,"operation_id": string,"result": string,"task_id": string,"task_version": number
                  }
                  Update: {
                    "actor"?: string,"created_at"?: string,"device"?: string | null,"id"?: string,"item_code"?: string,"media_ids"?: (string)[],"note"?: string | null,"operation_id"?: string,"result"?: string,"task_id"?: string,"task_version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "checklist_results_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "housekeeping_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"checklist_templates": {
                  Row: {
                    "active": boolean,"created_at": string,"entity_id": string,"id": string,"items": NonNullable<Json>,"kind": string,"title": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"entity_id": string,"id"?: string,"items": NonNullable<Json>,"kind": string,"title": string,"version": number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"entity_id"?: string,"id"?: string,"items"?: NonNullable<Json>,"kind"?: string,"title"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"common_area_schedules": {
                  Row: {
                    "active": boolean,"area": string,"day": number | null,"frequency": string | null,"location_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"area": string,"day"?: number | null,"frequency"?: string | null,"location_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"area"?: string,"day"?: number | null,"frequency"?: string | null,"location_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"housekeeping_tasks": {
                  Row: {
                    "area_code": string | null,"assigned_to": string | null,"booking_id": string | null,"created_at": string,"due_at": string | null,"entity_id": string,"id": string,"inspected_at": string | null,"inspected_by": string | null,"inspection_notes": string | null,"kind": string,"location_id": string,"needs_manager_review": boolean,"notes": string | null,"priority": number,"refused_reason": string | null,"reschedule_at": string | null,"room_id": string | null,"state": string,"submitted_at": string | null,"submitted_by": string | null,"template_version": number | null,"updated_at": string,"version": number,"task_template": {
              "active": boolean,
"created_at": string,
"entity_id": string,
"id": string,
"items": NonNullable<Json>,
"kind": string,
"title": string,
"version": number
            } | null
                  }
                  ComputedFields: "task_template"
                  Insert: {
                    "area_code"?: string | null,"assigned_to"?: string | null,"booking_id"?: string | null,"created_at"?: string,"due_at"?: string | null,"entity_id": string,"id"?: string,"inspected_at"?: string | null,"inspected_by"?: string | null,"inspection_notes"?: string | null,"kind": string,"location_id": string,"needs_manager_review"?: boolean,"notes"?: string | null,"priority"?: number,"refused_reason"?: string | null,"reschedule_at"?: string | null,"room_id"?: string | null,"state"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"template_version"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "area_code"?: string | null,"assigned_to"?: string | null,"booking_id"?: string | null,"created_at"?: string,"due_at"?: string | null,"entity_id"?: string,"id"?: string,"inspected_at"?: string | null,"inspected_by"?: string | null,"inspection_notes"?: string | null,"kind"?: string,"location_id"?: string,"needs_manager_review"?: boolean,"notes"?: string | null,"priority"?: number,"refused_reason"?: string | null,"reschedule_at"?: string | null,"room_id"?: string | null,"state"?: string,"submitted_at"?: string | null,"submitted_by"?: string | null,"template_version"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "housekeeping_tasks_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_documents": {
                  Row: {
                    "booking_id": string,"bytes": number,"captured_at": string,"captured_by": string,"entity_id": string,"expires_at": string,"id": string,"iv": string | null,"key_id": string | null,"last_error": string | null,"location_id": string,"mime": string,"object_path": string | null,"purge_attempts": number,"purged_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"bytes": number,"captured_at"?: string,"captured_by": string,"entity_id": string,"expires_at"?: string,"id"?: string,"iv"?: string | null,"key_id"?: string | null,"last_error"?: string | null,"location_id": string,"mime": string,"object_path"?: string | null,"purge_attempts"?: number,"purged_at"?: string | null
                  }
                  Update: {
                    "booking_id"?: string,"bytes"?: number,"captured_at"?: string,"captured_by"?: string,"entity_id"?: string,"expires_at"?: string,"id"?: string,"iv"?: string | null,"key_id"?: string | null,"last_error"?: string | null,"location_id"?: string,"mime"?: string,"object_path"?: string | null,"purge_attempts"?: number,"purged_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_documents_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"inspections": {
                  Row: {
                    "approved": boolean,"content_hash": string,"form": string,"id": string,"notes": string | null,"safety_issue": boolean,"signed_at": string,"signed_by": string,"snapshot": NonNullable<Json>,"task_id": string,"template_version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approved": boolean,"content_hash": string,"form"?: string,"id"?: string,"notes"?: string | null,"safety_issue"?: boolean,"signed_at"?: string,"signed_by": string,"snapshot": NonNullable<Json>,"task_id": string,"template_version": number
                  }
                  Update: {
                    "approved"?: boolean,"content_hash"?: string,"form"?: string,"id"?: string,"notes"?: string | null,"safety_issue"?: boolean,"signed_at"?: string,"signed_by"?: string,"snapshot"?: NonNullable<Json>,"task_id"?: string,"template_version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspections_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "housekeeping_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"lost_found_items": {
                  Row: {
                    "description": string,"entity_id": string,"found_at": string,"found_by": string,"handled_at": string | null,"handled_by": string | null,"id": string,"location_id": string,"photo_id": string | null,"receipt_no": string | null,"room_id": string | null,"seal_code": string | null,"status": string,"storage_place": string,"updated_at": string,"verification_note": string | null,"version": number,"witness_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"entity_id": string,"found_at"?: string,"found_by": string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"location_id": string,"photo_id"?: string | null,"receipt_no"?: string | null,"room_id"?: string | null,"seal_code"?: string | null,"status"?: string,"storage_place": string,"updated_at"?: string,"verification_note"?: string | null,"version"?: number,"witness_id"?: string | null
                  }
                  Update: {
                    "description"?: string,"entity_id"?: string,"found_at"?: string,"found_by"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"location_id"?: string,"photo_id"?: string | null,"receipt_no"?: string | null,"room_id"?: string | null,"seal_code"?: string | null,"status"?: string,"storage_place"?: string,"updated_at"?: string,"verification_note"?: string | null,"version"?: number,"witness_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lost_found_items_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"quotes": {
                  Row: {
                    "adults": number,"arrival": string,"children_ages": (number)[],"created_at": string,"departure": string,"deposit_due": number,"deposit_rate_bp": number,"discount": number,"entity_id": string,"expires_at": string,"id": string,"lines": NonNullable<Json>,"location_id": string,"policy_version_id": string,"room_id": string,"services": NonNullable<Json>,"subtotal": number,"total": number,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adults": number,"arrival": string,"children_ages"?: (number)[],"created_at"?: string,"departure": string,"deposit_due": number,"deposit_rate_bp": number,"discount": number,"entity_id": string,"expires_at": string,"id"?: string,"lines": NonNullable<Json>,"location_id": string,"policy_version_id": string,"room_id": string,"services"?: NonNullable<Json>,"subtotal": number,"total": number,"version"?: number
                  }
                  Update: {
                    "adults"?: number,"arrival"?: string,"children_ages"?: (number)[],"created_at"?: string,"departure"?: string,"deposit_due"?: number,"deposit_rate_bp"?: number,"discount"?: number,"entity_id"?: string,"expires_at"?: string,"id"?: string,"lines"?: NonNullable<Json>,"location_id"?: string,"policy_version_id"?: string,"room_id"?: string,"services"?: NonNullable<Json>,"subtotal"?: number,"total"?: number,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotes_room_id_entity_id_location_id_fkey"
      columns: ["room_id","entity_id","location_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","entity_id","location_id"]
    }
                  ]
                },"rate_plans": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"date_range": unknown,"dow": number | null,"entity_id": string,"extra_adult_fee": number,"extra_child_fee": number,"id": string,"kind": string,"label": string | null,"location_id": string,"price": number,"priority": number | null,"room_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"date_range"?: unknown,"dow"?: number | null,"entity_id": string,"extra_adult_fee"?: number,"extra_child_fee"?: number,"id"?: string,"kind": string,"label"?: string | null,"location_id": string,"price": number,"priority"?: never,"room_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"date_range"?: unknown,"dow"?: number | null,"entity_id"?: string,"extra_adult_fee"?: number,"extra_child_fee"?: number,"id"?: string,"kind"?: string,"label"?: string | null,"location_id"?: string,"price"?: number,"priority"?: never,"room_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_plans_room_id_entity_id_location_id_fkey"
      columns: ["room_id","entity_id","location_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","entity_id","location_id"]
    }
                  ]
                },"room_allocations": {
                  Row: {
                    "active": boolean,"created_at": string,"entity_id": string,"id": string,"kind": string,"location_id": string,"occupied_range": unknown,"released_at": string | null,"room_id": string,"source_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"entity_id": string,"id"?: string,"kind": string,"location_id": string,"occupied_range": unknown,"released_at"?: string | null,"room_id": string,"source_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"entity_id"?: string,"id"?: string,"kind"?: string,"location_id"?: string,"occupied_range"?: unknown,"released_at"?: string | null,"room_id"?: string,"source_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_allocations_room_id_entity_id_location_id_fkey"
      columns: ["room_id","entity_id","location_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","entity_id","location_id"]
    }
                  ]
                },"room_blocks": {
                  Row: {
                    "arrival": string,"created_at": string,"created_by": string | null,"departure": string,"entity_id": string,"id": string,"kind": string,"location_id": string,"reason": string,"released_at": string | null,"room_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arrival": string,"created_at"?: string,"created_by"?: string | null,"departure": string,"entity_id": string,"id"?: string,"kind": string,"location_id": string,"reason": string,"released_at"?: string | null,"room_id": string
                  }
                  Update: {
                    "arrival"?: string,"created_at"?: string,"created_by"?: string | null,"departure"?: string,"entity_id"?: string,"id"?: string,"kind"?: string,"location_id"?: string,"reason"?: string,"released_at"?: string | null,"room_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_blocks_room_id_entity_id_location_id_fkey"
      columns: ["room_id","entity_id","location_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id","entity_id","location_id"]
    }
                  ]
                },"room_status_log": {
                  Row: {
                    "actor": string | null,"created_at": string,"field": string,"from_value": string | null,"id": number,"reason": string | null,"room_id": string,"to_value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"created_at"?: string,"field": string,"from_value"?: string | null,"id"?: never,"reason"?: string | null,"room_id": string,"to_value": string
                  }
                  Update: {
                    "actor"?: string | null,"created_at"?: string,"field"?: string,"from_value"?: string | null,"id"?: never,"reason"?: string | null,"room_id"?: string,"to_value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_status_log_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
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
                },"service_request_events": {
                  Row: {
                    "actor": string | null,"created_at": string,"from_state": string | null,"id": number,"note": string | null,"request_id": string,"to_state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"created_at"?: string,"from_state"?: string | null,"id"?: never,"note"?: string | null,"request_id": string,"to_state": string
                  }
                  Update: {
                    "actor"?: string | null,"created_at"?: string,"from_state"?: string | null,"id"?: never,"note"?: string | null,"request_id"?: string,"to_state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_request_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "service_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"service_requests": {
                  Row: {
                    "booking_id": string,"created_at": string,"entity_id": string,"handled_by": string | null,"id": string,"idempotency_key": string | null,"location_id": string,"notes": string | null,"order_item_id": string,"qty": number,"scheduled_at": string,"service_id": string,"source": string,"state": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"entity_id": string,"handled_by"?: string | null,"id"?: string,"idempotency_key"?: string | null,"location_id": string,"notes"?: string | null,"order_item_id": string,"qty": number,"scheduled_at": string,"service_id": string,"source": string,"state"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"entity_id"?: string,"handled_by"?: string | null,"id"?: string,"idempotency_key"?: string | null,"location_id"?: string,"notes"?: string | null,"order_item_id"?: string,"qty"?: number,"scheduled_at"?: string,"service_id"?: string,"source"?: string,"state"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_requests_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_requests_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "active": boolean,"audience": string | null,"created_at": string,"description": string,"entity_id": string,"group_key": string,"id": string,"lead_time_min": number,"location_id": string,"name": string,"photo_id": string | null,"prebook_discount_bp": number,"price": number,"revenue_source": string,"serve_from": string,"serve_to": string,"slug": string,"sort": number,"source_category": string | null,"unit": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"audience"?: string | null,"created_at"?: string,"description"?: string,"entity_id": string,"group_key": string,"id"?: string,"lead_time_min"?: number,"location_id": string,"name": string,"photo_id"?: string | null,"prebook_discount_bp"?: number,"price": number,"revenue_source": string,"serve_from"?: string,"serve_to"?: string,"slug": string,"sort"?: number,"source_category"?: string | null,"unit": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"audience"?: string | null,"created_at"?: string,"description"?: string,"entity_id"?: string,"group_key"?: string,"id"?: string,"lead_time_min"?: number,"location_id"?: string,"name"?: string,"photo_id"?: string | null,"prebook_discount_bp"?: number,"price"?: number,"revenue_source"?: string,"serve_from"?: string,"serve_to"?: string,"slug"?: string,"sort"?: number,"source_category"?: string | null,"unit"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"shift_amendments": {
                  Row: {
                    "amount_delta": number,"created_at": string,"created_by": string,"id": string,"note": string,"shift_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_delta"?: number,"created_at"?: string,"created_by": string,"id"?: string,"note": string,"shift_id": string
                  }
                  Update: {
                    "amount_delta"?: number,"created_at"?: string,"created_by"?: string,"id"?: string,"note"?: string,"shift_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shift_amendments_shift_id_fkey"
      columns: ["shift_id"]
isOneToOne: false
      referencedRelation: "shifts"
      referencedColumns: ["id"]
    }
                  ]
                },"shifts": {
                  Row: {
                    "cash_counted": number | null,"cash_open": number,"content_hash": string | null,"entity_id": string,"expected_cash": number | null,"handed_over_at": string | null,"id": string,"location_id": string,"needs_manager_review": boolean,"notes": string | null,"opened_at": string,"opened_by": string,"receiver_ack_at": string | null,"receiver_id": string | null,"snapshot": Json | null,"status": string,"template_version": number,"updated_at": string,"variance": number | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cash_counted"?: number | null,"cash_open": number,"content_hash"?: string | null,"entity_id": string,"expected_cash"?: number | null,"handed_over_at"?: string | null,"id"?: string,"location_id": string,"needs_manager_review"?: boolean,"notes"?: string | null,"opened_at"?: string,"opened_by": string,"receiver_ack_at"?: string | null,"receiver_id"?: string | null,"snapshot"?: Json | null,"status"?: string,"template_version"?: number,"updated_at"?: string,"variance"?: number | null,"version"?: number
                  }
                  Update: {
                    "cash_counted"?: number | null,"cash_open"?: number,"content_hash"?: string | null,"entity_id"?: string,"expected_cash"?: number | null,"handed_over_at"?: string | null,"id"?: string,"location_id"?: string,"needs_manager_review"?: boolean,"notes"?: string | null,"opened_at"?: string,"opened_by"?: string,"receiver_ack_at"?: string | null,"receiver_id"?: string | null,"snapshot"?: Json | null,"status"?: string,"template_version"?: number,"updated_at"?: string,"variance"?: number | null,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"supply_items": {
                  Row: {
                    "code": string,"entity_id": string,"id": string,"kind": string,"location_id": string,"min_level": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"entity_id": string,"id"?: string,"kind": string,"location_id": string,"min_level"?: number,"name": string
                  }
                  Update: {
                    "code"?: string,"entity_id"?: string,"id"?: string,"kind"?: string,"location_id"?: string,"min_level"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"supply_movements": {
                  Row: {
                    "actor": string,"confirmed_at": string | null,"counterpart": string | null,"created_at": string,"id": string,"item_id": string,"kind": string,"note": string | null,"qty": number,"room_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"confirmed_at"?: string | null,"counterpart"?: string | null,"created_at"?: string,"id"?: string,"item_id": string,"kind": string,"note"?: string | null,"qty": number,"room_id"?: string | null
                  }
                  Update: {
                    "actor"?: string,"confirmed_at"?: string | null,"counterpart"?: string | null,"created_at"?: string,"id"?: string,"item_id"?: string,"kind"?: string,"note"?: string | null,"qty"?: number,"room_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "supply_movements_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "supply_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supply_movements_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"ticket_events": {
                  Row: {
                    "actor": string | null,"created_at": string,"from_state": string | null,"id": number,"note": string | null,"ticket_id": string,"to_state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"created_at"?: string,"from_state"?: string | null,"id"?: never,"note"?: string | null,"ticket_id": string,"to_state": string
                  }
                  Update: {
                    "actor"?: string | null,"created_at"?: string,"from_state"?: string | null,"id"?: never,"note"?: string | null,"ticket_id"?: string,"to_state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ticket_events_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "tickets"
      referencedColumns: ["id"]
    }
                  ]
                },"tickets": {
                  Row: {
                    "assigned_to": string | null,"booking_id": string | null,"created_at": string,"created_by": string | null,"description": string,"entity_id": string,"escalated_at": string | null,"guest_confirmed": boolean | null,"id": string,"kind": string,"location_id": string,"priority": string,"resolution": string | null,"room_id": string | null,"sla_due_at": string,"state": string,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"booking_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"entity_id": string,"escalated_at"?: string | null,"guest_confirmed"?: boolean | null,"id"?: string,"kind": string,"location_id": string,"priority": string,"resolution"?: string | null,"room_id"?: string | null,"sla_due_at": string,"state"?: string,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "assigned_to"?: string | null,"booking_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"entity_id"?: string,"escalated_at"?: string | null,"guest_confirmed"?: boolean | null,"id"?: string,"kind"?: string,"location_id"?: string,"priority"?: string,"resolution"?: string | null,"room_id"?: string | null,"sla_due_at"?: string,"state"?: string,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ack_handover":
{ Args: { "p_expected_version": number,"p_shift": string }; Returns: string
                           },
"add_calendar_feed":
{ Args: { "p_import_url": string,"p_provider": string,"p_room": string }; Returns: string
                           },
"add_cash_movement":
{ Args: { "p_amount": number,"p_kind": string,"p_note": string,"p_shift": string }; Returns: string
                           },
"add_service_request":
{ Args: { "b": Omit<Database["stay"]['Tables']["bookings"]['Row'], Database["stay"]['Tables']["bookings"]['ComputedFields']>,"p_idempotency": string,"p_notes": string,"p_qty": number,"p_scheduled_at": string,"p_service": string,"p_source": string }; Returns: Json
                           },
"amend_shift":
{ Args: { "p_amount_delta"?: number,"p_note": string,"p_shift": string }; Returns: string
                           },
"apply_checklist_op":
{ Args: { "p_op": Json }; Returns: Json
                           },
"approve_inspection":
{ Args: { "p_approved": boolean,"p_expected_version": number,"p_notes": string,"p_safety_issue"?: boolean,"p_task": string }; Returns: Json
                           },
"block_room":
{ Args: { "p_arrival": string,"p_departure": string,"p_kind": string,"p_reason": string,"p_room": string,"p_source"?: string }; Returns: string
                           },
"cancel_my_service":
{ Args: { "p_request": string,"p_token": string }; Returns: undefined
                           },
"clear_safety_block":
{ Args: { "p_reason": string,"p_room": string }; Returns: undefined
                           },
"confirm_supply_movement":
{ Args: { "p_movement": string }; Returns: undefined
                           },
"confirm_with_exception":
{ Args: { "p_booking": string,"p_due": number,"p_reason": string }; Returns: undefined
                           },
"create_common_task":
{ Args: { "p_area": string,"p_due": string,"p_location": string }; Returns: string
                           },
"create_due_common_tasks":
{ Args: { "p_date"?: string }; Returns: number
                           },
"create_manual_booking":
{ Args: { "p_adults": number,"p_arrival": string,"p_children": (number)[],"p_collected_by": string,"p_departure": string,"p_guest": Json,"p_idempotency": string,"p_notes": string,"p_room": string,"p_source": string }; Returns: Json
                           },
"create_stay_hold":
{ Args: { "p_arrival_time"?: string,"p_consents": Json,"p_guest": Json,"p_idempotency": string,"p_notes"?: string,"p_policy_version": string,"p_quote": string,"p_source"?: string }; Returns: Json
                           },
"create_stay_hold_core":
{ Args: { "p_arrival_time"?: string,"p_consents": Json,"p_guest": Json,"p_idempotency": string,"p_notes"?: string,"p_policy_version": string,"p_quote": string,"p_source"?: string }; Returns: Json
                           },
"create_ticket":
{ Args: { "p_booking": string,"p_description": string,"p_kind": string,"p_location": string,"p_priority": string,"p_room": string,"p_title": string }; Returns: string
                           },
"deactivate_rate":
{ Args: { "p_rate": string,"p_reason": string }; Returns: undefined
                           },
"escalate_overdue_tickets":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"expire_all_holds":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"expire_room_holds":
{ Args: { "p_room": string }; Returns: number
                           },
"export_busy":
{ Args: { "p_token": string }; Returns: {
              "ends_on": string,"starts_on": string,"uid": string
            }[]
                           },
"feeds_due":
{ Args: { "p_interval"?: string }; Returns: {
              "horizon_days": number,"id": string,"import_url": string
            }[]
                           },
"handover_shift":
{ Args: { "p_counted_cash": number,"p_expected_version": number,"p_notes": string,"p_receiver": string,"p_shift": string }; Returns: Json
                           },
"identity_doc_for_read":
{ Args: { "p_id": string }; Returns: Json
                           },
"identity_doc_mark":
{ Args: { "p_error": string,"p_id": string,"p_ok": boolean }; Returns: undefined
                           },
"identity_doc_register":
{ Args: { "p_actor": string,"p_booking": string,"p_bytes": number,"p_iv": string,"p_key_id": string,"p_mime": string,"p_path": string }; Returns: string
                           },
"identity_docs_due":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"object_path": string
            }[]
                           },
"issue_stay_token":
{ Args: { "p_booking": string }; Returns: string
                           },
"latest_results":
{ Args: { "p_task": string }; Returns: {
              "actor": string,"item_code": string,"note": string,"result": string,"task_version": number
            }[]
                           },
"my_stay_services":
{ Args: { "p_token": string }; Returns: Json
                           },
"open_shift":
{ Args: { "p_cash_open": number,"p_location": string }; Returns: string
                           },
"price_nights":
{ Args: { "p_arrival": string,"p_departure": string,"p_room": string }; Returns: {
              "night": string,"price": number,"rate_kind": string
            }[]
                           },
"quote_services":
{ Args: { "p_arrival": string,"p_departure": string,"p_room": string,"p_services": Json }; Returns: Json
                           },
"quote_stay":
{ Args: { "p_adults": number,"p_arrival": string,"p_children"?: (number)[],"p_departure": string,"p_room": string,"p_services"?: Json }; Returns: Json
                           },
"reconcile_feed":
{ Args: { "p_error"?: string,"p_events": Json,"p_feed": string }; Returns: Json
                           },
"record_lost_item":
{ Args: { "p_description": string,"p_location": string,"p_room": string,"p_seal": string,"p_storage": string,"p_witness": string }; Returns: string
                           },
"record_supply_movement":
{ Args: { "p_counterpart": string,"p_item": string,"p_kind": string,"p_note": string,"p_qty": number,"p_room": string }; Returns: string
                           },
"refuse_service":
{ Args: { "p_reason": string,"p_reschedule_at": string,"p_task": string }; Returns: undefined
                           },
"release_block":
{ Args: { "p_block": string,"p_reason": string }; Returns: undefined
                           },
"request_stay_service":
{ Args: { "p_idempotency": string,"p_notes"?: string,"p_qty": number,"p_scheduled_at": string,"p_service": string,"p_token": string }; Returns: Json
                           },
"resolve_conflict":
{ Args: { "p_conflict": string,"p_resolution": string }; Returns: undefined
                           },
"reverse_service_item":
{ Args: { "p_item": string }; Returns: undefined
                           },
"revoke_stay_tokens":
{ Args: { "p_booking": string }; Returns: undefined
                           },
"room_calendar":
{ Args: { "p_from": string,"p_room": string,"p_to": string }; Returns: {
              "available": boolean,"date": string,"price": string
            }[]
                           },
"rotate_export_token":
{ Args: { "p_feed": string }; Returns: string
                           },
"save_rate":
{ Args: { "p_dow"?: number,"p_extra_adult_fee"?: number,"p_extra_child_fee"?: number,"p_from"?: string,"p_kind": string,"p_label"?: string,"p_price": number,"p_room": string,"p_to"?: string }; Returns: string
                           },
"schedule_journey":
{ Args: { "p_booking": string }; Returns: undefined
                           },
"set_common_schedule":
{ Args: { "p_area": string,"p_day": number,"p_frequency": string,"p_location": string }; Returns: undefined
                           },
"set_room_sellable":
{ Args: { "p_reason": string,"p_room": string,"p_sellable": boolean }; Returns: undefined
                           },
"shift_receivers":
{ Args: { "p_location": string }; Returns: {
              "display_name": string,"user_id": string
            }[]
                           },
"staff_request_service":
{ Args: { "p_booking": string,"p_idempotency": string,"p_notes"?: string,"p_qty": number,"p_scheduled_at": string,"p_service": string }; Returns: Json
                           },
"stay_range":
{ Args: { "p_arrival": string,"p_departure": string,"p_location": string }; Returns: unknown
                           },
"submit_for_inspection":
{ Args: { "p_expected_version": number,"p_task": string }; Returns: Json
                           },
"supply_balances":
{ Args: { "p_location": string }; Returns: {
              "at_laundry": number,"below_min": boolean,"clean": number,"code": string,"dirty": number,"discarded": number,"item_id": string,"min_level": number,"name": string,"unconfirmed": number
            }[]
                           },
"task_template":
{ Args: { "t": Omit<Database["stay"]['Tables']["housekeeping_tasks"]['Row'], Database["stay"]['Tables']["housekeeping_tasks"]['ComputedFields']> }; Returns: {
              "active": boolean,
"created_at": string,
"entity_id": string,
"id": string,
"items": NonNullable<Json>,
"kind": string,
"title": string,
"version": number
            }
                          SetofOptions: {
        from: "stay.housekeeping_tasks"
        to: "checklist_templates"
        isOneToOne: true
        isSetofReturn: false
      } },
"transition_booking":
{ Args: { "p_action": string,"p_booking": string,"p_expected_version": number,"p_idempotency": string,"p_opts"?: Json,"p_reason": string }; Returns: Json
                           },
"transition_lost_item":
{ Args: { "p_item": string,"p_note": string,"p_receipt": string,"p_to": string }; Returns: undefined
                           },
"transition_service_request":
{ Args: { "p_expected_version": number,"p_note"?: string,"p_request": string,"p_to": string }; Returns: Json
                           },
"transition_ticket":
{ Args: { "p_assignee"?: string,"p_expected_version": number,"p_note"?: string,"p_ticket": string,"p_to": string }; Returns: Json
                           },
"try_reallocate":
{ Args: { "p_booking": string }; Returns: boolean
                           },
"update_room_energy":
{ Args: { "p_card": Json,"p_room": string }; Returns: string
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
