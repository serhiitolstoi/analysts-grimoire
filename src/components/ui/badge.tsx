import { cn } from "@/lib/utils/cn";

type BadgeVariant = "tan" | "purple" | "green" | "red" | "muted" | "blue";

export function Badge({
  children,
  variant = "muted",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  const variantClass: Record<BadgeVariant, string> = {
    tan:    "bg-g-tan/15 text-g-tan border-g-tan/30",
    purple: "bg-g-purple/15 text-g-purple border-g-purple/30",
    green:  "bg-g-green/15 text-g-green border-g-green/30",
    red:    "bg-g-red/15 text-g-red border-g-red/30",
    blue:   "bg-g-blue/15 text-g-blue border-g-blue/30",
    muted:  "bg-g-elevated text-g-muted border-g-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
        variantClass[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
