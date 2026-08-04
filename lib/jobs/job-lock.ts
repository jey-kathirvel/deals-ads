import fs from "fs";
import path from "path";
import { JobLock } from "./job-types";

const LOCK_FILE = path.join(process.cwd(), "data/jobs/lock.json");
const STALE_MS = Number(process.env.DEALS_JOB_STALE_MS ?? 5 * 60 * 1000);

function read(): JobLock {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  } catch {
    return { locked: false, jobId: null, lockedAt: null };
  }
}

function write(lock: JobLock) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  const tmp = LOCK_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(lock, null, 2));
  fs.renameSync(tmp, LOCK_FILE);
}

export function isLockStale(lock = read()) {
  if (!lock.locked) return false;
  const timestamp = lock.heartbeatAt ?? lock.lockedAt;
  if (!timestamp) return true;
  return Date.now() - new Date(timestamp).getTime() > STALE_MS;
}

export function isLocked() {
  const lock = read();
  return lock.locked && !isLockStale(lock);
}

export function acquireLock(jobId: string) {
  if (isLocked()) {
    throw new Error("Deals job already running.");
  }
  const now = new Date().toISOString();
  write({
    locked: true,
    jobId,
    lockedAt: now,
    heartbeatAt: now,
    processId: process.pid,
    stopRequestedAt: null,
  });
}

export function heartbeatLock(jobId: string) {
  const lock = read();
  if (!lock.locked || lock.jobId !== jobId) return;
  write({ ...lock, heartbeatAt: new Date().toISOString(), processId: process.pid });
}

export function markLockStopRequested(jobId: string) {
  const lock = read();
  if (!lock.locked || lock.jobId !== jobId) return false;
  write({ ...lock, stopRequestedAt: new Date().toISOString() });
  return true;
}

export function releaseLock(jobId?: string) {
  const lock = read();
  if (jobId && lock.jobId && lock.jobId !== jobId) return false;
  write({
    locked: false,
    jobId: null,
    lockedAt: null,
    heartbeatAt: null,
    processId: null,
    stopRequestedAt: null,
  });
  return true;
}

export function getCurrentLock() {
  return read();
}
