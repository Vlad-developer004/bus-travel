export interface CheckoutInput {
  bookingId: string;
  code: string;
  totalCents: number;
  currency: string;
  description: string;
  locale: string;
  expiresAt: Date;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe';
  createCheckout(input: CheckoutInput): Promise<{ url: string; ref?: string }>;
  refund(paymentRef: string | null): Promise<void>;
}
