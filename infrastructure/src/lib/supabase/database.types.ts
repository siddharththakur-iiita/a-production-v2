/**
 * src/lib/supabase/database.types.ts
 *
 * Hand-authored TypeScript mirror of the frozen SQL schema, scoped
 * for now to the tables the Authentication module actually touches
 * (customer, customer_tier, admin_user, role, permission,
 * admin_user_role). This file is intended to be REPLACED by the
 * output of `supabase gen types typescript --project-id <id>` once
 * the project is live and migrations 001-019 have been applied to a
 * real Supabase instance — that generator produces a single
 * exhaustive `Database` type for every table/view/function in one
 * pass, which is strictly better than hand-maintaining this file
 * long-term. Until then, this hand-written version is kept in exact
 * sync with the migration files column-for-column, so every query
 * built against it in this module is real compile-time-checked
 * against the actual frozen schema, not `any`.
 *
 * As each subsequent backend module is built (Catalog, Orders,
 * Tailoring, ...), its tables are added to this same `Database` type
 * rather than creating parallel, disconnected type files — there is
 * exactly one Database type for the whole project.
 */

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
      customer_tier: {
        Row: {
          id: string;
          name: string;
          min_spend_threshold: string; // numeric(12,2) surfaces as string over PostgREST
          benefits: Json | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          min_spend_threshold?: string;
          benefits?: Json | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['customer_tier']['Insert']>;
        Relationships: [];
      };

      customer: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          phone_verified: boolean;
          tier_id: string | null;
          referred_by_customer_id: string | null;
          marketing_opt_in: boolean;
          is_anonymous: boolean; // added 023_guest_cart_support.sql, guest cart/checkout support
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id: string; // supplied = auth.users.id; normally populated by the
          // handle_new_customer() trigger (019_auth_bootstrap.sql), not
          // inserted directly by application code
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          phone_verified?: boolean;
          tier_id?: string | null;
          referred_by_customer_id?: string | null;
          marketing_opt_in?: boolean;
          is_anonymous?: boolean;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['customer']['Insert'], 'id'>
        >;
        Relationships: [];
      };

      admin_user: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          status: 'active' | 'suspended';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id: string; // supplied = auth.users.id
          email: string;
          full_name: string;
          status?: 'active' | 'suspended';
        };
        Update: Partial<
          Omit<Database['public']['Tables']['admin_user']['Insert'], 'id'>
        >;
        Relationships: [];
      };

      role: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_system_role: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_system_role?: boolean;
        };
        Update: Partial<Database['public']['Tables']['role']['Insert']>;
        Relationships: [];
      };

      permission: {
        Row: {
          id: string;
          key: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          description?: string | null;
        };
        Update: Partial<Database['public']['Tables']['permission']['Insert']>;
        Relationships: [];
      };

      admin_user_role: {
        Row: {
          admin_user_id: string;
          role_id: string;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          admin_user_id: string;
          role_id: string;
          granted_by?: string | null;
        };
        Update: Partial<
          Database['public']['Tables']['admin_user_role']['Insert']
        >;
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // Customer domain, remaining tables (Data Dictionary 04 /
      // 007_customers.sql). customer_tier and customer are declared
      // earlier in this file (added by the Authentication module);
      // the five tables below are added for the Customers module.
      // ---------------------------------------------------------------

      loyalty_account: {
        Row: {
          id: string;
          customer_id: string;
          points_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // created implicitly the first time a loyalty_transaction references it; not inserted directly by application code in this module's scope
        Update: never; // points_balance is maintained exclusively by trg_loyalty_transaction_apply_balance
        Relationships: [];
      };

      loyalty_transaction: {
        Row: {
          id: string;
          loyalty_account_id: string;
          points_delta: number;
          reason: string;
          reference_order_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          loyalty_account_id: string;
          points_delta: number;
          reason: string;
          reference_order_id?: string | null;
        };
        Update: never; // Pattern C — immutable ledger, never updated
        Relationships: [];
      };

      referral: {
        Row: {
          id: string;
          referrer_customer_id: string;
          referred_customer_id: string;
          code: string;
          status: 'pending' | 'rewarded' | 'expired';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referrer_customer_id: string;
          referred_customer_id: string;
          code: string;
          status?: 'pending' | 'rewarded' | 'expired';
        };
        Update: Partial<{ status: 'pending' | 'rewarded' | 'expired' }>;
        Relationships: [];
      };

      communication_preference: {
        Row: {
          id: string;
          customer_id: string;
          channel: 'email' | 'sms' | 'whatsapp' | 'push';
          opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          channel: 'email' | 'sms' | 'whatsapp' | 'push';
          opt_in?: boolean;
        };
        Update: Partial<{ opt_in: boolean }>;
        Relationships: [];
      };

      customer_device: {
        Row: {
          id: string;
          customer_id: string;
          platform: 'ios' | 'android' | 'web';
          push_token: string;
          last_seen_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          platform: 'ios' | 'android' | 'web';
          push_token: string;
          last_seen_at?: string;
          is_active?: boolean;
        };
        Update: Partial<{ last_seen_at: string; is_active: boolean }>;
        Relationships: [];
      };

      address: {
        Row: {
          id: string;
          customer_id: string;
          label: string | null;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string; // app_iso_country_code domain, ISO-3166-1 alpha-2
          is_default: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label?: string | null;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          is_default?: boolean;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['address']['Insert'], 'id' | 'customer_id'>
        >;
        Relationships: [];
      };

      cart: {
        Row: {
          id: string;
          customer_id: string | null;
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          session_id?: string | null;
        };
        Update: never; // this module never issues a direct UPDATE on cart itself — updated_at is touched only via app_touch_parent from cart_item triggers
        Relationships: [];
      };

      cart_item: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string | null;
          variant_id: string | null;
          tailoring_request_id: string | null;
          qty: number;
          unit_price_snapshot: string; // numeric(12,2)
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          tailoring_request_id?: string | null;
          qty?: number;
          unit_price_snapshot: string;
        };
        Update: Partial<{ qty: number }>; // the only field a customer legitimately edits post-insert
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // Orders / Commerce domain (Data Dictionary 05 / 009_orders.sql).
      // "order" is quoted throughout since it is a reserved SQL word.
      // ---------------------------------------------------------------

      order: {
        Row: {
          id: string;
          customer_id: string | null;
          order_number: string;
          order_type: 'ready_made' | 'made_to_order' | 'bespoke' | 'mixed';
          status:
            | 'pending_payment'
            | 'paid'
            | 'in_fulfillment'
            | 'shipped'
            | 'delivered'
            | 'closed'
            | 'returned'
            | 'refunded'
            | 'cancelled';
          subtotal: string;
          discount_total: string;
          tax_total: string;
          shipping_total: string;
          grand_total: string;
          currency: string;
          shipping_address_id: string | null;
          shipping_address_snapshot: Json | null;
          billing_address_id: string | null;
          placed_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: never; // no client INSERT policy exists — created exclusively via app_checkout_cart (024_checkout_and_order_lifecycle.sql)
        // Staff (orders.manage) may update status directly per order_staff_all
        // RLS — used for the manual fulfillment steps (paid -> in_fulfillment
        // -> shipped) that have no dedicated RPC. Deliberately narrow: no
        // other column (subtotal/grand_total/etc.) is ever client-writable,
        // even for staff — those remain trigger/RPC-computed only.
        Update: Partial<{
          status:
            | 'pending_payment'
            | 'paid'
            | 'in_fulfillment'
            | 'shipped'
            | 'delivered'
            | 'closed'
            | 'returned'
            | 'refunded'
            | 'cancelled';
        }>;
        Relationships: [];
      };

      order_item: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          tailoring_request_id: string | null;
          description_snapshot: string;
          qty: number;
          unit_price: string;
          line_total: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // created exclusively by app_checkout_cart
        Update: never;
        Relationships: [];
      };

      payment: {
        Row: {
          id: string;
          order_id: string;
          provider: 'razorpay' | 'stripe' | 'cod' | 'bank_transfer';
          status: 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
          amount: string;
          currency: string;
          provider_reference: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          provider: 'razorpay' | 'stripe' | 'cod' | 'bank_transfer';
          status?: 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
          amount: string;
          currency?: string;
          provider_reference?: string | null;
        };
        Update: Partial<{
          status: 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
          provider_reference: string | null;
        }>;
        Relationships: [];
      };

      payment_transaction: {
        Row: {
          id: string;
          payment_id: string;
          transaction_type: 'charge' | 'refund' | 'webhook_event';
          amount: string | null;
          provider_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          transaction_type: 'charge' | 'refund' | 'webhook_event';
          amount?: string | null;
          provider_payload?: Json | null;
        };
        Update: never;
        Relationships: [];
      };

      shipment: {
        Row: {
          id: string;
          order_id: string;
          carrier: string | null;
          tracking_number: string | null;
          status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_delivery';
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          carrier?: string | null;
          tracking_number?: string | null;
          status?: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_delivery';
          shipped_at?: string | null;
        };
        Update: Partial<{
          carrier: string | null;
          tracking_number: string | null;
          status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_delivery';
          shipped_at: string | null;
          delivered_at: string | null;
        }>;
        Relationships: [];
      };

      shipment_tracking_event: {
        Row: {
          id: string;
          shipment_id: string;
          status: string;
          location: string | null;
          occurred_at: string;
        };
        Insert: never; // populated exclusively by trg_shipment_status_change or the carrier webhook integration, never directly by this module
        Update: never;
        Relationships: [];
      };

      coupon: {
        Row: {
          id: string;
          code: string;
          discount_type: 'percent' | 'fixed';
          value: string;
          min_order_value: string | null;
          usage_limit: number | null;
          per_customer_limit: number | null;
          starts_at: string | null;
          ends_at: string | null;
          status: 'active' | 'paused' | 'expired';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: 'percent' | 'fixed';
          value: string;
          min_order_value?: string | null;
          usage_limit?: number | null;
          per_customer_limit?: number | null;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: 'active' | 'paused' | 'expired';
        };
        Update: Partial<Omit<Database['public']['Tables']['coupon']['Insert'], 'id' | 'code'>>;
        Relationships: [];
      };

      coupon_redemption: {
        Row: {
          id: string;
          coupon_id: string;
          order_id: string;
          customer_id: string | null;
          redeemed_at: string;
        };
        Insert: never; // created exclusively by app_checkout_cart
        Update: never;
        Relationships: [];
      };

      promotion: {
        Row: {
          id: string;
          name: string;
          rule: Json;
          starts_at: string | null;
          ends_at: string | null;
          status: 'active' | 'paused' | 'expired';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          name: string;
          rule: Json;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: 'active' | 'paused' | 'expired';
        };
        Update: Partial<Omit<Database['public']['Tables']['promotion']['Insert'], 'id'>>;
        Relationships: [];
      };

      promotion_application: {
        Row: {
          id: string;
          promotion_id: string;
          order_id: string;
          amount_applied: string;
          applied_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };

      tax_rule: {
        Row: {
          id: string;
          region: string;
          tax_type: string;
          rate: string;
          applies_to: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          region: string;
          tax_type: string;
          rate: string;
          applies_to?: Json | null;
          is_active?: boolean;
        };
        Update: Partial<Omit<Database['public']['Tables']['tax_rule']['Insert'], 'id'>>;
        Relationships: [];
      };

      invoice_sequence: {
        Row: { financial_year: string; last_number: number };
        Insert: never; // written exclusively by app_generate_invoice_number
        Update: never;
        Relationships: [];
      };

      invoice: {
        Row: {
          id: string;
          order_id: string;
          invoice_number: string;
          issued_at: string;
          pdf_media_asset_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          pdf_media_asset_id?: string | null;
          // invoice_number/issued_at are DB-generated (DEFAULT
          // app_generate_invoice_number() / now()) — never supplied
        };
        Update: Partial<{ pdf_media_asset_id: string | null }>;
        Relationships: [];
      };

      refund: {
        Row: {
          id: string;
          order_id: string;
          payment_id: string;
          return_request_id: string | null;
          amount: string;
          reason: string;
          status: 'requested' | 'approved' | 'processed' | 'rejected';
          processed_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          payment_id: string;
          return_request_id?: string | null;
          amount: string;
          reason: string;
          status?: 'requested' | 'approved' | 'processed' | 'rejected';
        };
        Update: Partial<{
          status: 'requested' | 'approved' | 'processed' | 'rejected';
          processed_at: string | null;
        }>;
        Relationships: [];
      };

      refund_item: {
        Row: {
          id: string;
          refund_id: string;
          order_item_id: string;
          qty: number;
          amount: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          refund_id: string;
          order_item_id: string;
          qty: number;
          amount: string;
        };
        Update: never;
        Relationships: [];
      };

      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          changed_at: string;
          changed_by: string | null;
          note: string | null;
        };
        Insert: never; // populated exclusively by trg_order_status_change / app_cancel_order
        Update: never;
        Relationships: [];
      };

      return_request: {
        Row: {
          id: string;
          order_item_id: string;
          customer_id: string;
          reason: string;
          status: 'requested' | 'approved' | 'rejected' | 'item_received' | 'inspected' | 'refund_issued' | 'exchanged';
          return_tracking_number: string | null;
          requested_at: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          customer_id: string;
          reason: string;
          status?: 'requested' | 'approved' | 'rejected' | 'item_received' | 'inspected' | 'refund_issued' | 'exchanged';
        };
        Update: Partial<{
          status: 'requested' | 'approved' | 'rejected' | 'item_received' | 'inspected' | 'refund_issued' | 'exchanged';
          return_tracking_number: string | null;
        }>;
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // Tailoring domain (Data Dictionary 03 / 010_tailoring.sql).
      // ---------------------------------------------------------------

      garment_type: {
        Row: { id: string; name: string; gender_id: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; gender_id?: string | null; is_active?: boolean };
        Update: Partial<Database['public']['Tables']['garment_type']['Insert']>;
        Relationships: [];
      };

      garment_measurement_template: {
        Row: {
          id: string;
          garment_type_id: string;
          name: string;
          fields: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: { id?: string; garment_type_id: string; name: string; fields: Json; is_active?: boolean };
        Update: Partial<Omit<Database['public']['Tables']['garment_measurement_template']['Insert'], 'id'>>;
        Relationships: [];
      };

      measurement_profile: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          garment_type_id: string;
          measurement_template_id: string;
          measurements: Json;
          taken_by: string | null;
          taken_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label: string;
          garment_type_id: string;
          measurement_template_id: string;
          measurements: Json;
          taken_by?: string | null;
        };
        Update: never; // truly immutable — BEFORE UPDATE trigger unconditionally rejects any update (010_tailoring.sql)
        Relationships: [];
      };

      tailoring_request: {
        Row: {
          id: string;
          customer_id: string | null;
          reference_product_id: string | null;
          measurement_profile_id: string | null;
          assigned_to: string | null;
          status:
            | 'inquiry_received' | 'consultation_scheduled' | 'consultation_completed'
            | 'measurements_captured' | 'design_finalized' | 'quotation_sent'
            | 'quotation_accepted' | 'in_production' | 'fitting_scheduled'
            | 'fitting_completed' | 'ready_for_delivery' | 'delivered' | 'closed' | 'cancelled';
          source: 'web' | 'whatsapp' | 'in_person' | 'phone';
          guest_name: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          reference_product_id?: string | null;
          measurement_profile_id?: string | null;
          assigned_to?: string | null;
          status?: string;
          source?: 'web' | 'whatsapp' | 'in_person' | 'phone';
          guest_name?: string | null;
          guest_email?: string | null;
          guest_phone?: string | null;
        };
        Update: Partial<{
          measurement_profile_id: string | null;
          assigned_to: string | null;
          status:
            | 'inquiry_received' | 'consultation_scheduled' | 'consultation_completed'
            | 'measurements_captured' | 'design_finalized' | 'quotation_sent'
            | 'quotation_accepted' | 'in_production' | 'fitting_scheduled'
            | 'fitting_completed' | 'ready_for_delivery' | 'delivered' | 'closed' | 'cancelled';
        }>;
        Relationships: [];
      };

      appointment: {
        Row: {
          id: string;
          tailoring_request_id: string;
          type: 'consultation' | 'measurement' | 'fitting' | 'final_fitting' | 'delivery';
          mode: 'in_person' | 'virtual';
          scheduled_at: string;
          duration_minutes: number;
          status: 'requested' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
          location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          tailoring_request_id: string;
          type: 'consultation' | 'measurement' | 'fitting' | 'final_fitting' | 'delivery';
          mode?: 'in_person' | 'virtual';
          scheduled_at: string;
          duration_minutes?: number;
          status?: 'requested' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
          location?: string | null;
          notes?: string | null;
        };
        Update: Partial<{
          status: 'requested' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
          scheduled_at: string;
          location: string | null;
          notes: string | null;
        }>;
        Relationships: [];
      };

      fabric_selection: {
        Row: {
          id: string;
          tailoring_request_id: string;
          fabric_type_id: string | null;
          material_id: string | null;
          custom_fabric_description: string | null;
          swatch_media_asset_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tailoring_request_id: string;
          fabric_type_id?: string | null;
          material_id?: string | null;
          custom_fabric_description?: string | null;
          swatch_media_asset_id?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['fabric_selection']['Insert'], 'id' | 'tailoring_request_id'>>;
        Relationships: [];
      };

      design_brief: {
        Row: {
          id: string;
          tailoring_request_id: string;
          garment_type_id: string;
          embroidery_type_id: string | null;
          style_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tailoring_request_id: string;
          garment_type_id: string;
          embroidery_type_id?: string | null;
          style_notes?: string | null;
        };
        Update: Partial<{ garment_type_id: string; embroidery_type_id: string | null; style_notes: string | null }>;
        Relationships: [];
      };

      reference_image: {
        Row: {
          id: string;
          tailoring_request_id: string;
          media_asset_id: string;
          caption: string | null;
          uploaded_by: 'customer' | 'staff';
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          tailoring_request_id: string;
          media_asset_id: string;
          caption?: string | null;
          uploaded_by: 'customer' | 'staff';
        };
        Update: never;
        Relationships: [];
      };

      quotation: {
        Row: {
          id: string;
          tailoring_request_id: string;
          version_number: number;
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
          valid_until: string | null;
          subtotal: string;
          tax_total: string;
          total: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          tailoring_request_id: string;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
          valid_until?: string | null;
          tax_total?: string;
          // version_number is DB-generated (trg_quotation_assign_version) — never supplied
        };
        Update: Partial<{
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
          valid_until: string | null;
          tax_total: string;
        }>;
        Relationships: [];
      };

      quotation_line_item: {
        Row: {
          id: string;
          quotation_id: string;
          description: string;
          amount: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; quotation_id: string; description: string; amount: string; sort_order?: number };
        Update: Partial<{ description: string; amount: string; sort_order: number }>;
        Relationships: [];
      };

      production_stage: {
        Row: { id: string; name: string; sort_order: number; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; sort_order?: number; is_active?: boolean };
        Update: Partial<Database['public']['Tables']['production_stage']['Insert']>;
        Relationships: [];
      };

      tailoring_order_stage_history: {
        Row: {
          id: string;
          tailoring_request_id: string;
          production_stage_id: string;
          entered_at: string;
          exited_at: string | null;
          notes: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          tailoring_request_id: string;
          production_stage_id: string;
          notes?: string | null;
          updated_by?: string | null;
        };
        Update: never;
        Relationships: [];
      };

      tailoring_order_status_history: {
        Row: {
          id: string;
          tailoring_request_id: string;
          status: string;
          changed_at: string;
          changed_by: string | null;
          note: string | null;
        };
        Insert: never; // populated exclusively by trg_tailoring_request_status_change
        Update: never;
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // CMS domain (Data Dictionary 06 / 011_cms.sql). media_asset is
      // declared above (added by the Product module).
      // ---------------------------------------------------------------

      page: {
        Row: { id: string; key: string; name: string; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; key: string; name: string; is_active?: boolean };
        Update: Partial<{ name: string; is_active: boolean }>;
        Relationships: [];
      };

      content_block: {
        Row: {
          id: string;
          page_id: string;
          section_key: string;
          content: Json;
          sort_order: number;
          status: 'draft' | 'published';
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          page_id: string;
          section_key: string;
          content: Json;
          sort_order?: number;
          status?: 'draft' | 'published';
        };
        Update: Partial<{ content: Json; sort_order: number; status: 'draft' | 'published' }>;
        Relationships: [];
      };

      hero_banner: {
        Row: {
          id: string;
          page_id: string;
          media_asset_id: string | null;
          headline: string | null;
          subheadline: string | null;
          cta_label: string | null;
          cta_url: string | null;
          starts_at: string | null;
          ends_at: string | null;
          sort_order: number;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          page_id: string;
          media_asset_id?: string | null;
          headline?: string | null;
          subheadline?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          sort_order?: number;
          status?: 'draft' | 'published';
        };
        Update: Partial<Omit<Database['public']['Tables']['hero_banner']['Insert'], 'id' | 'page_id'>>;
        Relationships: [];
      };

      featured_placement: {
        Row: {
          id: string;
          placement_context: 'homepage' | 'department' | 'collection_page';
          context_ref_id: string | null;
          product_id: string;
          placement_type: 'featured' | 'trending';
          sort_order: number;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          placement_context: 'homepage' | 'department' | 'collection_page';
          context_ref_id?: string | null;
          product_id: string;
          placement_type: 'featured' | 'trending';
          sort_order?: number;
          starts_at?: string | null;
          ends_at?: string | null;
        };
        Update: Partial<{ sort_order: number; starts_at: string | null; ends_at: string | null }>;
        Relationships: [];
      };

      gallery_item: {
        Row: {
          id: string;
          media_asset_id: string;
          caption: string | null;
          source_url: string | null;
          sort_order: number;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          media_asset_id: string;
          caption?: string | null;
          source_url?: string | null;
          sort_order?: number;
          status?: 'draft' | 'published';
        };
        Update: Partial<Omit<Database['public']['Tables']['gallery_item']['Insert'], 'id' | 'media_asset_id'>>;
        Relationships: [];
      };

      testimonial: {
        Row: {
          id: string;
          customer_name: string;
          customer_photo_media_asset_id: string | null;
          quote: string;
          rating: number | null;
          product_id: string | null;
          status: 'draft' | 'published';
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_photo_media_asset_id?: string | null;
          quote: string;
          rating?: number | null;
          product_id?: string | null;
          status?: 'draft' | 'published';
          sort_order?: number;
        };
        Update: Partial<Omit<Database['public']['Tables']['testimonial']['Insert'], 'id'>>;
        Relationships: [];
      };

      announcement: {
        Row: {
          id: string;
          message: string;
          link_url: string | null;
          starts_at: string | null;
          ends_at: string | null;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          message: string;
          link_url?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: 'draft' | 'published';
        };
        Update: Partial<Omit<Database['public']['Tables']['announcement']['Insert'], 'id'>>;
        Relationships: [];
      };

      navigation_menu: {
        Row: { id: string; key: string; name: string };
        Insert: { id?: string; key: string; name: string };
        Update: Partial<{ name: string }>;
        Relationships: [];
      };

      navigation_item: {
        Row: {
          id: string;
          menu_id: string;
          parent_item_id: string | null;
          label: string;
          url: string | null;
          category_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          parent_item_id?: string | null;
          label: string;
          url?: string | null;
          category_id?: string | null;
          sort_order?: number;
        };
        Update: Partial<Omit<Database['public']['Tables']['navigation_item']['Insert'], 'id' | 'menu_id'>>;
        Relationships: [];
      };

      mega_menu_promo: {
        Row: {
          id: string;
          navigation_item_id: string;
          media_asset_id: string | null;
          title: string | null;
          subtitle: string | null;
          cta_url: string | null;
        };
        Insert: {
          id?: string;
          navigation_item_id: string;
          media_asset_id?: string | null;
          title?: string | null;
          subtitle?: string | null;
          cta_url?: string | null;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['mega_menu_promo']['Insert'], 'id' | 'navigation_item_id'>
        >;
        Relationships: [];
      };

      social_link: {
        Row: {
          id: string;
          platform: string;
          url: string;
          sort_order: number;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; platform: string; url: string; sort_order?: number; status?: 'draft' | 'published' };
        Update: Partial<Omit<Database['public']['Tables']['social_link']['Insert'], 'id'>>;
        Relationships: [];
      };

      contact_info: {
        Row: {
          id: string;
          label: string;
          phone: string | null;
          whatsapp_number: string | null;
          email: string | null;
          address: string | null;
          business_hours: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label?: string;
          phone?: string | null;
          whatsapp_number?: string | null;
          email?: string | null;
          address?: string | null;
          business_hours?: string | null;
        };
        Update: Partial<Omit<Database['public']['Tables']['contact_info']['Insert'], 'id' | 'label'>>;
        Relationships: [];
      };

      seo_redirect: {
        Row: {
          id: string;
          from_path: string;
          to_path: string;
          redirect_type: '301' | '302';
          status: 'active' | 'disabled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_path: string;
          to_path: string;
          redirect_type?: '301' | '302';
          status?: 'active' | 'disabled';
        };
        Update: Partial<{ to_path: string; redirect_type: '301' | '302'; status: 'active' | 'disabled' }>;
        Relationships: [];
      };

      site_setting: {
        Row: { key: string; value: Json; is_public: boolean; updated_at: string };
        Insert: { key: string; value: Json; is_public?: boolean };
        Update: Partial<{ value: Json; is_public: boolean }>;
        Relationships: [];
      };

      inquiry: {
        Row: {
          id: string;
          customer_id: string | null;
          order_id: string | null;
          inquiry_type: 'general' | 'order_support' | 'product_question';
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          status: 'new' | 'contacted' | 'closed';
          handled_by: string | null;
          source_page: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: never; // no direct client insert — the sanctioned surface is app_submit_inquiry (012_contact.sql), which rate-limits and validates server-side
        Update: Partial<{ status: 'new' | 'contacted' | 'closed'; handled_by: string | null }>;
        Relationships: [];
      };

      newsletter_subscriber: {
        Row: {
          id: string;
          email: string;
          customer_id: string | null;
          status: 'subscribed' | 'unsubscribed';
          source_page: string | null;
          unsubscribe_token: string;
          subscribed_at: string;
          unsubscribed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // no client insert policy — the sanctioned surface is app_subscribe_newsletter (013_newsletter.sql)
        Update: never; // likewise — app_unsubscribe_newsletter is the only sanctioned status change
        Relationships: [];
      };

      notification_template: {
        Row: {
          id: string;
          key: string;
          channel: 'email' | 'sms' | 'whatsapp' | 'push';
          subject: string | null;
          body_template: string;
          variables: Json | null;
          provider_template_id: string | null;
          status: 'active' | 'disabled';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          key: string;
          channel: 'email' | 'sms' | 'whatsapp' | 'push';
          subject?: string | null;
          body_template: string;
          variables?: Json | null;
          provider_template_id?: string | null;
          status?: 'active' | 'disabled';
        };
        Update: Partial<Omit<Database['public']['Tables']['notification_template']['Insert'], 'id' | 'key' | 'channel'>>;
        Relationships: [];
      };

      notification_log: {
        Row: {
          id: string;
          template_id: string;
          channel: 'email' | 'sms' | 'whatsapp' | 'push';
          recipient: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          status: 'queued' | 'sent' | 'delivered' | 'failed';
          provider_response: Json | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: never; // written exclusively by app_enqueue_notification (internal-only, 022_rls_hardening.sql) and the delivery worker via service_role
        Update: never; // status progression (queued -> sent/delivered/failed) is the delivery worker's responsibility, via service_role, not this client
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // Analytics domain (Data Dictionary 07 / added directly in
      // 016_rls.sql — see that file's Section A header for why).
      // ---------------------------------------------------------------

      analytics_event: {
        Row: {
          id: string;
          event_type: string;
          entity_type: string | null;
          entity_id: string | null;
          customer_id: string | null;
          session_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          customer_id?: string | null;
          session_id?: string | null;
          metadata?: Json | null;
        };
        Update: never; // Pattern C — immutable event log, never updated
        Relationships: [];
      };

      search_query_log: {
        Row: {
          id: string;
          query_text: string;
          results_count: number;
          customer_id: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          query_text: string;
          results_count: number;
          customer_id?: string | null;
          session_id?: string | null;
        };
        Update: never;
        Relationships: [];
      };

      daily_product_metric: {
        Row: {
          id: string;
          product_id: string;
          metric_date: string;
          view_count: number;
          wishlist_add_count: number;
          cart_add_count: number;
          purchase_count: number;
          updated_at: string;
        };
        Insert: never; // populated exclusively by a scheduled job (e.g. pg_cron), never application-request-path code
        Update: never;
        Relationships: [];
      };

      daily_search_term_metric: {
        Row: {
          id: string;
          query_text_normalized: string;
          metric_date: string;
          search_count: number;
          avg_results_count: string;
          updated_at: string;
        };
        Insert: never; // same rollup pattern as daily_product_metric — scheduled-job-populated only
        Update: never;
        Relationships: [];
      };

      audit_log: {
        Row: {
          id: string;
          admin_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: never; // populated exclusively by trg_audit_log()/trg_audit_log_composite() triggers, never a direct client insert
        Update: never; // immutable, append-only (Pattern C, 004_auth.sql)
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // Catalog domain (Data Dictionary 01 / 005_catalog.sql).
      // Added for the Product, Category, and Collection modules.
      // ---------------------------------------------------------------

      department: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['department']['Insert']>;
        Relationships: [];
      };

      category: {
        Row: {
          id: string;
          parent_category_id: string | null;
          department_id: string;
          name: string;
          slug: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_category_id?: string | null;
          department_id: string;
          name: string;
          slug: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['category']['Insert']>;
        Relationships: [];
      };

      brand: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_media_asset_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_media_asset_id?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['brand']['Insert']>;
        Relationships: [];
      };

      gender_tag: {
        Row: { id: string; name: string; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; is_active?: boolean };
        Update: Partial<Database['public']['Tables']['gender_tag']['Insert']>;
        Relationships: [];
      };

      age_group: {
        Row: {
          id: string;
          name: string;
          min_age_months: number | null;
          max_age_months: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          min_age_months?: number | null;
          max_age_months?: number | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['age_group']['Insert']>;
        Relationships: [];
      };

      product_type: {
        Row: {
          id: string;
          code: 'ready_made' | 'made_to_order' | 'bespoke_template';
          name: string;
          requires_inventory: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: 'ready_made' | 'made_to_order' | 'bespoke_template';
          name: string;
          requires_inventory: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['product_type']['Insert']>;
        Relationships: [];
      };

      /** The six structurally identical taxonomy lookups (Data Dictionary 01). */
      material: { Row: TaxonomyLookupRow; Insert: TaxonomyLookupInsert; Update: Partial<TaxonomyLookupInsert> };
      fabric_type: { Row: TaxonomyLookupRow; Insert: TaxonomyLookupInsert; Update: Partial<TaxonomyLookupInsert> };
      embroidery_type: { Row: TaxonomyLookupRow; Insert: TaxonomyLookupInsert; Update: Partial<TaxonomyLookupInsert> };
      occasion: { Row: TaxonomyLookupRow; Insert: TaxonomyLookupInsert; Update: Partial<TaxonomyLookupInsert> };
      season: { Row: TaxonomyLookupRow; Insert: TaxonomyLookupInsert; Update: Partial<TaxonomyLookupInsert> };
      tag: { Row: TaxonomyLookupRow; Insert: TaxonomyLookupInsert; Update: Partial<TaxonomyLookupInsert> };

      product: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          product_type_id: string;
          department_id: string;
          category_id: string | null;
          brand_id: string | null;
          gender_id: string | null;
          age_group_id: string | null;
          status: 'draft' | 'published' | 'archived';
          visibility: 'public' | 'hidden' | 'search_only' | 'private';
          is_featured: boolean;
          is_trending: boolean;
          is_new_arrival: boolean;
          price: string | null; // numeric(12,2)
          compare_at_price: string | null;
          currency: string;
          lead_time_days_min: number | null;
          lead_time_days_max: number | null;
          fabric: string | null;
          craftsmanship: string | null;
          care_instructions: string | null;
          shipping_info: string | null;
          return_policy: string | null;
          average_rating: string | null; // numeric(2,1)
          review_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          product_type_id: string;
          department_id: string;
          category_id?: string | null;
          brand_id?: string | null;
          gender_id?: string | null;
          age_group_id?: string | null;
          status?: 'draft' | 'published' | 'archived';
          visibility?: 'public' | 'hidden' | 'search_only' | 'private';
          is_featured?: boolean;
          is_trending?: boolean;
          is_new_arrival?: boolean;
          price?: string | null;
          compare_at_price?: string | null;
          currency?: string;
          lead_time_days_min?: number | null;
          lead_time_days_max?: number | null;
          fabric?: string | null;
          craftsmanship?: string | null;
          care_instructions?: string | null;
          shipping_info?: string | null;
          return_policy?: string | null;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['product']['Insert'], 'id'>
        >;
        Relationships: [];
      };

      media_asset: {
        Row: {
          id: string;
          storage_path: string;
          is_private: boolean;
          alt_text: string | null;
          tags: string[] | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          storage_path: string;
          is_private?: boolean;
          alt_text?: string | null;
          tags?: string[] | null;
          uploaded_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['media_asset']['Insert']>;
        Relationships: [];
      };

      product_image: {
        Row: {
          id: string;
          product_id: string;
          media_asset_id: string;
          sort_order: number;
          is_primary: boolean;
          alt_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          media_asset_id: string;
          sort_order?: number;
          is_primary?: boolean;
          alt_text?: string | null;
        };
        Update: Partial<Database['public']['Tables']['product_image']['Insert']>;
        Relationships: [];
      };

      product_video: {
        Row: {
          id: string;
          product_id: string;
          media_asset_id: string;
          thumbnail_media_asset_id: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          media_asset_id: string;
          thumbnail_media_asset_id?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['product_video']['Insert']>;
        Relationships: [];
      };

      product_specification: {
        Row: {
          id: string;
          product_id: string;
          spec_key: string;
          spec_value: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          spec_key: string;
          spec_value: string;
          sort_order?: number;
        };
        Update: Partial<
          Database['public']['Tables']['product_specification']['Insert']
        >;
        Relationships: [];
      };

      /** The six structurally identical product-tag join tables (Data Dictionary 01). */
      product_material: { Row: { product_id: string; material_id: string; created_at: string }; Insert: { product_id: string; material_id: string }; Update: never };
      product_fabric_type: { Row: { product_id: string; fabric_type_id: string; created_at: string }; Insert: { product_id: string; fabric_type_id: string }; Update: never };
      product_embroidery_type: { Row: { product_id: string; embroidery_type_id: string; created_at: string }; Insert: { product_id: string; embroidery_type_id: string }; Update: never };
      product_occasion: { Row: { product_id: string; occasion_id: string; created_at: string }; Insert: { product_id: string; occasion_id: string }; Update: never };
      product_season: { Row: { product_id: string; season_id: string; created_at: string }; Insert: { product_id: string; season_id: string }; Update: never };
      product_tag: { Row: { product_id: string; tag_id: string; created_at: string }; Insert: { product_id: string; tag_id: string }; Update: never };

      product_relation: {
        Row: {
          id: string;
          product_id: string;
          related_product_id: string;
          relation_type: 'related' | 'recommended' | 'cross_sell' | 'upsell';
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          related_product_id: string;
          relation_type: 'related' | 'recommended' | 'cross_sell' | 'upsell';
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['product_relation']['Insert']>;
        Relationships: [];
      };

      product_review: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string;
          order_item_id: string | null;
          rating: number;
          review_text: string | null;
          status: 'pending' | 'approved' | 'rejected';
          moderated_by: string | null;
          moderated_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_id: string;
          order_item_id?: string | null;
          rating: number;
          review_text?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
        };
        Update: Partial<
          Omit<Database['public']['Tables']['product_review']['Insert'], 'id' | 'product_id' | 'customer_id'>
        >;
        Relationships: [];
      };

      seo_meta: {
        Row: {
          id: string;
          entity_type: 'product' | 'collection' | 'page';
          entity_id: string;
          meta_title: string | null;
          meta_description: string | null;
          og_image_media_asset_id: string | null;
          canonical_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type: 'product' | 'collection' | 'page';
          entity_id: string;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_media_asset_id?: string | null;
          canonical_url?: string | null;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['seo_meta']['Insert'], 'entity_type' | 'entity_id'>
        >;
        Relationships: [];
      };

      collection: {
        Row: {
          id: string;
          slug: string;
          title: string;
          label: string | null;
          description: string | null;
          hero_media_asset_id: string | null;
          status: 'draft' | 'published' | 'archived';
          sort_order: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          label?: string | null;
          description?: string | null;
          hero_media_asset_id?: string | null;
          status?: 'draft' | 'published' | 'archived';
          sort_order?: number;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['collection']['Insert'], 'id'>
        >;
        Relationships: [];
      };

      product_collection: {
        Row: { product_id: string; collection_id: string; sort_order: number; created_at: string };
        Insert: { product_id: string; collection_id: string; sort_order?: number };
        Update: Partial<{ sort_order: number }>;
        Relationships: [];
      };

      // ---------------------------------------------------------------
      // Inventory domain (Data Dictionary 02 / 006_inventory.sql).
      // ---------------------------------------------------------------

      warehouse: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          is_default?: boolean;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['warehouse']['Insert']>;
        Relationships: [];
      };

      product_variant: {
        Row: {
          id: string;
          product_id: string;
          size: string | null;
          color: string | null;
          sku: string;
          barcode: string | null;
          price_override: string | null; // numeric(12,2)
          status: 'active' | 'discontinued';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          size?: string | null;
          color?: string | null;
          sku: string;
          barcode?: string | null;
          price_override?: string | null;
          status?: 'active' | 'discontinued';
        };
        Update: Partial<
          Omit<Database['public']['Tables']['product_variant']['Insert'], 'id' | 'product_id'>
        >;
        Relationships: [];
      };

      inventory_item: {
        Row: {
          id: string;
          warehouse_id: string;
          variant_id: string;
          on_hand_qty: number;
          reserved_qty: number;
          reorder_level: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: string;
          warehouse_id: string;
          variant_id: string;
          on_hand_qty?: number;
          reserved_qty?: number;
          reorder_level?: number;
        };
        Update: Partial<
          Omit<Database['public']['Tables']['inventory_item']['Insert'], 'id' | 'warehouse_id' | 'variant_id'>
        >;
        Relationships: [];
      };

      stock_movement: {
        Row: {
          id: string;
          inventory_item_id: string;
          movement_type: 'inbound' | 'outbound' | 'adjustment' | 'return';
          qty: number;
          reference_type: string | null;
          reference_id: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: never; // written exclusively by trg_inventory_item_log_movement; never inserted directly
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      v_product_catalog: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          product_type_code: 'ready_made' | 'made_to_order' | 'bespoke_template';
          department_slug: string;
          department_name: string;
          category_slug: string | null;
          category_name: string | null;
          price: string | null;
          compare_at_price: string | null;
          currency: string;
          lead_time_days_min: number | null;
          lead_time_days_max: number | null;
          is_featured: boolean;
          is_trending: boolean;
          is_new_arrival: boolean;
          average_rating: string | null;
          review_count: number;
          primary_image_storage_path: string | null;
          primary_image_alt_text: string | null;
        };
        Relationships: [];
      };
      v_product_variant_availability: {
        Row: {
          variant_id: string;
          product_id: string;
          size: string | null;
          color: string | null;
          sku: string;
          product_type_code: 'ready_made' | 'made_to_order' | 'bespoke_template';
          available_qty: number | null;
          availability_status: 'in_stock' | 'out_of_stock' | 'made_to_order' | 'consultation_required';
          lead_time_days_min: number | null;
          lead_time_days_max: number | null;
        };
        Relationships: [];
      };
      v_featured_products: {
        Row: Database['public']['Views']['v_product_catalog']['Row'] & {
          placement_id: string;
          placement_context: 'homepage' | 'department' | 'collection_page';
          context_ref_id: string | null;
          placement_type: 'featured' | 'trending';
          sort_order: number;
        };
        Relationships: [];
      };
      v_staff_low_stock: {
        Row: {
          inventory_item_id: string;
          warehouse_name: string;
          product_name: string;
          sku: string;
          size: string | null;
          color: string | null;
          on_hand_qty: number;
          reserved_qty: number;
          reorder_level: number;
        };
        Relationships: [];
      };
      v_my_orders: {
        Row: {
          id: string;
          order_number: string;
          order_type: 'ready_made' | 'made_to_order' | 'bespoke' | 'mixed';
          status: string;
          grand_total: string;
          currency: string;
          placed_at: string;
          item_count: number;
        };
        Relationships: [];
      };
      v_staff_order_queue: {
        Row: {
          id: string;
          order_number: string;
          order_type: 'ready_made' | 'made_to_order' | 'bespoke' | 'mixed';
          status: string;
          grand_total: string;
          currency: string;
          placed_at: string;
          customer_display_name: string;
          customer_email: string | null;
          item_count: number;
        };
        Relationships: [];
      };
      v_staff_notification_queue: {
        Row: {
          id: string;
          template_key: string;
          channel: 'email' | 'sms' | 'whatsapp' | 'push';
          recipient: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          status: 'queued' | 'sent' | 'delivered' | 'failed';
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      app_current_customer_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      app_current_admin_user_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      app_has_permission: {
        Args: { p_permission_key: string };
        Returns: boolean;
      };
      app_adjust_inventory_stock: {
        Args: {
          p_inventory_item_id: string;
          p_delta: number;
          p_movement_type: 'inbound' | 'outbound' | 'adjustment' | 'return';
          p_reference_type?: string | null;
          p_reference_id?: string | null;
        };
        Returns: Database['public']['Tables']['inventory_item']['Row'];
      };
      app_adjust_inventory_reservation: {
        Args: { p_inventory_item_id: string; p_delta: number };
        Returns: Database['public']['Tables']['inventory_item']['Row'];
      };
      app_checkout_cart: {
        Args: {
          p_customer_id: string;
          p_cart_id: string;
          p_shipping_address_id: string;
          p_billing_address_id?: string | null;
          p_coupon_code?: string | null;
          p_shipping_total?: number;
          p_warehouse_id?: string | null;
        };
        Returns: Database['public']['Tables']['order']['Row'];
      };
      app_cancel_order: {
        Args: { p_order_id: string; p_reason?: string | null };
        Returns: Database['public']['Tables']['order']['Row'];
      };
      app_issue_refund: {
        Args: {
          p_order_id: string;
          p_payment_id: string;
          p_reason: string;
          p_line_items: Json;
          p_return_request_id?: string | null;
        };
        Returns: Database['public']['Tables']['refund']['Row'];
      };
      app_submit_inquiry: {
        Args: {
          p_name: string;
          p_email: string;
          p_phone?: string | null;
          p_subject?: string | null;
          p_message?: string | null;
          p_source_page?: string | null;
          p_order_id?: string | null;
          p_inquiry_type?: 'general' | 'order_support' | 'product_question';
        };
        Returns: string;
      };
      app_resolve_contact_info: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['contact_info']['Row'];
      };
      app_subscribe_newsletter: {
        Args: { p_email: string; p_source_page?: string | null };
        Returns: string;
      };
      app_unsubscribe_newsletter: {
        Args: { p_token: string };
        Returns: boolean;
      };
      app_validate_coupon: {
        Args: { p_code: string; p_order_subtotal: number };
        Returns: {
          is_valid: boolean;
          reason: string | null;
          coupon_id: string | null;
          discount_type: string | null;
          value: number | null;
        }[];
      };
      app_anonymize_customer: {
        Args: { p_customer_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>; // the schema deliberately uses text+CHECK, not native enums
    CompositeTypes: Record<string, never>; // no composite types are used anywhere in this schema
  };
}

/** Shared row/insert shape for the six structurally identical taxonomy lookups. */
interface TaxonomyLookupRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
interface TaxonomyLookupInsert {
  id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
}

// Convenience row/insert/update aliases, extended per module as new
// tables are added to Database['public']['Tables'] above.
export type CustomerTierRow = Database['public']['Tables']['customer_tier']['Row'];
export type CustomerTierInsert = Database['public']['Tables']['customer_tier']['Insert'];
export type CustomerTierUpdate = Database['public']['Tables']['customer_tier']['Update'];

export type CustomerRow = Database['public']['Tables']['customer']['Row'];
export type CustomerInsert = Database['public']['Tables']['customer']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customer']['Update'];

export type AddressRow = Database['public']['Tables']['address']['Row'];
export type AddressInsert = Database['public']['Tables']['address']['Insert'];
export type AddressUpdate = Database['public']['Tables']['address']['Update'];

export type CartRow = Database['public']['Tables']['cart']['Row'];
export type CartInsert = Database['public']['Tables']['cart']['Insert'];

export type CartItemRow = Database['public']['Tables']['cart_item']['Row'];
export type CartItemInsert = Database['public']['Tables']['cart_item']['Insert'];

// ---------------------------------------------------------------------
// Orders / Commerce domain convenience aliases (Orders module).
// ---------------------------------------------------------------------

export type OrderRow = Database['public']['Tables']['order']['Row'];
export type OrderUpdate = Database['public']['Tables']['order']['Update'];

// ---------------------------------------------------------------------
// Tailoring domain convenience aliases (Tailoring module).
// ---------------------------------------------------------------------

export type GarmentTypeRow = Database['public']['Tables']['garment_type']['Row'];

export type GarmentMeasurementTemplateRow = Database['public']['Tables']['garment_measurement_template']['Row'];
export type GarmentMeasurementTemplateInsert = Database['public']['Tables']['garment_measurement_template']['Insert'];

export type MeasurementProfileRow = Database['public']['Tables']['measurement_profile']['Row'];
export type MeasurementProfileInsert = Database['public']['Tables']['measurement_profile']['Insert'];

export type TailoringRequestRow = Database['public']['Tables']['tailoring_request']['Row'];
export type TailoringRequestInsert = Database['public']['Tables']['tailoring_request']['Insert'];
export type TailoringRequestStatus = TailoringRequestRow['status'];
export type TailoringRequestSource = TailoringRequestRow['source'];

export type AppointmentRow = Database['public']['Tables']['appointment']['Row'];
export type AppointmentInsert = Database['public']['Tables']['appointment']['Insert'];
export type AppointmentStatus = AppointmentRow['status'];
export type AppointmentType = AppointmentRow['type'];

export type FabricSelectionRow = Database['public']['Tables']['fabric_selection']['Row'];
export type FabricSelectionInsert = Database['public']['Tables']['fabric_selection']['Insert'];

export type DesignBriefRow = Database['public']['Tables']['design_brief']['Row'];
export type DesignBriefInsert = Database['public']['Tables']['design_brief']['Insert'];

export type ReferenceImageRow = Database['public']['Tables']['reference_image']['Row'];
export type ReferenceImageInsert = Database['public']['Tables']['reference_image']['Insert'];

export type QuotationRow = Database['public']['Tables']['quotation']['Row'];
export type QuotationInsert = Database['public']['Tables']['quotation']['Insert'];
export type QuotationStatus = QuotationRow['status'];

export type QuotationLineItemRow = Database['public']['Tables']['quotation_line_item']['Row'];
export type QuotationLineItemInsert = Database['public']['Tables']['quotation_line_item']['Insert'];

export type ProductionStageRow = Database['public']['Tables']['production_stage']['Row'];

export type TailoringOrderStageHistoryRow = Database['public']['Tables']['tailoring_order_stage_history']['Row'];
export type TailoringOrderStageHistoryInsert = Database['public']['Tables']['tailoring_order_stage_history']['Insert'];

export type TailoringOrderStatusHistoryRow = Database['public']['Tables']['tailoring_order_status_history']['Row'];

// ---------------------------------------------------------------------
// CMS domain convenience aliases (CMS module). MediaAssetRow is
// declared earlier in this file (added by the Product module).
// ---------------------------------------------------------------------

export type PageRow = Database['public']['Tables']['page']['Row'];
export type PageInsert = Database['public']['Tables']['page']['Insert'];

export type ContentBlockRow = Database['public']['Tables']['content_block']['Row'];
export type ContentBlockInsert = Database['public']['Tables']['content_block']['Insert'];
export type ContentBlockStatus = ContentBlockRow['status'];

export type HeroBannerRow = Database['public']['Tables']['hero_banner']['Row'];
export type HeroBannerInsert = Database['public']['Tables']['hero_banner']['Insert'];

export type FeaturedPlacementRow = Database['public']['Tables']['featured_placement']['Row'];
export type FeaturedPlacementInsert = Database['public']['Tables']['featured_placement']['Insert'];

export type GalleryItemRow = Database['public']['Tables']['gallery_item']['Row'];
export type GalleryItemInsert = Database['public']['Tables']['gallery_item']['Insert'];

export type TestimonialRow = Database['public']['Tables']['testimonial']['Row'];
export type TestimonialInsert = Database['public']['Tables']['testimonial']['Insert'];

export type AnnouncementRow = Database['public']['Tables']['announcement']['Row'];
export type AnnouncementInsert = Database['public']['Tables']['announcement']['Insert'];

export type NavigationMenuRow = Database['public']['Tables']['navigation_menu']['Row'];

export type NavigationItemRow = Database['public']['Tables']['navigation_item']['Row'];
export type NavigationItemInsert = Database['public']['Tables']['navigation_item']['Insert'];

export type MegaMenuPromoRow = Database['public']['Tables']['mega_menu_promo']['Row'];
export type MegaMenuPromoInsert = Database['public']['Tables']['mega_menu_promo']['Insert'];

export type SocialLinkRow = Database['public']['Tables']['social_link']['Row'];
export type SocialLinkInsert = Database['public']['Tables']['social_link']['Insert'];

export type ContactInfoRow = Database['public']['Tables']['contact_info']['Row'];
export type ContactInfoUpdate = Database['public']['Tables']['contact_info']['Update'];

export type SeoRedirectRow = Database['public']['Tables']['seo_redirect']['Row'];
export type SeoRedirectInsert = Database['public']['Tables']['seo_redirect']['Insert'];

export type SiteSettingRow = Database['public']['Tables']['site_setting']['Row'];

// ---------------------------------------------------------------------
// Contact domain convenience aliases (Contact module).
// ---------------------------------------------------------------------

export type InquiryRow = Database['public']['Tables']['inquiry']['Row'];
export type InquiryStatus = InquiryRow['status'];
export type InquiryType = InquiryRow['inquiry_type'];
export type SubmitInquiryArgs = Database['public']['Functions']['app_submit_inquiry']['Args'];

export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

// ---------------------------------------------------------------------
// Analytics domain convenience aliases (Analytics module).
// ---------------------------------------------------------------------

export type AnalyticsEventRow = Database['public']['Tables']['analytics_event']['Row'];
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_event']['Insert'];

export type SearchQueryLogRow = Database['public']['Tables']['search_query_log']['Row'];
export type SearchQueryLogInsert = Database['public']['Tables']['search_query_log']['Insert'];

export type DailyProductMetricRow = Database['public']['Tables']['daily_product_metric']['Row'];

export type DailySearchTermMetricRow = Database['public']['Tables']['daily_search_term_metric']['Row'];

// ---------------------------------------------------------------------
// Newsletter domain convenience aliases (Newsletter module).
// ---------------------------------------------------------------------

export type NewsletterSubscriberRow = Database['public']['Tables']['newsletter_subscriber']['Row'];
export type NewsletterSubscriberStatus = NewsletterSubscriberRow['status'];

// ---------------------------------------------------------------------
// Notifications domain convenience aliases (Notifications module).
// ---------------------------------------------------------------------

export type NotificationTemplateRow = Database['public']['Tables']['notification_template']['Row'];
export type NotificationTemplateInsert = Database['public']['Tables']['notification_template']['Insert'];
export type NotificationTemplateUpdate = Database['public']['Tables']['notification_template']['Update'];
export type NotificationChannel = NotificationTemplateRow['channel'];
export type NotificationTemplateStatus = NotificationTemplateRow['status'];

export type NotificationLogRow = Database['public']['Tables']['notification_log']['Row'];
export type NotificationLogStatus = NotificationLogRow['status'];

export type VStaffNotificationQueueRow = Database['public']['Views']['v_staff_notification_queue']['Row'];
export type OrderStatus = OrderRow['status'];
export type OrderType = OrderRow['order_type'];

export type OrderItemRow = Database['public']['Tables']['order_item']['Row'];

export type PaymentRow = Database['public']['Tables']['payment']['Row'];
export type PaymentInsert = Database['public']['Tables']['payment']['Insert'];
export type PaymentStatus = PaymentRow['status'];
export type PaymentProvider = PaymentRow['provider'];

export type PaymentTransactionRow = Database['public']['Tables']['payment_transaction']['Row'];
export type PaymentTransactionInsert = Database['public']['Tables']['payment_transaction']['Insert'];

export type ShipmentRow = Database['public']['Tables']['shipment']['Row'];
export type ShipmentInsert = Database['public']['Tables']['shipment']['Insert'];
export type ShipmentUpdate = Database['public']['Tables']['shipment']['Update'];
export type ShipmentStatus = ShipmentRow['status'];

export type ShipmentTrackingEventRow = Database['public']['Tables']['shipment_tracking_event']['Row'];

export type CouponRow = Database['public']['Tables']['coupon']['Row'];
export type CouponInsert = Database['public']['Tables']['coupon']['Insert'];
export type CouponUpdate = Database['public']['Tables']['coupon']['Update'];

export type CouponRedemptionRow = Database['public']['Tables']['coupon_redemption']['Row'];

export type PromotionRow = Database['public']['Tables']['promotion']['Row'];
export type PromotionInsert = Database['public']['Tables']['promotion']['Insert'];
export type PromotionUpdate = Database['public']['Tables']['promotion']['Update'];

export type TaxRuleRow = Database['public']['Tables']['tax_rule']['Row'];
export type TaxRuleInsert = Database['public']['Tables']['tax_rule']['Insert'];
export type TaxRuleUpdate = Database['public']['Tables']['tax_rule']['Update'];

export type InvoiceRow = Database['public']['Tables']['invoice']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoice']['Insert'];

export type RefundRow = Database['public']['Tables']['refund']['Row'];
export type RefundInsert = Database['public']['Tables']['refund']['Insert'];
export type RefundStatus = RefundRow['status'];

export type RefundItemRow = Database['public']['Tables']['refund_item']['Row'];
export type RefundItemInsert = Database['public']['Tables']['refund_item']['Insert'];

export type OrderStatusHistoryRow = Database['public']['Tables']['order_status_history']['Row'];

export type ReturnRequestRow = Database['public']['Tables']['return_request']['Row'];
export type ReturnRequestInsert = Database['public']['Tables']['return_request']['Insert'];
export type ReturnRequestStatus = ReturnRequestRow['status'];

export type VMyOrdersRow = Database['public']['Views']['v_my_orders']['Row'];
export type VStaffOrderQueueRow = Database['public']['Views']['v_staff_order_queue']['Row'];

export type CheckoutCartArgs = Database['public']['Functions']['app_checkout_cart']['Args'];
export type ValidateCouponResult = Database['public']['Functions']['app_validate_coupon']['Returns'][number];

export type AdminUserRow = Database['public']['Tables']['admin_user']['Row'];

export type RoleRow = Database['public']['Tables']['role']['Row'];
export type PermissionRow = Database['public']['Tables']['permission']['Row'];

// ---------------------------------------------------------------------
// Catalog domain convenience aliases (Product / Category / Collection
// modules).
// ---------------------------------------------------------------------

export type DepartmentRow = Database['public']['Tables']['department']['Row'];

export type CategoryRow = Database['public']['Tables']['category']['Row'];
export type CategoryInsert = Database['public']['Tables']['category']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['category']['Update'];

export type BrandRow = Database['public']['Tables']['brand']['Row'];
export type GenderTagRow = Database['public']['Tables']['gender_tag']['Row'];
export type AgeGroupRow = Database['public']['Tables']['age_group']['Row'];
export type ProductTypeRow = Database['public']['Tables']['product_type']['Row'];
export type ProductTypeCode = ProductTypeRow['code'];

export type ProductRow = Database['public']['Tables']['product']['Row'];
export type ProductInsert = Database['public']['Tables']['product']['Insert'];
export type ProductUpdate = Database['public']['Tables']['product']['Update'];
export type ProductStatus = ProductRow['status'];
export type ProductVisibility = ProductRow['visibility'];

export type MediaAssetRow = Database['public']['Tables']['media_asset']['Row'];
export type MediaAssetInsert = Database['public']['Tables']['media_asset']['Insert'];
export type ProductImageRow = Database['public']['Tables']['product_image']['Row'];
export type ProductImageInsert = Database['public']['Tables']['product_image']['Insert'];
export type ProductVideoRow = Database['public']['Tables']['product_video']['Row'];
export type ProductSpecificationRow = Database['public']['Tables']['product_specification']['Row'];
export type ProductSpecificationInsert = Database['public']['Tables']['product_specification']['Insert'];
export type ProductRelationRow = Database['public']['Tables']['product_relation']['Row'];
export type ProductRelationType = ProductRelationRow['relation_type'];
export type ProductReviewRow = Database['public']['Tables']['product_review']['Row'];
export type ProductReviewInsert = Database['public']['Tables']['product_review']['Insert'];

export type CollectionRow = Database['public']['Tables']['collection']['Row'];
export type CollectionInsert = Database['public']['Tables']['collection']['Insert'];
export type CollectionUpdate = Database['public']['Tables']['collection']['Update'];
export type ProductCollectionRow = Database['public']['Tables']['product_collection']['Row'];

export type VProductCatalogRow = Database['public']['Views']['v_product_catalog']['Row'];
export type VProductVariantAvailabilityRow =
  Database['public']['Views']['v_product_variant_availability']['Row'];
export type VFeaturedProductsRow = Database['public']['Views']['v_featured_products']['Row'];

// ---------------------------------------------------------------------
// Inventory domain convenience aliases (Inventory module).
// ---------------------------------------------------------------------

export type WarehouseRow = Database['public']['Tables']['warehouse']['Row'];
export type WarehouseInsert = Database['public']['Tables']['warehouse']['Insert'];
export type WarehouseUpdate = Database['public']['Tables']['warehouse']['Update'];

export type ProductVariantRow = Database['public']['Tables']['product_variant']['Row'];
export type ProductVariantInsert = Database['public']['Tables']['product_variant']['Insert'];
export type ProductVariantUpdate = Database['public']['Tables']['product_variant']['Update'];
export type ProductVariantStatus = ProductVariantRow['status'];

export type InventoryItemRow = Database['public']['Tables']['inventory_item']['Row'];
export type InventoryItemInsert = Database['public']['Tables']['inventory_item']['Insert'];
export type InventoryItemUpdate = Database['public']['Tables']['inventory_item']['Update'];

export type StockMovementRow = Database['public']['Tables']['stock_movement']['Row'];
export type StockMovementType = StockMovementRow['movement_type'];

export type VStaffLowStockRow = Database['public']['Views']['v_staff_low_stock']['Row'];

// ---------------------------------------------------------------------
// Customer domain convenience aliases, remaining tables (Customers
// module). customer_tier/customer aliases are declared earlier in
// this file (added by the Authentication module).
// ---------------------------------------------------------------------

export type LoyaltyAccountRow = Database['public']['Tables']['loyalty_account']['Row'];

export type LoyaltyTransactionRow = Database['public']['Tables']['loyalty_transaction']['Row'];
export type LoyaltyTransactionInsert = Database['public']['Tables']['loyalty_transaction']['Insert'];

export type ReferralRow = Database['public']['Tables']['referral']['Row'];
export type ReferralInsert = Database['public']['Tables']['referral']['Insert'];
export type ReferralStatus = ReferralRow['status'];

export type CommunicationPreferenceRow = Database['public']['Tables']['communication_preference']['Row'];
export type CommunicationChannel = CommunicationPreferenceRow['channel'];

export type CustomerDeviceRow = Database['public']['Tables']['customer_device']['Row'];
export type CustomerDeviceInsert = Database['public']['Tables']['customer_device']['Insert'];
export type CustomerDevicePlatform = CustomerDeviceRow['platform'];

/** The six product-taxonomy lookup table names, used by the generic taxonomy helpers. */
export type TaxonomyTableName =
  | 'material'
  | 'fabric_type'
  | 'embroidery_type'
  | 'occasion'
  | 'season'
  | 'tag';

/** The six product-taxonomy join table names, one per TaxonomyTableName above. */
export type ProductTaxonomyJoinTableName =
  | 'product_material'
  | 'product_fabric_type'
  | 'product_embroidery_type'
  | 'product_occasion'
  | 'product_season'
  | 'product_tag';
