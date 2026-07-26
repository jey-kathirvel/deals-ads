"use client";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "secondary" | "success";
  loading?: boolean;
}

const styles = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700",
  danger:
    "bg-red-600 text-white hover:bg-red-700",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700",
};

export default function ActionButton({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[variant]} ${className}`}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
