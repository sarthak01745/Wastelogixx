import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  LOW: "bg-[#d7f4dc] text-[#19763b]",
  MEDIUM: "bg-[#fff1c9] text-[#9a5d00]",
  HIGH: "bg-[#ffd9c9] text-[#bd3a00]",
  CRITICAL: "bg-[#ffd2da] text-[#bb1138]",
  ASSIGNED: "bg-[#e8edff] text-[#1f4fd1]",
  IN_PROGRESS: "bg-[#dff5ff] text-[#0b6d8d]",
  COMPLETED: "bg-[#d7f4dc] text-[#19763b]",
  DELAYED: "bg-[#ffe6cb] text-[#ad5e00]",
  CANCELLED: "bg-[#efefef] text-[#5f5f5f]",
};

export const StatusPill = ({ value }: { value: string | null | undefined }) => {
  if (!value) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
        toneMap[value] ?? "bg-black text-white",
      )}
    >
      {value.replace("_", " ")}
    </span>
  );
};
