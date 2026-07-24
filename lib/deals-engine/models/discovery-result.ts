import { Deal } from "./deal";

export interface DiscoveryResult {
  deals: Deal[];
  durationMs: number;
}
