import type { Deal } from "../models/deal";
import type { Coupon } from "../models/coupon";

export interface DiscoveryResult {
  deals: Deal[];
  coupons: Coupon[];
}

export interface DiscoveryProvider {

  readonly id: string;

  readonly name: string;

  readonly enabled: boolean;

  discover(): Promise<DiscoveryResult>;
}
