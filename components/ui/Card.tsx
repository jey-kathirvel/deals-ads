interface Props {
  title?: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Card({
  title,
  value,
  children,
}: Props) {
  const hasValue = value !== undefined && value !== null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      {title && (
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="text-sm font-semibold text-slate-600">
            {title}
          </div>
        </div>
      )}

      <div className="p-6">
        {hasValue && (
          <div className="text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
