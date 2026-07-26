import { addAudit } from "@/lib/audit/store";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { JobRun, JobStatus, JobType } from "./job-types";

const FILE = path.join(process.cwd(), "data/jobs/runs.json");

function read(): JobRun[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function write(data: JobRun[]) {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

export function createRun(type: JobType, triggeredBy: "admin" | "system") {
  const jobs = read();

  const run: JobRun = {
    id: crypto.randomUUID(),
    type,
    status: "running",
    triggeredBy,
    startedAt: new Date().toISOString(),
    progress: 0,
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  jobs.unshift(run);
  write(jobs);

  addAudit("Jobs","UPDATE","SUCCESS",{});

  return run;
}

export function updateRun(id: string, patch: Partial<JobRun>) {
  const jobs = read();

  const index = jobs.findIndex((x) => x.id === id);
  if (index === -1) return;

  jobs[index] = {
    ...jobs[index],
    ...patch,
  };

  write(jobs);

  addAudit("Jobs","UPDATE","SUCCESS",{});
}

export function finishRun(
  id: string,
  status: JobStatus,
  patch: Partial<JobRun> = {},
) {
  const completed = new Date();

  updateRun(id, {
    ...patch,
    status,
    completedAt: completed.toISOString(),
    durationMs:
      completed.getTime() -
      new Date(read().find((x) => x.id === id)?.startedAt ?? completed).getTime(),
  });
}

export function latestRun() {
  return read()[0] ?? null;
}

export function history() {
  return read();
}
