import { cookies } from "next/headers";

export type UserRole = "director" | "casting";

export interface AuthUser {
  ssoId: string;
  displayName: string;
  role: UserRole;
}

const SESSION_COOKIE = "las_session";

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as AuthUser;
  } catch {
    return null;
  }
}

export function encodeSession(user: AuthUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

export function isDirectorId(id: string): boolean {
  return /^2\d{7}$/.test(id);
}

export function isCastingId(id: string): boolean {
  return /^3\d{7}$/.test(id);
}
