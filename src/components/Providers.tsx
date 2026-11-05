"use client";
import type { ReactNode } from "react";
import { MemoryProvider } from "@/lib/memory";
import { SessionProvider } from "@/lib/session";
import { Shell } from "./Shell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <MemoryProvider>
        <Shell>{children}</Shell>
      </MemoryProvider>
    </SessionProvider>
  );
}
