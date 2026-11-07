import type { ReactNode } from "react";
import { AiChip } from "@/components/AiChip";
import type { AiMeta } from "@/lib/memory";

export const pill = "min-h-11 rounded-full border border-line bg-paper px-4 text-sm text-ink disabled:opacity-50";

export function Bubble({ user = false, at, ai, children }: { user?: boolean; at?: string; ai?: AiMeta; children: ReactNode }) {
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
        <div className={`relative rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed text-ink shadow-sm before:absolute before:bottom-0 before:h-3 before:w-3 before:bg-inherit ${user ? "rounded-br-sm bg-[#F6C9D3] before:-right-1 before:[clip-path:polygon(0_0,0_100%,100%_100%)]" : "rounded-bl-sm bg-paper before:-left-1 before:[clip-path:polygon(100%_0,0_100%,100%_100%)]"}`}>
          {children}
          {at && <time dateTime={at} className="mt-1 block text-right text-[10px] leading-none text-muted">{new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}
        </div>
        {ai && <AiChip ai={ai} />}
      </div>
    </div>
  );
}
