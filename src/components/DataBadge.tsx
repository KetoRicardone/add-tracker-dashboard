export function DataBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-secondary/50 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}
