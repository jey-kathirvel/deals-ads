import type {
  ProviderElement,
} from "./provider-html-parser";

import type {
  RawDeal,
} from "./discovery-provider";

export interface ProviderDealMapper {

  map(
    element: ProviderElement,
  ): RawDeal | null;
}
