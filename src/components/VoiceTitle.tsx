import Image from "next/image";
import { VIEWS, type ViewId } from "@/lib/persona";

// A face for each voice (fictional people, generated on 0G), so three answers read as three people at a glance.
const FACE: Record<ViewId, string> = {
  sane: "/visuals/perspective-sane-768.webp",
  future: "/visuals/perspective-future-30-768.webp",
  bestie: "/visuals/perspective-bestie-768.webp",
};

export function VoiceTitle({ view, as: Tag = "h2" }: { view: ViewId; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-center gap-3">
      <Image src={FACE[view]} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 rounded-full object-cover object-[50%_25%]" />
      <Tag className="font-semibold">{VIEWS[view].title}</Tag>
    </div>
  );
}
