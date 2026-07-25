export interface DiscoveryRun {
  id: string;

  startedAt: Date;

  completedAt?: Date;

  providers: number;

  discovered: number;

  validated: number;

  published: number;

  rejected: number;

  status: "RUNNING" | "SUCCESS" | "FAILED";
}
