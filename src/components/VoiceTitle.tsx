import Image from "next/image";
import { VIEWS, type ViewId } from "@/lib/persona";

// A face for each voice (fictional people, generated on 0G; the same portraits as the landing), so three answers read
// as three people at a glance.
const FACE: Record<ViewId, string> = {
  sane: "/visuals-west/persp-sane.jpg",
  future: "/visuals-west/persp-future30.jpg",
  bestie: "/visuals-west/persp-bestie.jpg",
};

export function VoiceTitle({ view, as: Tag = "h2" }: { view: ViewId; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-center gap-3">
      <Image src={FACE[view]} alt="" width={40} height={40} sizes="40px" className="h-10 w-10 rounded-full object-cover object-[50%_25%]" />
      <Tag className="font-semibold">{VIEWS[view].title}</Tag>
    </div>
  );
}
