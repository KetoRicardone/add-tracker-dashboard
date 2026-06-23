import { GRAIN_NAMES } from "@/lib/events";

const GRAIN_EMOJIS: Record<string, string> = {
  SES: "🟡",
  CHI: "🌱",
  PVR: "🥜",
  MUN: "🟢",
  BLE: "⚫",
  PNR: "🟤",
  PCO: "🔴",
  PAD: "🟠",
  PCR: "🟣",
  PBL: "⚪",
};

export function GrainIcon({ codigo, size = "md" }: { codigo: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "text-base", md: "text-2xl", lg: "text-4xl" }[size];
  return (
    <span className={sizeClass} title={GRAIN_NAMES[codigo] || codigo}>
      {GRAIN_EMOJIS[codigo] || "🌾"}
    </span>
  );
}

export function GrainBadge({ codigo }: { codigo: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      <GrainIcon codigo={codigo} size="sm" />
      {GRAIN_NAMES[codigo] || codigo}
    </span>
  );
}
