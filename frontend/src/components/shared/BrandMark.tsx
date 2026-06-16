import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export const BrandMark = ({ compact = false, className }: BrandMarkProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/favicon.svg"
        alt="WasteLogix"
        className={cn(
          "rounded-xl border-2 border-foreground/80 bg-card shadow-brutal-sm",
          compact ? "h-9 w-9" : "h-11 w-11",
        )}
      />
      <div>
        <div className={cn("font-extrabold tracking-tight text-foreground", compact ? "text-base" : "text-lg")}>
          WasteLogix
        </div>
        <div className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
          Smart waste logistics
        </div>
      </div>
    </div>
  );
};
