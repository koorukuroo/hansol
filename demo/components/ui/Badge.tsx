interface BadgeProps {
  variant: "danger" | "warning" | "safe" | "blue" | "green" | "violet";
  children: React.ReactNode;
  size?: "xs" | "sm";
}

const styles: Record<string, string> = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  safe: "bg-success-bg text-success",
  blue: "bg-info-bg text-info",
  green: "bg-success-bg text-success",
  violet: "bg-violet-50 text-violet-700",
};

const sizeStyles: Record<string, string> = {
  xs: "text-[10px] px-1.5 py-px",
  sm: "text-[11px] px-2 py-0.5",
};

export default function Badge({ variant, children, size = "sm" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeStyles[size]} ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
