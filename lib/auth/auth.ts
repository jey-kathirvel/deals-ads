import fs from "fs";
import path from "path";
import { AdminUser } from "./types";

const FILE = path.join(process.cwd(), "data/admin-users.json");

function load(): AdminUser[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(users: AdminUser[]) {
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
  fs.renameSync(tmp, FILE);
}

export function listAdminUsers(): AdminUser[] {
  return load();
}

export function findAdminUser(username: string): AdminUser | undefined {
  return load().find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.active
  );
}

export function updateLastLogin(id: string) {
  const users = load();
  const idx = users.findIndex(x => x.id === id);
  if (idx >= 0) {
    users[idx].lastLogin = new Date().toISOString();
    save(users);
  }
}
