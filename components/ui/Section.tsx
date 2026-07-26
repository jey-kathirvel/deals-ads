interface Props {
  title: string;
  data?: unknown;
  children?: React.ReactNode;
}

export default function Section({
  title,
  data,
  children,
}: Props) {
  const hasData = data !== undefined;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {title}
      </h2>

      {hasData ? (
        <pre className="overflow-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        children
      )}
    </section>
  );
}
