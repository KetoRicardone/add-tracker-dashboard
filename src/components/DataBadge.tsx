export function DataBadge({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  const text = typeof value === "string" ? value : String(value);
  return (
    <div className="rounded bg-secondary/50 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-medium truncate">{text}</p>
    </div>
  );
}
