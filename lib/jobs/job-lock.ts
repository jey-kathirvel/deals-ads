import fs from "fs";
import path from "path";
import { JobLock } from "./job-types";

const LOCK_FILE = path.join(process.cwd(), "data/jobs/lock.json");
const STALE_MS = 1000 * 60 * 30;

function read(): JobLock {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  } catch {
    return { locked: false, jobId: null, lockedAt: null };
  }
}

function write(lock: JobLock) {
  const tmp = LOCK_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(lock, null, 2));
  fs.renameSync(tmp, LOCK_FILE);
}

export function isLocked() {
  const lock = read();

  if (!lock.locked || !lock.lockedAt) return false;

  if (Date.now() - new Date(lock.lockedAt).getTime() > STALE_MS) {
    releaseLock();
    return false;
  }

  return true;
}

export function acquireLock(jobId: string) {
  if (isLocked()) {
    throw new Error("Deals job already running.");
  }

  write({
    locked: true,
    jobId,
    lockedAt: new Date().toISOString(),
  });
}

export function releaseLock() {
  write({
    locked: false,
    jobId: null,
    lockedAt: null,
  });
}

export function getCurrentLock() {
  return read();
}
