import fs from "fs";
import path from "path";

const CONTROL_DIR = path.join(process.cwd(), "data/jobs/control");
const controllers = new Map<string, AbortController>();

function ensureDirectory() {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
}

function stopFile(jobId: string) {
  return path.join(CONTROL_DIR, `${jobId}.stop.json`);
}

export class JobCancelledError extends Error {
  constructor(message = "Job stopped manually by an administrator.") {
    super(message);
    this.name = "JobCancelledError";
  }
}

export function registerJobController(jobId: string): AbortController {
  ensureDirectory();
  fs.rmSync(stopFile(jobId), { force: true });
  const controller = new AbortController();
  controllers.set(jobId, controller);
  return controller;
}

export function unregisterJobController(jobId: string) {
  controllers.delete(jobId);
  fs.rmSync(stopFile(jobId), { force: true });
}

export function requestJobStop(jobId: string): boolean {
  ensureDirectory();
  fs.writeFileSync(
    stopFile(jobId),
    JSON.stringify(
      { requestedAt: new Date().toISOString(), requestedBy: "admin" },
      null,
      2,
    ),
  );
  const controller = controllers.get(jobId);
  if (controller && !controller.signal.aborted) {
    controller.abort(new JobCancelledError());
    return true;
  }
  return false;
}

export function isJobStopRequested(jobId: string): boolean {
  return fs.existsSync(stopFile(jobId));
}

export function throwIfJobStopRequested(jobId: string, signal?: AbortSignal) {
  if (signal?.aborted || isJobStopRequested(jobId)) {
    throw new JobCancelledError();
  }
}
