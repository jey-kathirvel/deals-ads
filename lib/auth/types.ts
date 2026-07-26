export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "REVIEWER" | "OPERATOR" | "READ_ONLY";
  active: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}
