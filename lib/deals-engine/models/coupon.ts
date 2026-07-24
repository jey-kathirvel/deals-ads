export interface Coupon {

  id?: string;

  platform: string;

  category: string;

  title: string;

  description?: string;

  couponCode?: string;

  offerUrl: string;

  imageUrl?: string;

  expiresAt?: Date;

  discoveredAt: Date;

  metadata?: Record<string, unknown>;
}
