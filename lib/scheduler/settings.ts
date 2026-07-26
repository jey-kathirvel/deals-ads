import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "data/jobs/settings.json");

const DAILY_INTERVAL_MINUTES = 24 * 60;
const INDIA_TIME_ZONE = "Asia/Kolkata";

export interface SchedulerSettings {
  enabled: boolean;

  /**
   * Retained for API and UI backward compatibility.
   * QuickCommerce execution is fixed at once per day.
   */
  intervalMinutes: number;

  maxDeals: number;
  publishMode: "review" | "publish";
  retryCount: number;
  retryDelaySeconds: number;
  timeoutMinutes: number;
  lastRun: string | null;
  nextRun: string | null;
}

function indiaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeSettings(value: SchedulerSettings): SchedulerSettings {
  return {
    ...value,
    intervalMinutes: DAILY_INTERVAL_MINUTES,
  };
}

export function getSchedulerSettings(): SchedulerSettings {
  const settings = JSON.parse(
    fs.readFileSync(FILE, "utf8"),
  ) as SchedulerSettings;

  return normalizeSettings(settings);
}

export function saveSchedulerSettings(settings: SchedulerSettings) {
  const normalized = normalizeSettings(settings);
  const tmp = `${FILE}.tmp`;

  fs.mkdirSync(path.dirname(FILE), {
    recursive: true,
  });

  fs.writeFileSync(tmp, JSON.stringify(normalized, null, 2));

  fs.renameSync(tmp, FILE);
}

/**
 * Returns true only when QuickCommerce has not already completed
 * a successful scheduled/manual import during the current India day.
 */
export function isSchedulerRunDue(now = new Date()): boolean {
  const settings = getSchedulerSettings();

  if (!settings.enabled) {
    return false;
  }

  if (!settings.lastRun) {
    return true;
  }

  const lastRun = new Date(settings.lastRun);

  if (!Number.isFinite(lastRun.getTime())) {
    return true;
  }

  return indiaDateString(lastRun) !== indiaDateString(now);
}

export function touchSchedulerRun(completedAt = new Date()) {
  const settings = getSchedulerSettings();

  settings.intervalMinutes = DAILY_INTERVAL_MINUTES;
  settings.lastRun = completedAt.toISOString();
  settings.nextRun = new Date(
    completedAt.getTime() + DAILY_INTERVAL_MINUTES * 60_000,
  ).toISOString();

  saveSchedulerSettings(settings);
}
