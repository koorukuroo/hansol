const dotColors: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  safe: "bg-success",
  running: "bg-success",
  idle: "bg-text-muted",
  emergency: "bg-violet-600",
};

export default function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${dotColors[status] || "bg-text-muted"}`}
      style={{ width: size, height: size }}
    />
  );
}
