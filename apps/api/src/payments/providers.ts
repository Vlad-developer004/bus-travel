import { Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { CheckoutInput, PaymentProvider } from './payment-provider';

export class MockProvider implements PaymentProvider {
  readonly name = 'mock' as const;
  constructor(private readonly webUrl: string) {}

  async createCheckout(i: CheckoutInput) {
    return { url: `${this.webUrl}/${i.locale}/pay/mock?booking=${i.bookingId}` };
  }

  async refund() {
  }
}

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private readonly log = new Logger('StripeProvider');
  readonly client: Stripe;

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey);
  }

  async createCheckout(i: CheckoutInput) {
    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      expires_at: Math.floor(i.expiresAt.getTime() / 1000),
      client_reference_id: i.bookingId,
      metadata: { bookingId: i.bookingId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: i.currency.toLowerCase(),
            unit_amount: i.totalCents,
            product_data: { name: i.description, description: `Booking ${i.code}` },
          },
        },
      ],
      success_url: i.successUrl,
      cancel_url: i.cancelUrl,
    });
    return { url: session.url!, ref: session.id };
  }

  async refund(paymentRef: string | null) {
    if (!paymentRef?.startsWith('pi_')) {
      this.log.warn(`Cannot refund: unexpected payment reference ${paymentRef}`);
      return;
    }
    await this.client.refunds.create({ payment_intent: paymentRef });
  }
}
