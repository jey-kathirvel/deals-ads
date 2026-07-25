import type { DealRecord } from "../models";
import type { DealRepository } from "../repositories";

export interface DuplicateDetectionResult {
    accepted: DealRecord[];
    duplicates: DealRecord[];
}

export class DuplicateDetectionService {

    constructor(
        private readonly repository: DealRepository,
    ) {}

    async filter(
        deals: readonly DealRecord[],
    ): Promise<DuplicateDetectionResult> {

        const accepted: DealRecord[] = [];
        const duplicates: DealRecord[] = [];

        const batchSeen = new Set<string>();

        for (const deal of deals) {

            const key =
                `${deal.source}:${deal.externalId}`;

            if (batchSeen.has(key)) {
                duplicates.push(deal);
                continue;
            }

            batchSeen.add(key);

            const exists =
                await this.repository.existsByExternalId(
                    deal.source,
                    deal.externalId,
                );

            if (exists) {
                duplicates.push(deal);
                continue;
            }

            accepted.push(deal);

        }

        return {
            accepted,
            duplicates,
        };

    }

}
