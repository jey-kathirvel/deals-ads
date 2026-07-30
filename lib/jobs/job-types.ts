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
  | "grocery-import"
  | "amazon-import"
  | "cleanup";

export interface JobEvent {
  timestamp: string;
  stage:
    | "starting"
    | "search"
    | "selection"
    | "import"
    | "validation"
    | "cleanup"
    | "complete"
    | "error";
  message: string;
}

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
  deleted: number;
  failed: number;

  message?: string;
  error?: string;
  events?: JobEvent[];
}

export interface JobLock {
  locked: boolean;
  jobId: string | null;
  lockedAt: string | null;
}
