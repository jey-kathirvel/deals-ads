export enum SchedulerJobStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface SchedulerJob {
  id: string;
  provider: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: SchedulerJobStatus;
  attempts: number;
  lastError?: string;
}

export interface QueueStatistics {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export class SchedulerQueueService {

  private readonly jobs =
    new Map<string, SchedulerJob>();

  enqueue(
    job: SchedulerJob,
  ): void {

    if (this.jobs.has(job.id)) {
      throw new Error(
        `Scheduler job "${job.id}" already exists`,
      );
    }

    this.jobs.set(
      job.id,
      {
        ...job,
      },
    );

  }

  dequeue(): SchedulerJob | null {

    const pending =
      [...this.jobs.values()]
        .filter(
          job =>
            job.status ===
            SchedulerJobStatus.PENDING,
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.scheduledAt.getTime() -
            second.scheduledAt.getTime(),
        )[0];

    if (!pending) {
      return null;
    }

    pending.status =
      SchedulerJobStatus.RUNNING;

    pending.startedAt =
      new Date();

    pending.attempts += 1;

    return {
      ...pending,
    };

  }

  complete(
    id: string,
  ): void {

    const job =
      this.jobs.get(id);

    if (!job) {
      throw new Error(
        `Unknown scheduler job "${id}"`,
      );
    }

    job.status =
      SchedulerJobStatus.COMPLETED;

    job.completedAt =
      new Date();

  }

  fail(
    id: string,
    error: string,
  ): void {

    const job =
      this.jobs.get(id);

    if (!job) {
      throw new Error(
        `Unknown scheduler job "${id}"`,
      );
    }

    job.status =
      SchedulerJobStatus.FAILED;

    job.lastError =
      error;

    job.completedAt =
      new Date();

  }

  statistics(): QueueStatistics {

    const stats: QueueStatistics = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    for (const job of this.jobs.values()) {

      switch (job.status) {

        case SchedulerJobStatus.PENDING:
          stats.pending++;
          break;

        case SchedulerJobStatus.RUNNING:
          stats.running++;
          break;

        case SchedulerJobStatus.COMPLETED:
          stats.completed++;
          break;

        case SchedulerJobStatus.FAILED:
          stats.failed++;
          break;

      }

    }

    return stats;

  }

  list(): SchedulerJob[] {

    return [...this.jobs.values()]
      .sort(
        (
          first,
          second,
        ) =>
          first.scheduledAt.getTime() -
          second.scheduledAt.getTime(),
      )
      .map(
        job => ({
          ...job,
        }),
      );

  }

}
