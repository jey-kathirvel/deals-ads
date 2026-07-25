export interface ExpiringDeal {
  id: string;
  expiresAt?: Date | string | null;
}

export interface DealExpiryResult {
  active: ExpiringDeal[];
  expired: ExpiringDeal[];
  expiringSoon: ExpiringDeal[];
}

export interface DealExpiryManagerOptions {
  now?: Date;
  expiringSoonHours?: number;
}

export class DealExpiryManager {

  private readonly now: Date;
  private readonly expiringSoonHours: number;

  constructor(
    options: DealExpiryManagerOptions = {},
  ) {
    this.now =
      options.now
        ? new Date(options.now)
        : new Date();

    this.expiringSoonHours =
      options.expiringSoonHours ?? 24;
  }

  process(
    deals: readonly ExpiringDeal[],
  ): DealExpiryResult {

    const active: ExpiringDeal[] = [];
    const expired: ExpiringDeal[] = [];
    const expiringSoon: ExpiringDeal[] = [];

    for (const deal of deals) {

      if (!deal.expiresAt) {
        active.push(deal);
        continue;
      }

      const expiry =
        new Date(deal.expiresAt);

      if (
        Number.isNaN(
          expiry.getTime(),
        )
      ) {
        expired.push(deal);
        continue;
      }

      if (
        expiry.getTime() <=
        this.now.getTime()
      ) {
        expired.push(deal);
        continue;
      }

      active.push(deal);

      const hours =
        (
          expiry.getTime() -
          this.now.getTime()
        ) / 3_600_000;

      if (
        hours <=
        this.expiringSoonHours
      ) {
        expiringSoon.push(deal);
      }

    }

    return {
      active,
      expired,
      expiringSoon,
    };
  }

}
