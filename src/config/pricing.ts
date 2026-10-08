import { PaymentInterval, PaymentType } from '@/core/payment/types';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};
export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};
// Authoritative catalog: client-supplied prices and credits are ignored.
export const pricingCatalog: Record<string, PricingProduct> = {
  creator_monthly: {
    productId: 'creator_monthly',
    productName: 'Creator',
    planName: 'Creator',
    description: 'Prism Studio Creator Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 1200,
    currency: 'usd',
    credits: 100,
    creditsValidDays: 31,
    plan: {
      name: 'Creator',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
  pro_monthly: {
    productId: 'pro_monthly',
    productName: 'Pro',
    planName: 'Pro',
    description: 'Prism Studio Pro Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 2900,
    currency: 'usd',
    credits: 300,
    creditsValidDays: 31,
    plan: { name: 'Pro', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  image_pack: {
    productId: 'image_pack',
    productName: '80 Image Pack',
    planName: 'Image Pack',
    description: 'Prism Studio 80 Image Credits',
    type: PaymentType.ONE_TIME,
    priceInCents: 990,
    currency: 'usd',
    credits: 80,
    creditsValidDays: 365,
  },
};
export function getPricingProduct(id: string): PricingProduct | null {
  return pricingCatalog[id] ?? null;
}
export function listPricingProducts() {
  return Object.values(pricingCatalog);
}
