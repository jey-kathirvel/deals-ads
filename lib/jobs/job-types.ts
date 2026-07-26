export type JobStatus =
  | "queued"
  | "running"
  | "success"
  | "partial_success"
  | "failed"
  | "cancelled";

export type JobType =
  | "full-import"
  | "quickcommerce-import"
  | "amazon-import"
  | "cleanup";

export interface JobRun {
  id: string;
  type: JobType;
  status: JobStatus;

  triggeredBy: "admin" | "system";

  startedAt?: string;
  completedAt?: string;
  durationMs?: number;

  progress: number;
  total: number;

  imported: number;
  updated: number;
  skipped: number;
  failed: number;

  message?: string;
  error?: string;
}

export interface JobLock {
  locked: boolean;
  jobId: string | null;
  lockedAt: string | null;
}
