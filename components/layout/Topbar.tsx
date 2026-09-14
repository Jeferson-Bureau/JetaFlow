"use client";

import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";

export default function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <span className="font-semibold text-marinho">JetaFlow</span>
      <div className="flex items-center gap-4">
        <span className="text-sm">{session?.user?.name}</span>
        <ThemeToggle />
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm text-rosa">
          Sair
        </button>
      </div>
    </header>
  );
}
