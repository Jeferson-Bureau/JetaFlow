import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function getSessionRole(): Promise<Role | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: Role } | undefined)?.role ?? null;
}

export function isAdmin(role: Role | null): boolean {
  return role === "ADMIN";
}
