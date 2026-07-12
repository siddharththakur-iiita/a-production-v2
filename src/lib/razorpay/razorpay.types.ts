/**
 * src/lib/razorpay/razorpay.types.ts
 */

export interface CreatePaymentOrderInput {
  amount: number;
  currency: string;
  orderId: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  receipt: string | null;
  status: string;
}

export interface VerifyPaymentSignatureInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    refund?: { entity: RazorpayRefundEntity };
    order?: { entity: RazorpayOrderEntity };
  };
}

export interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  captured: boolean;
  error_code?: string | null;
  error_description?: string | null;
}

export interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

export interface RazorpayOrderEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
}

export interface CreateRefundInput {
  razorpayPaymentId: string;
  amount?: number;
  notes?: Record<string, string>;
}

export interface RazorpayRefundResult {
  razorpayRefundId: string;
  amount: number;
  amountInPaise: number;
  status: string;
}
